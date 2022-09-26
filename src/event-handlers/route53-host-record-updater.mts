import EventEmitter from "events";
import { HostRecordsRetrievedEvent, HostRecordsUpdatedEvent } from "../constants/events.mjs";
import { loggerForModuleUrl } from "../environment/logger.mjs";
import { DnsZoneRecordClient, DnsZoneRecordSets } from "../types/dns-zone-record-client.mjs";
import { HostRecordEventEmitter, HostRecordState } from "../types/host-record-events.mjs";
import { IpAddresses, PublicIpState } from "../types/public-ip-events.mjs";

export class Route53HostRecordUpdater extends EventEmitter implements HostRecordEventEmitter {
  private readonly logger = loggerForModuleUrl(import.meta.url);

  private lastIpUpdated: IpAddresses | null = null;
  private zoneRecordSets: DnsZoneRecordSets[] = [];
  private pendingUpdate: Promise<void> | null = null;
  private eventDuringUpdate: PublicIpState | null = null;

  constructor(private readonly client: DnsZoneRecordClient) {
    super();
  }

  /**
   * Get the initial state of the zones and DNS records to cache their IP and IDs for quicker lookups
   * @param dnsRecordsToUpdate Search all zones and records the AWS account has access for hostnames that match
   * @returns Resolve when matching zones and host records have been cached
   */
  initialize = async (dnsRecordsToUpdate: string[]): Promise<void> => {
    this.zoneRecordSets = await this.client.getZoneRecords(dnsRecordsToUpdate);

    this.logger.verbose(`Initialized with zones: ${this.zoneRecordSets.length}`);
    this.emit(HostRecordsRetrievedEvent, this.getHostRecordState());
  };

  /**
   * When the public IP changes, check if any host records have an out of date ip. If they do, start an update for each out of
   * date record and wait for the change to synchronize. The AWS service updates the records asynchronously.
   * @param event The event emitted when the public IP address has changed
   * @returns Resolve when the host records have been checked and updated if necessary. If there's an update in progress, set the
   * event to process later and resolve immediately. We may get multiple update events while a synchronization is in progress, we
   * only want to use the latest IP to make the public IP update independent of the host record update without queuing events that
   * won't be relevant anymore.
   */
  handlePublicIpUpdate = async (event: PublicIpState): Promise<void> => {
    if (this.pendingUpdate) {
      this.logger.debug("Pending update in progress, defer update until finished");
      this.eventDuringUpdate = event;
      return;
    }

    this.pendingUpdate = this.updateRecordsIfOutdated(event.publicIpAddresses);
    await this.pendingUpdate;
    this.pendingUpdate = null;

    if (this.eventDuringUpdate) {
      const eventPending = this.eventDuringUpdate;
      this.eventDuringUpdate = null;
      void this.handlePublicIpUpdate(eventPending);
    }
  };

  private updateRecordsIfOutdated = async (publicIp: IpAddresses): Promise<void> => {
    if (this.lastIpUpdated?.v4 === publicIp.v4 && this.lastIpUpdated?.v6 === publicIp.v6) {
      this.logger.verbose("IP addresses not change, do not update records");
      return;
    }

    const toUpdateZoneRecords = this.zoneRecordSets
      .filter(z =>
        z.records.some(
          s =>
            (s.Type === "A" && s.ResourceRecords.some(r => r.Value !== publicIp.v4)) ||
            (s.Type === "AAAA" && s.ResourceRecords.some(r => r.Value !== publicIp.v6))
        )
      )
      .map(z => ({
        zoneId: z.zoneId,
        records: z.records.map(s => {
          if (s.Type === "A") {
            const publicIpV4 = publicIp.v4;
            if (!publicIpV4) {
              this.logger.warn(`No public IPv4 skipping update for record: ${s.Type} ${s.Name}`);
              return { ...s };
            }

            return {
              ...s,
              ResourceRecords: s.ResourceRecords?.map(_r => ({ Value: publicIpV4 })),
            };
          }
          if (s.Type === "AAAA") {
            const publicIpV6 = publicIp.v6;
            if (!publicIpV6) {
              this.logger.warn(`No public IPv6 skipping update for record: ${s.Type} ${s.Name}`);
              return { ...s };
            }

            return {
              ...s,
              ResourceRecords: s.ResourceRecords?.map(_r => ({ Value: publicIpV6 })),
            };
          }

          return { ...s };
        }),
      }));

    if (toUpdateZoneRecords.length <= 0) {
      this.logger.verbose(
        `No outdated records, no update applied for IPs: v4=${publicIp.v4}, v6=${publicIp.v6}`
      );
      this.lastIpUpdated = publicIp;
      return;
    }

    this.logger.info(
      `Starting update for each outdated zone: zones=${toUpdateZoneRecords.length}, v4=${publicIp.v4}, v6=${publicIp.v6}`
    );
    const statusMap = await this.client.updateZoneRecords(toUpdateZoneRecords);

    this.zoneRecordSets = this.zoneRecordSets.map(z => {
      const hasSucceeded = statusMap.get(z.zoneId);
      if (hasSucceeded) {
        const updated = toUpdateZoneRecords.find(u => u.zoneId === z.zoneId);
        if (updated) {
          return { ...updated };
        }
      }

      return { ...z };
    });

    this.lastIpUpdated = publicIp;
    this.emit(HostRecordsUpdatedEvent, this.getHostRecordState());
  };

  private getHostRecordState = (): HostRecordState => {
    const hostRecords = this.zoneRecordSets.flatMap(z =>
      z.records.map(r => ({
        name: r.Name,
        type: r.Type,
        value: r.ResourceRecords[0].Value,
      }))
    );

    return {
      hostRecords,
      lastUpdateDateTime: new Date(),
    };
  };
}
