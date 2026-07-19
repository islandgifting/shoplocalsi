// scrape-godaven.mjs  (v2)
// Reads each GoDaven shul page like a human sees it: finds the Shacharis/Mincha/Maariv
// column headers and the day rows by their position on screen, and assigns every time
// to the right column + day. Also clicks the "Shiurim / Events" tab, and pulls
// address, phone, website, rabbi, nusach, and notes.
// Writes everything to data/shuls.json. Runs inside GitHub Actions.

import { chromium } from "playwright";
import { writeFileSync, mkdirSync } from "fs";

const SHUL_IDS = [
  292, 293, 295, 296, 299, 431, 930, 1653, 1985, 2553,
  4104, 6106, 7837, 11577, 16585, 19774, 21585, 23798,
  23815, 24689, 24846, 25405, 25516,
];

// Shuls not on GoDaven — we visit their own websites and grab what we can.
const EXTRA_SITES = [
  { name: "TOV of Staten Island", url: "https://tovofsi.weebly.com/" },
  { name: "Young Israel of Staten Island (YISI)", url: "https://www.yisi.org" },
];

// Paste YISI's Tehillim-list page URL between the quotes to enable the tehillim feed.
// Leave as null to skip.
const TEHILLIM_URL = null;

// Misaskim public aveilim listing — we keep only Staten Island shivas.
const MISASKIM_URL = "https://www.misaskim.org/aveilim";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Shabbos"];
const NUSACH = ["Ashkenaz", "Sefard", "Edut Mizrach", "Ari", "Nusach Ari", "Unspecified"];

