import { Config } from "@jest/types";

const ignoreCoverageFolders = ["commands", "constants", "types"];
const ignoreCoverageFiles = ["index"];

const config: Config.InitialOptions = {
  preset: "ts-jest/presets/default-esm",
  verbose: true,
  resolver: "<rootDir>/jest-mjs-resolver.cjs",
  moduleFileExtensions: ["js", "mjs", "cjs", "json", "ts", "mts", "cts"],
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
  testMatch: ["**/tests/**/*.test.ts"],
  // TODO fix esm
  // testMatch: ["**/tests/**/*.test.{m,c,}ts"],
  collectCoverage: false,
  collectCoverageFrom: [
    `src/!(${ignoreCoverageFolders.join("|")})/**/!(${ignoreCoverageFiles.join("|")}).{m,c,}ts`,
  ],
  coverageThreshold: {
    global: {
      statements: 75,
      branches: 75,
      functions: 75,
      lines: 75,
    },
  },
  coverageProvider: "v8",
  testEnvironment: "node",
  transform: {
    "^.+\\.m?tsx?$": "ts-jest",
  },
  // Temporary fix for import.meta.url not detected from ts-jest
  globals: {
    "ts-jest": {
      tsconfig: "tests/tsconfig.json",
      useESM: true,
      diagnostics: {
        ignoreCodes: [1343],
      },
      astTransformers: {
        before: [
          {
            path: "node_modules/ts-jest-mock-import-meta",
            options: {
              metaObjectReplacement: {
                url: `file://${process.platform === "win32" ? "" : "localhost/"}test.mts`,
              },
            },
          },
        ],
      },
    },
  },
};

export default config;
