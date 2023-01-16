import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import packageData from "./package.json" assert { type: "json" };

const VERSION_CONSTANT_PATH = "./src/constants/version.mts";

const scriptName = path.basename(fileURLToPath(import.meta.url));
const indexOfScopeSep = packageData.name.lastIndexOf("/");
const unscopedName =
  indexOfScopeSep > 0 ? packageData.name.substring(indexOfScopeSep + 1) : packageData.name;

const versionConstExport = `/**
 * @file auto-generated from '${scriptName}'
 */

export const PACKAGE_UNSCOPED_NAME = "${unscopedName}";
export const PACKAGE_VERSION = "${packageData.version}";
`;

await fs.writeFile(VERSION_CONSTANT_PATH, versionConstExport);
