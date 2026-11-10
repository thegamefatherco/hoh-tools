import { defineConfig } from "oxfmt";
import ultracite from "ultracite/oxfmt";

export default defineConfig({
  ...ultracite,
  ignorePatterns: [
    ...(ultracite.ignorePatterns ?? []),
    // Raw game exports, test fixtures and build outputs are kept byte-for-byte.
    "packages/negotiation/fixtures/**",
    "packages/negotiation/input/**",
    "packages/negotiation/src/generated/**",
  ],
});
