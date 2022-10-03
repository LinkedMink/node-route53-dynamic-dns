import path from "path";
import { isStringConvertable } from "../../src/functions/type-check.mjs";

describe(path.basename(__filename, ".test.ts"), () => {
  test("should return true when type has toString function", () => {
    const result = isStringConvertable(15);

    expect(result).toBe(true);
  });

  test("should return false when type missing toString function", () => {
    const result = isStringConvertable(null);

    expect(result).toBe(false);
  });
});
