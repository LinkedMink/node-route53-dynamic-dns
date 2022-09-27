import { loggerForModuleUrl } from "../environment/logger.mjs";
import { DnsRecordSetSource } from "../types/dns-record-events.mjs";
import { DnsZoneRecordClient } from "../types/dns-zone-record-client.mjs";
import { IpAddresses, PublicIpState } from "../types/public-ip-events.mjs";

export class Route53AddressRecordUpdater {
  private readonly logger = loggerForModuleUrl(import.meta.url);

  private lastIpUpdated: IpAddresses | null = null;
  private pendingUpdate: Promise<void> | null = null;
  private eventDuringUpdate: PublicIpState | null = null;

  constructor(
    private readonly client: DnsZoneRecordClient,
    private readonly recordSource: DnsRecordSetSource
  ) {}

  /**
   * When the public IP changes, check if any host records have an out of date ip. If they do, start an update for each out of
   * date record and wait for the change to synchronize. The AWS service updates the records asynchronously.
   * @param event The event emitted when the public IP address has changed
   * @returns Resolve when the host records have been checked and updated if necessary. If there's an update in progress, set the
   * event to process later and resolve immediately. We may get multiple update events while a synchronization is in progress, we
   * only want to use the latest IP to make the public IP update independent of the host record update without queuing events that
   * won't be relevant anymore.
   */
  handlePublicIpUpdate = (event: PublicIpState): void => {
    if (this.pendingUpdate) {
      this.logger.debug("Pending update in progress, defer update until finished");
      this.eventDuringUpdate = event;
      return;
    }

    this.pendingUpdate = this.updateRecordsIfOutdated(event.publicIpAddresses);

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

    const currentRecordSets = await this.recordSource.getRecords();
    const updateZoneRecords = currentRecordSets
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

    if (updateZoneRecords.length <= 0) {
      this.logger.verbose(
        `No outdated records, no update applied for IPs: v4=${publicIp.v4}, v6=${publicIp.v6}`
      );
      this.lastIpUpdated = publicIp;
      return;
    }

    this.logger.info(
      `Starting update for each outdated zone: zones=${updateZoneRecords.length}, v4=${publicIp.v4}, v6=${publicIp.v6}`
    );
    const statusMap = await this.client.updateZoneRecords(updateZoneRecords);

    this.recordSource.updateRecordsAfterSync(updateZoneRecords, statusMap);

    this.lastIpUpdated = publicIp;
  };
}
