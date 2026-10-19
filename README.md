# QLDsciencehelp.com

Revision pages for the QCE Chemistry and Physics syllabuses, written by a Brisbane-based teacher, with one page per syllabus topic.

This is a **pure static site**: plain HTML, CSS and vanilla JavaScript. There's no framework, no build step, no backend, no cookies and no forms. The site never collects or sends personal information. Progress is read from the browser's own `localStorage`, which never leaves the student's device.

## Folder structure

```
/index.html                 Home
/chemistry/index.html       Chemistry topics (rendered from topics.js)
/chemistry/unit-3/3-1-1/    A revision page (the bundled file, plus one script tag)
/physics/index.html         Physics (coming soon)
/about/  /contact/  /disclaimer/  /404.html
/assets/data/topics.js      ← single source of truth for every subject, unit and topic
/assets/js/config.js        ← SITE_URL, CONTACT_EMAIL, ANALYTICS_TOKEN
/assets/js/topic-chrome.js  Top bar + prev/next buttons injected into revision pages
/assets/js/site.js          Entry point for the site pages (search, progress, …)
/assets/css/site.css        All site styles (design tokens are CSS custom properties)
/assets/fonts/              IBM Plex Sans/Serif, self-hosted woff2 (SIL OFL, see OFL.txt)
/assets/img/                Logo, logo variants, icons, social-share image
/tools/                     Node helpers (no dependencies): add-topic, build-sitemap, set-site-url, check-site
/incoming/                  Drop new bundled pages here (not committed)
```

## Preview locally

The site uses root-relative paths (`/assets/...`), so serve it from the repo root rather than opening the files directly:

```sh
npx serve .
# or
python3 -m http.server 8080      # then open http://localhost:8080
```

Python's server doesn't show `404.html` for missing pages, but GitHub Pages does.

## Add a new topic page

1. Put the bundled HTML file in `incoming/`.
2. Run the tool with the topic's **id** from `assets/data/topics.js`, or its **code**:

   ```sh
   node tools/add-topic.mjs incoming/3.1.4_Acids_and_Bases.html chem-3-1-4
   node tools/add-topic.mjs incoming/3.1.4_Acids_and_Bases.html 3.1.4          # same thing
   node tools/add-topic.mjs incoming/3.1.4_Acids_and_Bases.html 3.1.4 --dry-run  # preview only
   ```

   The tool:
   - copies the file to the topic's folder (e.g. `chemistry/unit-3/3-1-4/index.html`);
   - inserts `<script src="/assets/js/topic-chrome.js" defer></script>` before `</body>` if it isn't already there. Nothing else in the file changes;
   - sets the topic's `status` to `"live"` in `topics.js`;
   - reads the page's `STEP_KEY` and `WORK` localStorage keys and fills in `progressKey` / `workKey`. It warns if another topic already uses the same step key, which usually means the wrong file;
   - fills in `subtitle` from the page's `<title>` if the topic doesn't have one yet.
3. Run `node tools/build-sitemap.mjs`.
4. Preview, then commit and push. The site deploys automatically.

To **add a topic that isn't in the list yet** (e.g. Physics subtopics), add one line to the right group's `topics` array in `assets/data/topics.js`, copying an existing line. Keep each topic on a single line, because the tool edits lines. Then run `add-topic` as above.

```js
{ id: "phys-3-1-1", code: "3.1.1", title: "…", status: "coming-soon", url: "/physics/unit-3/3-1-1/", progressKey: "phys311_step" },
```

Once a Physics topic is live, change `status: "coming-soon"` to `"live"` on the Physics subject near the top of its block.

Each topic can also have `keywords: ["…"]`, which are extra words for search. Coming-soon topics appear in search with a "Coming soon" label.

`node tools/check-site.mjs` checks the data file (unique ids and keys, live pages exist and include the script tag) and every internal link. The deploy workflow runs it too, and a failing check stops the deploy.

## Settings (`assets/js/config.js`)

| Setting | What it does |
| --- | --- |
| `CONTACT_EMAIL` | Leave `""` and the Contact page says "Email address coming soon". Set it, e.g. `"hello@qldsciencehelp.com"`, and the page shows a `mailto:` link. |
| `ANALYTICS_TOKEN` | Cloudflare Web Analytics token. When it's empty, no analytics script loads anywhere. |
| `SITE_URL` | Canonical address used for canonical/Open Graph tags, `sitemap.xml` and `robots.txt`. |

### Get a Cloudflare Web Analytics token (cookie-free)

