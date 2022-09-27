import EventEmitter from "events";
import { DnsRecordsEvent } from "../constants/events.mjs";
import { loggerForModuleUrl } from "../environment/logger.mjs";
import { convertToDnsRecordState, mapToUpdatedZoneRecordSets } from "../functions/convert.mjs";
import { DnsRecordSetSource } from "../types/dns-record-events.mjs";
import { DnsZoneRecordClient, DnsZoneRecordSets } from "../types/dns-zone-record-client.mjs";

export class CachedDnsRecordSetStore extends EventEmitter implements DnsRecordSetSource {
  private readonly logger = loggerForModuleUrl(import.meta.url);

  private zoneRecordSets: DnsZoneRecordSets[] = [];
  private hasRetrievedFirstRecordSets = false;

  constructor(
    private readonly client: DnsZoneRecordClient,
    private readonly dnsRecordsToUpdate: string[]
  ) {
    super();
  }

  async getRecords(): Promise<DnsZoneRecordSets[]> {
    if (!this.hasRetrievedFirstRecordSets) {
      this.zoneRecordSets = await this.client.getZoneRecords(this.dnsRecordsToUpdate);
      if (this.zoneRecordSets.length <= 0) {
        throw new Error(
          `No zones were found matching the input record: ${this.dnsRecordsToUpdate.toString()}`
        );
      }

      this.hasRetrievedFirstRecordSets = true;
      this.emitDnsRecordState(DnsRecordsEvent.Retrieved);
    }

    return this.zoneRecordSets;
  }

  updateRecordsAfterSync = (
    updatedRecordsSets: DnsZoneRecordSets[],
    updateStatuses: Map<string, boolean>
  ): void => {
    this.zoneRecordSets = mapToUpdatedZoneRecordSets(
      this.zoneRecordSets,
      updatedRecordsSets,
      updateStatuses
    );

    this.emitDnsRecordState(DnsRecordsEvent.Updated);
  };

  private emitDnsRecordState = (event: DnsRecordsEvent) => {
    const dnsRecords = convertToDnsRecordState(this.zoneRecordSets);
    this.logger.verbose(`${event}: #zones=${this.zoneRecordSets.length}`);
    this.emit(event, dnsRecords);
  };
}
