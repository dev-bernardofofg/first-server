import { defineConfig } from "@kubb/core";
import { pluginOas } from "@kubb/plugin-oas";
import { pluginTs } from "@kubb/plugin-ts";
import { pluginClient } from "@kubb/plugin-client";
import { pluginReactQuery } from "@kubb/plugin-react-query";

export default defineConfig({
  input: {
    path: "http://localhost:3000/openapi.json",
  },
  output: {
    path: "./generated",
    clean: true,
  },
  plugins: [
    pluginOas(),
    pluginTs({
      output: { path: "types" },
    }),
    pluginClient({
      output: { path: "client" },
      baseURL: process.env.API_URL ?? "http://localhost:3000",
    }),
    pluginReactQuery({
      output: { path: "hooks" },
      client: {
        importPath: "../client",
      },
    }),
  ],
});
