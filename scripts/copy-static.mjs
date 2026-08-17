import { copyFile, mkdir } from "node:fs/promises";

const files = [
  "404.html",
  "_headers",
  "browserconfig.xml",
  "favicon.ico",
  "humans.txt",
  "robots.txt",
  "sitemap.xml",
  "tile-wide.png",
  "tile.png",
];

await mkdir("dist", { recursive: true });
await Promise.all(files.map((file) => copyFile(file, `dist/${file}`)));
