import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Tool-specific worktrees contain their own generated Next.js output and
    // are not part of this application workspace.
    ".claude/**",
    // Local reverse-engineering/reference captures are not application code.
    ".agents/**",
  ]),
]);

export default eslintConfig;
