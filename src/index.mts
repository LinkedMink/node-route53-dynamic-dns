import { ConfigKey } from "./constants/config.mjs";
import {
  HostRecordsRetrievedEvent,
  HostRecordsUpdatedEvent,
  PublicIpCheckedEvent,
} from "./constants/events.mjs";
import { EnvironmentConfig } from "./environment/environment-config.mjs";
import { initializeLogging } from "./environment/logger.mjs";
import { HealthCheckServer } from "./event-handlers/health-check-server.mjs";
import { PublicIpClient } from "./event-handlers/public-ip-event-emitter.mjs";
import { Route53HostRecordUpdater } from "./event-handlers/route53-host-record-updater.mjs";
import { Route53UpdateClient } from "./services/route53-update-client.mjs";
import { DnsZoneRecordClient } from "./types/dns-zone-record-client.mjs";
import { HostRecordEventEmitter } from "./types/host-record-events.mjs";
import { PublicIpEventEmitter } from "./types/public-ip-events.mjs";

const config = new EnvironmentConfig();
const logger = initializeLogging(config);

logger.verbose("Initializing Main");

const awsAccessKeyId = config.getString(ConfigKey.AwsAccessKeyId);
const awsAccessKeySecret = config.getString(ConfigKey.AwsAccessKeySecret);
const route53Client: DnsZoneRecordClient = new Route53UpdateClient(
  awsAccessKeyId,
  awsAccessKeySecret
);

const route53Updater: HostRecordEventEmitter = new Route53HostRecordUpdater(route53Client);

const ipUpdateInterval = config.getNumber(ConfigKey.CheckIntervalSeconds) * 1000;
const publicIpClient: PublicIpEventEmitter = new PublicIpClient(ipUpdateInterval);
publicIpClient.on(PublicIpCheckedEvent, route53Updater.handlePublicIpUpdate);

const port = config.getNumberOrNull(ConfigKey.BindPort);
if (port !== null) {
  const healthCheckServer = new HealthCheckServer();
  route53Updater.on(HostRecordsRetrievedEvent, healthCheckServer.handleHostRecordsEvent);
  route53Updater.on(HostRecordsUpdatedEvent, healthCheckServer.handleHostRecordsEvent);
  publicIpClient.on(PublicIpCheckedEvent, healthCheckServer.handlePublicIpEvent);

  const host = config.getStringOrNull(ConfigKey.BindHost);
  await healthCheckServer.start(port, host !== null ? host : undefined);
}

const hostnames = config.getJson<string[]>(ConfigKey.HostnamesToUpdate);
await route53Updater.initialize(hostnames);
publicIpClient.start();

logger.verbose("Initialized Main");
