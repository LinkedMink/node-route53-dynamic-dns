import chalk from "chalk";
import { Command } from "commander";
import { ConfigKey } from "../constants/config.js";
import { PACKAGE_VERSION } from "../constants/version.js";
import { EnvironmentConfig } from "../environment/environment-config.js";
import { initializeLogging } from "../environment/logger.js";
import { createRoute53PolicyForZones } from "../functions/aws-iam-policy.js";
import { validateNormalizeDnsRecord } from "../functions/validate.js";
import { Route53UpdateClient } from "../services/route53-update-client.js";
import { DnsZoneRecordClient } from "../types/dns-zone-record-client.js";

/**
 * @todo Add subcommands to write IAM policy to file or create user via AWS SDK
 */
export default (config: EnvironmentConfig) => {
  const main = async () => {
    const logger = initializeLogging(config);

    const route53Client: DnsZoneRecordClient = new Route53UpdateClient();

    logger.verbose("Get accessible DNS zone's");

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
