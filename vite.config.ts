import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const rootDir = dirname(fileURLToPath(import.meta.url));
const srcDir = resolve(rootDir, "src");

const repoName = process.env.GITHUB_REPOSITORY?.split("/")[1];
const isGitHubPagesBuild = process.env.GITHUB_PAGES === "true";
const base = isGitHubPagesBuild && repoName ? `/${repoName}/` : "/";

export default defineConfig({
  base,
  resolve: {
    alias: {
      // Existing TS path aliases (runtime support)
      "@core": resolve(srcDir, "core"),
      "@game": resolve(srcDir, "game"),
      "@render": resolve(srcDir, "render"),
      "@types": resolve(srcDir, "types"),

      // New alias for scene module
      "@scene": resolve(srcDir, "scene"),

      // Back-compat for baseUrl-style imports like: import { Entity } from "scene"
      "scene": resolve(srcDir, "scene"),
    },
  },
});
