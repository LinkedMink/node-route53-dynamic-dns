import { randomUUID } from "crypto";

const POLICY_JSON_VERSION = "2012-10-17";
const ROUTE53_ARN_PREFIX = "arn:aws:route53:::";

const zoneIdToArn = (id: string) => ROUTE53_ARN_PREFIX + id.substring(1);

const getAllowChangeResourceRecordSets = (zoneId: string, recordNames: string[]) => ({
  Effect: "Allow",
  Action: ["route53:ChangeResourceRecordSets"],
  Condition: {
    "ForAllValues:StringEquals": {
      "route53:ChangeResourceRecordSetsNormalizedRecordNames": recordNames.map(r =>
        r.endsWith(".") ? r.substring(0, r.length - 1) : r
      ),
      "route53:ChangeResourceRecordSetsRecordTypes": ["A", "AAAA"],
      "route53:ChangeResourceRecordSetsActions": ["UPSERT"],
    },
  },
  Resource: [zoneIdToArn(zoneId)],
});

export const createRoute53PolicyForZones = (zoneIds: Map<string, string[]>) => {
  const listZoneResources = Array.from(zoneIds.keys()).map(zoneIdToArn);
  return {
    Version: POLICY_JSON_VERSION,
    Id: randomUUID(),
    Statement: [
      {
        Effect: "Allow",
        Action: ["route53:ListHostedZones", "route53:GetChange"],
        Resource: ["*"],
      },
      {
        Effect: "Allow",
        Action: ["route53:ListResourceRecordSets"],
        Resource: listZoneResources,
      },
      ...Array.from(zoneIds).map(([zoneArn, hostNames]) =>
        getAllowChangeResourceRecordSets(zoneArn, hostNames)
      ),
    ],
  };
};
