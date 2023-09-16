import { Change, ChangeStatus, Route53 } from "@aws-sdk/client-route-53";
import { setTimeout } from "node:timers/promises";
import { CHANGE_INSYNC_INTERVAL_MS, CHANGE_INSYNC_LIMIT_MS } from "../constants/behavior.mjs";
import { LogLevel } from "../constants/logging.mjs";
import { loggerForModuleUrl, logWhenEnabled } from "../environment/logger.mjs";
import { formatError } from "../functions/format.mjs";
import {
  DnsAddressRecordSet,
  DnsZoneRecordClient,
  DnsZoneRecordSets,
} from "../types/dns-zone-record-client.mjs";

const NO_REGION = "REGION";

export class Route53UpdateClient implements DnsZoneRecordClient {
  private readonly logger = loggerForModuleUrl(import.meta.url);
  private readonly client: Route53;

  constructor(awsAccessKeyId: string, awsAccessKeySecret: string) {
    this.client = new Route53({
      region: NO_REGION,
      credentials: {
        accessKeyId: awsAccessKeyId,
        secretAccessKey: awsAccessKeySecret,
      },
    });
  }

  getZoneRecords = async (dnsRecordsToMatch: string[]): Promise<DnsZoneRecordSets[]> => {
    this.logger.verbose(`Find matching records for DNS records: ${dnsRecordsToMatch.toString()}`);

    try {
      const zonesToUpdate = await this.getZonesForDnsRecords(dnsRecordsToMatch);
      const pendingRequest = Array.from(zonesToUpdate).map(([zoneId, dnsRecords]) => {
        return this.getRecordsForZone(zoneId, dnsRecords);
      });

      const matchedZoneRecords = await Promise.all(pendingRequest);

      this.logger.verbose(
        `Found matching zones for DNS records: count=${
          matchedZoneRecords.length
        }, records=${dnsRecordsToMatch.toString()}`
      );
      logWhenEnabled(
        this.logger,
        LogLevel.debug,
        () => `Zones and records found: ${JSON.stringify(matchedZoneRecords, null, 2)}`
      );

      return matchedZoneRecords;
    } catch (error: unknown) {
      this.logger.error(formatError(error));
      return [];
    }
  };

  updateZoneRecords = async (zoneRecords: DnsZoneRecordSets[]): Promise<Map<string, boolean>> => {
    this.logger.verbose(`Update records for zones: ${zoneRecords.length}`);

    const pendingRequest = zoneRecords.map(async z => {
      try {
        return await this.updateRecordsForZone(z);
      } catch (error: unknown) {
        this.logger.error(formatError(error));
        return { zoneId: z.zoneId, hasSucceeded: false };
      }
    });
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

  getZonesForDnsRecords = async (dnsRecordsToMatch: string[]): Promise<Map<string, string[]>> => {
    this.logger.http("listHostedZones request");
    const response = await this.client.listHostedZones({});

    if (!response.HostedZones) {
      throw new Error("listHostedZones no HostedZones in response");
    }

    const zones = response.HostedZones.filter(z => z.Id && z.Name).map(z => ({
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      id: z.Id!,
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      name: z.Name!,
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      isInZoneRegEx: new RegExp(`(${z.Name!.replace(".", "\\.")})$`),
    }));

    logWhenEnabled(this.logger, LogLevel.debug, () => {
      const zoneNames = zones.map(z => `id=${z.id}, name=${z.name}`).join("; ");
      return `Found zones: ${zoneNames}`;
    });

    const dnsRecords = dnsRecordsToMatch.map(h => h.trim());
    return dnsRecords.reduce((zoneIdToDnsRecords, nextDnsRecord) => {
      const zoneToUpdate = zones.find(z => z.isInZoneRegEx.test(nextDnsRecord));
      if (!zoneToUpdate) {
        this.logger.warn(`No zone matches the host name, it will be skipped: ${nextDnsRecord}`);
        return zoneIdToDnsRecords;
      }

      const dnsRecords = zoneIdToDnsRecords.get(zoneToUpdate.id);
      if (dnsRecords) {
        dnsRecords.push(nextDnsRecord);
      } else {
        zoneIdToDnsRecords.set(zoneToUpdate.id, [nextDnsRecord]);
      }

      return zoneIdToDnsRecords;
    }, new Map<string, string[]>());
  };

  private getRecordsForZone = async (
    zoneId: string,
    dnsRecords: string[]
  ): Promise<DnsZoneRecordSets> => {
    this.logger.http(`listResourceRecordSets request for zone: ${zoneId}`);
    const response = await this.client.listResourceRecordSets({ HostedZoneId: zoneId });

    if (!response.ResourceRecordSets) {
      throw new Error("listResourceRecordSets no ResourceRecordSets in response");
    }

    const dnsRecordSet = new Set(dnsRecords);
    const records = response.ResourceRecordSets.filter(
      rs => rs.Name && dnsRecordSet.has(rs.Name) && (rs.Type === "A" || rs.Type === "AAAA")
    ) as DnsAddressRecordSet[];

    logWhenEnabled(this.logger, LogLevel.debug, () => {
      const recordsString = JSON.stringify(records, null, 2);
      return `Found records for zone: zoneId=${zoneId}, ${recordsString}`;
    });

    const foundDnsRecords = new Set(records.map(r => r.Name));
    const missingDnsRecords = dnsRecords.filter(n => !foundDnsRecords.has(n));
    if (missingDnsRecords.length > 0) {
      this.logger.warn(
        `No host records were found in zone, they will be skipped: zoneId=${zoneId}, missing=${missingDnsRecords.toString()}`
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

    logWhenEnabled(
      this.logger,
      LogLevel.debug,
      () =>
        `Records updates for zone pending: changeId=${changeId}, ${JSON.stringify(
          zoneRecords,
          null,
          2
        )}`
    );

    const hasSucceeded = await this.getChangeStatusUntilInSync(
      changeId,
      response.ChangeInfo?.Status as ChangeStatus | undefined
    );

    return {
      zoneId: zoneRecords.zoneId,
      hasSucceeded,
    };
  };

  private getChangeStatusUntilInSync = async (
    changeId: string,
    status: ChangeStatus = "PENDING",
    startTime = Date.now()
  ): Promise<boolean> => {
    if (status === "INSYNC") {
      return true;
    } else if (Date.now() - startTime > CHANGE_INSYNC_LIMIT_MS) {
      this.logger.warn(
        `Change not in sync after time limit: id=${changeId}, limit=${CHANGE_INSYNC_LIMIT_MS}`
      );
      return false;
    }

    await setTimeout(CHANGE_INSYNC_INTERVAL_MS);

    this.logger.debug(`getChange request for ID: ${changeId}`);
    const response = await this.client.getChange({ Id: changeId });

    return this.getChangeStatusUntilInSync(
      changeId,
      response.ChangeInfo?.Status as ChangeStatus | undefined,
      startTime
    );
  };
}
