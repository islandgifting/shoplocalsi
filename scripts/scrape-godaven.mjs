// scrape-godaven.mjs
// Pulls shul info + minyan/shiur times from GoDaven for the Staten Island shul list
// and writes them to data/shuls.json. Runs inside GitHub Actions.

import { chromium } from "playwright";
import { writeFileSync, mkdirSync } from "fs";

// ---- The shul list (23 unique GoDaven IDs) ----
const SHUL_IDS = [
  292, 293, 295, 296, 299, 431, 930, 1653, 1985, 2553,
  4104, 6106, 7837, 11577, 16585, 19774, 21585, 23798,
  23815, 24689, 24846, 25405, 25516,
];

const TEFILLAH_WORDS = /\b(shachari[st]|mincha|maariv|ma'ariv|selichos|selichot|neitz|netz|musaf|kabbalas shabbos|kabbalat shabbat)\b/i;
const SHIUR_WORDS = /\b(shiur|daf yomi|chabura|chavrusa|kollel|mishnayos|halacha|gemara|parsha|amud yomi)\b/i;
const TIME_RE = /\b\d{1,2}:\d{2}\s?(?:AM|PM|am|pm)?\b/;

function classifyLine(line) {
  const hasTime = TIME_RE.test(line);
  if (!hasTime) return null;
  if (SHIUR_WORDS.test(line)) return "shiur";
  if (TEFILLAH_WORDS.test(line)) return "minyan";
  return "other";
}

async function scrapeShul(page, id) {
  const url = `https://www.godaven.com/shul-details/${id}`;

  await page.goto(url, { waitUntil: "networkidle", timeout: 60000 });
  // Give the app a moment to finish rendering
  await page.waitForTimeout(4000);

  // Basic info is in the meta description:
  // "Shul info and minyanim times (zmanim) for - NAME | ADDRESS | Rabbi X"
  const metaDesc = await page
    .locator('meta[name="description"]')
    .getAttribute("content")
    .catch(() => null);

  let name = null, address = null, rabbi = null;
  if (metaDesc) {
    const m = metaDesc.replace(/^.*for\s*-\s*/i, "").split("|").map((s) => s.trim());
    name = m[0] || null;
    address = m[1] || null;
    rabbi = (m[2] || "").replace(/^Rabbi\s*\.?\s*/i, "").trim() || null;
  }
  const title = await page.title().catch(() => "");
  if (!name && title.includes("|")) name = title.split("|").pop().trim();

  // Full rendered text of the page
  const rawText = await page.evaluate(() => document.body.innerText || "");
  const lines = rawText
    .split("\n")
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  const minyanim = [];
  const shiurim = [];
  const other = [];
  let currentSection = "";

  for (const line of lines) {
    if (!TIME_RE.test(line) && (TEFILLAH_WORDS.test(line) || SHIUR_WORDS.test(line) || /shabbos|shabbat/i.test(line))) {
      if (line.length < 40) currentSection = line;
      continue;
    }
    const kind = classifyLine(line);
    if (!kind) continue;
    const entry = { section: currentSection || null, text: line };
    if (kind === "shiur") shiurim.push(entry);
    else if (kind === "minyan") minyanim.push(entry);
    else {
      if (SHIUR_WORDS.test(currentSection)) shiurim.push(entry);
      else if (TEFILLAH_WORDS.test(currentSection) || /shabbos|shabbat/i.test(currentSection)) minyanim.push(entry);
      else other.push(entry);
    }
  }

  return {
    id,
    url,
    name,
    address,
    rabbi,
    minyanim,
    shiurim,
    other,
    rawText: rawText.slice(0, 8000),
    scrapedAt: new Date().toISOString(),
  };
}

const browser = await chromium.launch();
const page = await browser.newPage({
  userAgent:
    "Mozilla/5.0 (compatible; ShopLocalSI-ShulTimes/1.0; +https://shoplocalsi.com)",
});

const shuls = [];
for (const id of SHUL_IDS) {
  try {
    console.log(`Scraping shul ${id}...`);
    shuls.push(await scrapeShul(page, id));
  } catch (e) {
    console.error(`Failed on shul ${id}: ${e.message}`);
    shuls.push({ id, url: `https://www.godaven.com/shul-details/${id}`, error: e.message });
  }
  await page.waitForTimeout(2500); // be polite to GoDaven's servers
}

await browser.close();

mkdirSync("data", { recursive: true });
writeFileSync(
  "data/shuls.json",
  JSON.stringify({ updated: new Date().toISOString(), source: "godaven.com", shuls }, null, 2)
);
console.log(`Done. Wrote ${shuls.length} shuls to data/shuls.json`);