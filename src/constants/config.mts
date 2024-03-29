export enum ConfigKey {
  AppName = "APP_NAME",
  LogFile = "LOG_FILE",
  LogLevel = "LOG_LEVEL",

  BindHost = "BIND_HOST",
  BindPort = "BIND_PORT",

  IpCheckIntervalSeconds = "IP_CHECK_INTERVAL_SECONDS",
  IpCheckTimeoutMs = "IP_CHECK_TIMEOUT_MS",
  IpV6Enabled = "IP_V6_ENABLED",
  CacheDnsRecords = "CACHE_DNS_RECORDS",

  HostnamesToUpdate = "HOSTNAMES_TO_UPDATE",
}

export const configDefaultMap: Map<ConfigKey, string> = new Map([
  [ConfigKey.AppName, "@linkedmink/node-route53-dynamic-dns"],
  [ConfigKey.LogFile, "node-route53-dynamic-dns.log"],
  [ConfigKey.LogLevel, "info"],

  [ConfigKey.BindPort, String(61080)],

  [ConfigKey.IpCheckIntervalSeconds, String(5 * 60)],
  [ConfigKey.IpCheckTimeoutMs, String(5000)],
  [ConfigKey.IpV6Enabled, String(false)],
  [ConfigKey.CacheDnsRecords, String(true)],
]);

export enum NodeEnv {
  Local = "development",
  Production = "production",
}

export const IS_CONTAINERIZED_ENV_VAR = "IS_CONTAINER_ENV";
