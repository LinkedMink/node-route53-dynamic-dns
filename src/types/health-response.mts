import type { HostRecord } from "./host-record-events.mjs";
import type { IpAddresses } from "./public-ip-events.mjs";

export interface HealthCheckResponse {
  publicIpAddresses: IpAddresses | null;
  lastPublicIpDateTime: string | null;
  lastUpdateDateTime: string | null;
  hostRecords: HostRecord[] | null;
  uptimeMs: number;
}
