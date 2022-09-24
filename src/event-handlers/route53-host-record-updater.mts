import EventEmitter from "events";
import { getLogger } from "../environment/logger.mjs";
import { HostRecordEventEmitter, HostRecordState } from "../types/host-record.mjs";
import { IpAddresses, PublicIpState } from "../types/public-ip.mjs";

export class Route53HostRecordUpdater extends EventEmitter implements HostRecordEventEmitter {
  private readonly logger = getLogger(import.meta.url);

  private _state: HostRecordState | null = null;
  private _lastIpChecked: IpAddresses | null = null;

  public get state(): HostRecordState {
    if (!this._state) {
      throw new Error(`${Route53HostRecordUpdater.name} has not been started`);
    }

    return this._state;
  }

  constructor(readonly hostNamesToUpdate: string[]) {
    super();
  }

  handlePublicIpUpdate = (_event: PublicIpState) => {
    if (
      this._lastIpChecked?.v4 === _event.publicIpAddresses.v4 &&
      this._lastIpChecked?.v6 === _event.publicIpAddresses.v6
    ) {
      this.logger.verbose("IP addresses not change, do not update records");
      return;
    }

    this.logger.info("Updating host records");
    throw new Error();
  };
}
