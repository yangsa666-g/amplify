import baseConfig from "@repo/eslint-config/base";

export default [
  {
    ignores: ["dist/", "node_modules/"],
  },
  ...baseConfig,
  {
    rules: {
      "no-console": "off",
    },
  },
];
