import { defineConfig } from "oxlint";
import core from "ultracite/oxlint/core";
import react from "ultracite/oxlint/react";
import tanstack from "ultracite/oxlint/tanstack";

export default defineConfig({
  extends: [core, react, tanstack],
  ignorePatterns: [
    ...(core.ignorePatterns ?? []),
    // Vendored agent skills, not project code.
    ".agents/**",
    ".claude/skills/**",
  ],
  rules: {
    "react/no-unescaped-entities": "off",
    "typescript/no-empty-interface": "off",
    "react/function-component-definition": "off",
    "unicorn/prefer-export-from": "off",
    "unicorn/prefer-module": "warn",
    "no-use-before-define": [
      "warn",
      {
        allowNamedExports: true,
        functions: true,
      },
    ],
    "func-style": [
      "warn",
      "declaration",
      { allowArrowFunctions: true, allowTypeAnnotation: true },
    ],
    "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
    "jsx-a11y/prefer-tag-over-role": "off",
    "jsx-a11y/click-events-have-key-events": "off",
    "jsx-a11y/label-has-associated-control": "off",
    "jsx-a11y/no-noninteractive-element-interactions": "off",
    "node/global-require": "off",
    "unicorn/consistent-function-scoping": "warn",
    "typescript/no-empty-object-type": "off",
    "import/no-named-as-default-member": "off",
    "react/no-unstable-nested-components": ["warn", { allowAsProps: true }],
  },
});
