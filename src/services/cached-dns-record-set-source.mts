import EventEmitter from "events";
import { DnsRecordsEvent } from "../constants/events.mjs";
import { loggerForModuleUrl } from "../environment/logger.mjs";
import { convertToDnsRecordState } from "../functions/convert.mjs";
import { DnsRecordSetSource } from "../types/dns-record-events.mjs";
import { DnsZoneRecordClient, DnsZoneRecordSets } from "../types/dns-zone-record-client.mjs";

export class CachedDnsRecordSetStore extends EventEmitter implements DnsRecordSetSource {
  private readonly logger = loggerForModuleUrl(import.meta.url);

  private zoneRecordSets: DnsZoneRecordSets[] = [];

  constructor(private readonly client: DnsZoneRecordClient) {
    super();
  }

  /**
   * Get the initial state of the zones and DNS records to cache their IP and IDs for quicker lookups
   * @param dnsRecordsToUpdate Search all zones and records the AWS account has access for hostnames that match
   * @returns Resolve when matching zones and host records have been cached
   */
  initialize = async (dnsRecordsToUpdate: string[]): Promise<void> => {
    this.zoneRecordSets = await this.client.getZoneRecords(dnsRecordsToUpdate);
    if (this.zoneRecordSets.length <= 0) {
      throw new Error(
        `No zones were found matching the input record: ${dnsRecordsToUpdate.toString()}`
      );
    }

    this.emitDnsRecordState(DnsRecordsEvent.Retrieved);
  };

  getRecords(): Promise<DnsZoneRecordSets[]> {
    return Promise.resolve(this.zoneRecordSets);
  }

  updateRecordsAfterSync(
    updatedRecordsSets: DnsZoneRecordSets[],
    updateStatuses: Map<string, boolean>
  ): void {
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
  }

  private emitDnsRecordState = (event: DnsRecordsEvent) => {
    const dnsRecords = convertToDnsRecordState(this.zoneRecordSets);
    this.logger.verbose(`${event}: ${this.zoneRecordSets.length}`);
    this.emit(event, dnsRecords);
  };
}
