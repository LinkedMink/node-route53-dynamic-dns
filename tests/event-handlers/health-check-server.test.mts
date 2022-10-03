import path from "path";
import { HealthCheckServer } from "../../src/event-handlers/health-check-server.mjs";

describe(path.basename(__filename, ".test.ts"), () => {
  test("should construct", () => {
    const result = new HealthCheckServer();

    expect(result).toBeTruthy();
  });
});
