import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  // NOTE: `src/lib/mobile-*.test.ts` import shared helpers from `mobile/src/lib`.
  // Vite's oxc transform resolves the nearest tsconfig per file, so those files use
  // mobile/tsconfig.json, which extends `expo/tsconfig.base`. That means the full
  // suite requires `bun install` in ./mobile as well as at the root — without it,
  // both files fail to transform and 8 tests silently do not run.
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    env: {
      VITE_APP_ENV: "development",
      VITE_SUPABASE_URL: "https://test-project.supabase.co",
      VITE_SUPABASE_PUBLISHABLE_KEY: "test-publishable-key",
    },
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
