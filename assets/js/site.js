// Entry point for every site page (not the revision pages — they use topic-chrome.js).
import { SUBJECTS, STEPS, allTopics } from "../data/topics.js";
import { CONTACT_EMAIL } from "./config.js";
import { initSearch } from "./search.js";
import { initAnalytics } from "./analytics.js";
import { storageAvailable } from "./storage.js";
import {
  currentStep,
  recentTopic,
  resetProgress,
  subjectSummary,
  summaryLabel,
  topicProgress,
  unitSummary,
  visitedSteps,
} from "./progress.js";

const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

const CHECK = '<svg viewBox="0 0 20 20" aria-hidden="true"><path fill="currentColor" d="M8 13.6 4.4 10l-1.4 1.4L8 16.4 17 7.4 15.6 6z"/></svg>';

// ---------- Shared fragments ----------

function stepsMeter(topic) {
  const visited = new Set(visitedSteps(topic));
  return `<div class="steps-meter" aria-hidden="true">${STEPS.map((_, i) => `<span class="${visited.has(i) ? "on" : ""}"></span>`).join("")}</div>`;
}

function progressLabel(p) {
  return `<span class="progress-label" data-state="${p.state}">${p.state === "completed" ? CHECK : ""}<span><span class="visually-hidden">Progress: </span>${esc(p.label)}</span></span>`;
}

function barMeter(fraction) {
  const pct = Math.round(Math.max(0, Math.min(1, fraction)) * 100);
  return `<div class="bar-meter" aria-hidden="true"><span style="width:${pct}%"></span></div>`;
}

function topicCard(t) {
  if (t.status !== "live") {
    return `<div class="card topic-card is-soon" id="${esc(t.id)}">
      <div class="topic-head"><span class="topic-code">${esc(t.code)}</span><span class="badge">Coming soon</span></div>
      <h4 class="topic-title">${esc(t.title)}</h4>
    </div>`;
  }
  const p = topicProgress(t);
  return `<a class="card topic-card" id="${esc(t.id)}" href="${esc(t.url)}">
    <div class="topic-head"><span class="topic-code">${esc(t.code)}</span>${p.state === "completed" ? '<span class="badge badge-done">Done</span>' : ""}</div>
    <h4 class="topic-title">${esc(t.title)}</h4>
    ${t.subtitle ? `<p class="topic-sub">${esc(t.subtitle)}</p>` : ""}
    <div class="topic-foot">${stepsMeter(t)}${progressLabel(p)}</div>
  </a>`;
}

// ---------- Home ----------

