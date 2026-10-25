// Client-side topic search over topics.js. Implements the ARIA combobox +
// listbox pattern: ↑/↓ move, Enter opens, Esc closes, "/" focuses the box.
import { SUBJECTS, allTopics } from "../data/topics.js";

const MAX_RESULTS = 8;

/** Lower-case, strip accents and punctuation so "bronsted" finds "Brønsted–Lowry". */
export function fold(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/ø/g, "o")
    .replace(/æ/g, "ae")
    .replace(/ß/g, "ss")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[‐-―−]/g, "-")
    .replace(/[^a-z0-9.\- ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function buildIndex() {
  const entries = allTopics().map((t) => ({
    kind: "topic",
    code: t.code,
    title: t.title,
    subtitle: t.subtitle || "",
    live: t.status === "live",
    href: t.status === "live" ? t.url : `${t.subject.url}#${t.id}`,
    meta: `${t.subject.name} · Unit ${t.unit.number}${t.subtitle ? " · " + t.subtitle : ""}`,
    fields: {
      code: fold(t.code),
      title: fold(t.title),
      subtitle: fold(t.subtitle),
      other: fold([t.subject.name, `unit ${t.unit.number}`, t.unit.title, t.group.title, ...(t.keywords || [])].join(" ")),
    },
  }));
  // Topic groups that don't have numbered subtopics yet (e.g. Physics) are still searchable.
  for (const subject of SUBJECTS) {
    for (const unit of subject.units) {
      for (const group of unit.groups) {
        if (group.topics.length) continue;
        entries.push({
          kind: "group",
          code: `${unit.number}.${group.number}`,
          title: group.title,
          subtitle: "",
          live: false,
          href: `${subject.url}#${unit.id}-topic-${group.number}`,
          meta: `${subject.name} · Unit ${unit.number}: ${unit.title}`,
          fields: {
            code: fold(`${unit.number}.${group.number}`),
            title: fold(group.title),
            subtitle: "",
            other: fold([subject.name, `unit ${unit.number}`, unit.title].join(" ")),
          },
        });
      }
    }
  }
  return entries;
}

let INDEX = null;

export function search(query) {
  INDEX = INDEX || buildIndex();
  const q = fold(query);
  if (!q) return [];
  const terms = q.split(" ");
  const scored = [];
  for (const e of INDEX) {
    let score = 0;
    let ok = true;
    for (const term of terms) {
      const f = e.fields;
      let s = 0;
      if (f.code === term) s = 100;
      else if (f.code.startsWith(term)) s = 60;
      else if (f.title.startsWith(term)) s = 40;
      else if ((" " + f.title).includes(" " + term)) s = 30;
      else if (f.title.includes(term)) s = 20;
      else if ((" " + f.subtitle).includes(" " + term)) s = 18;
      else if (f.subtitle.includes(term)) s = 12;
      else if ((" " + f.other).includes(" " + term)) s = 8;
      else if (term.length > 2 && f.other.includes(term)) s = 4;
      if (!s) {
        ok = false;
        break;
      }
      score += s;
    }
    if (ok) scored.push({ e, score: score + (e.live ? 15 : 0) }); // prefer published pages on close matches
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, MAX_RESULTS).map((s) => s.e);
}

function escapeHTML(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

let uid = 0;

function setupBox(root) {
  const input = root.querySelector(".search-input");
  const list = root.querySelector(".search-results");
  const status = root.querySelector(".search-status");
  if (!input || !list) return;
  const id = `search-${++uid}`;
  list.id = list.id || `${id}-list`;
  input.setAttribute("aria-controls", list.id);
  let results = [];
  let active = -1;

  function close() {
    list.hidden = true;
    input.setAttribute("aria-expanded", "false");
    input.removeAttribute("aria-activedescendant");
    active = -1;
  }

  function highlight(i) {
    const options = list.querySelectorAll('[role="option"]');
    options.forEach((o, j) => o.setAttribute("aria-selected", String(j === i)));
    active = i;
    if (i >= 0 && options[i]) {
      input.setAttribute("aria-activedescendant", options[i].id);
      options[i].scrollIntoView({ block: "nearest" });
    } else {
      input.removeAttribute("aria-activedescendant");
    }
  }

  function update() {
    const q = input.value;
    if (!q.trim()) {
      results = [];
      list.innerHTML = "";
      if (status) status.textContent = "";
      close();
      return;
    }
    results = search(q);
    if (!results.length) {
      list.innerHTML = `<li class="search-empty" role="presentation">No topics match “${escapeHTML(q.trim())}”.</li>`;
    } else {
      list.innerHTML = results
        .map(
          (r, i) => `<li class="search-option" role="option" id="${id}-opt-${i}" aria-selected="false">
            <a href="${escapeHTML(r.href)}" tabindex="-1">
              <span class="r-code">${escapeHTML(r.code)}</span>
              <span><span class="r-title">${escapeHTML(r.title)}</span>${r.live ? "" : ' <span class="badge">Coming soon</span>'}</span>
              <span class="r-meta">${escapeHTML(r.meta)}</span>
            </a></li>`
        )
        .join("");
    }
    if (status) {
      status.textContent = results.length
        ? `${results.length} result${results.length === 1 ? "" : "s"}. Use up and down arrows to choose.`
        : "No results.";
    }
    list.hidden = false;
    input.setAttribute("aria-expanded", "true");
    highlight(-1);
  }

  function go(i) {
    const r = results[i];
    if (r) window.location.href = r.href;
  }

  input.addEventListener("input", update);
  input.addEventListener("focus", () => {
    if (input.value.trim()) update();
  });
  input.addEventListener("keydown", (ev) => {
    const n = results.length;
    if (ev.key === "ArrowDown") {
      ev.preventDefault();
      if (list.hidden) update();
      if (n) highlight((active + 1) % n);
    } else if (ev.key === "ArrowUp") {
      ev.preventDefault();
      if (n) highlight(active <= 0 ? n - 1 : active - 1);
    } else if (ev.key === "Enter") {
      if (!list.hidden && n) {
        ev.preventDefault();
        go(active >= 0 ? active : 0);
      }
    } else if (ev.key === "Escape") {
      if (!list.hidden) {
        ev.preventDefault();
        close();
      } else if (input.value) {
        input.value = "";
        update();
      } else {
        input.blur();
      }
    } else if (ev.key === "Home" && active >= 0) {
      ev.preventDefault();
      highlight(0);
    } else if (ev.key === "End" && active >= 0) {
      ev.preventDefault();
      highlight(n - 1);
    }
  });
  list.addEventListener("mousedown", (ev) => ev.preventDefault()); // keep focus in the input
  list.addEventListener("mousemove", (ev) => {
    const li = ev.target.closest('[role="option"]');
    if (li) highlight([...list.children].indexOf(li));
  });
  document.addEventListener("click", (ev) => {
    if (!root.contains(ev.target)) close();
  });
  input.addEventListener("blur", () => setTimeout(() => !root.contains(document.activeElement) && close(), 0));
}

export function initSearch() {
  const boxes = [...document.querySelectorAll("[data-search]")];
  boxes.forEach(setupBox);
  document.addEventListener("keydown", (ev) => {
    if (ev.key !== "/" || ev.ctrlKey || ev.metaKey || ev.altKey) return;
    const t = ev.target;
    if (t && (t.isContentEditable || /^(input|textarea|select)$/i.test(t.tagName))) return;
    // Prefer the page's main search (home hero) over the header box.
    const target = boxes
      .map((b) => b.querySelector(".search-input"))
      .filter((i) => i && i.offsetParent !== null)
      .sort((a, b) => (b.closest("[data-search-primary]") ? 1 : 0) - (a.closest("[data-search-primary]") ? 1 : 0))[0];
    if (target) {
      ev.preventDefault();
      target.focus();
      target.select();
    }
  });
}
