import { defineConfig } from "vite";
import solidPlugin from "vite-plugin-solid";

export default defineConfig({
  plugins: [solidPlugin()],
  resolve: {
    alias: {
      "@cubism-web-framework": "/src/libs/cubism-web/Framework",
    },
  },
});
