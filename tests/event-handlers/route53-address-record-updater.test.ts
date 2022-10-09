import { mock } from "jest-mock-extended";
import path from "path";
import { EventEmitter } from "stream";
import { Route53AddressRecordUpdater } from "../../src/event-handlers/route53-address-record-updater.mjs";
import { DnsRecordSetSource } from "../../src/types/dns-record-events.mjs";
import {
  DnsAddressRecordSet,
  DnsZoneRecordClient,
  DnsZoneRecordSets,
} from "../../src/types/dns-zone-record-client.mjs";
import { PublicIpState } from "../../src/types/public-ip-events.mjs";

const getMockRecords = (
  recordName: string,
  ipV4 = "10.10.10.10",
  ipV6 = "1000:1000:1000:1000:1000:1000:1000:1000"
): DnsAddressRecordSet[] => [
  {
    Name: recordName,
    Type: "A",
    ResourceRecords: [
      {
        Value: ipV4,
      },
    ],
  },
  {
    Name: recordName,
    Type: "AAAA",
    ResourceRecords: [
      {
        Value: ipV6,
      },
    ],
  },
];

describe(path.basename(__filename, ".test.ts"), () => {
  beforeEach(() => jest.useRealTimers());

  test("should skip update when no records outdated", async () => {
    const mockClient = mock<DnsZoneRecordClient>();
    const mockSource = mock<DnsRecordSetSource>();
    const mockResult: DnsZoneRecordSets[] = [
      {
        zoneId: "TEST_ID",
        records: [...getMockRecords("sub.test.tld."), ...getMockRecords("sub2.test.tld.")],
      },
    ];
    mockSource.getRecords.mockResolvedValue(mockResult);
    const mockIpEvent: PublicIpState = {
      publicIpAddresses: {
        v4: "10.10.10.10",
        v6: null,
      },
      lastPublicIpDateTime: new Date(),
    };

    const updater = new Route53AddressRecordUpdater(mockClient, mockSource);
    await updater.handlePublicIpUpdate(mockIpEvent);
    await updater.dispose();

    expect(mockClient.updateZoneRecords).not.toHaveBeenCalled();
  });

  test("should skip update when not address records", async () => {
    const mockClient = mock<DnsZoneRecordClient>();
    const mockSource = mock<DnsRecordSetSource>();
    const mockResult: DnsZoneRecordSets[] = [
      {
        zoneId: "TEST_ID",
        records: [
          {
            Name: "sub2.test.tld.",
            Type: "CNAME" as "A",
            ResourceRecords: [
              {
                Value: "sub.test.tld.",
              },
            ],
          },
        ],
      },
    ];
    mockSource.getRecords.mockResolvedValue(mockResult);
    const mockIpEvent: PublicIpState = {
      publicIpAddresses: {
        v4: "10.10.10.10",
        v6: null,
      },
      lastPublicIpDateTime: new Date(),
    };

    const updater = new Route53AddressRecordUpdater(mockClient, mockSource);
    await updater.handlePublicIpUpdate(mockIpEvent);
    await updater.dispose();

    expect(mockClient.updateZoneRecords).not.toHaveBeenCalled();
  });

  test("should perform update when records outdated", async () => {
    const mockClient = mock<DnsZoneRecordClient>();
    const mockStatusMap = new Map<string, boolean>([["TEST_ID", true]]);
    mockClient.updateZoneRecords.mockResolvedValue(mockStatusMap);
    const mockSource = mock<DnsRecordSetSource>();
    const mockResult: DnsZoneRecordSets[] = [
      {
        zoneId: "TEST_ID",
        records: [
          ...getMockRecords("sub.test.tld."),
          ...getMockRecords(
            "sub2.test.tld.",
            "10.10.10.11",
            "1000:1000:1000:1000:1000:1000:1000:1001"
          ),
        ],
      },
    ];
    mockSource.getRecords.mockResolvedValue(mockResult);
    const mockIpEvent: PublicIpState = {
      publicIpAddresses: {
        v4: "10.10.10.11",
        v6: "1000:1000:1000:1000:1000:1000:1000:1001",
      },
      lastPublicIpDateTime: new Date(),
    };

    const updater = new Route53AddressRecordUpdater(mockClient, mockSource);
    await updater.handlePublicIpUpdate(mockIpEvent);
    await updater.dispose();

    const expectedUpdate = [
      {
        zoneId: "TEST_ID",
        records: [
          ...getMockRecords(
            "sub.test.tld.",
            "10.10.10.11",
            "1000:1000:1000:1000:1000:1000:1000:1001"
          ),
          ...getMockRecords(
            "sub2.test.tld.",
            "10.10.10.11",
            "1000:1000:1000:1000:1000:1000:1000:1001"
          ),
        ],
      },
    ];
    expect(mockClient.updateZoneRecords).toHaveBeenCalledWith(expectedUpdate);
    expect(mockSource.updateRecordsAfterSync).toHaveBeenCalledWith(expectedUpdate, mockStatusMap);
  });

  test("should perform update without IPv6 when IPv6 not available", async () => {
    const mockClient = mock<DnsZoneRecordClient>();
    const mockStatusMap = new Map<string, boolean>([["TEST_ID", true]]);
    mockClient.updateZoneRecords.mockResolvedValue(mockStatusMap);
    const mockSource = mock<DnsRecordSetSource>();
    const mockResult: DnsZoneRecordSets[] = [
      {
        zoneId: "TEST_ID",
        records: [
          ...getMockRecords("sub.test.tld."),
          ...getMockRecords(
            "sub2.test.tld.",
            "10.10.10.11",
            "1000:1000:1000:1000:1000:1000:1000:1001"
          ),
        ],
      },
    ];
    mockSource.getRecords.mockResolvedValue(mockResult);
    const mockIpEvent: PublicIpState = {
      publicIpAddresses: {
        v4: "10.10.10.11",
        v6: null,
      },
      lastPublicIpDateTime: new Date(),
    };

    const updater = new Route53AddressRecordUpdater(mockClient, mockSource);
    await updater.handlePublicIpUpdate(mockIpEvent);
    await updater.dispose();

    const expectedUpdate = [
      {
        zoneId: "TEST_ID",
        records: [
          ...getMockRecords(
            "sub.test.tld.",
            "10.10.10.11",
            "1000:1000:1000:1000:1000:1000:1000:1000"
          ),
          ...getMockRecords(
            "sub2.test.tld.",
            "10.10.10.11",
            "1000:1000:1000:1000:1000:1000:1000:1001"
          ),
        ],
      },
    ];
    expect(mockClient.updateZoneRecords).toHaveBeenCalledWith(expectedUpdate);
    expect(mockSource.updateRecordsAfterSync).toHaveBeenCalledWith(expectedUpdate, mockStatusMap);
  });

  test("should perform update without IPv4 when IPv4 not available", async () => {
    const mockClient = mock<DnsZoneRecordClient>();
    const mockStatusMap = new Map<string, boolean>([["TEST_ID", true]]);
    mockClient.updateZoneRecords.mockResolvedValue(mockStatusMap);
    const mockSource = mock<DnsRecordSetSource>();
    const mockResult: DnsZoneRecordSets[] = [
      {
        zoneId: "TEST_ID",
        records: [
          ...getMockRecords("sub.test.tld."),
          ...getMockRecords(
            "sub2.test.tld.",
            "10.10.10.11",
            "1000:1000:1000:1000:1000:1000:1000:1001"
          ),
        ],
      },
    ];
    mockSource.getRecords.mockResolvedValue(mockResult);
    const mockIpEvent: PublicIpState = {
      publicIpAddresses: {
        v4: null,
        v6: "1000:1000:1000:1000:1000:1000:1000:1001",
      },
      lastPublicIpDateTime: new Date(),
    };

    const updater = new Route53AddressRecordUpdater(mockClient, mockSource);
    await updater.handlePublicIpUpdate(mockIpEvent);
    await updater.dispose();

    const expectedUpdate = [
      {
        zoneId: "TEST_ID",
        records: [
          ...getMockRecords(
            "sub.test.tld.",
            "10.10.10.10",
            "1000:1000:1000:1000:1000:1000:1000:1001"
          ),
          ...getMockRecords(
            "sub2.test.tld.",
            "10.10.10.11",
            "1000:1000:1000:1000:1000:1000:1000:1001"
          ),
        ],
      },
    ];
    expect(mockClient.updateZoneRecords).toHaveBeenCalledWith(expectedUpdate);
    expect(mockSource.updateRecordsAfterSync).toHaveBeenCalledWith(expectedUpdate, mockStatusMap);
  });

  test("should defer handling IP event when update pending", async () => {
    const mockClient = mock<DnsZoneRecordClient>();
    const mockStatusMap = new Map<string, boolean>([["TEST_ID", true]]);
    const triggerFinish = new EventEmitter();
    mockClient.updateZoneRecords.mockImplementation(() => {
      return new Promise(resolve => {
        triggerFinish.on("finish", () => resolve(mockStatusMap));
      });
    });
    const mockSource = mock<DnsRecordSetSource>();
    const mockResult: DnsZoneRecordSets[] = [
      {
        zoneId: "TEST_ID",
        records: [
          ...getMockRecords("sub.test.tld."),
          ...getMockRecords(
            "sub2.test.tld.",
            "10.10.10.11",
            "1000:1000:1000:1000:1000:1000:1000:1001"
          ),
        ],
      },
    ];
    mockSource.getRecords.mockResolvedValue(mockResult);
    const mockIpEvent: PublicIpState = {
      publicIpAddresses: {
        v4: "10.10.10.11",
        v6: "1000:1000:1000:1000:1000:1000:1000:1001",
      },
      lastPublicIpDateTime: new Date(),
    };

    const updater = new Route53AddressRecordUpdater(mockClient, mockSource);
    updater.handlePublicIpUpdate(mockIpEvent);
    updater.handlePublicIpUpdate(mockIpEvent);
    updater.handlePublicIpUpdate(mockIpEvent);
    updater.handlePublicIpUpdate(mockIpEvent);
    updater.handlePublicIpUpdate(mockIpEvent);
    await new Promise(resolve => process.nextTick(resolve));
    triggerFinish.emit("finish");
    await new Promise(resolve => process.nextTick(resolve));
    triggerFinish.emit("finish");
    await updater.dispose();

    const expectedUpdate = [
      {
        zoneId: "TEST_ID",
        records: [
          ...getMockRecords(
            "sub.test.tld.",
            "10.10.10.11",
            "1000:1000:1000:1000:1000:1000:1000:1001"
          ),
          ...getMockRecords(
            "sub2.test.tld.",
            "10.10.10.11",
            "1000:1000:1000:1000:1000:1000:1000:1001"
          ),
        ],
      },
    ];
    expect(mockClient.updateZoneRecords).toHaveBeenNthCalledWith(2, expectedUpdate);
    expect(mockSource.updateRecordsAfterSync).toHaveBeenNthCalledWith(
      2,
      expectedUpdate,
      mockStatusMap
    );
  });
});
