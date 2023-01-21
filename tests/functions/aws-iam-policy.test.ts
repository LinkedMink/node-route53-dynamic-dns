import path from "node:path";
import { createRoute53PolicyForZones } from "../../src/functions/aws-iam-policy.mjs";

describe(path.basename(__filename, ".test.ts"), () => {
  test("should return policy object when called with valid data", () => {
    const input = new Map<string, string[]>([
      ["/hostedzone/Z10954171IY44R8NIL2H", ["sub1.test1.tld.", "sub2.test1.tld."]],
      ["/hostedzone/Z20954171IY44R8NIL2H", ["\\100.test2.tld."]],
    ]);

    const result = createRoute53PolicyForZones(input);

    const expected: ReturnType<typeof createRoute53PolicyForZones> = {
      Version: "2012-10-17",
      Id: expect.stringMatching(/[0-9a-z]{8}-[0-9a-z]{4}-[0-9a-z]{4}-[0-9a-z]{4}-[0-9a-z]{12}/),
      Statement: expect.arrayContaining([
        {
          Effect: "Allow",
          Action: ["route53:ListHostedZones", "route53:GetChange"],
          Resource: ["*"],
        },
        {
          Effect: "Allow",
          Action: ["route53:ListResourceRecordSets"],
          Resource: [
            "arn:aws:route53:::hostedzone/Z10954171IY44R8NIL2H",
            "arn:aws:route53:::hostedzone/Z20954171IY44R8NIL2H",
          ],
        },
        {
          Effect: "Allow",
          Action: ["route53:ChangeResourceRecordSets"],
          Condition: {
            "ForAllValues:StringEquals": {
              "route53:ChangeResourceRecordSetsNormalizedRecordNames": [
                "sub1.test1.tld",
                "sub2.test1.tld",
              ],
              "route53:ChangeResourceRecordSetsRecordTypes": ["A", "AAAA"],
              "route53:ChangeResourceRecordSetsActions": ["UPSERT"],
            },
          },
          Resource: ["arn:aws:route53:::hostedzone/Z10954171IY44R8NIL2H"],
        },
        {
          Effect: "Allow",
          Action: ["route53:ChangeResourceRecordSets"],
          Condition: {
            "ForAllValues:StringEquals": {
              "route53:ChangeResourceRecordSetsNormalizedRecordNames": ["\\100.test2.tld"],
              "route53:ChangeResourceRecordSetsRecordTypes": ["A", "AAAA"],
              "route53:ChangeResourceRecordSetsActions": ["UPSERT"],
            },
          },
          Resource: ["arn:aws:route53:::hostedzone/Z20954171IY44R8NIL2H"],
        },
      ]),
    };
    expect(result).toEqual(expect.objectContaining(expected));
  });
});
