import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";
import { VitePWA } from "vite-plugin-pwa";
import weatherHandler from "../server/weatherHandler.js";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  Object.entries(env).forEach(([key, value]) => {
    process.env[key] ||= value;
  });

  return {
    plugins: [
      localWeatherApiPlugin(),
      react(),
      VitePWA({
        registerType: "autoUpdate",
        includeAssets: ["icons/icon-192.png", "icons/icon-512.png"],
        manifest: {
          name: "Lalendar",
          short_name: "Lalendar",
          description: "가족 일정과 스마트 가전을 관리하는 캘린더",
          lang: "ko",
          theme_color: "#f43f5e",
          background_color: "#ffffff",
          display: "standalone",
          start_url: "/",
          scope: "/",
          icons: [
            {
              src: "/icons/icon-192.png",
              sizes: "192x192",
              type: "image/png",
            },
            {
              src: "/icons/icon-512.png",
              sizes: "512x512",
              type: "image/png",
            },
            {
              src: "/icons/icon-512.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "maskable",
            },
          ],
        },
      }),
    ],
  };
});

function localWeatherApiPlugin() {
  return {
    name: "local-weather-api",
    configureServer(server) {
      const weatherMiddleware = async (request, response, next) => {
        if (!request.url?.startsWith("/api/weather")) {
          next();
          return;
        }

        const url = new URL(request.url, "http://127.0.0.1");
        await weatherHandler(
          {
            query: Object.fromEntries(url.searchParams.entries()),
          },
          createNodeResponseAdapter(response),
        );
      };

      server.middlewares.use(weatherMiddleware);
      server.middlewares.stack.unshift(server.middlewares.stack.pop());
    },
  };
}

function createNodeResponseAdapter(response) {
  return {
    status(code) {
      response.statusCode = code;
      return this;
    },
    setHeader(name, value) {
      response.setHeader(name, value);
      return this;
    },
    send(value) {
      response.end(typeof value === "string" ? value : String(value));
    },
    json(value) {
      response.setHeader("Content-Type", "application/json");
      response.end(JSON.stringify(value));
    },
  };
}
