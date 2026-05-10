import { reactRouter } from "@react-router/dev/vite";
import { cloudflareDevProxy } from "@react-router/cloudflare/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [cloudflareDevProxy(), tailwindcss(), reactRouter()],
  resolve: {
    alias: {
      "~": "/app",
    },
  },
});
