import http, { Server, IncomingMessage, ServerResponse } from "http";
import { loggerForModuleUrl } from "../environment/logger.mjs";

import { IpAddresses, PublicIpState } from "../types/public-ip-events.mjs";
import { HealthCheckResponse } from "../types/health-response.mjs";
import { DnsAddressRecord, DnsAddressRecordState } from "../types/dns-record-events.mjs";

export class HealthCheckServer {
  private readonly logger = loggerForModuleUrl(import.meta.url);

  private startDateTime = new Date();
  private publicIpAddresses: IpAddresses | null = null;
  private lastPublicIpDateTime: Date | null = null;
  private lastUpdateDateTime: Date | null = null;
  private dnsRecords: DnsAddressRecord[] | null = null;

  start = async (port: number, hostname?: string): Promise<Server> => {
    this.startDateTime = new Date();

    this.logger.verbose(`Health check server starting: port=${port}, host=${hostname}`);

    const server = http.createServer(this.handleHttpRequest);
    await new Promise<void>((resolve, _reject) => {
      server.listen(port, hostname, resolve);
    });

    this.logger.info(`Health check server listening: ${port}, host=${hostname}`);

    return server;
  };

  handleHostRecordsEvent = (event: DnsAddressRecordState) => {
    this.dnsRecords = event.dnsRecords;
    this.lastUpdateDateTime = event.lastUpdateDateTime;
  };

  handlePublicIpEvent = (event: PublicIpState) => {
    this.publicIpAddresses = event.publicIpAddresses;
    this.lastPublicIpDateTime = event.lastPublicIpDateTime;
  };

  private handleHttpRequest = (req: IncomingMessage, res: ServerResponse) => {
    this.logger.http(`Handling health check from: ${req.socket.remoteAddress}`);

    const responseData: HealthCheckResponse = {
      publicIpAddresses: this.publicIpAddresses,
      lastUpdateDateTime: this.lastUpdateDateTime?.toISOString() || null,
      lastPublicIpDateTime: this.lastPublicIpDateTime?.toISOString() || null,
      dnsRecords: this.dnsRecords,
      uptimeMs: Date.now() - this.startDateTime.getTime(),
    };

    res.end(JSON.stringify(responseData));
  };
}
