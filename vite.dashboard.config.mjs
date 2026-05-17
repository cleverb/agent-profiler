import { defineConfig } from "vite";

export default defineConfig({
  root: "src/dashboard/public",
  base: "/dashboard/",
  build: {
    outDir: "../../../dist-pages/dashboard",
    emptyOutDir: true,
  },
});
