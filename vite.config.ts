import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";
import { execSync } from "node:child_process";

// 版本号：构建日期（北京时间）+ 提交号，显示在「我的」页
const buildDate = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Shanghai" });
let commit = "dev";
try {
  commit = execSync("git rev-parse --short HEAD", { stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
} catch {
  // 不在 git 仓库里构建时用 dev
}
const appVersion = [buildDate, commit, process.env.BUILD_TAG].filter(Boolean).join(" · ");

// 部署到 GitHub Pages 的项目站点时设置 BASE_PATH=/<仓库名>/
export default defineConfig({
  base: process.env.BASE_PATH ?? "/",
  define: { __APP_VERSION__: JSON.stringify(appVersion) },
  plugins: [
    react(),
    VitePWA({
      registerType: "prompt",
      includeAssets: ["favicon.svg", "apple-touch-icon.png"],
      manifest: {
        name: "Skill Up EDU",
        short_name: "Skill Up",
        description: "江苏自考 计算机科学与技术（专升本）学习助手",
        lang: "zh-CN",
        start_url: ".",
        scope: ".",
        display: "standalone",
        orientation: "portrait",
        background_color: "#ffffff",
        theme_color: "#4f46e5",
        icons: [
          { src: "icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icons/icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,webmanifest}"],
      },
    }),
  ],
});
