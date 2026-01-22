import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const rootDir = dirname(fileURLToPath(import.meta.url));
const srcDir = resolve(rootDir, "src");

const isGitHubPagesBuild = process.env.GITHUB_PAGES === "true";
// For GitHub Pages (project pages), using a relative base avoids broken absolute
// asset URLs like `/assets/...` when the site is served under `/<repo>/`.
const base = isGitHubPagesBuild ? "./" : "/";

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
