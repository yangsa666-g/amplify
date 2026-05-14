import reactConfig from "@repo/eslint-config/react";

export default [
  {
    ignores: ["dist/", "node_modules/"],
  },
  ...reactConfig,
];
