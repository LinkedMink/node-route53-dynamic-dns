import path from "path";
import { Route53UpdateClient } from "../../src/services/route53-update-client.mjs";

describe(path.basename(__filename, ".test.ts"), () => {
  test("should construct", () => {
    const result = new Route53UpdateClient("FAKE_KEY_ID", "FAKE_KEY_SECRET");

    expect(result).toBeTruthy();
  });
});
