import type EventEmitter from "events";
import type { PublicIpCheckedEvent } from "../constant/events.mjs";

export interface IpAddresses {
  v4?: string;
  v6?: string;
}

export interface PublicIpState {
  publicIpAddresses: IpAddresses;
  lastCheckDateTime: Date;
}

export type PublicIpEventHandler = (event: PublicIpState) => void;

export interface PublicIpEventEmitter extends EventEmitter {
  start(): AsyncGenerator<PublicIpState>;
  on(eventName: typeof PublicIpCheckedEvent, listener: PublicIpEventHandler): this;
}
