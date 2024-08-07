import type { DnsAddressRecord } from "./dns-record-events.js";
import type { IpAddresses } from "./public-ip-events.js";

export interface HealthCheckResponse {
  publicIpAddresses: IpAddresses | null;
  lastPublicIpDateTime: string | null;
  lastUpdateDateTime: string | null;
  dnsRecords: DnsAddressRecord[] | null;
  uptimeMs: number;
}
