import { mock } from "jest-mock-extended";
import path from "node:path";
import { DnsRecordsEvent } from "../../src/constants/events.mjs";
import { Route53DnsRecordSetStore } from "../../src/services/dns-record-set-source.mjs";
import { DnsZoneRecordClient, DnsZoneRecordSets } from "../../src/types/dns-zone-record-client.mjs";

describe(path.basename(__filename, ".test.ts"), () => {
  test("should thorw when getRecords called and remote source empty on first attempt", async () => {
    const mockClient = mock<DnsZoneRecordClient>();
    mockClient.getZoneRecords.mockResolvedValue([]);

    const recordStore = new Route53DnsRecordSetStore(mockClient, false, ["test.tld."]);
    const action = recordStore.getRecords();

    await expect(action).rejects.toBeInstanceOf(Error);
  });

  test("should get records from remote source when getRecords called and not caching or not retrieved once", async () => {
    const mockClient = mock<DnsZoneRecordClient>();
    const mockResult: DnsZoneRecordSets[] = [
      {
        zoneId: "TEST_ID",
        records: [
          {
            Name: "sub.test.tld.",
            Type: "A",
            ResourceRecords: [
              {
                Value: "10.10.10.10",
              },
            ],
          },
        ],
      },
    ];
    mockClient.getZoneRecords.mockResolvedValue(mockResult);
    const mockEventHandler = jest.fn();

    const recordStore = new Route53DnsRecordSetStore(mockClient, false, ["test.tld."]);
    recordStore.on(DnsRecordsEvent.Retrieved, mockEventHandler);
    const result = await recordStore.getRecords();

    expect(result).toEqual(mockResult);
    expect(mockEventHandler).toHaveBeenCalledWith({
      dnsRecords: [
        {
          name: "sub.test.tld.",
          type: "A",
          value: "10.10.10.10",
        },
      ],
      lastChangeDateTime: expect.any(Date),
    });
    expect(mockClient.getZoneRecords).toHaveBeenCalledWith(["test.tld."]);
  });

  test("should return cached records when getRecords called, caching, and retrieved once", async () => {
    const mockClient = mock<DnsZoneRecordClient>();
    const mockResult: DnsZoneRecordSets[] = [
      {
        zoneId: "TEST_ID",
        records: [
          {
            Name: "sub.test.tld.",
            Type: "A",
            ResourceRecords: [
              {
                Value: "10.10.10.10",
              },
            ],
          },
        ],
      },
    ];
    mockClient.getZoneRecords.mockResolvedValue(mockResult);

    const recordStore = new Route53DnsRecordSetStore(mockClient, true, ["test.tld."]);
    const result1 = await recordStore.getRecords();
    const result2 = await recordStore.getRecords();

    expect(result1).toBe(result2);
    expect(mockClient.getZoneRecords).toHaveBeenNthCalledWith(1, ["test.tld."]);
  });

  test("should emit updated records when updateRecordsAfterSync called with successful records", async () => {
    const mockClient = mock<DnsZoneRecordClient>();
    const mockResult: DnsZoneRecordSets[] = [
      {
        zoneId: "TEST_ID",
        records: [
          {
            Name: "sub.test.tld.",
            Type: "A",
            ResourceRecords: [
              {
                Value: "10.10.10.10",
              },
            ],
          },
        ],
      },
      {
        zoneId: "TEST_ID_2",
        records: [
          {
            Name: "sub.test2.tld.",
            Type: "A",
            ResourceRecords: [
              {
                Value: "10.10.10.10",
              },
            ],
          },
        ],
      },
    ];
    mockClient.getZoneRecords.mockResolvedValue(mockResult);
    const mockEventHandler = jest.fn();

    const recordStore = new Route53DnsRecordSetStore(mockClient, true, ["test.tld."]);
    recordStore.on(DnsRecordsEvent.Updated, mockEventHandler);
    await recordStore.getRecords();
    recordStore.updateRecordsAfterSync(
      [
        {
          zoneId: "TEST_ID",
          records: [
            {
              Name: "sub.test.tld.",
              Type: "A",
              ResourceRecords: [
                {
                  Value: "10.10.10.11",
                },
              ],
            },
          ],
        },
        {
          zoneId: "TEST_ID_2",
          records: [
            {
              Name: "sub.test2.tld.",
              Type: "A",
              ResourceRecords: [
                {
                  Value: "10.10.10.11",
                },
              ],
            },
          ],
        },
      ],
      new Map<string, boolean>([
        ["TEST_ID", true],
        ["TEST_ID_2", false],
      ])
    );

    expect(mockEventHandler).toHaveBeenCalledWith({
      dnsRecords: [
        {
          name: "sub.test.tld.",
          type: "A",
          value: "10.10.10.11",
        },
        {
          name: "sub.test2.tld.",
          type: "A",
          value: "10.10.10.10",
        },
      ],
      lastChangeDateTime: expect.any(Date),
    });
  });
});
