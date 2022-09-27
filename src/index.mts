#!/usr/bin/env node

import { Command } from "commander";
import iamPolicyCommand from "./commands/iam-policy.mjs";
import serviceCommand from "./commands/service.mjs";
import { PACKAGE_UNSCOPED_NAME } from "./constants/version.mjs";
import { EnvironmentConfig } from "./environment/environment-config.mjs";

const config = new EnvironmentConfig();

const program = new Command(PACKAGE_UNSCOPED_NAME)
  .addCommand(serviceCommand(config), { isDefault: true })
  .addCommand(iamPolicyCommand(config));

await program.parseAsync();
