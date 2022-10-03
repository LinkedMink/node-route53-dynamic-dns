import { mock } from "jest-mock-extended";
import path from "path";
import { Route53AddressRecordUpdater } from "../../src/event-handlers/route53-address-record-updater.mjs";
import { DnsRecordSetSource } from "../../src/types/dns-record-events.mjs";
import { DnsZoneRecordClient } from "../../src/types/dns-zone-record-client.mjs";

describe(path.basename(__filename, ".test.ts"), () => {
  test("should construct", () => {
    const mockClient = mock<DnsZoneRecordClient>();
    const mockSource = mock<DnsRecordSetSource>();

    const result = new Route53AddressRecordUpdater(mockClient, mockSource);

    expect(result).toBeTruthy();
  });
});
