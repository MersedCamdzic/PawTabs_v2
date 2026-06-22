import { defineConfig } from "vite";
import preact from "@preact/preset-vite";
import tailwindcss from "@tailwindcss/vite";
import { crx } from "@crxjs/vite-plugin";
import path from "node:path";
import manifest from "./src/manifest.config";

export default defineConfig({
  plugins: [preact(), tailwindcss(), crx({ manifest })],
  resolve: {
    alias: {
      react: "preact/compat",
      "react-dom": "preact/compat",
      "@": path.resolve(__dirname, "src"),
    },
  },
  build: {
    target: "esnext",
    minify: "esbuild",
    sourcemap: true,
  },
  server: {
    port: 5173,
    strictPort: true,
    hmr: { port: 5173 },
  },
});
