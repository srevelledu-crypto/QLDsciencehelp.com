// Light / dark / system theme toggle, remembered in localStorage (`qsh_theme`).
// The inline snippet in each page's <head> applies a saved choice before first
// paint; this module wires up the header button.
import { getItem, setItem, removeItem } from "./storage.js";

const KEY = "qsh_theme";
const ORDER = ["system", "light", "dark"];
const LABELS = { system: "System", light: "Light", dark: "Dark" };
const ICONS = {
  system:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/></svg>',
  light:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
  dark: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>',
};

function current() {
  const saved = getItem(KEY);
  return saved === "light" || saved === "dark" ? saved : "system";
}

function apply(mode) {
  const root = document.documentElement;
  if (mode === "system") {
    delete root.dataset.theme;
    removeItem(KEY);
  } else {
    root.dataset.theme = mode;
    setItem(KEY, mode);
  }
}

function render(button, mode) {
  const next = ORDER[(ORDER.indexOf(mode) + 1) % ORDER.length];
  button.innerHTML = `${ICONS[mode]}<span>${LABELS[mode]}</span>`;
  button.setAttribute("aria-label", `Colour theme: ${LABELS[mode]}. Activate to switch to ${LABELS[next]}.`);
  button.title = `Theme: ${LABELS[mode]} (click for ${LABELS[next]})`;
}

export function initTheme() {
  const button = document.querySelector("[data-theme-toggle]");
  if (!button) return;
  let mode = current();
  render(button, mode);
  button.hidden = false;
  button.addEventListener("click", () => {
    mode = ORDER[(ORDER.indexOf(mode) + 1) % ORDER.length];
    apply(mode);
    render(button, mode);
  });
}
