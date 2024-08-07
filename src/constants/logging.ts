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

export const DEFAULT_LOGGER_LABEL = "app";
export const DEFAULT_LOG_LEVEL = LogLevel[LogLevel.info];
