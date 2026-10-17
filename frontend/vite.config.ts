import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  // Vercel serves the site at the domain root; GitHub Pages (npm run deploy) serves it under the repo path.
  // Override either with VITE_BASE, e.g. VITE_BASE=/ npm run build
  base: process.env.VITE_BASE ?? (process.env.VERCEL ? "/" : "/construction-price-intelligence/"),
});
