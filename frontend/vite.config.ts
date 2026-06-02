import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [
    tsConfigPaths(),
    // tanstackStart must come before viteReact
    tanstackStart({
      srcDirectory: "src",
      router: {
        routesDirectory: "routes",
      },
      server: {
        entry: "server",
      },
    }),
    viteReact(),
    tailwindcss(),
  ],
  server: {
    port: 3000,
    host: "0.0.0.0",
  },
});
