import { Command } from "commander";
import { ConfigKey } from "../constants/config.mjs";
import { PublicIpEvent, DnsRecordsEvent } from "../constants/events.mjs";
import { PACKAGE_VERSION } from "../constants/version.mjs";
import { EnvironmentConfig } from "../environment/environment-config.mjs";
import { initializeLogging } from "../environment/logger.mjs";
import { HealthCheckServer } from "../event-handlers/health-check-server.mjs";
import { PublicIpClient } from "../event-handlers/public-ip-event-emitter.mjs";
import { Route53AddressRecordUpdater } from "../event-handlers/route53-address-record-updater.mjs";
import { createDnsRecordSetSource } from "../services/dns-record-set-source.mjs";
import { Route53UpdateClient } from "../services/route53-update-client.mjs";
import { DnsZoneRecordClient } from "../types/dns-zone-record-client.mjs";
import { PublicIpEventEmitter } from "../types/public-ip-events.mjs";

export default (config: EnvironmentConfig) => {
  const main = async () => {
    const logger = initializeLogging(config);

    logger.info("Initializing App");

    const awsAccessKeyId = config.getString(ConfigKey.AwsAccessKeyId);
    const awsAccessKeySecret = config.getString(ConfigKey.AwsAccessKeySecret);
    const route53Client: DnsZoneRecordClient = new Route53UpdateClient(
      awsAccessKeyId,
      awsAccessKeySecret
    );

    const inputHostnames = config.getJson<string[]>(ConfigKey.HostnamesToUpdate);
    const isCachedRecordsEnabled = config.getBool(ConfigKey.CacheDnsRecords);
    const dnsRecordSetSource = createDnsRecordSetSource(
      route53Client,
      isCachedRecordsEnabled,
      inputHostnames
    );

    const route53Updater = new Route53AddressRecordUpdater(route53Client, dnsRecordSetSource);

    const ipUpdateInterval = config.getNumber(ConfigKey.IpCheckIntervalSeconds) * 1000;
    const ipUpdateTimeout = config.getNumber(ConfigKey.IpCheckTimeoutMs);
    const isIpV6Enabled = config.getBool(ConfigKey.IpV6Enabled);
    const publicIpClient: PublicIpEventEmitter = new PublicIpClient(
      ipUpdateInterval,
      ipUpdateTimeout,
      isIpV6Enabled
    );
    publicIpClient.on(PublicIpEvent.Retrieved, route53Updater.handlePublicIpUpdate);

    const port = config.getNumberOrNull(ConfigKey.BindPort);
    if (port !== null) {
      const healthCheckServer = new HealthCheckServer();
      dnsRecordSetSource.on(DnsRecordsEvent.Retrieved, healthCheckServer.handleHostRecordsEvent);
      dnsRecordSetSource.on(DnsRecordsEvent.Updated, healthCheckServer.handleHostRecordsEvent);
      publicIpClient.on(PublicIpEvent.Retrieved, healthCheckServer.handlePublicIpEvent);

      const host = config.getStringOrNull(ConfigKey.BindHost);
      await healthCheckServer.start(port, host !== null ? host : undefined);
    }

    void publicIpClient.start();

    logger.verbose("Initialized App");
  };

  return new Command("service")
    .version(PACKAGE_VERSION)
    .description(
      "This will run the background process that updates host records from your public IP until it's terminated"
    )
    .action(main);
};
