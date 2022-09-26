import path from "path";
import { fileURLToPath } from "url";
import * as winston from "winston";
import TransportStream from "winston-transport";
import { ConfigKey } from "../constants/config.mjs";
import { DEFAULT_LOGGER_LABEL, DEFAULT_LOG_LEVEL, LogLevel } from "../constants/logging.mjs";
import { getNumericEnumKeys } from "../functions/convert.mjs";
import { formatError } from "../functions/format.mjs";
import { EnvironmentConfig } from "./environment-config.mjs";

const getDefaultFormat = (label: string): winston.Logform.Format => {
  return winston.format.combine(
    winston.format.errors({ stack: true }),
    winston.format.colorize(),
    winston.format.label({ label, message: false }),
    winston.format.timestamp(),
    winston.format.printf(info => {
      const label = typeof info.label === "string" ? ` ${info.label}` : "";
      const message = typeof info.stack === "string" ? info.stack : (info.message as string);
      return `${info.timestamp as string} ${info.level}${label}: ${message}`;
    })
  );
};

const getDefaultOptions = (label: string): winston.LoggerOptions => {
  const options: winston.LoggerOptions = {
    levels: winston.config.npm.levels,
    level: DEFAULT_LOG_LEVEL,
    transports: [
      new winston.transports.Console({
        format: getDefaultFormat(label),
      }),
    ],
  };

  return options;
};

/**
 * Change the options before constructing a logger. A logger will use the options
 * set at the time the first get() is called for a specific label
 */
let loggerOptionsFunc = getDefaultOptions;

/**
 * Wrap the Winston logger container, so we can get the same logger for each module.
 * @param label The label of the module we're logging
 * @return An instance of the logger
 */
export const loggerForLabel = (label = DEFAULT_LOGGER_LABEL): winston.Logger => {
  if (!winston.loggers.has(label)) {
    winston.loggers.add(label, loggerOptionsFunc(label));
  }

  return winston.loggers.get(label);
};

/**
 * @param moduleUrl Use {@link ImportMeta.url import.meta.url} for ESM modules to generate label
 * @return An instance of the logger
 */
export const loggerForModuleUrl = (moduleUrl: string): winston.Logger => {
  const moduleFilename = path.basename(fileURLToPath(moduleUrl));
  const moduleName = moduleFilename.substring(
    0,
    moduleFilename.length - path.extname(moduleFilename).length
  );
  return loggerForLabel(moduleName);
};

/**
 * Wrap expensive operations, so we don't perform them for logging unless logging for the level is enabled
 * @param logger
 * @param level
 * @param messageFunc
 */
export const logWhenEnabled = (
  logger: winston.Logger,
  level: LogLevel,
  messageFunc: () => string
): void => {
  const loggerLevel = LogLevel[logger.level as keyof typeof LogLevel];
  if (typeof loggerLevel === "number" && level <= loggerLevel) {
    logger.log(LogLevel[level], messageFunc());
  }
};

/**
 * Sets the options to construct winston loggers and configures logging for unhandled errors
 * @param config Configuration determines the output transport streams
 * @returns The default global logger
 */
export const initializeLogging = (config: EnvironmentConfig): winston.Logger => {
  const getLoggerOptions = (label: string): winston.LoggerOptions => {
    const format = getDefaultFormat(label);
    const outputs: TransportStream[] = [new winston.transports.Console({ format })];

    const logFilePath = config.getStringOrNull(ConfigKey.LogFile);
    if (logFilePath && !config.isEnvironmentContainerized) {
      outputs.push(
        new winston.transports.File({
          filename: logFilePath,
          format,
        })
      );
    }

    const logLevel = config.getString(ConfigKey.LogLevel);
    const numericLogLevel = LogLevel[logLevel as keyof typeof LogLevel];
    if (numericLogLevel === undefined || isNaN(numericLogLevel)) {
      const allowed = getNumericEnumKeys(LogLevel).toString();
      throw new Error(`Log level is invalid: value=${logLevel}, allowed=${allowed}`);
    }

    const options: winston.LoggerOptions = {
      level: logLevel,
      transports: outputs,
    };

    return options;
  };

  loggerOptionsFunc = getLoggerOptions;

  const logger = loggerForLabel();
  process.on("uncaughtException", (error: unknown) => {
    logger.error(`uncaughtException: ${formatError(error)}`);
  });

  process.on("unhandledRejection", (error: unknown) => {
    logger.error(`unhandledRejection: ${formatError(error)}`);
  });

  logger.verbose(`${initializeLogging.name}: Logger Initialized`);

  return logger;
};
