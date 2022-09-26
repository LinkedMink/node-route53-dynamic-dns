import type EventEmitter from "events";
import type { HostRecordsRetrievedEvent, HostRecordsUpdatedEvent } from "../constants/events.mjs";
import type { DnsHostRecordType } from "./dns-zone-record-client.mjs";
import type { PublicIpEventHandler } from "./public-ip-events.mjs";

export interface HostRecord {
  name: string;
  type: DnsHostRecordType;
  value: string;
}

export interface HostRecordState {
  hostRecords: HostRecord[];
  lastUpdateDateTime: Date;
}

export type HostRecordUpdatedEventHandler = (event: HostRecordState) => void;

export interface HostRecordEventEmitter extends EventEmitter {
  initialize(dnsRecordsToUpdate: string[]): Promise<void>;
  handlePublicIpUpdate: PublicIpEventHandler;
  on(eventName: typeof HostRecordsRetrievedEvent, listener: HostRecordUpdatedEventHandler): this;
  on(eventName: typeof HostRecordsUpdatedEvent, listener: HostRecordUpdatedEventHandler): this;
}
