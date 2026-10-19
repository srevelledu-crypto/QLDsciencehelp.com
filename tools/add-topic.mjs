#!/usr/bin/env node
// Publish a bundled revision page as a topic.
//
//   node tools/add-topic.mjs <source.html> <topic-id-or-code> [--subject chemistry|physics] [--dry-run]
//
// Examples:
//   node tools/add-topic.mjs incoming/3.1.4_Acids_and_Bases.html chem-3-1-4
//   node tools/add-topic.mjs incoming/3.1.4_Acids_and_Bases.html 3.1.4 --subject chemistry
//
// What it does:
//   1. Copies the file to the topic's folder (e.g. chemistry/unit-3/3-1-4/index.html).
//   2. Inserts <script src="/assets/js/topic-chrome.js" defer></script> before </body>
//      if it isn't already there. Nothing else in the file is changed.
//   3. Sets the topic's status to "live" in assets/data/topics.js, and fills in
//      progressKey / workKey / subtitle from the page when it can detect them.
//
// No dependencies — plain Node 18+.

import { readFile, writeFile, mkdir, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const TOPICS_FILE = path.join(ROOT, "assets/data/topics.js");
const SCRIPT_TAG = '<script src="/assets/js/topic-chrome.js" defer></script>';

function fail(msg) {
  console.error(`\n✗ ${msg}\n`);
  process.exit(1);
}

function usage() {
  console.log(`Usage: node tools/add-topic.mjs <source.html> <topic-id-or-code> [--subject chemistry|physics] [--dry-run]

  <topic-id-or-code>  a topic id from assets/data/topics.js (e.g. chem-3-1-4)
                      or its code (e.g. 3.1.4) — add --subject if a code is ambiguous.`);
}

function decodeEntities(s) {
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

async function loadTopics(file) {
  // Import a fresh copy (cache-busted) so we always see the file as it is on disk.
  return import(pathToFileURL(file).href + `?t=${Date.now()}${Math.random()}`);
}

async function main() {
  const args = process.argv.slice(2);
  const flags = new Set(args.filter((a) => a.startsWith("--") && !a.includes("=")));
  const subjectIdx = args.indexOf("--subject");
  const subjectFilter = subjectIdx >= 0 ? args[subjectIdx + 1] : null;
  const positional = args.filter((a, i) => !a.startsWith("--") && !(subjectIdx >= 0 && i === subjectIdx + 1));
  if (flags.has("--help") || positional.length !== 2) {
    usage();
    process.exit(positional.length === 2 ? 0 : 1);
  }
  const dryRun = flags.has("--dry-run");
  const [sourceArg, topicArg] = positional;

  // ---- find the topic ----
  const data = await loadTopics(TOPICS_FILE);
  const all = data.allTopics().filter((t) => !subjectFilter || t.subject.id === subjectFilter);
  let topic = all.find((t) => t.id === topicArg);
  if (!topic) {
    const byCode = all.filter((t) => t.code === topicArg);
    if (byCode.length > 1) fail(`Code ${topicArg} exists in more than one subject — add --subject ${byCode.map((t) => t.subject.id).join(" or ")}.`);
    topic = byCode[0];
  }
  if (!topic) fail(`No topic "${topicArg}" in assets/data/topics.js. Add a line for it first (copy a neighbouring "coming-soon" line).`);
  if (!topic.url || !topic.url.startsWith("/") || !topic.url.endsWith("/")) fail(`Topic ${topic.id} needs a url like "/chemistry/unit-3/3-1-4/".`);

  // ---- read and patch the source ----
  const sourcePath = path.resolve(sourceArg);
  if (!existsSync(sourcePath)) fail(`Source file not found: ${sourceArg}`);
  let html = await readFile(sourcePath, "utf8");
  const bodyClose = html.lastIndexOf("</body>");
  if (bodyClose < 0) fail("The source file has no </body> tag — is it a complete HTML page?");
  let inserted = false;
  if (!html.includes('src="/assets/js/topic-chrome.js"')) {
    html = html.slice(0, bodyClose) + SCRIPT_TAG + "\n" + html.slice(bodyClose);
    inserted = true;
  }

  // ---- detect keys and title from the page ----
  const stepKey = (html.match(/\bSTEP_KEY\s*=\s*\\?["']([\w-]+)\\?["']/) || [])[1] || null;
  const workKey = (html.match(/\bWORK\s*=\s*\\?["']([\w-]+)\\?["']/) || [])[1] || null;
  const titleTag = (html.match(/<title>([\s\S]*?)<\/title>/i) || [])[1];
  let subtitle = null;
  if (titleTag) {
    subtitle = decodeEntities(titleTag)
      .replace(/\s+[—–|-]\s+.*$/, "") // drop " — QCE Chemistry Revision"
      .replace(/^\s*\d+(\.\d+)+\s*/, "") // drop leading "3.1.2 "
      .trim();
  }

  // ---- update the topic's line in topics.js ----
  const src = await readFile(TOPICS_FILE, "utf8");
  const lines = src.split("\n");
  const idx = lines.findIndex((l) => l.includes(`id: "${topic.id}"`));
  if (idx < 0) fail(`Couldn't find the line with id: "${topic.id}" in topics.js (keep each topic on one line).`);
  let line = lines[idx];
  const notes = [];
  const setField = (name, value, after) => {
    const re = new RegExp(`\\b${name}: "(?:[^"\\\\]|\\\\.)*"`);
    const lit = `${name}: ${JSON.stringify(value)}`;
    if (re.test(line)) line = line.replace(re, lit);
    else line = line.replace(new RegExp(`(\\b${after}: "(?:[^"\\\\]|\\\\.)*")`), `$1, ${lit}`);
  };
  setField("status", "live", "title");
  const clash = stepKey && data.allTopics().find((t) => t.id !== topic.id && t.progressKey === stepKey);
  if (clash) notes.push(`⚠ ${clash.code} already uses step key "${stepKey}" — is this the right file? Progress for the two topics would be shared.`);
  if (stepKey && stepKey !== topic.progressKey) {
    notes.push(`progressKey: "${topic.progressKey || ""}" → "${stepKey}" (detected in the page)`);
    setField("progressKey", stepKey, "url");
  } else if (!stepKey) {
    notes.push(`⚠ Couldn't detect STEP_KEY in the page; keeping progressKey "${topic.progressKey}". Check it matches the page.`);
  }
  if (workKey && workKey !== topic.workKey) {
    notes.push(`workKey → "${workKey}"`);
    setField("workKey", workKey, "progressKey");
  }
  if (!topic.subtitle && subtitle && subtitle !== topic.title) {
    notes.push(`subtitle → "${subtitle}" (from the page <title>)`);
    setField("subtitle", subtitle, "title");
  }
  lines[idx] = line;
  const newSrc = lines.join("\n");

  // Validate the edited data file before saving it.
  const tmp = path.join(path.dirname(TOPICS_FILE), `.topics-check-${process.pid}.mjs`);
  await writeFile(tmp, newSrc);
  try {
    const check = await loadTopics(tmp);
    const t = check.allTopics().find((x) => x.id === topic.id);
    if (!t || t.status !== "live") throw new Error("topic not live after edit");
  } catch (e) {
    await rm(tmp, { force: true });
    fail(`Editing topics.js produced an invalid file (${e.message}). Nothing was changed.`);
  }
  await rm(tmp, { force: true });

  const destDir = path.join(ROOT, topic.url);
  const dest = path.join(destDir, "index.html");
  console.log(`\nTopic   ${topic.code} ${topic.title}  (${topic.id})`);
  const relSource = path.relative(ROOT, sourcePath);
  console.log(`Source  ${relSource.startsWith("..") ? sourcePath : relSource}`);
  console.log(`Output  ${path.relative(ROOT, dest)}`);
  console.log(`Script  ${inserted ? "inserted topic-chrome.js before </body>" : "already present — file copied unchanged"}`);
  for (const n of notes) console.log(`Data    ${n}`);
  if (dryRun) {
    console.log("\n(dry run — nothing written)\n");
    return;
  }
  await mkdir(destDir, { recursive: true });
  await writeFile(dest, html);
  await writeFile(TOPICS_FILE, newSrc);
  console.log(`\n✓ ${topic.code} is live. Next: node tools/build-sitemap.mjs, preview locally, then commit and push.\n`);
}

main().catch((e) => fail(e.stack || String(e)));
