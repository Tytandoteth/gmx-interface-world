/// <reference types="vitest" />

import { defineConfig, type PluginOption } from "vite";
import { visualizer } from "rollup-plugin-visualizer";
import react from "@vitejs/plugin-react";
import path from "path";
import svgr from "vite-plugin-svgr";
import tsconfigPaths from "vite-tsconfig-paths";
import { lingui } from "@lingui/vite-plugin";

export default defineConfig({
  define: {
    'import.meta.env.VITE_WORLD_RPC_URL': JSON.stringify("https://sleek-little-leaf.worldchain-mainnet.quiknode.pro/49cff082c3f8db6bc60bd05d7256d2fda94a42cd/"),
    'import.meta.env.VITE_ORACLE_KEEPER_URL': JSON.stringify("https://oracle-keeper.kevin8396.workers.dev"),
    'import.meta.env.VITE_USE_PRODUCTION_PRICES': JSON.stringify("true"),
    'import.meta.env.VITE_CHAIN_ID': JSON.stringify("480"),
    'import.meta.env.VITE_VAULT_ADDRESS': JSON.stringify("0x6519E08ecC9B2763FbEf360132a8303dc2E9ccE5"),
    'import.meta.env.VITE_ROUTER_ADDRESS': JSON.stringify("0x1958F6Cba8eb87902bDc1805A2a3bD5842BE645b"),
    'import.meta.env.VITE_POSITION_ROUTER_ADDRESS': JSON.stringify("0x566e66c17a6DfE5B0964fA0AFC85cF3cc5963dAF"),
    'import.meta.env.VITE_POSITION_MANAGER_ADDRESS': JSON.stringify("0x0AC8566466e68678d2d32F625d2d3CD9e6cf088D"),
    'import.meta.env.VITE_VAULT_PRICE_FEED_ADDRESS': JSON.stringify("0x8727D91C1174b4ab7CfD5780296aAE8Ef4b0E6Bf"),
  },
  worker: {
    format: "es",
  },
  plugins: [
    svgr({
      include: "**/*.svg?react",
    }),
    tsconfigPaths(),
    react({
      babel: {
        plugins: ["macros"],
      },
    }),
    lingui(),
    visualizer() as PluginOption,
  ],
  resolve: {
    alias: {
      App: path.resolve(__dirname, "src/App"),
      components: path.resolve(__dirname, "src/components"),
      config: path.resolve(__dirname, "src/config"),
      context: path.resolve(__dirname, "src/context"),
      domain: path.resolve(__dirname, "src/domain"),
      fonts: path.resolve(__dirname, "src/fonts"),
      img: path.resolve(__dirname, "src/img"),
      lib: path.resolve(__dirname, "src/lib"),
      ab: path.resolve(__dirname, "src/ab"),
      locales: path.resolve(__dirname, "src/locales"),
      pages: path.resolve(__dirname, "src/pages"),
      styles: path.resolve(__dirname, "src/styles"),
      "typechain-types": path.resolve(__dirname, "src/typechain-types"),
      prebuilt: path.resolve(__dirname, "src/prebuilt"),
      sdk: path.resolve(__dirname, "sdk/src"),
    },
  },
  build: {
    assetsInlineLimit: 0,
    outDir: "build",
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["ethers", "viem", "date-fns", "recharts", "@rainbow-me/rainbowkit", "lodash"],
        },
      },
    },
  },
  test: {
    environment: "happy-dom",
    globalSetup: "./vitest.global-setup.js",
    exclude: ["./autotests", "node_modules", "./sdk"],
    setupFiles: ["@vitest/web-worker"],
  },
});
