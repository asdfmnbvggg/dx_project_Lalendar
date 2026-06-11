import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";
import weatherHandler from "../server/weatherHandler.js";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  Object.entries(env).forEach(([key, value]) => {
    process.env[key] ||= value;
  });

  return {
    plugins: [localWeatherApiPlugin(), react()],
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
