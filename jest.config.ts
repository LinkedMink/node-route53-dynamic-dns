import { Config } from "@jest/types";

const ignoreCoverageFiles = ["index"];

const config: Config.InitialOptions = {
  preset: "ts-jest/presets/default-esm",
  verbose: true,
  resolver: "<rootDir>/jest-mjs-resolver.cjs",
  moduleFileExtensions: ["js", "mjs", "cjs", "json", "ts", "mts", "cts"],
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
  testMatch: ["**/tests/**/(*.test|*.spec).{m,c,}ts"],
  collectCoverage: false,
  collectCoverageFrom: [`src/!(types|constants)/**/!(${ignoreCoverageFiles.join("|")}).{m,c,}ts`],
  // coverageThreshold: {
  //   global: {
  //     statements: 75,
  //     branches: 75,
  //     functions: 75,
  //     lines: 75,
  //   },
  // },
  coverageProvider: "v8",
  testEnvironment: "node",
  transform: {
    "^.+\\.m?tsx?$": [
      "ts-jest",
      {
        tsconfig: "tests/tsconfig.json",
        useESM: true,
      },
    ],
  },
};

export default config;
