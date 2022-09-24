import { EnvironmentConfig } from "./environment/environment-config.mjs";
import { initializeLogging } from "./environment/logger.mjs";

const config = new EnvironmentConfig();
const logger = initializeLogging(config);

logger.info("Hello Template");
