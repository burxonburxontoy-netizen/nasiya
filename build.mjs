// Build: node build.mjs  ->  dist/
import { build } from "esbuild";
import { cpSync, mkdirSync, rmSync, copyFileSync } from "node:fs";

rmSync("dist", { recursive: true, force: true });
mkdirSync("dist/assets", { recursive: true });
await build({
  entryPoints: ["src/main.jsx"],
  bundle: true, minify: true, format: "esm", target: "es2020",
  jsx: "automatic", outfile: "dist/assets/app.js",
  define: { "process.env.NODE_ENV": '"production"' },
  nodePaths: process.env.NODE_PATH ? process.env.NODE_PATH.split(":") : [],
  logLevel: "info",
});
copyFileSync("src/styles.css", "dist/assets/styles.css");
copyFileSync("index.html", "dist/index.html");
cpSync("public", "dist", { recursive: true });
console.log("✓ dist/ tayyor");
