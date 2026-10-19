#!/usr/bin/env node
// Deploy-time only: prefix the site's root paths ("/assets/…", "/chemistry/…") with a base
// path, so the site also works when GitHub Pages serves it from a sub-folder such as
// https://<user>.github.io/QLDsciencehelp.com/ (before a custom domain is set up).
//
//   node tools/apply-base-path.mjs <published-folder> <base-path>
//
// The deploy workflow runs this on its COPY of the site (_site), never on the repo. With an
// empty base path (custom domain, or a <user>.github.io repo) it does nothing.
// In the revision pages only the topic-chrome.js script tag is touched.
import { readFile, writeFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const [dirArg, baseArg = ""] = process.argv.slice(2);
if (!dirArg) {
  console.error("Usage: node tools/apply-base-path.mjs <published-folder> <base-path>");
  process.exit(1);
}
const base = baseArg.replace(/\/+$/, "");
if (!base) {
  console.log("✓ No base path — site is served from the domain root; nothing to change.");
  process.exit(0);
}
if (!/^\/[\w.\-/]+$/.test(base)) {
  console.error(`✗ Unexpected base path "${baseArg}"`);
  process.exit(1);
}

const DIR = path.resolve(dirArg);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const { allTopics } = await import(pathToFileURL(path.join(ROOT, "assets/data/topics.js")).href);
const topicPages = new Set(allTopics().map((t) => path.join(DIR, t.url, "index.html")));
const TAG = '<script src="/assets/js/topic-chrome.js" defer></script>';

async function files(dir) {
  const out = [];
  for (const name of await readdir(dir)) {
    const p = path.join(dir, name);
    if ((await stat(p)).isDirectory()) out.push(...(await files(p)));
    else out.push(p);
  }
  return out;
}

let changed = 0;
for (const file of await files(DIR)) {
  const ext = path.extname(file);
  if (![".html", ".js", ".css"].includes(ext)) continue;
  const src = await readFile(file, "utf8");
  let out = src;
  if (topicPages.has(file)) {
    out = src.replace(TAG, TAG.replace('src="/', `src="${base}/`));
  } else if (ext === ".html") {
    out = src.replace(/\b(href|src)="\/(?!\/)/g, `$1="${base}/`);
  } else if (ext === ".css") {
    out = src.replace(/url\("\/(?!\/)/g, `url("${base}/`);
  } else if (file.endsWith(path.join("assets", "data", "topics.js"))) {
    out = src.replace(/\burl: "\/(?!\/)/g, `url: "${base}/`);
  } else if (file.endsWith(path.join("assets", "js", "topic-chrome.js"))) {
    out = src.replace('var BASE = "/assets/";', `var BASE = "${base}/assets/";`).replace('href="/" aria-label', `href="${base}/" aria-label`);
  }
  if (out !== src) {
    await writeFile(file, out);
    changed++;
  }
}
console.log(`✓ Prefixed root paths with ${base} in ${changed} file(s).`);
