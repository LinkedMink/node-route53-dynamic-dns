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

  constructor(private readonly client: DnsZoneRecordClient) {
    super();
  }

  /**
   * Get the initial state of the zones and DNS records to cache their IP and IDs for quicker lookups
   */
  initialize = async (hostNamesToUpdate: string[]): Promise<void> => {
    this.zoneRecordSets = await this.client.getZoneRecords(hostNamesToUpdate);

    this.logger.verbose(`Initialized with zones: ${this.zoneRecordSets.length}`);
    this.emit(HostRecordsRetrievedEvent, this.getHostRecordState());
  };

  handlePublicIpUpdate = async (event: PublicIpState) => {
    const publicIpV4 = event.publicIpAddresses.v4;
    const publicIpV6 = event.publicIpAddresses.v6;
    if (this.lastIpUpdated?.v4 === publicIpV4 && this.lastIpUpdated?.v6 === publicIpV6) {
      this.logger.verbose("IP addresses not change, do not update records");
      return;
    }

    this.logger.verbose("Starting update for each zone");

    const toUpdateZoneRecords = this.zoneRecordSets.map(z => ({
      zoneId: z.zoneId,
      records: z.records.map(s => {
        if (s.Type === "A") {
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

    this.lastIpUpdated = event.publicIpAddresses;
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
