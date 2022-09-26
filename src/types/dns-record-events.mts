import type { DnsRecordsEvent } from "../constants/events.mjs";
import type { DnsAddressRecordType, DnsZoneRecordSets } from "./dns-zone-record-client.mjs";

export interface DnsAddressRecord {
  name: string;
  type: DnsAddressRecordType;
  value: string;
}

export interface DnsAddressRecordState {
  dnsRecords: DnsAddressRecord[];
  lastUpdateDateTime: Date;
}

export type DnsAddressRecordsChangedEventHandler = (event: DnsAddressRecordState) => void;

export interface DnsRecordSetSource {
  getRecords(): Promise<DnsZoneRecordSets[]>;
  updateRecordsAfterSync(
    updatedRecordsSets: DnsZoneRecordSets[],
    updateStatuses: Map<string, boolean>
  ): void;

  on(eventName: DnsRecordsEvent, listener: DnsAddressRecordsChangedEventHandler): this;
}
