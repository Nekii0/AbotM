// Saves the latest Baguio headlines from Google News to news.json for the homepage news panel.
// GitHub runs this every few hours (.github/workflows/news.yml). Run it yourself with: node scripts/fetch-news.mjs
import { writeFileSync } from "node:fs";

const FEED = "https://news.google.com/rss/search?q=%22Baguio%22+when:7d&hl=en-PH&gl=PH&ceid=PH:en";
const res = await fetch(FEED, { headers: { "User-Agent": "Mozilla/5.0" } });
if (!res.ok) throw new Error(`Feed returned ${res.status}; keeping the old news.json`);
const xml = await res.text();

const decode = s => s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
  .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&").trim();
const tag = (x, t) => decode((x.match(new RegExp(`<${t}[^>]*>([\\s\\S]*?)</${t}>`)) || [])[1] || "");

const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map(([, x]) => {
  const source = tag(x, "source").replace(/ \| .*$/, "");
  let title = tag(x, "title");
  // Google appends " - Source" to every title (the panel shows the source separately); some sites add " - Name | slogan".
  if (title.endsWith(" - " + tag(x, "source"))) title = title.slice(0, -(tag(x, "source").length + 3));
  title = title.replace(/ - [^-]*\|[^-]*$/, "");
  if (title.length > 110) title = title.slice(0, 107).replace(/\s+\S*$/, "") + "…";
  const date = new Date(tag(x, "pubDate"));
  return { title, link: tag(x, "link"), source, date: isNaN(date) ? null : date.toISOString() };
})
  // Keep only stories with Baguio in the headline; Facebook results are post text, not headlines.
  .filter(i => /baguio/i.test(i.title) && i.date && i.link.startsWith("https://") && i.source !== "Facebook")
  .sort((a, b) => b.date.localeCompare(a.date))
  .slice(0, 8);

if (!items.length) throw new Error("No headlines found; keeping the old news.json");
writeFileSync("news.json", JSON.stringify({ updated: new Date().toISOString(), items }, null, 2) + "\n");
console.log(`Saved ${items.length} headlines`);
