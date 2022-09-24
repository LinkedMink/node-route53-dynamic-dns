import type EventEmitter from "events";
import type { HostRecordUpdatedEvent } from "../constant/events.mjs";
import type { PublicIpEventHandler } from "./public-ip.mjs";

export interface HostRecord {
  value: string;
}

export interface HostRecordState {
  hostRecordsUpdated: HostRecord[];
  lastUpdateDateTime: Date;
}

export type HostRecordUpdatedEventHandler = (event: HostRecordState) => void;

export interface HostRecordEventEmitter extends EventEmitter {
  handlePublicIpUpdate: PublicIpEventHandler;
  on(eventName: typeof HostRecordUpdatedEvent, listener: HostRecordUpdatedEventHandler): this;
}
