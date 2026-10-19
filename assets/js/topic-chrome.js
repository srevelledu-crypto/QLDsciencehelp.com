/*
 * QLDsciencehelp.com — topic chrome for the bundled revision pages.
 *
 * Added to each revision page with ONE line before </body>:
 *   <script src="/assets/js/topic-chrome.js" defer></script>
 *
 * It adds a slim top bar (logo, breadcrumb, Topics link) and prev/next topic
 * buttons, records the topic as "recently viewed" (qsh_recent: id + timestamp
 * only), and loads the optional cookie-free analytics beacon.
 *
 * Robustness rules:
 *  - All UI lives in Shadow DOM, so page CSS and this CSS can't affect each other.
 *  - The bundled pages replace the whole <html> element once they have unpacked,
 *    so the UI is (re)mounted whenever the document element or body changes.
 *  - The bars are positioned absolutely inside <body> (not fixed), and body
 *    padding reserves their height, so nothing covers the page content.
 *  - Every step is wrapped in try/catch: if anything fails the revision page
 *    simply works as it did before.
 */
(function () {
  "use strict";
  try {
    if (window.__qshTopicChrome) return;
    window.__qshTopicChrome = true;
  } catch (e) {
    return;
  }

  var BASE = "/assets/";
  var HOST_TOP = "qsh-topic-bar";
  var HOST_BOTTOM = "qsh-topic-nav";

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  var CSS =
    ":host{all:initial;display:block;position:absolute;left:0;right:0;z-index:2147483000;" +
    "font-family:'IBM Plex Sans',system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;font-size:15px;line-height:1.4;color:#0f2340;" +
    "-webkit-text-size-adjust:100%;text-size-adjust:100%}" +
    "*,*::before,*::after{box-sizing:border-box}" +
    "a{color:#0b5aa6;text-decoration:none}" +
    "a:hover{text-decoration:underline;text-underline-offset:.18em}" +
    "a:focus-visible{outline:3px solid #0b5aa6;outline-offset:2px;border-radius:4px}" +
    ".bar{background:#fff;border-bottom:1px solid #dbe1ea}" +
    ".in{max-width:1080px;margin:0 auto;padding:6px 16px;min-height:52px;display:flex;align-items:center;gap:6px 16px;flex-wrap:wrap}" +
    ".logo{display:inline-flex;align-items:center;flex:none;border-radius:6px}" +
    ".logo img{display:block;height:34px;width:auto}" +
    "nav.crumbs{flex:1 1 auto;min-width:0}" +
    "ol{list-style:none;margin:0;padding:0;display:flex;flex-wrap:wrap;align-items:center;gap:2px 0}" +
    "li{display:inline-flex;align-items:center;white-space:nowrap}" +
    "li+li::before{content:'\\203A';color:#6b7280;padding:0 7px;font-size:16px}" +
    "li[aria-current] span{color:#0f2340;font-weight:600}" +
    ".topics{flex:none;font-weight:600;padding:6px 12px;border:1px solid #dbe1ea;border-radius:999px;background:#fff;color:#0f2340}" +
    ".topics:hover{background:#f7f9fc;border-color:#0b5aa6;text-decoration:none}" +
    ".nav{background:#fff;border-top:1px solid #dbe1ea}" +
    ".nav .in{justify-content:space-between;padding:14px 16px 18px;align-items:stretch}" +
    ".pn{flex:1 1 240px;max-width:100%;display:flex;flex-direction:column;gap:2px;padding:10px 14px;border:1px solid #dbe1ea;border-radius:6px;background:#fff;color:#0f2340}" +
    ".pn:hover{border-color:#0b5aa6;text-decoration:none}" +
    ".pn small{font-size:13px;color:#4a5568;font-weight:600;letter-spacing:.02em}" +
    ".pn span{font-family:'IBM Plex Serif',Georgia,serif;font-weight:600;font-size:16px;color:#0b5aa6}" +
    ".pn.next{text-align:right;margin-left:auto}" +
    ".spacer{flex:1 1 240px}" +
    ".all{flex-basis:100%;text-align:center;font-size:14px}" +
    "@media (max-width:520px){.logo img{height:28px}.in{gap:4px 10px}li+li::before{padding:0 5px}.topics{padding:5px 10px}.pn.next{text-align:left;margin-left:0}.spacer{display:none}}" +
    "@media (prefers-reduced-motion:reduce){*{transition:none!important;animation:none!important}}";

  var state = { force: false, topic: null, neighbours: null, observer: null, resizeObs: null, padTop: null, listening: false };

  function makeHost(id, where) {
    var host = document.createElement("div");
    host.id = id;
    host.setAttribute("data-qsh", "");
    var root = host.attachShadow({ mode: "open" });
    var style = document.createElement("style");
    style.textContent = CSS;
    root.appendChild(style);
    var box = document.createElement("div");
    root.appendChild(box);
    host.style.setProperty(where, "0", "important");
    return { host: host, box: box };
  }

  function topBarHTML(t) {
    return (
      '<div class="bar"><div class="in">' +
      '<a class="logo" href="/" aria-label="QLDsciencehelp.com home"><img src="' + BASE + 'img/logo-mark.png" alt="QLDsciencehelp.com" width="76" height="34"></a>' +
      '<nav class="crumbs" aria-label="Breadcrumb"><ol>' +
      '<li><a href="' + esc(t.subject.url) + '">' + esc(t.subject.name) + "</a></li>" +
      '<li><a href="' + esc(t.subject.url) + "#" + esc(t.unit.id) + '">Unit ' + esc(t.unit.number) + "</a></li>" +
      '<li aria-current="page"><span>' + esc(t.code) + "</span></li>" +
      "</ol></nav>" +
      '<a class="topics" href="' + esc(t.subject.url) + '">Topics</a>' +
      "</div></div>"
    );
  }

  function pnHTML(t, dir) {
    if (!t) return '<span class="spacer" aria-hidden="true"></span>';
    var label = dir === "prev" ? "← Previous topic" : "Next topic →";
    return (
      '<a class="pn ' + dir + '" href="' + esc(t.url) + '" rel="' + dir + '">' +
      "<small>" + label + "</small><span>" + esc(t.code) + " " + esc(t.title) + "</span></a>"
    );
  }

  function bottomNavHTML(t, n) {
    return (
      '<nav class="nav" aria-label="Topic navigation"><div class="in">' +
      pnHTML(n.prev, "prev") + pnHTML(n.next, "next") +
      '<a class="all" href="' + esc(t.subject.url) + "#" + esc(t.id) + '">All ' + esc(t.subject.name) + " topics</a>" +
      "</div></nav>"
    );
  }

  function px(v) {
    var n = parseFloat(v);
    return isNaN(n) ? 0 : n;
  }

  // Bottom of the page's own content, in body coordinates. Measured from the
  // content itself, not from <body>: the revision pages set html,body{height:100%}
  // and their content overflows the body, so body's own bottom is not the page end.
  function contentBottom(body) {
    var bodyTop = body.getBoundingClientRect().top;
    var max = 0;
    for (var i = 0; i < body.children.length; i++) {
      var el = body.children[i];
      if (el.hasAttribute("data-qsh") || /^(SCRIPT|STYLE|TEMPLATE)$/.test(el.tagName)) continue;
      var cs = getComputedStyle(el);
      if (cs.position === "fixed" || cs.display === "none") continue;
      var r = el.getBoundingClientRect();
      var bottom = r.top - bodyTop + Math.max(r.height, el.scrollHeight) + px(cs.marginBottom);
      if (bottom > max) max = bottom;
    }
    return max;
  }

  // Reserve room for the top bar with body padding (added to the page's own padding),
  // and place the prev/next nav just below the end of the content.
  function reserve() {
    try {
      var body = document.body;
      var top = document.getElementById(HOST_TOP);
      var bottom = document.getElementById(HOST_BOTTOM);
      if (!body || !top) return;
      if (state.padTop == null || body.getAttribute("data-qsh-pad") !== "1") {
        // Measure the page's own padding before we touch it.
        body.style.removeProperty("padding-top");
        var cs = getComputedStyle(body);
        state.padTop = px(cs.paddingTop);
        if (cs.position === "static") body.style.setProperty("position", "relative");
        body.setAttribute("data-qsh-pad", "1");
      }
      var want = state.padTop + top.offsetHeight + "px";
      if (body.style.paddingTop !== want) body.style.setProperty("padding-top", want, "important");
      if (bottom) {
        var y = Math.max(contentBottom(body), window.innerHeight - bottom.offsetHeight) + "px";
        if (bottom.style.top !== y) bottom.style.setProperty("top", y, "important");
      }
    } catch (e) {}
  }

  var queued = false;
  function queueReserve() {
    if (queued) return;
    queued = true;
    (window.requestAnimationFrame || setTimeout)(function () {
      queued = false;
      reserve();
    });
  }

  // Layout fixes for the bundled pages. Their title header carries a fixed size left over
  // from the design tool (e.g. width:1030px; height:498px), which pushes the learning
  // objectives off the side of a phone screen. Let it size to the screen instead.
  // Their card grids use repeat(auto-fit, minmax(320px, 1fr)) and similar, which forces a
  // 320px column on screens narrower than that; cap each minimum at the available width.
  var PAGE_FIXES = "#dc-root header{width:auto!important;height:auto!important;max-width:100%!important}";
  (function () {
    for (var px = 200; px <= 400; px += 10) {
      ["fit", "fill"].forEach(function (mode) {
        PAGE_FIXES +=
          '#dc-root [style*="repeat(auto-' + mode + ", minmax(" + px + 'px, 1fr))"]' +
          "{grid-template-columns:repeat(auto-" + mode + ",minmax(min(" + px + "px,100%),1fr))!important}";
      });
    }
  })();

  function addPageFixes() {
    try {
      if (document.getElementById("qsh-page-fixes")) return;
      var style = document.createElement("style");
      style.id = "qsh-page-fixes";
      style.textContent = PAGE_FIXES;
      (document.head || document.documentElement).appendChild(style);
    } catch (e) {}
    addIcons();
  }

  // The revision pages don't link a tab icon, so add the site's (unless the page has one).
  function addIcons() {
    try {
      var head = document.head;
      if (!head || head.querySelector('link[rel~="icon"]')) return;
      var root = BASE.replace(/assets\/$/, "");
      [
        ["icon", "favicon.ico", "any"],
        ["icon", "favicon-32x32.png", "32x32"],
        ["apple-touch-icon", "apple-touch-icon.png", ""],
      ].forEach(function (d) {
        var link = document.createElement("link");
        link.rel = d[0];
        link.href = root + d[1];
        if (d[2]) link.setAttribute("sizes", d[2]);
        head.appendChild(link);
      });
    } catch (e) {}
  }

  function mount() {
    try {
      var t = state.topic;
      var body = document.body;
      if (!t || !body) return;
      // Wait while the bundled page is still unpacking (its splash screen is showing);
      // the document swap that follows triggers mount() again.
      if (!state.force && document.getElementById("__bundler_thumbnail")) return;
      addPageFixes();
      var top = document.getElementById(HOST_TOP);
      if (!top) {
        state.padTop = null;
        var a = makeHost(HOST_TOP, "top");
        a.box.innerHTML = topBarHTML(t);
        body.insertBefore(a.host, body.firstChild);
        top = a.host;
      }
      var bottom = document.getElementById(HOST_BOTTOM);
      if (!bottom) {
        var b = makeHost(HOST_BOTTOM, "top");
        b.box.innerHTML = bottomNavHTML(t, state.neighbours);
        body.appendChild(b.host);
        bottom = b.host;
      }
      reserve();
      if (window.ResizeObserver) {
        if (state.resizeObs) state.resizeObs.disconnect();
        state.resizeObs = new ResizeObserver(queueReserve);
        state.resizeObs.observe(top);
        state.resizeObs.observe(bottom);
      }
      watchBody(body);
      if (!state.listening) {
        state.listening = true;
        // Content height changes as students move between steps, open answers, etc.
        window.addEventListener("resize", queueReserve);
        window.addEventListener("load", queueReserve, true);
        setInterval(queueReserve, 2000);
      }
    } catch (e) {}
  }

  var bodyObs = null;
  function watchBody(body) {
    try {
      if (bodyObs) bodyObs.disconnect();
      bodyObs = new MutationObserver(function () {
        if (!document.getElementById(HOST_TOP) || !document.getElementById(HOST_BOTTOM)) mount();
        else queueReserve();
      });
      bodyObs.observe(body, { childList: true, subtree: true, attributes: true, attributeFilter: ["style", "class", "hidden", "open"] });
    } catch (e) {}
  }

  function watchDocument() {
    try {
      // The bundler swaps document.documentElement once it has unpacked the page.
      new MutationObserver(function () {
        if (document.body && !document.getElementById(HOST_TOP)) mount();
      }).observe(document, { childList: true });
    } catch (e) {}
  }

  function recordRecent(t) {
    try {
      window.localStorage.setItem("qsh_recent", JSON.stringify({ id: t.id, t: Date.now() }));
    } catch (e) {}
  }

  function loadAnalytics() {
    import(BASE + "js/analytics.js")
      .then(function (m) {
        var go = function () {
          try {
            m.initAnalytics(document);
          } catch (e) {}
        };
        go();
        // Re-add after the bundler swaps the document (the first copy may be discarded).
        new MutationObserver(go).observe(document, { childList: true });
      })
      .catch(function () {});
  }

  function start() {
    import(BASE + "data/topics.js")
      .then(function (data) {
        var t = data.findTopicByPath(location.pathname);
        if (!t) return;
        state.topic = t;
        state.neighbours = data.liveNeighbours(t.id);
        recordRecent(t);
        watchDocument();
        mount();
        // If the page never finishes unpacking, still offer the navigation.
        setTimeout(function () {
          state.force = true;
          mount();
        }, 10000);
        loadAnalytics();
      })
      .catch(function () {});
  }

  // The bundled pages' loading screen is an SVG whose viewBox attribute was mangled to
  // "sc-camel-view-box", so it draws unscaled from the top-left corner (on phones only a
  // corner shows). Restore the viewBox so it scales to fit, and fill the rest of the
  // screen with the artwork's own background colour so it covers the full screen.
  function fixSplash() {
    try {
      var box = document.getElementById("__bundler_thumbnail");
      var svg = box && box.querySelector("svg");
      if (!svg) return;
      var vb = svg.getAttribute("viewBox") || svg.getAttribute("sc-camel-view-box");
      if (vb) svg.setAttribute("viewBox", vb);
      svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
      var rect = svg.querySelector("rect");
      var fill = rect && rect.getAttribute("fill");
      if (fill && /^#[0-9a-f]{3,8}$/i.test(fill)) box.style.setProperty("background", fill, "important");
    } catch (e) {}
  }

  fixSplash();
  addIcons();
  try {
    start();
  } catch (e) {}
})();
