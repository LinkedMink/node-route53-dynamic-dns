import path from "path";
import { PublicIpClient } from "../../src/event-handlers/public-ip-event-emitter.mjs";

describe(path.basename(__filename, ".test.ts"), () => {
  test("should construct", () => {
    const result = new PublicIpClient(10000, 1000, true);

    expect(result).toBeTruthy();
  });
});
