import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const compat = new FlatCompat({ baseDirectory: dirname(fileURLToPath(import.meta.url)) });

const eslintConfig = [
  { ignores: [".next/**", "node_modules/**", "next-env.d.ts", "drizzle/**"] },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    // Server actions bound with .bind() must accept the previous state even when unused.
    rules: { "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }] },
  },
];

export default eslintConfig;
