import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Database drivers ship native/wasm assets; keep them out of the server bundle.
  serverExternalPackages: ["@electric-sql/pglite", "pg"],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
