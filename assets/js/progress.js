// Read-only progress tracking. The revision pages write their own step keys;
// this module only reads them (and clears them on request from the About page).
import { STEPS, allTopics, findTopic, subjectTopics, unitTopics } from "../data/topics.js";
import { getItem, getJSON, removeItem } from "./storage.js";

export const RECENT_KEY = "qsh_recent";
export const THEME_KEY = "qsh_theme";
export const TOTAL_STEPS = STEPS.length;

/** Visited step indices for a topic, from `<progressKey>_v`. */
export function visitedSteps(topic) {
  if (!topic || !topic.progressKey) return [];
  const v = getJSON(topic.progressKey + "_v");
  if (!Array.isArray(v)) return [];
  const steps = v.map(Number).filter((n) => Number.isInteger(n) && n >= 0 && n < TOTAL_STEPS);
  return [...new Set(steps)].sort((a, b) => a - b);
}

/** { done, total, state: "not-started" | "in-progress" | "completed", label } */
export function topicProgress(topic) {
  const done = topic && topic.status === "live" ? visitedSteps(topic).length : 0;
  const state = done === 0 ? "not-started" : done >= TOTAL_STEPS ? "completed" : "in-progress";
  const label =
    state === "not-started" ? "Not started" : state === "completed" ? "Completed" : `In progress (${done}/${TOTAL_STEPS})`;
  return { done, total: TOTAL_STEPS, state, label };
}

/** Current step index the page last showed, or null. */
export function currentStep(topic) {
  const raw = getItem(topic.progressKey);
  const n = raw == null ? NaN : Number(raw);
  return Number.isInteger(n) && n >= 0 && n < TOTAL_STEPS ? n : null;
}

/** Summary over a list of topics (only live topics count). */
export function summarise(topics) {
  const live = topics.filter((t) => t.status === "live");
  let steps = 0;
  let completed = 0;
  let started = 0;
  for (const t of live) {
    const p = topicProgress(t);
    steps += p.done;
    if (p.state === "completed") completed++;
    if (p.state !== "not-started") started++;
  }
  const totalSteps = live.length * TOTAL_STEPS;
  return {
    liveCount: live.length,
    totalCount: topics.length,
    completed,
    started,
    steps,
    totalSteps,
    fraction: totalSteps ? steps / totalSteps : 0,
  };
}

export const unitSummary = (unit) => summarise(unitTopics(unit));
export const subjectSummary = (subject) => summarise(subjectTopics(subject));

export function summaryLabel(s) {
  if (s.liveCount === 0) return "No topics available yet";
  const avail = `${s.liveCount} topic${s.liveCount === 1 ? "" : "s"} available`;
  if (s.started === 0) return `${avail} · Not started`;
  return `${s.completed} of ${s.liveCount} completed · ${s.steps}/${s.totalSteps} steps visited`;
}

/** The most recently viewed live topic recorded by topic-chrome.js, or null. */
export function recentTopic() {
  const r = getJSON(RECENT_KEY);
  if (!r || typeof r.id !== "string") return null;
  const topic = findTopic(r.id);
  if (!topic || topic.status !== "live") return null;
  return { topic, time: Number(r.t) || null };
}

/** Every localStorage key this site knows about (for "Reset my progress"). */
export function knownKeys() {
  const keys = [RECENT_KEY];
  for (const t of allTopics()) {
    if (t.progressKey) keys.push(t.progressKey, t.progressKey + "_v");
    if (t.workKey) keys.push(t.workKey);
  }
  return keys;
}

export function resetProgress() {
  let ok = true;
  for (const k of knownKeys()) ok = removeItem(k) && ok;
  return ok;
}
