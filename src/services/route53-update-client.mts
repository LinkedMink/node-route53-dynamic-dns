import { Change, ChangeStatus, Route53 } from "@aws-sdk/client-route-53";
import { setTimeout } from "timers/promises";
import { LogLevel } from "../constants/logging.mjs";
import { loggerForModuleUrl, logWhenEnabled } from "../environment/logger.mjs";
import {
  DnsHostRecordSet,
  DnsZoneRecordClient,
  DnsZoneRecordSets,
} from "../types/dns-zone-record-client.mjs";

const CHANGE_INSYNC_INTERVAL_MS = 15_000;
const CHANGE_INSYNC_LIMIT_MS = 5 * 60 * 1000;

export class Route53UpdateClient implements DnsZoneRecordClient {
  private readonly logger = loggerForModuleUrl(import.meta.url);
  private readonly client: Route53;

  constructor(awsAccessKeyId: string, awsAccessKeySecret: string) {
    this.client = new Route53({
      credentials: {
        accessKeyId: awsAccessKeyId,
        secretAccessKey: awsAccessKeySecret,
      },
    });
  }

  getZoneRecords = async (hostNamesToMatch: string[]): Promise<DnsZoneRecordSets[]> => {
    this.logger.verbose(`Find matching records for hostnames: ${hostNamesToMatch.toString()}`);
    const zonesToUpdate = await this.getZonesForHostNames(hostNamesToMatch);

    const pendingRequest = Array.from(zonesToUpdate).map(([zoneId, hostNames]) => {
      return this.getRecordsForZone(zoneId, hostNames);
    });

    const matchedZoneRecords = await Promise.all(pendingRequest);

    this.logger.verbose(
      `Found matching records for hostnames: count=${
        matchedZoneRecords.length
      }, host=${hostNamesToMatch.toString()}`
    );
    logWhenEnabled(
      this.logger,
      LogLevel.debug,
      () => `Zones and records found: ${JSON.stringify(matchedZoneRecords, null, 2)}`
    );

    return matchedZoneRecords;
  };

  updateZoneRecords = async (zoneRecords: DnsZoneRecordSets[]): Promise<Map<string, boolean>> => {
    this.logger.verbose(`Update records for zones: ${zoneRecords.length}`);
    const pendingRequest = zoneRecords.map(z => this.updateRecordsForZone(z));
    const statuses = await Promise.all(pendingRequest);

    logWhenEnabled(
      this.logger,
      LogLevel.debug,
      () => `Zones and records updated: ${JSON.stringify(statuses, null, 2)}`
    );

    return statuses.reduce(
      (statusMap, next) => statusMap.set(next.zoneId, next.hasSucceeded),
      new Map<string, boolean>()
    );
  };

  private getZonesForHostNames = async (
    hostNamesToMatch: string[]
  ): Promise<Map<string, string[]>> => {
    this.logger.http("listHostedZones request");
    const response = await this.client.listHostedZones({});

    if (!response.HostedZones) {
      throw new Error("listHostedZones no HostedZones in response");
    }

    const zones = response.HostedZones.map(z => ({
      id: z.Id ?? "",
      name: z.Name?.toLowerCase() ?? "",
    })).filter(z => z.id && z.name);

    logWhenEnabled(this.logger, LogLevel.debug, () => {
      const zoneNames = zones.map(z => `id=${z.id}, name=${z.name}`).join("; ");
      return `Found zones: ${zoneNames}`;
    });

    const hostNames = hostNamesToMatch.map(n => n.toLowerCase());
    return hostNames.reduce((zoneIdToHostNames, nextHostName) => {
      const zoneToUpdate = zones.find(z => nextHostName.endsWith(z.name));
      if (!zoneToUpdate) {
        this.logger.warn(`No zone matches the host name, it will be skipped: ${nextHostName}`);
        return zoneIdToHostNames;
      }

      const hostNames = zoneIdToHostNames.get(zoneToUpdate.id);
      if (hostNames) {
        hostNames.push(nextHostName);
      } else {
        zoneIdToHostNames.set(zoneToUpdate.id, [nextHostName]);
      }

      return zoneIdToHostNames;
    }, new Map<string, string[]>());
  };

  private getRecordsForZone = async (
    zoneId: string,
    hostNames: string[]
  ): Promise<DnsZoneRecordSets> => {
    this.logger.http(`listResourceRecordSets request for zone: ${zoneId}`);
    const response = await this.client.listResourceRecordSets({ HostedZoneId: zoneId });

    if (!response.ResourceRecordSets) {
      throw new Error("listResourceRecordSets no ResourceRecordSets in response");
    }

    const hostNameSet = new Set(hostNames);
    const records = response.ResourceRecordSets.filter(
      rs => rs.Name && hostNameSet.has(rs.Name) && (rs.Type === "A" || rs.Type === "AAAA")
    ) as DnsHostRecordSet[];

    logWhenEnabled(this.logger, LogLevel.debug, () => {
      const recordsString = JSON.stringify(records, null, 2);
      return `Found records for zone: zoneId=${zoneId}, ${recordsString}`;
    });

    const foundHostNames = new Set(records.map(r => r.Name));
    const missingHostNames = hostNames.filter(n => !foundHostNames.has(n));
    if (missingHostNames.length > 0) {
      this.logger.warn(
        `No host records were found in zone, they will be skipped: zoneId=${zoneId}, missing=${missingHostNames.toString()}`
      );
    }

    return { zoneId, records };
  };

  private updateRecordsForZone = async (
    zoneRecords: DnsZoneRecordSets
  ): Promise<{ zoneId: string; hasSucceeded: boolean }> => {
    const updates: Change[] = zoneRecords.records.map(r => ({
      Action: "UPSERT",
      ResourceRecordSet: r,
    }));

    this.logger.http(`changeResourceRecordSets request for zone: ${zoneRecords.zoneId}`);
    const response = await this.client.changeResourceRecordSets({
      HostedZoneId: zoneRecords.zoneId,
      ChangeBatch: { Changes: updates },
    });

    const changeId = response.ChangeInfo?.Id;
    if (!changeId) {
      throw new Error("changeResourceRecordSets no ChangeInfo.Id in response");
    }

    const hasSucceeded = await this.getChangeStatusUntilInSync(
      changeId,
      response.ChangeInfo?.Status
    );

    return {
      zoneId: zoneRecords.zoneId,
      hasSucceeded,
    };
  };

  private getChangeStatusUntilInSync = async (
    changeId: string,
    status: ChangeStatus | string | undefined = "PENDING",
    startTime = Date.now()
  ): Promise<boolean> => {
    if (status === "INSYNC") {
      return true;
    } else if (Date.now() - startTime > CHANGE_INSYNC_LIMIT_MS) {
      return false;
    }

    await setTimeout(CHANGE_INSYNC_INTERVAL_MS);
    const response = await this.client.getChange({ Id: changeId });

    return this.getChangeStatusUntilInSync(changeId, response.ChangeInfo?.Status, startTime);
  };
}