1. Create a free Cloudflare account and open **Analytics & Logs → Web Analytics** in the dashboard.
2. Click **Add a site** and enter your hostname, e.g. `qldsciencehelp.com`. You don't need to move your DNS to Cloudflare.
3. Choose the manual JavaScript snippet. It contains `data-cf-beacon='{"token": "…"}'`. Copy just the token value into `ANALYTICS_TOKEN`.
4. Commit and push. Site pages and revision pages (via `topic-chrome.js`) will then load the beacon. No other trackers are used.

## Hosting on GitHub Pages and adding a domain

**First deploy:** in the repo on GitHub, go to **Settings → Pages → Build and deployment → Source** and choose **GitHub Actions**. Every push to `main` then runs `.github/workflows/deploy.yml`, which checks the site and publishes it. Repo-only files (`tools/`, `incoming/`, README) aren't published.

> The site's files use root-relative paths (`/assets/...`). When GitHub serves it from a sub-folder, e.g. `https://srevelledu-crypto.github.io/QLDsciencehelp.com/` before a custom domain is set, the deploy workflow prefixes those paths automatically (`tools/apply-base-path.mjs`, run on the published copy only). Once a custom domain is set, the prefix is dropped automatically on the next deploy.

**Custom domain** (when you have it):
1. At your domain registrar, add the DNS records GitHub lists under *Managing a custom domain for your GitHub Pages site*: four `A` records for the apex domain, plus a `CNAME` for `www` pointing to `<user>.github.io`.
2. In **Settings → Pages → Custom domain**, enter the domain, save, and tick **Enforce HTTPS** once it's available. With Actions deployments, GitHub stores the domain in the setting, so no `CNAME` file is needed.
3. If the domain differs from `https://qldsciencehelp.com`, update `SITE_URL` in `config.js`, then run:

   ```sh
   node tools/set-site-url.mjs && node tools/build-sitemap.mjs
   ```

## How progress works

Every revision page saves two values in `localStorage` as the student moves between its five steps (Recall, Worked examples, Consolidate, Exam questions, Wrap-up):

- `<key>` is the index of the current step (0–4);
- `<key>_v` is a JSON array of visited step indices, e.g. `[0,1,2]`.

The key prefix for each topic is stored as `progressKey` in `topics.js`, e.g. `chem311_step`. For 3.1.2 it is `chem312_step_trial`, which is just data. The site only **reads** these keys and works out:

- **Not started**: no steps visited;
- **In progress (n/5)**: some steps visited;
- **Completed**: all five visited.

This shows on topic cards (a five-segment bar plus a text label), as unit and subject summaries, and on the home page. `topic-chrome.js` records the most recently opened topic under `qsh_recent`, storing only `{ "id": "chem-3-1-2", "t": <timestamp> }`. The home page uses it for the "Continue where you left off" card.

All storage access is wrapped in `try/catch`. If the browser blocks storage, pages still render and progress shows as "Not started".

**Reset my progress on this device** (About page) asks for confirmation, then removes only the keys listed in `topics.js`: each topic's `progressKey`, `progressKey_v` and `workKey` (saved answers), plus `qsh_recent`.

> Note: the current 3.1.2 page declares its answers key as `WORKc` but saves under `this.WORK`, so its answers are stored under the literal key `"undefined"`. `topics.js` records that as its `workKey` so Reset still clears it. If you fix the page and re-run `add-topic`, the tool will pick up the corrected key.

## topic-chrome.js

This is the one script added to each revision page. It renders inside Shadow DOM, so styles can't leak in either direction. It waits for the bundled page to unpack (the bundle swaps the whole `<html>` element), then adds:

- a slim top bar: logo, breadcrumb and a "Topics" link. It isn't `position: fixed`; its height is reserved with body padding;
- prev/next buttons for live topics (coming-soon ones are skipped), placed below the end of the page content;
- the `qsh_recent` record and the optional analytics beacon.

If anything fails, it does nothing and the revision page works as before.

## Design notes

- Colours come from the logo: navy `#0f2340`, Queensland blue `#0b5aa6 → #0a3d7a`, green `#3f9b2f → #6cc04a`, and background `#faf9f5`. They're all tokens at the top of `site.css`. Text colours meet WCAG AA in both themes.
- The whole site is light-only, matching the revision pages and the logo.
- Fonts are self-hosted, so site pages make no Google requests. The revision pages bundle their own fonts but keep a `preconnect` to Google Fonts, which the privacy section mentions.
- Images: `logo.png` is the original. `logo-960/480.png`, `logo-mark.png` and `logo-wordmark.png` are trimmed variants. `qld-map-*.png`, `favicon.ico`, `favicon-32x32.png` and `apple-touch-icon.png` are the Queensland map icon. `og-image.png` is the 1200×630 share image.
