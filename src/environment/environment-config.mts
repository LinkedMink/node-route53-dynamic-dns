import dotenv from "dotenv";
import fs from "fs/promises";
import {
  configDefaultMap,
  ConfigKey,
  IS_CONTAINERIZED_ENV_VAR,
  NodeEnv,
} from "../constants/config.mjs";

/**
 * Cache shared app configuration from files in memory
 */
export class EnvironmentConfig {
  private readonly fileBuffers = new Map<ConfigKey, Buffer>();
  private readonly jsonData = new Map<ConfigKey, unknown>();
  private readonly environment: NodeEnv;

  constructor(dotEnvPath = ".env") {
    dotenv.config({ path: dotEnvPath, override: true });
    this.environment = (process.env.NODE_ENV?.toLowerCase() ?? NodeEnv.Production) as NodeEnv;
  }

  get isEnvironmentLocal(): boolean {
    return this.environment === NodeEnv.Local;
  }

  get isEnvironmentProd(): boolean {
    return this.environment === NodeEnv.Production;
  }

  get isEnvironmentContainerized(): boolean {
    return process.env[IS_CONTAINERIZED_ENV_VAR]?.trim().toLowerCase() === "true";
  }

  getString = (key: ConfigKey): string => {
    return this.getConfigValue(key);
  };

  getStringOrNull = (key: ConfigKey): string | null => {
    return this.getConfigValueOrNull(key);
  };

  getNumber = (key: ConfigKey): number => {
    const value = this.getConfigValue(key);
    return Number(value);
  };

  getNumberOrNull = (key: ConfigKey): number | null => {
    const value = this.getConfigValueOrNull(key);
    return value !== null ? Number(value) : null;
  };

  getBool = (key: ConfigKey): boolean => {
    const value = this.getConfigValue(key);
    return value.trim().toLowerCase() === "true";
  };

  // prettier-ignore
  getJsonOrString = <T,>(
    key: ConfigKey
  ): string | T => {
    const json = this.jsonData.get(key);
    if (json) {
      return json as string | T;
    }

    const value = this.getConfigValue(key).trim();
    if (value.length > 0 && (value.startsWith("{") || value.startsWith("["))) {
      return this.getJson<T>(key);
    }

    return value;
  };

  // prettier-ignore
  getJson = <T,>(key: ConfigKey): T => {
    const json = this.jsonData.get(key);
    if (json) {
      return json as T;
    }

    const value = this.getConfigValue(key);
    const parsed = JSON.parse(value) as T;
    this.jsonData.set(key, parsed);
    return parsed;
  };

  getFileBuffer = async (key: ConfigKey): Promise<Buffer> => {
    const buffer = this.fileBuffers.get(key);
    if (buffer) {
      return buffer;
    }

    const filePath = this.getConfigValue(key);
    const data = await fs.readFile(filePath);
    this.fileBuffers.set(key, data);
    return data;
  };

  private getConfigValue = (key: ConfigKey): string => {
    const configValue = process.env[key] || configDefaultMap.get(key);
    if (configValue) {
      return configValue;
    }

    throw new Error(`Environmental variable must be defined: ${key}`);
  };

  private getConfigValueOrNull = (key: ConfigKey): string | null => {
    const configValue =
      typeof process.env[key] === "string" ? process.env[key] : configDefaultMap.get(key);

    if (configValue) {
      return configValue;
    }

    return null;
  };
}
