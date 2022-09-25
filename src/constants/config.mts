export enum ConfigKey {
  AppName = "APP_NAME",
  LogFile = "LOG_FILE",
  LogLevel = "LOG_LEVEL",

  BindHost = "BIND_HOST",
  BindPort = "BIND_PORT",

  CheckIntervalSeconds = "CHECK_INTERVAL_SECONDS",

  HostnamesToUpdate = "HOSTNAMES_TO_UPDATE",

  AwsAccessKeyId = "AWS_ACCESS_KEY_ID",
  AwsAccessKeySecret = "AWS_ACCESS_KEY_SECRET",
}

export const configDefaultMap: Map<ConfigKey, string> = new Map([
  [ConfigKey.AppName, "@linkedmink/node-route53-dynamic-dns"],
  [ConfigKey.LogFile, "combined.log"],
  [ConfigKey.LogLevel, "info"],

  [ConfigKey.BindPort, String(61080)],

  [ConfigKey.CheckIntervalSeconds, String(15 * 60)],
]);

export enum NodeEnv {
  Local = "development",
  Production = "production",
}

export const IS_CONTAINERIZED_ENV_VAR = "IS_CONTAINER_ENV";
