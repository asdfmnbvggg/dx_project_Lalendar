import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";
import { VitePWA } from "vite-plugin-pwa";
import dailyReportHandler from "../api/daily-report.js";
import predictTaskHandler from "../api/predict-task.js";
import weatherHandler from "../Qwen/weatherHandler.js";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  Object.entries(env).forEach(([key, value]) => {
    process.env[key] ||= value;
  });

  return {
    plugins: [
      localServerlessApiPlugin(),
      react(),
      VitePWA({
        registerType: "autoUpdate",
        includeAssets: ["icons/icon-192.png", "icons/icon-512.png"],
        manifest: {
          name: "L-lander",
          short_name: "L-lander",
          description: "가족 일정과 스마트 가전을 관리하는 캘린더",
          lang: "ko",
          theme_color: "#fffaf5",
          background_color: "#fffaf5",
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

function localServerlessApiPlugin() {
  return {
    name: "local-serverless-api",
    configureServer(server) {
      const apiMiddleware = async (request, response, next) => {
        if (request.url?.startsWith("/api/daily-report")) {
          await dailyReportHandler(request, createNodeResponseAdapter(response));
          return;
        }

        if (request.url?.startsWith("/api/predict-task")) {
          await predictTaskHandler(request, createNodeResponseAdapter(response));
          return;
        }

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

      server.middlewares.use(apiMiddleware);
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
