import http, { Http2Server, Http2ServerRequest, Http2ServerResponse } from "http2";
import { loggerForModuleUrl } from "../environment/logger.mjs";
import { HostRecord, HostRecordState } from "../types/host-record-events.mjs";
import { IpAddresses, PublicIpState } from "../types/public-ip-events.mjs";
import { HealthCheckResponse } from "../types/health-response.mjs";

export class HealthCheckServer {
  private readonly logger = loggerForModuleUrl(import.meta.url);

  private startDateTime = new Date();
  private publicIpAddresses: IpAddresses | null = null;
  private lastPublicIpDateTime: Date | null = null;
  private lastUpdateDateTime: Date | null = null;
  private hostRecords: HostRecord[] | null = null;

  start = async (port: number, hostname?: string): Promise<Http2Server> => {
    this.startDateTime = new Date();

    this.logger.verbose(`Health check server starting on port: ${port}`);

    const server = http.createServer(this.handleHttpRequest);
    await new Promise<void>((resolve, _reject) => {
      server.listen(port, hostname, resolve);
    });

    this.logger.info(`Health check server listening on port: ${port}`);

    return server;
  };

  handleHostRecordsEvent = (event: HostRecordState) => {
    this.hostRecords = event.hostRecords;
    this.lastUpdateDateTime = event.lastUpdateDateTime;
  };

  handlePublicIpEvent = (event: PublicIpState) => {
    this.publicIpAddresses = event.publicIpAddresses;
    this.lastPublicIpDateTime = event.lastPublicIpDateTime;
  };

  private handleHttpRequest = (req: Http2ServerRequest, res: Http2ServerResponse) => {
    this.logger.http(`Handling health check from: ${req.socket.remoteAddress}`);

    const responseData: HealthCheckResponse = {
      publicIpAddresses: this.publicIpAddresses,
      lastUpdateDateTime: this.lastUpdateDateTime?.toISOString() || null,
      lastPublicIpDateTime: this.lastPublicIpDateTime?.toISOString() || null,
      hostRecords: this.hostRecords,
      uptimeMs: Date.now() - this.startDateTime.getTime(),
    };

    res.end(JSON.stringify(responseData));
  };
}
