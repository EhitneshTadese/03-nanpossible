import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { FlatCompat } from "@eslint/eslintrc";
import { defineConfig, globalIgnores } from "eslint/config";

const currentFile = fileURLToPath(import.meta.url);
const currentDirectory = dirname(currentFile);
const compat = new FlatCompat({
  baseDirectory: currentDirectory,
});

export default defineConfig([
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  globalIgnores([
    ".next/**",
    ".next.nosync/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);
