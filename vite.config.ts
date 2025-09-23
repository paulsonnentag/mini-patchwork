import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import wasm from "vite-plugin-wasm";
import tailwindcss from "@tailwindcss/vite";
import importmap from "../../inkandswitch/gaios/packages/scion-gaios/importmap.json" with { type: "json" };
import cssInjectedByJsPlugin from "vite-plugin-css-injected-by-js";

export default defineConfig({
  plugins: [wasm(), react(), tailwindcss(), cssInjectedByJsPlugin()],
  build: {
    lib: {
      entry: "src/main.tsx",
      name: "Mini Patchwork",
      fileName: "index.js",
      formats: ["es"],
    },
    rollupOptions: {
      external: [
        "react",
        "react/jsx-runtime",
        "react-dom",
        "react-dom/client",
        "@automerge/automerge",
        "@automerge/automerge-repo",
        "@automerge/automerge/slim",
        "@automerge/automerge-repo/slim",
        "@automerge/automerge-repo-react-hooks",
      ],
      preserveEntrySignatures: "allow-extension",
      output: {
        format: "es",
        entryFileNames: "[name].js",
        chunkFileNames: "assets/[name]-[hash].js",
        assetFileNames: "assets/[name].[ext]",
      },
    },
    target: "esnext",
  },
});
