// Cloudflare Web Analytics (cookie-free, no personal data). Loaded only when
// ANALYTICS_TOKEN in config.js is set. No other trackers are used anywhere.
import { ANALYTICS_TOKEN } from "./config.js";

export function initAnalytics(doc = document) {
  const token = String(ANALYTICS_TOKEN || "").trim();
  if (!token || doc.querySelector("script[data-qsh-analytics]")) return;
  const s = doc.createElement("script");
  s.defer = true;
  s.src = "https://static.cloudflareinsights.com/beacon.min.js";
  s.setAttribute("data-cf-beacon", JSON.stringify({ token }));
  s.setAttribute("data-qsh-analytics", "");
  (doc.head || doc.documentElement).appendChild(s);
}
