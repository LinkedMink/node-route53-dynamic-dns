import { validateNormalizeDnsRecord } from "../functions/validate.mjs";
import { DnsRecordSetSource } from "../types/dns-record-events.mjs";
import { DnsZoneRecordClient } from "../types/dns-zone-record-client.mjs";
import { CachedDnsRecordSetStore } from "./cached-dns-record-set-source.mjs";
import { UpdatedDnsRecordSetStore } from "./updated-dns-record-set-source.mjs";

export const createDnsRecordSetSource = (
  dnsRecordClient: DnsZoneRecordClient,
  isCachedRecordsEnabled: boolean,
  hostnames: string[]
): DnsRecordSetSource => {
  const dnsRecords = hostnames.map(validateNormalizeDnsRecord);

  const dnsRecordSource = isCachedRecordsEnabled
    ? new CachedDnsRecordSetStore(dnsRecordClient, dnsRecords)
    : new UpdatedDnsRecordSetStore(dnsRecordClient, dnsRecords);

  return dnsRecordSource;
};
