import path from "path";
import winston from "winston";
import { EnvironmentConfig } from "../../src/environment/environment-config.mjs";
import {
  initializeLogging,
  loggerForLabel,
  loggerForModuleUrl,
} from "../../src/environment/logger.mjs";

describe(path.basename(__filename, ".test.ts"), () => {
  beforeEach(() => {
    winston.loggers.loggers.clear();
  });

  /**
   * @todo fix module reset
   */
  xdescribe(initializeLogging.name, () => {
    test("should initialize logging without file logging and return global logger when called with containerized config", () => {
      const mockConfig: Partial<EnvironmentConfig> = {
        isEnvironmentContainerized: true,
        getString: jest.fn().mockReturnValue("info"),
        getStringOrNull: jest.fn().mockReturnValue(null),
      };

      const result = initializeLogging(mockConfig as EnvironmentConfig);

      expect(result.level).toEqual("info");
      expect(result.transports[0]).toBeInstanceOf(winston.transports.Console);
    });

    test("should initialize logging with file logging and return global logger when called with log file config", () => {
      const mockConfig: Partial<EnvironmentConfig> = {
        isEnvironmentContainerized: false,
        getString: jest.fn().mockReturnValue("info"),
        getStringOrNull: jest.fn().mockReturnValue("test.log"),
      };

      const result = initializeLogging(mockConfig as EnvironmentConfig);

      expect(result.level).toEqual("info");
      expect((result.transports[1] as winston.transports.FileTransportInstance).filename).toEqual(
        "test.log"
      );
    });

    test("should throw when log level not supported", () => {
      const mockConfig: Partial<EnvironmentConfig> = {
        isEnvironmentContainerized: false,
        getString: jest.fn().mockReturnValue("fake-level"),
        getStringOrNull: jest.fn().mockReturnValue("test.log"),
      };

      const action = () => initializeLogging(mockConfig as EnvironmentConfig);

      expect(action).toThrow();
    });
  });

  describe(loggerForLabel.name, () => {
    test("should return same instance of logger when same label used", () => {
      const result1 = loggerForLabel("TestLabel");
      const result2 = loggerForLabel("TestLabel");

      expect(result1).toBe(result2);
    });
  });

  describe(loggerForModuleUrl.name, () => {
    test("should return logger labeled by module name when called with module URL", () => {
      const result = loggerForModuleUrl("file://path/test-module.mts");

      expect(result).toBe(winston.loggers.get("test-module"));
    });
  });

  // describe(logWhenEnabled.name, () => {
  //   test("should", () => {});
  // });
});
