const express = require("express");
const cors = require("cors");
const cron = require("node-cron");
const path = require("path");
const { scrapeUnstop } = require("./scrapers/unstop");
const { scrapeHackerEarth } = require("./scrapers/hackerearth");
const { scrapeHack2Skill } = require("./scrapers/hack2skill");
const { scrapeDevpost } = require("./scrapers/devpost");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Serve frontend
app.use(express.static(path.join(__dirname, "../frontend/public")));

// --- In-memory cache ---
let cache = {
  hackathons: [],
  lastUpdated: null,
  isLoading: false,
  errors: {},
};

const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

async function fetchAllHackathons() {
  if (cache.isLoading) return;
  cache.isLoading = true;
  console.log("[Scraper] Starting scrape cycle...");

  const results = await Promise.allSettled([
    scrapeUnstop(),
    scrapeHackerEarth(),
    scrapeHack2Skill(),
    scrapeDevpost(),
  ]);

  const sources = ["Unstop", "HackerEarth", "Hack2Skill", "Devpost"];
  let allHackathons = [];

  results.forEach((result, i) => {
    if (result.status === "fulfilled") {
      allHackathons = allHackathons.concat(result.value);
      delete cache.errors[sources[i]];
      console.log(`[${sources[i]}] Got ${result.value.length} hackathons`);
    } else {
      cache.errors[sources[i]] = result.reason?.message || "Unknown error";
      console.error(`[${sources[i]}] Failed:`, result.reason?.message);
    }
  });

  // Sort by deadline (soonest first, null last)
  allHackathons.sort((a, b) => {
    if (!a.deadline && !b.deadline) return 0;
    if (!a.deadline) return 1;
    if (!b.deadline) return -1;
    return new Date(a.deadline) - new Date(b.deadline);
  });

  // Deduplicate by title similarity
  const seen = new Set();
  allHackathons = allHackathons.filter((h) => {
    const key = h.title.toLowerCase().replace(/\s+/g, "").substring(0, 30);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  cache.hackathons = allHackathons;
  cache.lastUpdated = new Date().toISOString();
  cache.isLoading = false;
  console.log(`[Scraper] Done. Total: ${allHackathons.length} hackathons`);
}

// Initial fetch on startup
fetchAllHackathons();

// Refresh every 30 minutes
cron.schedule("*/30 * * * *", fetchAllHackathons);

// --- API Routes ---

// GET all hackathons
app.get("/api/hackathons", (req, res) => {
  const { source, search, mode, sort } = req.query;
  let data = [...cache.hackathons];

  // Filter by source
  if (source && source !== "all") {
    data = data.filter(
      (h) => h.source.toLowerCase() === source.toLowerCase()
    );
  }

  // Filter by mode
  if (mode && mode !== "all") {
    data = data.filter(
      (h) => h.mode?.toLowerCase().includes(mode.toLowerCase())
    );
  }

  // Search
  if (search) {
    const q = search.toLowerCase();
    data = data.filter(
      (h) =>
        h.title.toLowerCase().includes(q) ||
        h.description.toLowerCase().includes(q) ||
        h.tags?.some((t) => t.toLowerCase().includes(q))
    );
  }

  // Sort
  if (sort === "newest") {
    data.sort((a, b) => new Date(b.startDate || 0) - new Date(a.startDate || 0));
  } else if (sort === "prize") {
    data.sort((a, b) => {
      const aP = extractPrizeNum(a.prize);
      const bP = extractPrizeNum(b.prize);
      return bP - aP;
    });
  } else if (sort === "popular") {
    data.sort((a, b) => (b.registrations || 0) - (a.registrations || 0));
  }

  res.json({
    success: true,
    count: data.length,
    lastUpdated: cache.lastUpdated,
    errors: cache.errors,
    data,
  });
});

// GET single hackathon
app.get("/api/hackathons/:id", (req, res) => {
  const hackathon = cache.hackathons.find((h) => h.id === req.params.id);
  if (!hackathon) {
    return res.status(404).json({ success: false, error: "Not found" });
  }
  res.json({ success: true, data: hackathon });
});

// GET stats
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
    lastUpdated: cache.lastUpdated,
  });
});

// POST force refresh
app.post("/api/refresh", async (req, res) => {
  if (cache.isLoading) {
    return res.json({ success: false, message: "Refresh already in progress" });
  }
  fetchAllHackathons(); // non-blocking
  res.json({ success: true, message: "Refresh started" });
});

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", uptime: process.uptime() });
});

// Catch-all: serve frontend
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/public/index.html"));
});

app.listen(PORT, () => {
  console.log(`🚀 Hackathon Tracker running on port ${PORT}`);
});

function extractPrizeNum(prize) {
  if (!prize) return 0;
  const match = prize.replace(/,/g, "").match(/[\d.]+/);
  return match ? parseFloat(match[0]) : 0;
}

module.exports = app;
