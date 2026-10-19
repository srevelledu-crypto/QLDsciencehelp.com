#!/usr/bin/env node
// Sanity checks run before every deploy (and handy locally):
//   node tools/check-site.mjs
// - topics.js: unique ids/keys, valid status and URLs, live pages exist with topic-chrome.js
// - every internal href/src on the site pages and in topics.js points at a real file
import { readFile, readdir, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const { allTopics, SUBJECTS } = await import(pathToFileURL(path.join(ROOT, "assets/data/topics.js")).href);
const errors = [];
const err = (m) => errors.push(m);

// ---- topic data ----
const topics = allTopics();
const seen = new Map();
for (const t of topics) {
  for (const field of ["id", "progressKey", "url"]) {
    const key = `${field}:${t[field]}`;
    if (seen.has(key)) err(`Duplicate ${field} "${t[field]}" (${seen.get(key)} and ${t.code})`);
    seen.set(key, t.code);
  }
  if (!["live", "coming-soon"].includes(t.status)) err(`${t.id}: status must be "live" or "coming-soon"`);
  if (!/^\/[a-z0-9/-]+\/$/.test(t.url)) err(`${t.id}: url should look like /chemistry/unit-3/3-1-1/`);
  if (t.status === "live") {
    const file = path.join(ROOT, t.url, "index.html");
    if (!existsSync(file)) err(`${t.id} is live but ${path.relative(ROOT, file)} is missing`);
    else if (!(await readFile(file, "utf8")).includes('<script src="/assets/js/topic-chrome.js" defer></script>'))
      err(`${t.id}: ${path.relative(ROOT, file)} is missing the topic-chrome.js script tag`);
  }
}
for (const s of SUBJECTS) if (!existsSync(path.join(ROOT, s.url, "index.html"))) err(`Subject page ${s.url} missing`);

// ---- internal links on site pages ----
async function htmlFiles(dir) {
  const out = [];
  for (const name of await readdir(dir)) {
    if (name.startsWith(".") || ["node_modules", "incoming", "tools", "_site"].includes(name)) continue;
    const p = path.join(dir, name);
    const st = await stat(p);
    if (st.isDirectory()) out.push(...(await htmlFiles(p)));
    else if (name.endsWith(".html")) out.push(p);
  }
  return out;
}
const livePages = new Set(topics.filter((t) => t.status === "live").map((t) => path.join(ROOT, t.url, "index.html")));
function resolves(url) {
  const clean = url.split("#")[0].split("?")[0];
  if (!clean) return true;
  const p = path.join(ROOT, decodeURIComponent(clean));
  return clean.endsWith("/") ? existsSync(path.join(p, "index.html")) : existsSync(p);
}
for (const file of await htmlFiles(ROOT)) {
  if (livePages.has(file)) continue; // bundled revision pages: not ours to lint
  const html = await readFile(file, "utf8");
  for (const m of html.matchAll(/\b(?:href|src)="(\/[^"]*)"/g)) {
    if (!resolves(m[1])) err(`${path.relative(ROOT, file)}: broken link ${m[1]}`);
  }
}
for (const t of topics) if (t.status === "live" && !resolves(t.url)) err(`topics.js: ${t.url} does not resolve`);
for (const f of ["assets/img/logo.png", "assets/img/logo-mark.png", "assets/js/topic-chrome.js", "favicon.ico", "sitemap.xml", "robots.txt"])
  if (!existsSync(path.join(ROOT, f))) err(`Missing ${f}`);

if (errors.length) {
  console.error(`✗ ${errors.length} problem(s):\n  - ${errors.join("\n  - ")}`);
  process.exit(1);
}
console.log(`✓ ${topics.length} topics (${livePages.size} live) and all internal links OK`);
