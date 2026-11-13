import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "wxt";

// See https://wxt.dev/api/reference/wxt/interfaces/inlineconfig.html
export default defineConfig({
  manifest: {
    // A toolbar button without a popup: clicking it opens the side panel on game tabs.
    action: {},
    description: "Heroes of History tools in a side panel next to the game.",
    // Lets the background read the URL of game tabs, without the broad "tabs" permission.
    host_permissions: ["*://*.heroesgame.com/*"],
    name: "HoH Tools",
  },
  modules: ["@wxt-dev/module-react"],
  vite: () => ({
    plugins: [tailwindcss()],
  }),
});
