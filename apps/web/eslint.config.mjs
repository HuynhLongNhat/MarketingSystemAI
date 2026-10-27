
import { nextJsConfig } from "@workspace/eslint-config/next-js";

export default [
  ...nextJsConfig,
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "next-env.d.ts",
    ],
  },
];
