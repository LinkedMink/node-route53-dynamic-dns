import EventEmitter from "events";
import { DnsRecordsEvent } from "../constants/events.mjs";
import { loggerForModuleUrl } from "../environment/logger.mjs";
import { validateNormalizeDnsRecord } from "../functions/validate.mjs";
import { DnsRecordSetSource } from "../types/dns-record-events.mjs";
import { DnsZoneRecordClient, DnsZoneRecordSets } from "../types/dns-zone-record-client.mjs";

export class Route53DnsRecordSetStore extends EventEmitter implements DnsRecordSetSource {
  private readonly logger = loggerForModuleUrl(import.meta.url);
  private readonly dnsRecordsToUpdate: string[];

  private zoneRecordSets: DnsZoneRecordSets[] = [];
  private hasRetrievedFirstRecordSets = false;

  constructor(
    private readonly client: DnsZoneRecordClient,
    private readonly isRecordsCached: boolean,
    hostnames: string[]
  ) {
    super();
    this.dnsRecordsToUpdate = hostnames.map(validateNormalizeDnsRecord);
  }

  getRecords = async (): Promise<DnsZoneRecordSets[]> => {
    if (this.isRecordsCached && this.hasRetrievedFirstRecordSets) {
      return this.zoneRecordSets;
    }

    this.zoneRecordSets = await this.client.getZoneRecords(this.dnsRecordsToUpdate);

    if (this.zoneRecordSets.length <= 0) {
      // Only throw an error when this is the first record set since that probably indicates a misconfiguration.
      // During operations the records may change, and we want to keep the service running to recover on the next update.
      const message = `No zones were found matching the input record: ${this.dnsRecordsToUpdate.toString()}`;
      if (!this.hasRetrievedFirstRecordSets) {
        throw new Error(message);
      }

      this.logger.error(message);
    }

    this.hasRetrievedFirstRecordSets = true;
    this.emitDnsRecordState(DnsRecordsEvent.Retrieved);
    return this.zoneRecordSets;
  };

  updateRecordsAfterSync = (
    updatedRecordsSets: DnsZoneRecordSets[],
    updateStatuses: Map<string, boolean>
  ): void => {
    this.zoneRecordSets = this.zoneRecordSets.map(z => {
      const hasSucceeded = updateStatuses.get(z.zoneId);
      if (hasSucceeded) {
        const updated = updatedRecordsSets.find(u => u.zoneId === z.zoneId);
        if (updated) {
          return { ...updated };
        }
      }

      return { ...z };
    });

    this.emitDnsRecordState(DnsRecordsEvent.Updated);
  };

  private emitDnsRecordState = (event: DnsRecordsEvent) => {
    const dnsRecordsEvent = {
      dnsRecords: this.zoneRecordSets.flatMap(z =>
        z.records.map(r => ({
          name: r.Name,
          type: r.Type,
          value: r.ResourceRecords[0].Value,
        }))
      ),
      lastChangeDateTime: new Date(),
    };

    this.logger.verbose(`${event}: #zones=${this.zoneRecordSets.length}`);
    this.emit(event, dnsRecordsEvent);
  };
}
