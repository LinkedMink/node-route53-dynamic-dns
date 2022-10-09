import path from "path";
import { PublicIpClient } from "../../src/event-handlers/public-ip-event-emitter.mjs";

/**
 * @todo not sure why 'public-ip' isn't being detected as ESM
 */

describe(path.basename(__filename, ".test.ts"), () => {
  test("should construct", () => {
    const result = new PublicIpClient(10000, 1000, true);

    expect(result).toBeTruthy();
  });
});
