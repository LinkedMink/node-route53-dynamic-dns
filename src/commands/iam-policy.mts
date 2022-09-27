import chalk from "chalk";
import { Command } from "commander";
import { ConfigKey } from "../constants/config.mjs";
import { PACKAGE_VERSION } from "../constants/version.mjs";
import { EnvironmentConfig } from "../environment/environment-config.mjs";
import { initializeLogging } from "../environment/logger.mjs";
import { createRoute53PolicyForZones } from "../functions/aws-iam-policy.mjs";
import { validateNormalizeDnsRecord } from "../functions/validate.mjs";
import { Route53UpdateClient } from "../services/route53-update-client.mjs";
import { DnsZoneRecordClient } from "../types/dns-zone-record-client.mjs";

/**
 * @todo Add subcommands to write IAM policy to file or create user via AWS SDK
 */
export default (config: EnvironmentConfig) => {
  const main = async () => {
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

    const policyObject = createRoute53PolicyForZones(zoneIds);

    console.log(chalk.underline.green("Output JSON:"));
    console.log(JSON.stringify(policyObject, null, 2));
  };

  return new Command("iam-policy")
    .version(PACKAGE_VERSION)
    .description("Generates an IAM policy for the configured hosted zones")
    .action(main);
};
