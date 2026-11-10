import { metaLoader, pageLoader } from "@fumadocs/astro/loaders";
import { defineCollection } from "astro:content";

export const collections = {
  docs: defineCollection({ loader: pageLoader() }),
  meta: defineCollection({ loader: metaLoader() }),
};
