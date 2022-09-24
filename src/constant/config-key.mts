export enum ConfigKey {
  AppName = "APP_NAME",
  LogFile = "LOG_FILE",
  LogLevel = "LOG_LEVEL",
}

export const configDefaultMap: Map<ConfigKey, string | undefined> = new Map([
  [ConfigKey.AppName, "@linkedmink/node-route53-dynamic-dns"],
  [ConfigKey.LogFile, "combined.log"],
  [ConfigKey.LogLevel, "info"],
]);
