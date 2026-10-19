#!/usr/bin/env node
// Regenerate sitemap.xml and robots.txt from assets/data/topics.js and SITE_URL in assets/js/config.js.
// Only LIVE topic pages are listed. Run after adding a topic or changing SITE_URL:
//   node tools/build-sitemap.mjs
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const { SUBJECTS, allTopics } = await import(pathToFileURL(path.join(ROOT, "assets/data/topics.js")).href);
const { SITE_URL } = await import(pathToFileURL(path.join(ROOT, "assets/js/config.js")).href);

const base = String(SITE_URL).replace(/\/+$/, "");
const today = new Date().toISOString().slice(0, 10);
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");

const pages = [
  { loc: "/", priority: "1.0" },
  ...SUBJECTS.map((s) => ({ loc: s.url, priority: s.status === "live" ? "0.9" : "0.5" })),
  ...allTopics()
    .filter((t) => t.status === "live")
    .map((t) => ({ loc: t.url, priority: "0.8" })),
  { loc: "/about/", priority: "0.4" },
  { loc: "/contact/", priority: "0.3" },
  { loc: "/disclaimer/", priority: "0.3" },
];

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages.map((p) => `  <url><loc>${esc(base + p.loc)}</loc><lastmod>${today}</lastmod><priority>${p.priority}</priority></url>`).join("\n")}
</urlset>
`;
await writeFile(path.join(ROOT, "sitemap.xml"), xml);
await writeFile(path.join(ROOT, "robots.txt"), `User-agent: *\nAllow: /\n\nSitemap: ${base}/sitemap.xml\n`);
console.log(`✓ sitemap.xml (${pages.length} URLs) and robots.txt written for ${base}`);
