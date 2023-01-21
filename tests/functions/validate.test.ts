import path from "node:path";
import { validateNormalizeDnsRecord } from "../../src/functions/validate.mjs";

describe(path.basename(__filename, ".test.ts"), () => {
  test("should return DNS records with matching format from AWS when valid", () => {
    const input1 = "TEST.tld";
    const input2 = "*.test.tld.";
    const input3 = "@.test.tld.";

    const result1 = validateNormalizeDnsRecord(input1);
    const result2 = validateNormalizeDnsRecord(input2);
    const result3 = validateNormalizeDnsRecord(input3);

    expect(result1).toEqual("test.tld.");
    expect(result2).toEqual("\\052.test.tld.");
    expect(result3).toEqual("\\100.test.tld.");
  });

  test("should return DNS records with matching format from AWS when valid", () => {
    const input = "NotA,ValidRecord";

    const action = () => validateNormalizeDnsRecord(input);

    expect(action).toThrow();
  });
});
