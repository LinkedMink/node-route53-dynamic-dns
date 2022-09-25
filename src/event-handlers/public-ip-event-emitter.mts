import EventEmitter from "events";
import { IpNotFoundError, publicIpv4, publicIpv6 } from "public-ip";
import { setInterval } from "timers/promises";
import { PublicIpCheckedEvent } from "../constants/events.mjs";
import { loggerForModuleUrl } from "../environment/logger.mjs";
import { formatError } from "../functions/format.mjs";
import { PublicIpEventEmitter, PublicIpState } from "../types/public-ip-events.mjs";

export class PublicIpClient extends EventEmitter implements PublicIpEventEmitter {
  private readonly logger = loggerForModuleUrl(import.meta.url);

  constructor(readonly updateIntervalMs: number) {
    super();
  }

  async *start(): AsyncGenerator<PublicIpState> {
    for await (const _ of setInterval(this.updateIntervalMs)) {
      const state = await this.updatePublicIpState();
      yield state;
    }
  }

  private updatePublicIpState = async (): Promise<PublicIpState> => {
    this.logger.debug("Getting latest public IP");
    const [ipV4, ipV6] = await Promise.all([this.getPublicIpV4(), this.getPublicIpV6()]);

    const state: PublicIpState = {
      publicIpAddresses: {
        v4: ipV4,
        v6: ipV6,
      },
      lastPublicIpDateTime: new Date(),
    };

    this.logger.info(`Emitting public IPs to check: v4=${ipV4}, v6=${ipV6}`);

    this.emit(PublicIpCheckedEvent, state);
    return state;
  };

  private getPublicIpV4 = async (): Promise<string | null> => {
    try {
      return await publicIpv4();
    } catch (error: unknown) {
      this.logIpError(error, "V4");
      return null;
    }
  };

  private getPublicIpV6 = async (): Promise<string | null> => {
    try {
      return await publicIpv6();
    } catch (error: unknown) {
      this.logIpError(error, "V6");
      return null;
    }
  };

  private logIpError = (error: unknown, version: string): void => {
    if (error instanceof IpNotFoundError) {
      this.logger.verbose(
        `Could not determine IP ${version}. It may not be assigned, or this may indicate another problem (no internet access, etc.)`
      );
    } else {
      this.logger.error(formatError(error));
    }
  };
}
