// vitest.config.ts
import { defineConfig } from 'vitest/config';
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const rootDir = dirname(fileURLToPath(import.meta.url));
const srcDir = resolve(rootDir, "src");

export default defineConfig({
  resolve: {
    alias: {
      "@core": resolve(srcDir, "core"),
      "@game": resolve(srcDir, "game"),
      "@render": resolve(srcDir, "render"),
      "@types": resolve(srcDir, "types"),
      "@scene": resolve(srcDir, "scene"),
      "scene": resolve(srcDir, "scene"),
    },
  },
  test: {
    // 1. 模拟浏览器环境 (让 globalThis.window 可用)
    // 需要安装: npm install -D jsdom
    environment: 'jsdom',

    // 2. 包含哪些文件作为测试文件
    // 默认是 **/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}
    // 如果你把测试都放在 tests/ 目录下，默认配置通常就能扫到，或者手动指定：
    include: ['tests/**/*.test.ts'],

    // 3. 全局 API (可选)
    // 如果设为 true，你就不需要在每个测试文件里 import { describe, it, expect } from 'vitest'
    globals: true,
  },
});