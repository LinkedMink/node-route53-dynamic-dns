import type { DnsRecordsEvent } from "../constants/events.js";
import type { DnsAddressRecordType, DnsZoneRecordSets } from "./dns-zone-record-client.js";

export interface DnsAddressRecord {
  name: string;
  type: DnsAddressRecordType;
  value: string;
}

export interface DnsAddressRecordState {
  dnsRecords: DnsAddressRecord[];
  lastChangeDateTime: Date;
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
