import { mock } from "jest-mock-extended";
import path from "path";
import winston from "winston";
import { LogLevel } from "../../src/constants/logging.mjs";
import { EnvironmentConfig } from "../../src/environment/environment-config.mjs";
import {
  initializeLogging,
  loggerForLabel,
  loggerForModuleUrl,
  logWhenEnabled,
} from "../../src/environment/logger.mjs";

jest.mock("../../src/functions/format.mjs");

describe(path.basename(__filename, ".test.ts"), () => {
  beforeEach(() => {
    winston.loggers.loggers.clear();
  });

  describe(initializeLogging.name, () => {
    afterEach(() => {
      jest.resetModules();
      process.removeAllListeners("uncaughtException");
      process.removeAllListeners("unhandledRejection");
    });

    test("should initialize logging without file logging and return global logger when called with containerized config", () => {
      const mockConfig: Partial<EnvironmentConfig> = {
        isEnvironmentContainerized: true,
        getString: jest.fn().mockReturnValue("info"),
        getStringOrNull: jest.fn().mockReturnValue(null),
      };

      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { initializeLogging } = require("../../src/environment/logger.mjs");
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

      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { initializeLogging } = require("../../src/environment/logger.mjs");
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

      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { initializeLogging } = require("../../src/environment/logger.mjs");
      const action = () => initializeLogging(mockConfig as EnvironmentConfig);

      expect(action).toThrow();
    });

    test("should register uncaught exception handlers when called", () => {
      const mockConfig: Partial<EnvironmentConfig> = {
        isEnvironmentContainerized: false,
        getString: jest.fn().mockReturnValue("info"),
        getStringOrNull: jest.fn().mockReturnValue("test.log"),
      };
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { initializeLogging } = require("../../src/environment/logger.mjs");
      const globalLogger = initializeLogging(mockConfig as EnvironmentConfig);
      const errorSpy = jest.spyOn(globalLogger, "error").mockReturnThis();

      const uncaughtExceptionListeners = process.listeners("uncaughtException");
      uncaughtExceptionListeners.forEach(l => l(new Error("Test Error"), "uncaughtException"));
      const unhandledRejectionListeners = process.listeners("unhandledRejection");
      unhandledRejectionListeners.forEach(l => l("Test Error", Promise.resolve("Test Error")));

      expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining("uncaughtException"));
      expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining("unhandledRejection"));
    });
  });

  describe(loggerForLabel.name, () => {
    test("should return same instance of logger when same label used", () => {
      const result1 = loggerForLabel("TestLabel");
      const result2 = loggerForLabel("TestLabel");

      expect(result1).toBe(result2);
    });

    /**
     * @todo may have something to do with not mocking winston and resetting module state
     */
    xtest("should log with default format when not initialized", () => {
      const logger = loggerForLabel("DefaultFormat");
      const writeSpy = jest.spyOn(logger, "write");

      logger.info("Test");

      expect(writeSpy).toHaveBeenCalled();
    });
  });

  describe(loggerForModuleUrl.name, () => {
    test("should return logger labeled by module name when called with module URL", () => {
      const result = loggerForModuleUrl(
        `file://${process.platform === "win32" ? "" : "localhost/"}test-module.mts`
      );

      expect(result).toBe(winston.loggers.get("test-module"));
    });
  });

  describe(logWhenEnabled.name, () => {
    test("should not run log message function when logging level below ", () => {
      const mockLogMessageFunc = jest.fn().mockReturnValue("Test Message");
      const mockLogger = mock<winston.Logger>();
      mockLogger.level = LogLevel[LogLevel.info];

      logWhenEnabled(mockLogger, LogLevel.debug, mockLogMessageFunc);

      expect(mockLogMessageFunc).not.toHaveBeenCalled();
    });

    test("should not run log message function when logging level below ", () => {
      const mockLogMessageFunc = jest.fn().mockReturnValue("Test Message");
      const mockLogger = mock<winston.Logger>();
      mockLogger.level = LogLevel[LogLevel.info];

      logWhenEnabled(mockLogger, LogLevel.info, mockLogMessageFunc);

      expect(mockLogMessageFunc).toHaveBeenNthCalledWith(1, LogLevel.info);
      expect(mockLogger.log).toHaveBeenNthCalledWith(1, LogLevel[LogLevel.info], "Test Message");
    });
  });
});
