import { resolve } from "path";
import { defineConfig, type Plugin } from "vite";

import { assetpackPlugin } from "./scripts/assetpack-vite-plugin";

function gameRoutePlugin(): Plugin {
  return {
    name: "game-route-plugin",
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        if (req.url) {
          const [pathname, search] = req.url.split("?");
          if (pathname === "/game" || pathname === "/game/") {
            req.url = "/game/index.html" + (search ? `?${search}` : "");
          }
        }
        next();
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [assetpackPlugin(), gameRoutePlugin()],
  appType: "mpa",
  server: {
    port: 8080,
    open: true,
  },
  define: {
    APP_VERSION: JSON.stringify(process.env.npm_package_version),
  },
  build: {
    target: "esnext",
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        game: resolve(__dirname, "game/index.html"),
      },
    },
  },
});