function relativeTime(ms) {
  if (!ms) return "";
  const mins = Math.round((Date.now() - ms) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} minute${mins === 1 ? "" : "s"} ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs === 1 ? "" : "s"} ago`;
  const days = Math.round(hrs / 24);
  return days < 30 ? `${days} day${days === 1 ? "" : "s"} ago` : new Date(ms).toLocaleDateString("en-AU");
}

function renderContinue(el) {
  const recent = recentTopic();
  const firstLive = allTopics().find((t) => t.status === "live");
  if (!recent && !firstLive) {
    el.hidden = true;
    return;
  }
  if (!recent) {
    el.innerHTML = `<div class="card continue-card">
      <p class="eyebrow">Start here</p>
      <h2>${esc(firstLive.code)} ${esc(firstLive.title)}</h2>
      <p class="muted" style="margin:0">Pick any topic below — or start at the beginning of ${esc(firstLive.subject.name)} Unit ${firstLive.unit.number}.
      Your progress is remembered on this device only.</p>
      <div class="actions"><a class="btn" href="${esc(firstLive.url)}">Start ${esc(firstLive.code)}</a></div>
    </div>`;
    return;
  }
  const t = recent.topic;
  const p = topicProgress(t);
  const step = currentStep(t);
  const when = relativeTime(recent.time);
  el.innerHTML = `<div class="card continue-card">
    <p class="eyebrow">Continue where you left off</p>
    <h2><span class="topic-code">${esc(t.code)}</span> ${esc(t.title)}</h2>
    <p class="muted" style="margin:0">${esc(t.subject.name)} · Unit ${t.unit.number}${t.subtitle ? " · " + esc(t.subtitle) : ""}${
      step != null ? ` · Last step: ${esc(STEPS[step])}` : ""
    }${when ? ` · Viewed ${esc(when)}` : ""}</p>
    <div style="display:grid;gap:.4rem;max-width:22rem">${stepsMeter(t)}${progressLabel(p)}</div>
    <div class="actions"><a class="btn" href="${esc(t.url)}">${p.state === "completed" ? "Revisit" : "Continue"} ${esc(t.code)}</a></div>
  </div>`;
}

function renderSubjectCards(el) {
  el.innerHTML = SUBJECTS.map((s) => {
    const sum = subjectSummary(s);
    const soon = s.status !== "live";
    const units = s.units.map((u) => `<li>Unit ${u.number}: ${esc(u.title)}</li>`).join("");
    return `<a class="card subject-card${soon ? " is-soon" : ""}" href="${esc(s.url)}">
      <div class="topic-head"><h3>${esc(s.name)}</h3>${soon ? '<span class="badge">Coming soon</span>' : ""}</div>
      <p class="muted" style="margin:0">${esc(s.blurb)}</p>
      <ul>${units}</ul>
      ${
        soon
          ? '<p class="progress-label" style="margin:0">Revision pages are on the way.</p>'
          : `<div style="display:grid;gap:.35rem">${barMeter(sum.fraction)}<span class="progress-label">${esc(summaryLabel(sum))}</span></div>`
      }
      <span class="cta">${soon ? "See what's planned" : `Open ${esc(s.name)}`} <span aria-hidden="true">→</span></span>
    </a>`;
  }).join("");
}

// ---------- Subject page ----------

function renderSubject(el, subject) {
  const sum = subjectSummary(subject);
  const summaryEl = document.querySelector("[data-subject-summary]");
  if (summaryEl && sum.liveCount) {
    summaryEl.innerHTML = `${barMeter(sum.fraction)}<span class="progress-label">Your progress in ${esc(subject.name)}: ${esc(summaryLabel(sum))}</span>`;
  }
  el.innerHTML = subject.units
    .map((u) => {
      const us = unitSummary(u);
      const groups = u.groups
        .map(
          (g) => `<section class="group" id="${esc(u.id)}-topic-${g.number}" aria-labelledby="${esc(u.id)}-g${g.number}-h">
            <h3 id="${esc(u.id)}-g${g.number}-h">Topic ${g.number}: ${esc(g.title)}</h3>
            ${
              g.topics.length
                ? `<div class="grid">${g.topics.map(topicCard).join("")}</div>`
                : `<p class="placeholder-card"><span class="badge">Coming soon</span> Revision pages for this topic are being written.</p>`
            }
          </section>`
        )
        .join("");
      return `<section class="unit" id="${esc(u.id)}" aria-labelledby="${esc(u.id)}-h">
        <div class="unit-head">
          <div><p class="eyebrow">Unit ${u.number}</p><h2 id="${esc(u.id)}-h">${esc(u.title)}</h2></div>
          ${
            us.liveCount
              ? `<div class="unit-progress">${barMeter(us.fraction)}<span class="progress-label">${esc(summaryLabel(us))}</span></div>`
              : '<span class="badge">Coming soon</span>'
          }
        </div>
        ${groups}
      </section>`;
    })
    .join("");
  // Re-apply a #hash target now that the cards exist.
  if (location.hash) {
    const target = document.getElementById(decodeURIComponent(location.hash.slice(1)));
    if (target) {
      target.scrollIntoView();
      if (!target.matches("a")) target.setAttribute("tabindex", "-1");
      target.focus({ preventScroll: true });
    }
  }
}

// ---------- About: reset ----------

function initReset(button) {
  const status = document.querySelector("[data-reset-status]");
  if (!storageAvailable()) {
    button.disabled = true;
    if (status) status.textContent = "This browser isn't letting the site store anything, so there is no progress to reset.";
    return;
  }
  button.addEventListener("click", () => {
    const ok = window.confirm(
      "Reset your progress on this device?\n\nThis clears the steps you've visited, the answers saved on each revision page, and your 'continue where you left off' topic. It can't be undone."
    );
    if (!ok) return;
    const done = resetProgress();
    if (status) status.textContent = done ? "Done — your progress on this device has been cleared." : "Some items couldn't be cleared.";
  });
}

// ---------- Contact ----------

function renderContact(el) {
  const email = String(CONTACT_EMAIL || "").trim();
  if (!email) return; // keep the "coming soon" text from the HTML
  el.innerHTML = `<a href="mailto:${esc(email)}">${esc(email)}</a>`;
}

// ---------- Boot ----------

function run(name, fn) {
  try {
    fn();
  } catch (err) {
    console.error(`[qsh] ${name} failed`, err);
  }
}

run("search", initSearch);
run("analytics", () => initAnalytics());
run("year", () => document.querySelectorAll("[data-year]").forEach((e) => (e.textContent = String(new Date().getFullYear()))));
run("continue", () => document.querySelectorAll("[data-continue]").forEach(renderContinue));
run("subject-cards", () => document.querySelectorAll("[data-subject-cards]").forEach(renderSubjectCards));
run("subject", () =>
  document.querySelectorAll("[data-subject]").forEach((el) => {
    const s = SUBJECTS.find((x) => x.id === el.dataset.subject);
    if (s) renderSubject(el, s);
  })
);
run("reset", () => document.querySelectorAll("[data-reset-progress]").forEach(initReset));
run("contact", () => document.querySelectorAll("[data-contact-email]").forEach(renderContact));

// Progress changes in another tab (e.g. a revision page) refresh the cards.
window.addEventListener("pageshow", (e) => {
  if (e.persisted) location.reload();
});
