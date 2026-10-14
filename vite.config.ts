import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { sentryVitePlugin } from "@sentry/vite-plugin";
import path from "path";

// Prebuild verification derives production from VERCEL_ENV/CONTEXT, but those host
// variables are not exposed to browser code. Vite must embed the *same* app environment
// for the public configuration resolver used by the startup check and Supabase client.
export const resolveHostAppEnvironment = (env: Record<string, string | undefined>): "production" | "development" | undefined => {
  if (env.VERCEL_ENV) return env.VERCEL_ENV.trim().toLowerCase() === "production" ? "production" : "development";
  if (env.CONTEXT) return env.CONTEXT.trim().toLowerCase() === "production" ? "production" : "development";
  return undefined;
};

export const setViteAppEnvironment = (env: Record<string, string | undefined>) => {
  const hostEnvironment = resolveHostAppEnvironment(env);
  const explicit = env.VITE_APP_ENV?.trim().toLowerCase();
  if (hostEnvironment === "development" && explicit === "production") {
    throw new Error("A preview build must not use VITE_APP_ENV=production or production Supabase defaults.");
  }
  if (!explicit && hostEnvironment) env.VITE_APP_ENV = hostEnvironment;
  return env.VITE_APP_ENV;
};

// https://vitejs.dev/config/
export default defineConfig(() => {
  const appEnvironment = setViteAppEnvironment(process.env);
  if (appEnvironment) console.log(`[Xoot] Vite browser environment: ${appEnvironment}`);
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
      sourcemap: enableSentryUpload ? "hidden" : false,
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
            if (/node_modules[\\/](lodash|lodash-es)[\\/]/.test(id)) return "vendor-lodash";
            if (id.includes("posthog-js") || id.includes("dompurify")) return "vendor-analytics";
            if (id.includes("@floating-ui")) return "vendor-floating";
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
              filesToDeleteAfterUpload: "./dist/**/*.map",
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
