import type { DnsAddressRecord } from "./dns-record-events.mjs";
import type { IpAddresses } from "./public-ip-events.mjs";

export interface HealthCheckResponse {
  publicIpAddresses: IpAddresses | null;
  lastPublicIpDateTime: string | null;
  lastUpdateDateTime: string | null;
  dnsRecords: DnsAddressRecord[] | null;
  uptimeMs: number;
}
