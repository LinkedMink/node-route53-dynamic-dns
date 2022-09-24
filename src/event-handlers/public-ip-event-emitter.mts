import EventEmitter from "events";
import { publicIpv4, publicIpv6 } from "public-ip";
import { setInterval } from "timers/promises";
import { PublicIpCheckedEvent } from "../constant/events.mjs";
import { getLogger } from "../environment/logger.mjs";
import { IpAddresses, PublicIpEventEmitter, PublicIpState } from "../types/public-ip.mjs";

export class IntervalPublicIpEventEmitter extends EventEmitter implements PublicIpEventEmitter {
  private readonly logger = getLogger(import.meta.url);

  private _state: PublicIpState | null = null;
  public get state(): PublicIpState {
    if (!this._state) {
      throw new Error(`${IntervalPublicIpEventEmitter.name} has not been started`);
    }

    return this._state;
  }

  constructor(readonly updateIntervalMs: number) {
    super();
  }

  async *start(): AsyncGenerator<PublicIpState> {
    for await (const _ of setInterval(this.updateIntervalMs)) {
      const publicIpAddresses = await this.getPublicIpAddresses();
      const currentState: PublicIpState = {
        publicIpAddresses,
        lastCheckDateTime: new Date(),
      };
      this._state = currentState;
      this.emit(PublicIpCheckedEvent, currentState);
      yield currentState;
    }
  }

  private getPublicIpAddresses = async (): Promise<IpAddresses> => {
    this.logger.debug("Getting latest IP");
    const [ipV4, ipV6] = await Promise.all([publicIpv4(), publicIpv6()]);
    this.logger.info(`Getting latest IP - Finished: v4=${ipV4}, v6=${ipV6}`);

    return { v4: ipV4, v6: ipV6 };
  };
}
