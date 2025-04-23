// eslint.config.js
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import globals from "globals";
import prettierConfig from "eslint-config-prettier";

export default tseslint.config(
  // Using tseslint.config helper simplifies setup
  // Global ignores
  {
    ignores: [
      "node_modules/",
      // Add other patterns like logs, .env files etc.
      // Example: "*.log", ".env*", "!.env.example"
    ],
  },

  // Base ESLint recommended rules applied globally
  js.configs.recommended,

  // TypeScript specific configurations
  // Apply recommended-type-checked rules ONLY to TS/TSX files
  {
    files: ["**/*.{ts,tsx}"], // Target only TypeScript files
    extends: [
      ...tseslint.configs.recommendedTypeChecked, // Recommended + Type Checked rules
    ],
    languageOptions: {
      parserOptions: {
        project: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // Allow unused vars prefixed with underscore
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },

  // Configuration for JavaScript files (if any, e.g., config files)
  // This ensures Node.js globals are available for JS files too
  {
    files: ["**/*.{js,cjs,mjs}"],
    languageOptions: {
      globals: {
        ...globals.node, // Use Node.js globals for JS files
        ...globals.es2022, // Use modern ES globals
      },
    },
    rules: {
      // Add any JS-specific rule overrides here if needed
    },
  },

  // Apply Node.js globals to TypeScript files as well
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      globals: {
        ...globals.node, // Add Node.js environment globals
        ...globals.es2022,
      },
    },
  },

  // Prettier configuration MUST be last
  // Turns off ESLint rules that conflict with Prettier formatting
  prettierConfig
);
