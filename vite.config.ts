import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { sentryVitePlugin } from "@sentry/vite-plugin";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(() => {
  const enableSentryUpload = Boolean(process.env.VITE_SENTRY_DSN && process.env.SENTRY_AUTH_TOKEN);

  return {
    base: "/",
    server: {
      host: "::",
      port: 8080,
      headers: {
        "X-Content-Type-Options": "nosniff",
        "X-Frame-Options": "DENY",
        "X-XSS-Protection": "1; mode=block",
        "Referrer-Policy": "strict-origin-when-cross-origin",
        "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
      },
      hmr: {
        overlay: false,
      },
    },
    build: {
      target: "es2020",
      sourcemap: true,
      rolldownOptions: {
        checks: {
          pluginTimings: false,
        },
        output: {
          manualChunks(id) {
            if (!id.includes("node_modules")) return undefined;
            if (
              id.includes("mapbox-gl") ||
              id.includes("@mapbox") ||
              /node_modules[\\/](cheap-ruler|csscolorparser|earcut|geojson-vt|gl-matrix|grid-index|kdbush|pbf|potpack|quickselect|resolve-protobuf-schema|supercluster|vt-pbf)[\\/]/.test(
                id,
              )
            ) {
              return "vendor-mapbox";
            }
            if (id.includes("@sentry")) return "vendor-monitoring";
            if (id.includes("react") || id.includes("scheduler")) return "vendor-react";
            if (id.includes("@supabase")) return "vendor-supabase";
            if (id.includes("@tanstack")) return "vendor-query";
            if (id.includes("recharts") || id.includes("d3-")) return "vendor-charts";
            if (id.includes("react-hook-form") || id.includes("@hookform") || id.includes("zod")) return "vendor-forms";
            if (id.includes("@radix-ui") || id.includes("lucide-react") || id.includes("class-variance-authority")) return "vendor-ui";
            return "vendor";
          },
        },
      },
    },
    plugins: [
      react(),
      enableSentryUpload
        ? sentryVitePlugin({
            authToken: process.env.SENTRY_AUTH_TOKEN,
            org: process.env.SENTRY_ORG || "zoot-home-services",
            project: process.env.SENTRY_PROJECT || "zoot-web",
            telemetry: false,
            sourcemaps: {
              assets: "./dist/**",
            },
          })
        : null,
    ].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
      dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
    },
  };
});
