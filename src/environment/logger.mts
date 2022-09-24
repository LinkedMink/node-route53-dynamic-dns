import path from "path";
import { fileURLToPath } from "url";
import { isNativeError } from "util/types";
import * as winston from "winston";
import TransportStream from "winston-transport";
import { ConfigKey } from "../constant/config-key.mjs";
import { EnvironmentConfig } from "./environment-config.mjs";
import { isStringConvertable } from "./type-check.mjs";

/**
 * @see winston.config.NpmConfigSetLevels
 */
export enum LogLevel {
  error = 0,
  warn,
  info,
  http,
  verbose,
  debug,
  silly,
}

const DEFAULT_LOGGER_LABEL = "AppGlobal";
const DEFAULT_LOG_LEVEL = LogLevel[LogLevel.info];

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
export const getLogger = (label = DEFAULT_LOGGER_LABEL): winston.Logger => {
  if (!winston.loggers.has(label)) {
    winston.loggers.add(label, loggerOptionsFunc(label));
  }

  return winston.loggers.get(label);
};

/**
 * @param moduleUrl Use {@link ImportMeta.url import.meta.url} for ESM modules to generate label
 * @return An instance of the logger
 */
export const getFromModuleUrl = (moduleUrl: string): winston.Logger => {
  const moduleFilename = path.basename(fileURLToPath(moduleUrl));
  const moduleName = moduleFilename.substring(
    0,
    moduleFilename.length - path.extname(moduleFilename).length
  );
  return getLogger(moduleName);
};

export const formatError = (error: unknown): string => {
  if (isNativeError(error)) {
    return error.stack as string;
  } else if (typeof error === "string") {
    return error;
  } else if (isStringConvertable(error)) {
    return error.toString();
  } else {
    const stack = new Error().stack as string;
    return `Unspecified Unhandled Error: ${stack}`;
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

    if (!config.isEnvironmentContainerized) {
      outputs.push(
        new winston.transports.File({
          filename: config.getString(ConfigKey.LogFile),
          format,
        })
      );
    }

    const options: winston.LoggerOptions = {
      level: config.getString(ConfigKey.LogLevel),
      transports: outputs,
    };

    return options;
  };

  loggerOptionsFunc = getLoggerOptions;

  const logger = getLogger();
  process.on("uncaughtException", (error: unknown) => {
    logger.error(`uncaughtException: ${formatError(error)}`);
  });

  process.on("unhandledRejection", (error: unknown) => {
    logger.error(`unhandledRejection: ${formatError(error)}`);
  });

  logger.verbose(`${initializeLogging.name}: Logger Initialized`);

  return logger;
};
