export enum ConfigKey {
  AppName = "APP_NAME",
  Port = "PORT",

  LogFile = "LOG_FILE",
  LogLevel = "LOG_LEVEL",

  HostsToUpdate = "HOSTS_TO_UPDATE",
  CheckIntervalSeconds = "CHECK_INTERVAL_SECONDS",

  AwsAccessKeyId = "AWS_ACCESS_KEY_ID",
  AwsAccessKeySecret = "AWS_ACCESS_KEY_SECRET",
}

export const configDefaultMap: Map<ConfigKey, string | undefined> = new Map([
  [ConfigKey.AppName, "@linkedmink/node-route53-dynamic-dns"],
  [ConfigKey.Port, String(8080)],

  [ConfigKey.LogFile, "combined.log"],
  [ConfigKey.LogLevel, "info"],

  [ConfigKey.CheckIntervalSeconds, String(15 * 60)],
]);
