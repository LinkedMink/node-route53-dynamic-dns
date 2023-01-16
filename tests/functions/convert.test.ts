import path from "node:path";
import { getEnumKeys } from "../../src/functions/convert.mjs";

describe(path.basename(__filename, ".test.ts"), () => {
  test("should return array of enum keys when string enum", () => {
    enum TestString {
      Key1 = "Value1",
      Key2 = "Value2",
    }

    const result = getEnumKeys(TestString);

    expect(result).toEqual(["Key1", "Key2"]);
  });

  test("should return array of enum keys when number enum", () => {
    enum TestString {
      Key1,
      Key2,
    }

    const result = getEnumKeys(TestString);

    expect(result).toEqual(["Key1", "Key2"]);
  });
});
