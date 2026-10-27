import { defineConfig, mergeConfig } from "vitest/config";
import { preview } from "@vitest/browser-preview";
import viteConfig from "./vite.config.ts";

/**
 * On-device model evals. They call the real engine, so they only run in a WebGPU browser: Vitest serves the tester page and you open
 * it yourself (the preview provider launches nothing). The server takes over port 5173 so the page is the same origin as `dev:lan`,
 * which is the origin that has the secure-context flag and the cached model; stop `dev:lan` before running. See README.
 */
export default mergeConfig(
  viteConfig,
  defineConfig({
    server: { allowedHosts: process.env.DEV_ALLOWED_HOSTS?.split(",") ?? [".local"] },
    // The evals import the app's tools, which pull in the UI libraries; pre-bundle them so Vite does not reload the page mid-run.
    optimizeDeps: {
      include: [
        "@assistant-ui/react",
        "@assistant-ui/react-ai-sdk",
        "@assistant-ui/react-markdown",
        "maplibre-gl",
        "react-dom/client",
        "react-map-gl/maplibre",
        "zustand/react/shallow",
      ],
    },
    test: {
      include: ["evals/**/*.eval.ts"],
      setupFiles: ["evals/setup.ts"],
      fileParallelism: false,
      testTimeout: Number(process.env.VITE_EVAL_TIMEOUT_MS ?? 360_000),
      hookTimeout: 900_000,
      outputFile: { json: "evals/results/latest.json" },
      reporters: ["verbose", "json"],
      api: { host: "0.0.0.0", port: 5173, strictPort: true },
      browser: {
        enabled: true,
        provider: preview(),
        headless: false,
        instances: [{ browser: "chromium" }],
      },
    },
  }),
);
