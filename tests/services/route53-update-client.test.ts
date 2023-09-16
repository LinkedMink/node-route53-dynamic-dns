import {
  ChangeResourceRecordSetsCommandOutput,
  GetChangeCommandOutput,
  ListHostedZonesCommandOutput,
  ListResourceRecordSetsCommandOutput,
  Route53,
} from "@aws-sdk/client-route-53";
import path from "node:path";
import { Route53UpdateClient } from "../../src/services/route53-update-client.mjs";

jest.mock("@aws-sdk/client-route-53");
jest.mock("node:timers/promises", () => ({
  setTimeout: () => Promise.resolve(),
}));

describe(path.basename(__filename, ".test.ts"), () => {
  // beforeEach(() => jest.useRealTimers())

  test("should construct Route53 client with access key when constructed", () => {
    const mockRoute53 = jest.mocked(Route53);

    const result = new Route53UpdateClient("FAKE_KEY_ID", "FAKE_KEY_SECRET");

    expect(result).toBeTruthy();
    expect(mockRoute53).toHaveBeenCalledWith({
      region: "REGION",
      credentials: {
        accessKeyId: "FAKE_KEY_ID",
        secretAccessKey: "FAKE_KEY_SECRET",
      },
    });
  });

  test("should call listHostedZones and throw when getZonesForDnsRecords called and result not expected", async () => {
    const mockRoute53 = jest.mocked(Route53);
    const mockResponse: Partial<ListHostedZonesCommandOutput> = {};
    mockRoute53.prototype.listHostedZones.mockResolvedValue(mockResponse as never);

    const client = new Route53UpdateClient("FAKE_KEY_ID", "FAKE_KEY_SECRET");
    const action = client.getZonesForDnsRecords(["test.mydomain.tld."]);

    await expect(action).rejects.toBeInstanceOf(Error);
  });

  test("should call listHostedZones and transform when getZonesForDnsRecords called and result is expected", async () => {
    const mockRoute53 = jest.mocked(Route53);
    const mockResponse: Partial<ListHostedZonesCommandOutput> = {
      HostedZones: [
        {
          Id: "TEST_ID_1",
          Name: "test1.tld.",
          CallerReference: "REF",
        },
        {
          Id: "TEST_ID_2",
          Name: "test2.tld.",
          CallerReference: "REF",
        },
      ],
    };
    mockRoute53.prototype.listHostedZones.mockResolvedValue(mockResponse as never);

    const client = new Route53UpdateClient("FAKE_KEY_ID", "FAKE_KEY_SECRET");
    const result = await client.getZonesForDnsRecords([
      "sub1.test1.tld.",
      "sub2.test1.tld.",
      "test2.tld.",
      "test3.tld.",
    ]);

    expect(mockRoute53.prototype.listHostedZones).toHaveBeenCalled();
    expect(result.get("TEST_ID_1")).toEqual(["sub1.test1.tld.", "sub2.test1.tld."]);
    expect(result.get("TEST_ID_2")).toEqual(["test2.tld."]);
  });

  test("should call listResourceRecordSets and transform when getZoneRecords called and result is expected", async () => {
    const mockRoute53 = jest.mocked(Route53);
    const mockZoneResponse: Partial<ListHostedZonesCommandOutput> = {
      HostedZones: [
        {
          Id: "TEST_ID_1",
          Name: "test1.tld.",
          CallerReference: "REF",
        },
        {
          Id: "TEST_ID_2",
          Name: "test2.tld.",
          CallerReference: "REF",
        },
      ],
    };
    mockRoute53.prototype.listHostedZones.mockResolvedValue(mockZoneResponse as never);
    const mockTest1RecordResponse: Partial<ListResourceRecordSetsCommandOutput> = {
      ResourceRecordSets: [
        {
          Name: "sub1.test1.tld.",
          Type: "A",
          ResourceRecords: [
            {
              Value: "10.10.10.10",
            },
          ],
        },
        {
          Name: "sub2.test1.tld.",
          Type: "A",
          ResourceRecords: [
            {
              Value: "10.10.10.10",
            },
          ],
        },
        {
          Name: "alias.test1.tld.",
          Type: "CNAME",
          ResourceRecords: [
            {
              Value: "sub1.test1.tld.",
            },
          ],
        },
      ],
    };
    const mockTest2RecordResponse: Partial<ListResourceRecordSetsCommandOutput> = {
      ResourceRecordSets: [],
    };
    mockRoute53.prototype.listResourceRecordSets.mockImplementation(request => {
      if (request.HostedZoneId === "TEST_ID_1") {
        return mockTest1RecordResponse;
      } else {
        return mockTest2RecordResponse;
      }
    });

    const client = new Route53UpdateClient("FAKE_KEY_ID", "FAKE_KEY_SECRET");
    const result = await client.getZoneRecords([
      "sub1.test1.tld.",
      "sub2.test1.tld.",
      "alias.test1.tld.",
      "test2.tld.",
      "test3.tld.",
    ]);

    expect(mockRoute53.prototype.listResourceRecordSets).toHaveBeenNthCalledWith(1, {
      HostedZoneId: "TEST_ID_1",
    });
    expect(mockRoute53.prototype.listResourceRecordSets).toHaveBeenNthCalledWith(2, {
      HostedZoneId: "TEST_ID_2",
    });
    expect(result).toEqual([
      {
        zoneId: "TEST_ID_1",
        records: [
          {
            Name: "sub1.test1.tld.",
            Type: "A",
            ResourceRecords: [
              {
                Value: "10.10.10.10",
              },
            ],
          },
          {
            Name: "sub2.test1.tld.",
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
        records: [],
      },
    ]);
  });

  test("should call changeResourceRecordSets wait for sync with getChange when updateZoneRecords called and result is expected", async () => {
    //const mockStartDate = new Date(2020, 10, 10, 10, 10, 10, 0)
    // const dateSpy = jest.spyOn(Date, 'now')
    // dateSpy.mockReturnValue(mockStartDate.getTime())
    // jest.useFakeTimers().setSystemTime(mockStartDate)
    const mockRoute53 = jest.mocked(Route53);
    const mockChange1Response: Partial<ChangeResourceRecordSetsCommandOutput> = {
      ChangeInfo: {
        Id: "CHANGE_ID_1",
        Status: "PENDING",
        SubmittedAt: new Date(),
      },
    };
    const mockGetChange1Response: Partial<GetChangeCommandOutput> = {
      ChangeInfo: {
        Id: "CHANGE_ID_1",
        Status: "INSYNC",
        SubmittedAt: new Date(),
      },
    };
    const mockChange2Response: Partial<ChangeResourceRecordSetsCommandOutput> = {
      ChangeInfo: {
        Id: "CHANGE_ID_2",
        Status: "PENDING",
        SubmittedAt: new Date(),
      },
    };
    const mockGetChange2Response: Partial<GetChangeCommandOutput> = mockChange1Response;
    mockRoute53.prototype.changeResourceRecordSets.mockImplementation(request => {
      if (request.HostedZoneId === "TEST_ID_1") {
        return mockChange1Response;
      } else {
        return mockChange2Response;
      }
    });
    let hasResolvedGetChange2Count = 0;
    mockRoute53.prototype.getChange.mockImplementation(request => {
      if (request.Id === "CHANGE_ID_1") {
        return mockGetChange1Response;
      }

      if (hasResolvedGetChange2Count > 0) {
        throw new Error();
      }

      hasResolvedGetChange2Count++;
      return mockGetChange2Response;
    });

    const client = new Route53UpdateClient("FAKE_KEY_ID", "FAKE_KEY_SECRET");
    const resultPromise = client.updateZoneRecords([
      {
        zoneId: "TEST_ID_1",
        records: [
          {
            Name: "sub1.test1.tld.",
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
            Name: "test2.tld.",
            Type: "A",
            ResourceRecords: [
              {
                Value: "10.10.10.10",
              },
            ],
          },
        ],
      },
    ]);

    // jest.runAllTicks()
    // jest.runAllTicks()
    // jest.runOnlyPendingTimers()
    // jest.setSystemTime(new Date(mockStartDate.getTime() + CHANGE_INSYNC_LIMIT_MS + 1))
    // jest.runAllTicks()
    // dateSpy.mockReturnValue(mockStartDate.getTime() + CHANGE_INSYNC_LIMIT_MS + 1)
    const result = await resultPromise;

    expect(result.get("TEST_ID_1")).toEqual(true);
    expect(result.get("TEST_ID_2")).toEqual(false);
    expect(mockRoute53.prototype.changeResourceRecordSets).toHaveBeenNthCalledWith(1, {
      HostedZoneId: "TEST_ID_1",
      ChangeBatch: {
        Changes: [
          {
            Action: "UPSERT",
            ResourceRecordSet: {
              Name: "sub1.test1.tld.",
              Type: "A",
              ResourceRecords: [
                {
                  Value: "10.10.10.10",
                },
              ],
            },
          },
        ],
      },
    });
    expect(mockRoute53.prototype.changeResourceRecordSets).toHaveBeenNthCalledWith(2, {
      HostedZoneId: "TEST_ID_2",
      ChangeBatch: {
        Changes: [
          {
            Action: "UPSERT",
            ResourceRecordSet: {
              Name: "test2.tld.",
              Type: "A",
              ResourceRecords: [
                {
                  Value: "10.10.10.10",
                },
              ],
            },
          },
        ],
      },
    });
  });
});
