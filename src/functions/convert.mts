import { DnsAddressRecordState } from "../types/dns-record-events.mjs";
import { DnsZoneRecordSets } from "../types/dns-zone-record-client.mjs";

export const getNumericEnumKeys = (enumeration: Record<string, string | number>) =>
  Object.keys(enumeration).filter(k => isNaN(Number(k)));

export const convertToDnsRecordState = (
  zoneRecordSets: DnsZoneRecordSets[]
): DnsAddressRecordState => {
  const dnsRecords = zoneRecordSets.flatMap(z =>
    z.records.map(r => ({
      name: r.Name,
      type: r.Type,
      value: r.ResourceRecords[0].Value,
    }))
  );

  return {
    dnsRecords,
    lastUpdateDateTime: new Date(),
  };
};

export const mapToUpdatedZoneRecordSets = (
  currentRecordSets: DnsZoneRecordSets[],
  updatedRecordsSets: DnsZoneRecordSets[],
  updateStatuses: Map<string, boolean>
): DnsZoneRecordSets[] =>
  currentRecordSets.map(z => {
    const hasSucceeded = updateStatuses.get(z.zoneId);
    if (hasSucceeded) {
      const updated = updatedRecordsSets.find(u => u.zoneId === z.zoneId);
      if (updated) {
        return { ...updated };
      }
    }

    return { ...z };
  });
