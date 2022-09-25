import type EventEmitter from "events";
import type { PublicIpCheckedEvent } from "../constants/events.mjs";

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
  start(): AsyncGenerator<PublicIpState>;
  on(eventName: typeof PublicIpCheckedEvent, listener: PublicIpEventHandler): this;
}
