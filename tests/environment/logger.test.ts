import { formatError } from "../../src/environment/logger.mjs";

describe(formatError.name, () => {
  test("should format as stack trace when type is error", () => {
    const error = new Error("TEST");

    const result = formatError(error);

    expect(result).toContain("logger.test.ts:5");
  });

  test("should format as string when type is string", () => {
    const error = "Text Error";

    const result = formatError(error);

    expect(result).toContain("Text Error");
  });

  test("should format as toString() result when object matches toString interface", () => {
    const error = {
      toString: () => "toString() result",
    };

    const result = formatError(error);

    expect(result).toContain("toString() result");
  });

  test("should format as new stack trace when type has not handler", () => {
    const error = null;

    const result = formatError(error);

    expect(result).toContain("logger.mts:94");
  });
});
