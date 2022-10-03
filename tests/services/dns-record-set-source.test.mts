import { mock } from "jest-mock-extended";
import path from "path";
import { Route53DnsRecordSetStore } from "../../src/services/dns-record-set-source.mjs";
import { DnsZoneRecordClient } from "../../src/types/dns-zone-record-client.mjs";

describe(path.basename(__filename, ".test.ts"), () => {
  test("should construct", () => {
    const mockClient = mock<DnsZoneRecordClient>();

    const result = new Route53DnsRecordSetStore(mockClient, true, ["test.tld."]);

    expect(result).toBeTruthy();
  });
});
