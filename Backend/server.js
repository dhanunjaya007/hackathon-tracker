const express = require("express");
const cors = require("cors");
const cron = require("node-cron");
const path = require("path");
const { fetchWithGemini } = require("./scrapers/gemini-fetcher");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Serve frontend (capital F matches your GitHub folder name)
app.use(express.static(path.join(__dirname, "../Frontend/public")));

// ── In-memory cache ───────────────────────────────────────────────────────────
let cache = {
  hackathons: [],
  lastUpdated: null,
  isLoading: false,
  errors: {},
};

const SOURCES = ["Unstop", "HackerEarth", "Hack2Skill", "Devpost"];

// ── Main fetch function ───────────────────────────────────────────────────────
async function fetchAllHackathons() {
  if (cache.isLoading) {
    console.log("[Scraper] Already running, skipping.");
    return;
  }
  cache.isLoading = true;
  console.log("[Scraper] Starting fetch via Gemini + Google Search...");

  const results = await Promise.allSettled(
    SOURCES.map((source) => fetchWithGemini(source))
  );

  let allHackathons = [];

  results.forEach((result, i) => {
    const source = SOURCES[i];
    if (result.status === "fulfilled" && result.value.length > 0) {
      allHackathons = allHackathons.concat(result.value);
      delete cache.errors[source];
      console.log(`[${source}] OK - ${result.value.length} hackathons`);
    } else {
      const reason =
        result.status === "rejected"
          ? result.reason?.message
          : "0 results returned";
      cache.errors[source] = reason;
      console.warn(`[${source}] WARN - ${reason}`);
    }
  });

  // Deduplicate by title
  const seen = new Set();
  allHackathons = allHackathons.filter((h) => {
    const key = h.title
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "")
      .substring(0, 25);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Sort: soonest deadline first, nulls last
  allHackathons.sort((a, b) => {
    if (!a.deadline && !b.deadline) return 0;
    if (!a.deadline) return 1;
    if (!b.deadline) return -1;
    return new Date(a.deadline) - new Date(b.deadline);
  });

  if (allHackathons.length > 0) {
    cache.hackathons = allHackathons;
    cache.lastUpdated = new Date().toISOString();
  } else {
    console.warn("[Scraper] No results — keeping previous cache.");
  }

  cache.isLoading = false;
  console.log(`[Scraper] Done. ${cache.hackathons.length} total cached.`);
}

// Fetch on startup, then every 6 hours (saves API quota)
fetchAllHackathons();
cron.schedule("0 */6 * * *", fetchAllHackathons);

// ── API Routes ────────────────────────────────────────────────────────────────

app.get("/api/hackathons", (req, res) => {
  const { source, search, mode, sort } = req.query;
  let data = [...cache.hackathons];

  if (source && source !== "all") {
    data = data.filter((h) => h.source.toLowerCase() === source.toLowerCase());
  }
  if (mode && mode !== "all") {
    data = data.filter((h) =>
      (h.mode || "").toLowerCase().includes(mode.toLowerCase())
    );
  }
  if (search) {
    const q = search.toLowerCase();
    data = data.filter(
      (h) =>
        h.title.toLowerCase().includes(q) ||
        h.description.toLowerCase().includes(q) ||
        (h.tags || []).some((t) => t.toLowerCase().includes(q))
    );
  }
  if (sort === "newest") {
    data.sort((a, b) => new Date(b.startDate || 0) - new Date(a.startDate || 0));
  } else if (sort === "prize") {
    data.sort((a, b) => extractPrizeNum(b.prize) - extractPrizeNum(a.prize));
  } else if (sort === "popular") {
    data.sort((a, b) => (b.registrations || 0) - (a.registrations || 0));
  }

  res.json({
    success: true,
    count: data.length,
    lastUpdated: cache.lastUpdated,
    isLoading: cache.isLoading,
    errors: cache.errors,
    data,
  });
});

app.get("/api/hackathons/:id", (req, res) => {
  const h = cache.hackathons.find((x) => x.id === req.params.id);
  if (!h) return res.status(404).json({ success: false, error: "Not found" });
  res.json({ success: true, data: h });
});

app.get("/api/stats", (req, res) => {
  const sources = {};
  cache.hackathons.forEach((h) => {
    sources[h.source] = (sources[h.source] || 0) + 1;
  });
  const upcoming = cache.hackathons.filter(
    (h) => h.deadline && new Date(h.deadline) > new Date()
  ).length;

  res.json({
    success: true,
    total: cache.hackathons.length,
    upcoming,
    sources,
    isLoading: cache.isLoading,
    lastUpdated: cache.lastUpdated,
  });
});

app.post("/api/refresh", (req, res) => {
  if (cache.isLoading) {
    return res.json({ success: false, message: "Already refreshing" });
  }
  fetchAllHackathons();
  res.json({ success: true, message: "Refresh started" });
});

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    uptime: process.uptime(),
    cached: cache.hackathons.length,
    lastUpdated: cache.lastUpdated,
    hasApiKey: !!process.env.GEMINI_API_KEY,
  });
});

// Catch-all → serve frontend SPA
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../Frontend/public/index.html"));
});

app.listen(PORT, () => {
  console.log(`🚀 HackFinder running on port ${PORT}`);
  if (!process.env.GEMINI_API_KEY) {
    console.warn("⚠️  WARNING: GEMINI_API_KEY not set! Scraping will fail.");
  }
});

function extractPrizeNum(prize) {
  if (!prize) return 0;
  const m = String(prize).replace(/,/g, "").match(/[\d.]+/);
  return m ? parseFloat(m[0]) : 0;
}

module.exports = app;
