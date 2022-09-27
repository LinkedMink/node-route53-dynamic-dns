#!/usr/bin/env node

import chalk from "chalk";
import { v4 as uuidV4 } from "uuid";
import { ConfigKey } from "./constants/config.mjs";
import { EnvironmentConfig } from "./environment/environment-config.mjs";
import { initializeLogging } from "./environment/logger.mjs";
import { validateNormalizeDnsRecord } from "./functions/validate.mjs";
import { Route53UpdateClient } from "./services/route53-update-client.mjs";
import { DnsZoneRecordClient } from "./types/dns-zone-record-client.mjs";

const POLICY_JSON_VERSION = "2012-10-17";
const ROUTE53_ARN_PREFIX = "arn:aws:route53:::";

const config = new EnvironmentConfig();
const logger = initializeLogging(config);

const awsAccessKeyId = config.getString(ConfigKey.AwsAccessKeyId);
const awsAccessKeySecret = config.getString(ConfigKey.AwsAccessKeySecret);
const route53Client: DnsZoneRecordClient = new Route53UpdateClient(
  awsAccessKeyId,
  awsAccessKeySecret
);

logger.verbose(`Get accessible DNS zone's for access key ID: ${awsAccessKeyId}`);

const inputHostnames = config.getJson<string[]>(ConfigKey.HostnamesToUpdate);
const dnsRecords = inputHostnames.map(validateNormalizeDnsRecord);
const zoneIds = await route53Client.getZonesForDnsRecords(dnsRecords);

if (zoneIds.size <= 0) {
  throw new Error(`No zones were found matching the input record: ${dnsRecords.toString()}`);
}

logger.verbose(
  `Found zone ID's matching hostnames: ${JSON.stringify(Array.from(zoneIds), null, 2)}`
);

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

const listZoneResources = Array.from(zoneIds.keys()).map(zoneIdToArn);
const policyObject = {
  Version: POLICY_JSON_VERSION,
  Id: uuidV4(),
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

console.log(chalk.underline.green("Output JSON:"));
console.log(JSON.stringify(policyObject, null, 2));
