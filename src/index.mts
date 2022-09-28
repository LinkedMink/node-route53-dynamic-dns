#!/usr/bin/env node

import { Command } from "commander";
import iamPolicyCommand from "./commands/iam-policy.mjs";
import serviceCommand from "./commands/service.mjs";
import { PACKAGE_UNSCOPED_NAME } from "./constants/version.mjs";
import { EnvironmentConfig } from "./environment/environment-config.mjs";

interface RootCommandOptions {
  envFile: string;
}

const program = new Command(PACKAGE_UNSCOPED_NAME)
  .option("-e, --env-file <string>", "The path to a dotenv configuration file", ".env")
  .parse();

const options = program.opts<RootCommandOptions>();
const config = new EnvironmentConfig(options.envFile);

program
  .addCommand(serviceCommand(config), { isDefault: true })
  .addCommand(iamPolicyCommand(config));

await program.parseAsync();
