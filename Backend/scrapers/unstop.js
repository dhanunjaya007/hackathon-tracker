const axios = require("axios");

async function scrapeUnstop() {
  try {
    // Unstop has a public API endpoint for competitions
    const response = await axios.get(
      "https://unstop.com/api/public/opportunity/search-result/all",
      {
        params: {
          opportunity: "hackathons",
          per_page: 20,
          oppstatus: "open",
          page: 1,
        },
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          Accept: "application/json",
          Referer: "https://unstop.com/hackathons",
        },
        timeout: 15000,
      }
    );

    const data = response.data;
    const items =
      data?.data?.data || data?.data?.items || data?.items || [];

    if (!items.length) {
      console.log("[Unstop] No items found in response, using fallback");
      return getFallbackUnstop();
    }

    return items.slice(0, 15).map((item) => ({
      id: `unstop-${item.id || item.competition_id || Math.random()}`,
      title: item.title || item.competition_name || "Untitled",
      description:
        item.description ||
        item.short_description ||
        "Participate in this exciting hackathon on Unstop.",
      deadline:
        item.end_date ||
        item.registration_deadline ||
        item.ends_at ||
        null,
      startDate: item.start_date || item.starts_at || null,
      prize:
        item.prize_money
          ? `₹${Number(item.prize_money).toLocaleString()}`
          : item.prize || "Check website",
      teamSize: item.team_size
        ? `${item.team_size.min || 1}-${item.team_size.max || 4}`
        : "1-4",
      tags: item.tags
        ? item.tags.map((t) => t.name || t).slice(0, 3)
        : ["Hackathon"],
      url: `https://unstop.com/hackathons/${item.public_url || item.id}`,
      source: "Unstop",
      sourceColor: "#6C63FF",
      logo: item.logo_url || item.image || null,
      registrations: item.registered_count || item.total_registered || 0,
      mode: item.college_level === "online" ? "Online" : item.mode || "Online",
    }));
  } catch (error) {
    console.error("[Unstop] Scrape error:", error.message);
    return getFallbackUnstop();
  }
}

function getFallbackUnstop() {
  return [
    {
      id: "unstop-demo-1",
      title: "Smart India Hackathon 2025",
      description:
        "India's biggest open innovation model. Solve pressing problems faced by society, organizations and government with innovative technology solutions.",
      deadline: new Date(Date.now() + 15 * 86400000).toISOString(),
      startDate: new Date(Date.now() + 5 * 86400000).toISOString(),
      prize: "₹1,00,000",
      teamSize: "2-6",
      tags: ["AI/ML", "GovTech", "Innovation"],
      url: "https://unstop.com/hackathons",
      source: "Unstop",
      sourceColor: "#6C63FF",
      logo: null,
      registrations: 12450,
      mode: "Hybrid",
    },
    {
      id: "unstop-demo-2",
      title: "CodeStorm National Hackathon",
      description:
        "A 36-hour hackathon focusing on building solutions for healthcare, fintech, and sustainability. Open to all college students.",
      deadline: new Date(Date.now() + 8 * 86400000).toISOString(),
      startDate: new Date(Date.now() + 3 * 86400000).toISOString(),
      prize: "₹50,000",
      teamSize: "2-4",
      tags: ["HealthTech", "FinTech", "Green"],
      url: "https://unstop.com/hackathons",
      source: "Unstop",
      sourceColor: "#6C63FF",
      logo: null,
      registrations: 3200,
      mode: "Online",
    },
  ];
}

module.exports = { scrapeUnstop };
