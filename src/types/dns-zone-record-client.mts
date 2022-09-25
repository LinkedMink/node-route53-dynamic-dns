import type { ResourceRecordSet } from "@aws-sdk/client-route-53";

export type DnsHostRecordType = "A" | "AAAA";

export interface DnsHostRecordSet extends ResourceRecordSet {
  Name: string;
  Type: DnsHostRecordType;
  ResourceRecords: {
    Value: string;
  }[];
}

export interface DnsZoneRecordSets {
  zoneId: string;
  records: DnsHostRecordSet[];
}

export interface DnsZoneRecordClient {
  getZoneRecords(hostNamesToMatch: string[]): Promise<DnsZoneRecordSets[]>;
  updateZoneRecords(zoneRecords: DnsZoneRecordSets[]): Promise<Map<string, boolean>>;
}
