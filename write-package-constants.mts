import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PackageJson } from "type-fest";
import packageData from "./package.json";

const VERSION_CONSTANT_PATH = "./src/constants/version.mts";

const packageJson = packageData as PackageJson;
const packageName = packageJson.name;
const packageVersion = packageJson.version;
if (!packageName || !packageVersion) {
  throw new Error(
    `package.json must have a 'name' and 'version': ${JSON.stringify(packageJson, null, 2)}`
  );
}

const scriptName = path.basename(fileURLToPath(import.meta.url));
const indexOfScopeSep = packageName.lastIndexOf("/");
const unscopedName = indexOfScopeSep > 0 ? packageName.substring(indexOfScopeSep + 1) : packageName;

const versionConstFile = `/**
 * @file auto-generated from '${scriptName}'
 */

export const PACKAGE_UNSCOPED_NAME = "${unscopedName}";
export const PACKAGE_VERSION = "${packageVersion}";
`;

await fs.writeFile(VERSION_CONSTANT_PATH, versionConstFile);
