import { jest } from "@jest/globals";
import { mock } from "jest-mock-extended";
import { createServer, IncomingMessage, RequestListener, Server, ServerResponse } from "node:http";
import path from "node:path";
import { HealthCheckServer } from "../../src/event-handlers/health-check-server.mjs";
import { DnsAddressRecordState } from "../../src/types/dns-record-events.mjs";
import { PublicIpState } from "../../src/types/public-ip-events.mjs";

jest.mock("node:http");

describe(path.basename(__filename, ".test.ts"), () => {
  test("should start HTTP server and listen when start() called", async () => {
    const mockServer = mock<Server>();
    mockServer.listen.mockImplementation(((
      _port: number,
      _hostname: string,
      resolve: () => void
    ) => {
      resolve();
      return mockServer;
    }) as unknown as typeof mockServer.listen);
    const mockCreateServer = jest.mocked(createServer);
    mockCreateServer.mockReturnValue(mockServer);

    const server = new HealthCheckServer();
    await server.start(9080, "test.host.tld");

    expect(mockServer.listen).toHaveBeenCalledWith(9080, "test.host.tld", expect.anything());
  });

  test("should respond with DNS records when records retrieved event handled", async () => {
    const mockServer = mock<Server>();
    mockServer.listen.mockImplementation(((
      _port: number,
      _hostname: string,
      resolve: () => void
    ) => {
      resolve();
      return mockServer;
    }) as unknown as typeof mockServer.listen);
    const mockCreateServer = jest.mocked(createServer);
    let httpHandler: RequestListener = jest.fn();
    mockCreateServer.mockImplementation(handler => {
      httpHandler = handler as RequestListener;
      return mockServer;
    });
    const mockRequest = mock<IncomingMessage>();
    const mockResponse = mock<ServerResponse>();
    const mockEvent: DnsAddressRecordState = {
      dnsRecords: [
        {
          name: "test.host.tld",
          type: "A",
          value: "10.10.10.10",
        },
      ],
      lastChangeDateTime: new Date(),
    };

    const server = new HealthCheckServer();
    await server.start(9080, "test.host.tld");
    server.handleRecordsRetrievedEvent(mockEvent);
    httpHandler(mockRequest, mockResponse);

    expect(mockResponse.end).toHaveBeenCalledWith(
      expect.stringContaining('"name":"test.host.tld","type":"A","value":"10.10.10.10"')
    );
  });

  test("should respond with DNS records and update time when records updated event handled", async () => {
    const mockServer = mock<Server>();
    mockServer.listen.mockImplementation(((
      _port: number,
      _hostname: string,
      resolve: () => void
    ) => {
      resolve();
      return mockServer;
    }) as unknown as typeof mockServer.listen);
    const mockCreateServer = jest.mocked(createServer);
    let httpHandler: RequestListener = jest.fn();
    mockCreateServer.mockImplementation(handler => {
      httpHandler = handler as RequestListener;
      return mockServer;
    });
    const mockRequest = mock<IncomingMessage>();
    const mockResponse = mock<ServerResponse>();
    const mockEvent: DnsAddressRecordState = {
      dnsRecords: [
        {
          name: "test.host.tld",
          type: "A",
          value: "10.10.10.10",
        },
      ],
      lastChangeDateTime: new Date(),
    };

    const server = new HealthCheckServer();
    await server.start(9080, "test.host.tld");
    server.handleRecordsUpdatedEvent(mockEvent);
    httpHandler(mockRequest, mockResponse);

    expect(mockResponse.end).toHaveBeenCalledWith(
      expect.stringContaining('"name":"test.host.tld","type":"A","value":"10.10.10.10"')
    );
    expect(mockResponse.end).toHaveBeenCalledWith(
      expect.stringContaining(
        `"lastUpdateDateTime":"${mockEvent.lastChangeDateTime.toISOString()}"`
      )
    );
  });

  test("should respond with public IP when IP updated event handled", async () => {
    const mockServer = mock<Server>();
    mockServer.listen.mockImplementation(((
      _port: number,
      _hostname: string,
      resolve: () => void
    ) => {
      resolve();
      return mockServer;
    }) as unknown as typeof mockServer.listen);
    const mockCreateServer = jest.mocked(createServer);
    let httpHandler: RequestListener = jest.fn();
    mockCreateServer.mockImplementation(handler => {
      httpHandler = handler as RequestListener;
      return mockServer;
    });
    const mockRequest = mock<IncomingMessage>();
    const mockResponse = mock<ServerResponse>();
    const mockEvent: PublicIpState = {
      publicIpAddresses: {
        v4: "10.10.10.10",
        v6: null,
      },
      lastPublicIpDateTime: new Date(),
    };

    const server = new HealthCheckServer();
    await server.start(9080, "test.host.tld");
    server.handlePublicIpEvent(mockEvent);
    httpHandler(mockRequest, mockResponse);

    expect(mockResponse.end).toHaveBeenCalledWith(
      expect.stringContaining('"publicIpAddresses":{"v4":"10.10.10.10","v6":null}')
    );
    expect(mockResponse.end).toHaveBeenCalledWith(
      expect.stringContaining(
        `"lastPublicIpDateTime":"${mockEvent.lastPublicIpDateTime.toISOString()}"`
      )
    );
  });
});
