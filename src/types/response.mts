import type { HostRecord } from "./host-record.mjs";
import type { IpAddresses } from "./public-ip.mjs";

export interface HealthCheckState {
  publicIpAddresses: IpAddresses;
  lastCheckDateTime: Date;
  lastUpdateDateTime: Date | null;
  hostRecords: HostRecord[] | null;
}

export interface HealthCheckResponse {
  publicIpAddresses: IpAddresses;
  lastCheckDateTime: string;
  lastUpdateDateTime: string | null;
  hostRecords: HostRecord[] | null;
  uptimeMs: number;
}
