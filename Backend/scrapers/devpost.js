const axios = require("axios");

async function scrapeDevpost() {
  try {
    // Devpost has a public API
    const response = await axios.get(
      "https://devpost.com/api/hackathons",
      {
        params: {
          status: ["upcoming", "open"],
          order_by: "deadline",
          per_page: 15,
        },
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          Accept: "application/json",
        },
        timeout: 15000,
      }
    );

    const hackathons = response.data?.hackathons || [];

    return hackathons.slice(0, 15).map((h) => ({
      id: `devpost-${h.id}`,
      title: h.title,
      description: h.tagline || h.description || "Join this hackathon on Devpost.",
      deadline: h.submission_period_dates
        ? extractEndDate(h.submission_period_dates)
        : null,
      startDate: null,
      prize: h.prize_amount
        ? `$${Number(h.prize_amount).toLocaleString()}`
        : h.displayed_prize_amount || "Check website",
      teamSize: "1-4",
      tags: (h.themes || []).slice(0, 3).map((t) => t.name || t).concat(["Hackathon"]).slice(0,3),
      url: h.url || `https://devpost.com/hackathons`,
      source: "Devpost",
      sourceColor: "#003E54",
      logo: h.thumbnail_url || null,
      registrations: h.registrations_count || 0,
      mode: h.location?.endsWith("Online") || !h.location ? "Online" : h.location,
    }));
  } catch (error) {
    console.error("[Devpost] Scrape error:", error.message);
    return getFallbackDevpost();
  }
}

function extractEndDate(dateString) {
  if (!dateString) return null;
  // "Jun 01 - Jul 15, 2025" → extract end date
  const parts = dateString.split("-");
  if (parts.length >= 2) {
    const d = new Date(parts[parts.length - 1].trim());
    if (!isNaN(d)) return d.toISOString();
  }
  const d = new Date(dateString);
  if (!isNaN(d)) return d.toISOString();
  return null;
}

function getFallbackDevpost() {
  return [
    {
      id: "devpost-demo-1",
      title: "Global AI Hackathon 2025",
      description:
        "The world's largest AI hackathon. Build impactful AI applications and compete for $50,000 in prizes.",
      deadline: new Date(Date.now() + 30 * 86400000).toISOString(),
      startDate: new Date(Date.now() + 5 * 86400000).toISOString(),
      prize: "$50,000",
      teamSize: "1-4",
      tags: ["AI", "ML", "Global"],
      url: "https://devpost.com/hackathons",
      source: "Devpost",
      sourceColor: "#003E54",
      logo: null,
      registrations: 25000,
      mode: "Online",
    },
  ];
}

module.exports = { scrapeDevpost };
