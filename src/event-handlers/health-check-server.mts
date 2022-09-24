import http, { Http2Server, Http2ServerRequest, Http2ServerResponse } from "http2";
import { getLogger } from "../environment/logger.mjs";
import { HostRecordState } from "../types/host-record.mjs";
import { PublicIpState } from "../types/public-ip.mjs";
import { HealthCheckResponse, HealthCheckState } from "../types/response.mjs";

const state: HealthCheckState = {
  publicIpAddresses: {},
  lastCheckDateTime: new Date(),
  lastUpdateDateTime: null,
  hostRecords: null,
};

export const handleHostRecordsForServer = (event: HostRecordState) => {
  state.hostRecords = event.hostRecordsUpdated;
  state.lastUpdateDateTime = event.lastUpdateDateTime;
};

export const handlePublicIpForServer = (event: PublicIpState) => {
  state.publicIpAddresses = event.publicIpAddresses;
  state.lastCheckDateTime = event.lastCheckDateTime;
};

export const startHttpHealthCheckServer = async (port: number): Promise<Http2Server> => {
  const startDateTime = new Date();
  const logger = getLogger(import.meta.url);

  logger.verbose(`Health check server starting on port: ${port}`);

  const healthCheckHandler = (req: Http2ServerRequest, res: Http2ServerResponse) => {
    logger.http(`Handling health check from: ${req.socket.remoteAddress}`);

    const responseData: HealthCheckResponse = {
      publicIpAddresses: state.publicIpAddresses,
      lastUpdateDateTime: state.lastUpdateDateTime?.toISOString() || null,
      lastCheckDateTime: state.lastCheckDateTime.toISOString(),
      hostRecords: state.hostRecords,
      uptimeMs: Date.now() - startDateTime.getTime(),
    };

    res.end(JSON.stringify(responseData));
  };

  const server = http.createServer(healthCheckHandler);
  await new Promise<void>((resolve, _reject) => {
    server.listen(port, resolve);
  });

  logger.info(`Health check server listening on port: ${port}`);

  return server;
};
