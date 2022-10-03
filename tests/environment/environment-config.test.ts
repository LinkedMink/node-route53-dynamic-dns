import dotenv from "dotenv";
import fs from "fs/promises";
import path from "path";
import { ConfigKey } from "../../src/constants/config.mjs";
import { EnvironmentConfig } from "../../src/environment/environment-config.mjs";

jest.mock("dotenv");
jest.mock("fs/promises");

const ENV_VARS_TO_RESET = ["NODE_ENV", "IS_CONTAINERIZED_ENV_VAR", ConfigKey.BindHost];

describe(path.basename(__filename, ".test.ts"), () => {
  beforeEach(() => {
    ENV_VARS_TO_RESET.forEach(v => delete process.env[v]);
  });

  test("should initialize with default when constructed without env vars set", () => {
    const result = new EnvironmentConfig(".env.test");

    expect(dotenv.config).toHaveBeenCalledWith({ path: ".env.test", override: true });
    expect(result.isEnvironmentContainerized).toBe(false);
    expect(result.isEnvironmentLocal).toBe(false);
    expect(result.isEnvironmentProd).toBe(true);
  });

  test("should return environment type when constructed with env vars set", () => {
    process.env.NODE_ENV = "development";
    process.env.IS_CONTAINER_ENV = "true";

    const result = new EnvironmentConfig(".env.test");

    expect(result.isEnvironmentContainerized).toBe(true);
    expect(result.isEnvironmentLocal).toBe(true);
    expect(result.isEnvironmentProd).toBe(false);
  });

  describe("getString", () => {
    test("should get string when config key defined", () => {
      process.env[ConfigKey.BindHost] = "TEST_VAL";

      const config = new EnvironmentConfig(".env.test");
      const result = config.getString(ConfigKey.BindHost);

      expect(result).toEqual("TEST_VAL");
    });

    test("should throw error when config key defined", () => {
      const config = new EnvironmentConfig(".env.test");
      const action = () => config.getString(ConfigKey.BindHost);

      expect(action).toThrow();
    });

    test("should get null when config key not defined", () => {
      const config = new EnvironmentConfig(".env.test");
      const result = config.getStringOrNull(ConfigKey.BindHost);

      expect(result).toBeNull();
    });
  });

  describe("getNumber", () => {
    test("should get number when config key defined", () => {
      process.env[ConfigKey.BindHost] = "5";

      const config = new EnvironmentConfig(".env.test");
      const result = config.getNumber(ConfigKey.BindHost);

      expect(result).toEqual(5);
    });

    test("should throw error when config key defined", () => {
      const config = new EnvironmentConfig(".env.test");
      const action = () => config.getNumber(ConfigKey.BindHost);

      expect(action).toThrow();
    });

    test("should throw error when config key defined and not number", () => {
      process.env[ConfigKey.BindHost] = "NotNumber";

      const config = new EnvironmentConfig(".env.test");
      const action = () => config.getNumber(ConfigKey.BindHost);

      expect(action).toThrow();
    });

    test("should get null when config key not defined", () => {
      const config = new EnvironmentConfig(".env.test");
      const result = config.getNumberOrNull(ConfigKey.BindHost);

      expect(result).toBeNull();
    });
  });

  describe("getBool", () => {
    test("should get boolean true when config key defined and string true", () => {
      process.env[ConfigKey.BindHost] = "true";

      const config = new EnvironmentConfig(".env.test");
      const result = config.getBool(ConfigKey.BindHost);

      expect(result).toBe(true);
    });

    test("should get boolean false when config key defined and string false", () => {
      process.env[ConfigKey.BindHost] = "false";

      const config = new EnvironmentConfig(".env.test");
      const result = config.getBool(ConfigKey.BindHost);

      expect(result).toBe(false);
    });

    test("should throw error when config key defined and not number", () => {
      process.env[ConfigKey.BindHost] = "NotBoolean";

      const config = new EnvironmentConfig(".env.test");
      const action = () => config.getBool(ConfigKey.BindHost);

      expect(action).toThrow();
    });
  });

  describe("getJson", () => {
    test("should return object from JSON data and cache when config key value is json", () => {
      process.env[ConfigKey.BindHost] = '{"test": "value"}';

      const config = new EnvironmentConfig(".env.test");
      const result1 = config.getJson(ConfigKey.BindHost);
      const result2 = config.getJson(ConfigKey.BindHost);

      expect(result1).toEqual({ test: "value" });
      expect(result1).toBe(result2);
    });
  });

  describe("getFileBuffer", () => {
    test("should return file data and cache when file read returns data", async () => {
      process.env[ConfigKey.BindHost] = "test-file.txt";
      const testBufferResult = Buffer.from("test buffer");
      (fs.readFile as jest.MockedFn<typeof fs.readFile>).mockResolvedValue(testBufferResult);

      const config = new EnvironmentConfig(".env.test");
      const result1 = await config.getFileBuffer(ConfigKey.BindHost);
      const result2 = await config.getFileBuffer(ConfigKey.BindHost);

      expect(result1).toBe(testBufferResult);
      expect(result1).toBe(result2);
      expect(fs.readFile).toHaveBeenNthCalledWith(1, "test-file.txt");
    });
  });
});
