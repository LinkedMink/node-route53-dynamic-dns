import type { ResourceRecordSet } from "@aws-sdk/client-route-53";

export type DnsAddressRecordType = "A" | "AAAA";

export interface DnsAddressRecordSet extends ResourceRecordSet {
  Name: string;
  Type: DnsAddressRecordType;
  ResourceRecords: {
    Value: string;
  }[];
}

export interface DnsZoneRecordSets {
  zoneId: string;
  records: DnsAddressRecordSet[];
}

export interface DnsZoneRecordClient {
  getZoneRecords(dnsRecordsToMatch: string[]): Promise<DnsZoneRecordSets[]>;
  getZonesForDnsRecords(dnsRecordsToMatch: string[]): Promise<Map<string, string[]>>;
  updateZoneRecords(zoneRecords: DnsZoneRecordSets[]): Promise<Map<string, boolean>>;
}
