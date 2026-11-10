import fumadocs from "@fumadocs/astro";
import tailwindcss from "@tailwindcss/vite";
// @ts-check
import { defineConfig } from "astro/config";

export default defineConfig({
  integrations: [
    fumadocs({
      components: "./src/components/mdx.tsx",
      includeProcessedMarkdown: { output: "function" },
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});
