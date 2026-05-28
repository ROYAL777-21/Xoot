import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

const vendorChunk = (id: string) => {
  if (!id.includes("node_modules")) return undefined;

  if (id.includes("react") || id.includes("scheduler")) return "vendor-react";
  if (id.includes("@radix-ui")) return "vendor-radix";
  if (id.includes("@tanstack")) return "vendor-query";
  if (id.includes("@supabase")) return "vendor-supabase";
  if (id.includes("@capacitor")) return "vendor-capacitor";
  if (id.includes("recharts") || id.includes("d3-")) return "vendor-charts";
  if (id.includes("date-fns")) return "vendor-date";
  if (id.includes("lucide-react")) return "vendor-icons";

  return "vendor-ui";
};

// https://vitejs.dev/config/
export default defineConfig(() => ({
  base: "./",
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: vendorChunk,
      },
    },
  },
}));
