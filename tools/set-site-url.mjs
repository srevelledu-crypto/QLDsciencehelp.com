#!/usr/bin/env node
// Rewrite canonical / Open Graph URLs in the site pages to match SITE_URL in assets/js/config.js.
// Run after changing SITE_URL (e.g. when your custom domain is ready), then run build-sitemap.mjs:
//   node tools/set-site-url.mjs && node tools/build-sitemap.mjs
// Only the site's own pages are touched — never the revision (topic) pages.
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const { SITE_URL } = await import(pathToFileURL(path.join(ROOT, "assets/js/config.js")).href);
const base = String(SITE_URL).replace(/\/+$/, "");
if (!/^https?:\/\/[^/]+$/.test(base)) {
  console.error(`✗ SITE_URL should look like https://example.com — got "${SITE_URL}"`);
  process.exit(1);
}

const PAGES = ["index.html", "chemistry/index.html", "physics/index.html", "about/index.html", "contact/index.html", "disclaimer/index.html", "404.html"];
const RE = /(<link rel="canonical" href="|<meta property="og:(?:url|image)" content=")https?:\/\/[^/"]+/g;

let changed = 0;
for (const rel of PAGES) {
  const file = path.join(ROOT, rel);
  const html = await readFile(file, "utf8");
  const out = html.replace(RE, `$1${base}`);
  if (out !== html) {
    await writeFile(file, out);
    changed++;
  }
}
console.log(`✓ ${changed} page(s) updated to ${base}`);
