import { defineConfig } from "vite";

export default defineConfig({
  resolve: {
    alias: {
      "@cubism-web-framework": "/src/libs/cubism-web/Framework",
    },
  },
});
