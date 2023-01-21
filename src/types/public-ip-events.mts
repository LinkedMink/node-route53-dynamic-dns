import type EventEmitter from "node:events";
import type { PublicIpEvent } from "../constants/events.mjs";

export interface IpAddresses {
  v4: string | null;
  v6: string | null;
}

export interface PublicIpState {
  publicIpAddresses: IpAddresses;
  lastPublicIpDateTime: Date;
}

export type PublicIpEventHandler = (event: PublicIpState) => void;

export interface PublicIpEventEmitter extends EventEmitter {
  start(): Promise<void>;
  on(eventName: PublicIpEvent, listener: PublicIpEventHandler): this;
}
