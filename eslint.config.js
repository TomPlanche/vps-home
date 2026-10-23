import { fileURLToPath } from "node:url";
import { includeIgnoreFile } from "@eslint/compat";
import js from "@eslint/js";
import prettier from "eslint-config-prettier";
import svelte from "eslint-plugin-svelte";
import { defineConfig } from "eslint/config";
import globals from "globals";
import ts from "typescript-eslint";
import svelteConfig from "./svelte.config.js";

const gitignorePath = fileURLToPath(new URL("./.gitignore", import.meta.url));

export default defineConfig(
  includeIgnoreFile(gitignorePath), // oxlint covers plain .ts/.js/.mjs/.cjs; ESLint is scoped to .svelte files
  js.configs.recommended,
  ...ts.configs.recommended,
  ...svelte.configs.recommended,
  // Disables rules from the configs above that fight oxfmt's formatting.
  prettier,
  ...svelte.configs.prettier,
  {
    languageOptions: {
      globals: { ...globals.browser, ...globals.node }
    },
    rules: {
      "no-undef": "off",
      quotes: ["error", "double"],
      semi: ["error", "always"],
      "object-curly-spacing": ["error", "always"],
      curly: ["error", "all"],
      "brace-style": ["error", "1tbs", { allowSingleLine: false }],
      // No `function` declarations, always `const foo = (...) => {}`.
      "func-style": ["error", "expression", { allowArrowFunctions: true }],
      // No `function` expressions either, except where an arrow can't stand in.
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "FunctionExpression[generator=false]:not(MethodDefinition > FunctionExpression):not(Property[method=true] > FunctionExpression):not(Property[kind=/^(get|set)$/] > FunctionExpression)",
          message: "Use an arrow function instead of a function expression."
        }
      ]
    }
  },
  {
    languageOptions: {
      parserOptions: {
        // The root config files sit outside the tsconfig SvelteKit generates,
        // so type-aware linting falls back to the default project for them.
        projectService: {
          allowDefaultProject: ["eslint.config.js", "svelte.config.js"]
        },
        extraFileExtensions: [".svelte"],
        parser: ts.parser,
        svelteConfig
      }
    }
  }
);