// ---------- helpers to mine the raw page text ----------
function extractInfo(rawLines, name) {
  const info = { address: null, phone: null, website: null, rabbi: null, nusach: null, notes: null };
  for (let i = 0; i < rawLines.length; i++) {
    const l = rawLines[i];
    if (!info.address && /\d.+,.*(NY|New York).*\d{5}/.test(l)) info.address = l;
    if (!info.phone) { const m = l.match(/\(\d{3}\)\s*\d{3}[- ]\d{4}/); if (m) info.phone = m[0]; }
    if (!info.website && /^https?:\/\//i.test(l) && !/godaven\.com/i.test(l)) info.website = l.trim();
    if (!info.nusach && NUSACH.includes(l)) info.nusach = l === "Unspecified" ? null : l;
    if (!info.rabbi && /^Rabbi\s+\S/.test(l) && rawLines[i + 1] === "Rabbi") {
      info.rabbi = l.replace(/^Rabbi\s+/, "").replace(/^Rabbi\s+/, "").replace(/^\.\s*/, "").trim();
    }
  }
  const nIdx = rawLines.indexOf("Notes");
  if (nIdx !== -1) {
    const stops = ["Other Minyanim Nearby", "See Shiurim", "Suggest Minyan Update", "TODAY\u2019S SPONSOR"];
    const chunk = [];
    for (let i = nIdx + 1; i < rawLines.length; i++) {
      if (stops.includes(rawLines[i])) break;
      chunk.push(rawLines[i]);
    }
    info.notes = chunk.join(" ").trim() || null;
  }
  return info;
}

// ---------- read the minyan table by screen coordinates ----------
async function extractSchedule(page) {
  return await page.evaluate(() => {
    const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Shabbos"];
    const COLS = ["Shacharis", "Mincha", "Maariv"];
    const leaves = Array.from(document.querySelectorAll("body *"))
      .filter((el) => el.children.length === 0 && el.offsetParent !== null);
    const txt = (el) => (el.textContent || "").replace(/\s+/g, " ").trim();
    const mid = (el) => {
      const r = el.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    };

    // Column headers
    const headers = {};
    for (const c of COLS) {
      const el = leaves.find((e) => txt(e) === c);
      if (el) headers[c] = mid(el);
    }
    if (Object.keys(headers).length < 2) return null; // table not found

    const headerY = Math.min(...Object.values(headers).map((h) => h.y));

    // Day row labels (below the header row)
    const dayRows = [];
    for (const d of DAYS) {
      const el = leaves.find((e) => txt(e) === d && mid(e).y > headerY);
      if (el) dayRows.push({ day: d, y: mid(el).y });
    }
    dayRows.sort((a, b) => a.y - b.y);
    if (!dayRows.length) return null;

    // Bottom boundary: the "Notes" label if present
    const notesEl = leaves.find((e) => txt(e) === "Notes" && mid(e).y > headerY);
    const bottomY = notesEl ? mid(notesEl).y : Infinity;

    // Every bare time cell within the table area
    const schedule = {};
    for (const d of DAYS) schedule[d] = { shacharis: [], mincha: [], maariv: [] };

    for (const el of leaves) {
      const t = txt(el);
      if (!/^\d{1,2}:\d{2}$/.test(t)) continue;
      const p = mid(el);
      if (p.y <= headerY + 5 || p.y >= bottomY - 5) continue;

      // Column = nearest header by x
      let col = null, colDist = Infinity;
      for (const [c, h] of Object.entries(headers)) {
        const dx = Math.abs(p.x - h.x);
        if (dx < colDist) { colDist = dx; col = c; }
      }
      // Day = the last day label at or above this cell
      let day = null;
      for (const r of dayRows) if (r.y <= p.y + 12) day = r.day;
      if (!day || !col) continue;

      const key = col === "Shacharis" ? "shacharis" : col === "Mincha" ? "mincha" : "maariv";
      if (!schedule[day][key].includes(t)) schedule[day][key].push(t);
    }
    return schedule;
  });
}

// ---------- the Shiurim / Events tab ----------
async function extractShiurim(page) {
  try {
    const tab = page.locator("text=Shiurim / Events").first();
    if (!(await tab.count())) return [];
    await tab.click({ timeout: 5000 });
    await page.waitForTimeout(1500);
    const text = await page.evaluate(() => document.body.innerText || "");
    const lines = text.split("\n").map((l) => l.replace(/\s+/g, " ").trim()).filter(Boolean);
    const start = lines.lastIndexOf("Shiurim / Events");
    if (start === -1) return [];
    const stops = ["Other Minyanim Nearby", "Suggest Minyan Update", "Notes", "TODAY\u2019S SPONSOR"];
    const skip = /^(\*Special days|Please click highlighted|info_outline|Regular Minyanim|Special Days)/i;
    const out = [];
    for (let i = start + 1; i < lines.length && out.length < 15; i++) {
      if (stops.includes(lines[i])) break;
      if (skip.test(lines[i]) || lines[i].length < 3) continue;
      out.push({ text: lines[i] });
    }
    return out;
  } catch {
    return [];
  }
}

async function scrapeShul(page, id) {
  const url = `https://www.godaven.com/shul-details/${id}`;
  await page.goto(url, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(3500);

  const rawText = await page.evaluate(() => document.body.innerText || "");
  const rawLines = rawText.split("\n").map((l) => l.replace(/\s+/g, " ").trim()).filter(Boolean);

  // Name: line right before the address, else from the title
  let name = null;
  const addrIdx = rawLines.findIndex((l) => /\d.+,.*(NY|New York).*\d{5}/.test(l));
  if (addrIdx > 0) name = rawLines[addrIdx - 1];
  if (!name) {
    const title = await page.title().catch(() => "");
    if (title.includes("|")) name = title.split("|").pop().trim();
  }

  const info = extractInfo(rawLines, name);
  const schedule = await extractSchedule(page);
  const shiurim = await extractShiurim(page);

  return {
    id, url, name,
    address: info.address, phone: info.phone, website: info.website,
    rabbi: info.rabbi, nusach: info.nusach, notes: info.notes,
    schedule, shiurim,
    scrapedAt: new Date().toISOString(),
  };
}

async function scrapeExtraSite(page, site) {
  try {
    await page.goto(site.url, { waitUntil: "domcontentloaded", timeout: 45000 });
    await page.waitForTimeout(3000);
    const text = await page.evaluate(() => document.body.innerText || "");
    const lines = text.split("\n").map((l) => l.replace(/\s+/g, " ").trim()).filter(Boolean);
    // Keep lines that look like schedule info: contain a time, or a tefillah/day word with substance
    const KEEP = /\d{1,2}:\d{2}|shachari|mincha|maariv|ma'ariv|shabbat|shabbos|daf yomi|shiur|kiddush|candle/i;
    const info = [];
    for (const l of lines) {
      if (info.length >= 12) break;
      if (l.length > 4 && l.length < 160 && KEEP.test(l)) info.push({ text: l });
    }
    return { id: site.url, url: site.url, name: site.name, website: site.url, external: true, info, scrapedAt: new Date().toISOString() };
  } catch (e) {
    return { id: site.url, url: site.url, name: site.name, website: site.url, external: true, info: [], error: e.message };
  }
}

async function scrapeMisaskimShivas(page) {
  try {
    await page.goto(MISASKIM_URL, { waitUntil: "networkidle", timeout: 60000 });
    await page.waitForTimeout(4000);
    const text = await page.evaluate(() => document.body.innerText || "");
    const lines = text.split("\n").map((l) => l.replace(/\s+/g, " ").trim()).filter(Boolean);
    // A niftar/nifteres header line contains an honorific
    const HONORIFIC = /(\u05D6["\u201D\u05F4']?\u05DC|\u05E2["\u201D\u05F4']?\u05D4|Z[\u201D"']L|A[\u201D"']H|OB"?M)\s*$/i;
    const blocks = [];
    let current = null;
    for (const l of lines) {
      if (HONORIFIC.test(l) && l.length < 90) {
        if (current) blocks.push(current);
        current = { niftar: l, lines: [] };
      } else if (current && current.lines.length < 25) {
        current.lines.push(l);
      }
    }
    if (current) blocks.push(current);
    const si = blocks
      .filter((b) => /staten island/i.test(b.lines.join(" ")))
      .map((b) => ({ niftar: b.niftar, details: b.lines }));
    return si;
  } catch (e) {
    console.error("Misaskim scrape failed: " + e.message);
    return null; // null = scrape failed (keep old data); [] = ran fine, none in SI
  }
}

async function scrapeTehillim(page) {
  if (!TEHILLIM_URL) return null;
  try {
    await page.goto(TEHILLIM_URL, { waitUntil: "domcontentloaded", timeout: 45000 });
    await page.waitForTimeout(3000);
    const text = await page.evaluate(() => document.body.innerText || "");
    const lines = text.split("\n").map((l) => l.replace(/\s+/g, " ").trim()).filter(Boolean);
    // Hebrew-name-looking lines (contains Hebrew letters, e.g. "... בן/בת ...")
    const names = lines.filter((l) => /[\u0590-\u05FF]/.test(l) && /\u05D1[\u05DF\u05EA]/.test(l) && l.length < 90);
    return names.map((n) => ({ name: n }));
  } catch (e) {
    console.error("Tehillim scrape failed: " + e.message);
    return null;
  }
}

const browser = await chromium.launch();
const page = await browser.newPage({
  userAgent: "Mozilla/5.0 (compatible; ShopLocalSI-ShulTimes/2.0; +https://shoplocalsi.com)",
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
  await page.waitForTimeout(2500);
}
for (const site of EXTRA_SITES) {
  console.log(`Scraping ${site.name}...`);
  shuls.push(await scrapeExtraSite(page, site));
  await page.waitForTimeout(2000);
}

console.log("Scraping Misaskim shiva listings (Staten Island only)...");
const shivas = await scrapeMisaskimShivas(page);
console.log("Scraping Tehillim list...");
const tehillim = await scrapeTehillim(page);

await browser.close();

mkdirSync("data", { recursive: true });
writeFileSync(
  "data/shuls.json",
  JSON.stringify({ updated: new Date().toISOString(), source: "godaven.com", version: 2, shuls }, null, 2)
);
if (shivas !== null) {
  writeFileSync(
    "data/shivas.json",
    JSON.stringify({ updated: new Date().toISOString(), source: "misaskim.org", shivas }, null, 2)
  );
  console.log(`Shivas in Staten Island: ${shivas.length}`);
}
if (tehillim !== null) {
  writeFileSync(
    "data/tehillim.json",
    JSON.stringify({ updated: new Date().toISOString(), source: TEHILLIM_URL, names: tehillim }, null, 2)
  );
  console.log(`Tehillim names: ${tehillim.length}`);
}
console.log(`Done. Wrote ${shuls.length} entries to data/shuls.json`);
