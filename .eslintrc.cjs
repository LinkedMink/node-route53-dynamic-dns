// @ts-check

/**
 * @type {Partial<import("eslint").Linter.ConfigOverride>}
 */
const tsRecommendedRules = {
  extends: ["eslint:recommended", "plugin:@typescript-eslint/recommended", "prettier"],
  rules: {
    "@typescript-eslint/no-unused-vars": [
      "error",
      { argsIgnorePattern: "^_", varsIgnorePattern: "_" },
    ],
  },
};

/**
 * @type {import("eslint").ESLint.ConfigData}
 */
const config = {
  root: true,
  env: {
    node: true,
    es2022: true,
  },
  ignorePatterns: ["dist/**", "coverage/**", "write-package-constants.mjs"],
  overrides: [
    {
      files: ["**/*.{m,c,}ts"],
      parserOptions: {
        project: ["tsconfig.json"],
      },
      ...tsRecommendedRules,
    },
    {
      files: ["src/**/*.{m,c,}ts"],
      extends: [
        "eslint:recommended",
        "plugin:@typescript-eslint/recommended",
        "plugin:@typescript-eslint/recommended-requiring-type-checking",
        "prettier",
      ],
      parserOptions: {
        project: ["src/tsconfig.json"],
      },
      rules: {
        "@typescript-eslint/no-unused-vars": [
          "error",
          { argsIgnorePattern: "^_", varsIgnorePattern: "_" },
        ],
        "@typescript-eslint/restrict-template-expressions": [
          "error",
          {
            allowNumber: true,
            allowBoolean: true,
            allowAny: false,
            allowNullish: true,
            allowRegExp: false,
          },
        ],
      },
    },
    {
      files: ["tests/**/*.{m,c,}ts", "jest.config.ts"],
      parserOptions: {
        project: ["tests/tsconfig.json"],
      },
      ...tsRecommendedRules,
    },
    {
      files: ["*.{c,}js"],
      extends: ["eslint:recommended"],
    },
    {
      files: ["*.mjs"],
      extends: ["eslint:recommended"],
      parserOptions: {
        sourceType: "module",
      },
    },
  ],
};

module.exports = config;
