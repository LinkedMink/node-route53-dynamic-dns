import { ConfigKey } from "./constant/config-key.mjs";
import { EnvironmentConfig } from "./environment/environment-config.mjs";
import { initializeLogging } from "./environment/logger.mjs";
import { IntervalPublicIpEventEmitter } from "./event-handlers/public-ip-event-emitter.mjs";
import {
  handlePublicIpForServer,
  handleHostRecordsForServer,
  startHttpHealthCheckServer,
} from "./event-handlers/health-check-server.mjs";
import { HostRecordUpdatedEvent, PublicIpCheckedEvent } from "./constant/events.mjs";
import { PublicIpEventEmitter } from "./types/public-ip.mjs";
import { Route53HostRecordUpdater } from "./event-handlers/route53-host-record-updater.mjs";
import { HostRecordEventEmitter } from "./types/host-record.mjs";

const config = new EnvironmentConfig();
const logger = initializeLogging(config);

logger.verbose("Initializing");

const client: PublicIpEventEmitter = new IntervalPublicIpEventEmitter(
  config.getNumber(ConfigKey.CheckIntervalSeconds) * 1000
);
client.on(PublicIpCheckedEvent, handlePublicIpForServer);

const route53Updater: HostRecordEventEmitter = new Route53HostRecordUpdater(
  config.getJson(ConfigKey.HostsToUpdate)
);
client.on(PublicIpCheckedEvent, route53Updater.handlePublicIpUpdate);

route53Updater.on(HostRecordUpdatedEvent, handleHostRecordsForServer);

client.start();
await startHttpHealthCheckServer(config.getNumber(ConfigKey.Port));

logger.verbose("Initialized");
