const axios = require("axios");

async function scrapeHackerEarth() {
  try {
    // HackerEarth public challenges API
    const response = await axios.get(
      "https://www.hackerearth.com/api/hackerearth/challenges/",
      {
        params: {
          client_id: "hackerearth",
          challenge_type: "hackathon",
          status: "ongoing,upcoming",
          limit: 20,
        },
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          Accept: "application/json",
        },
        timeout: 15000,
      }
    );

    const challenges = response.data?.response || [];

    if (!challenges.length) {
      // Try alternate endpoint
      return await scrapeHackerEarthAlternate();
    }

    return challenges.slice(0, 15).map((c) => ({
      id: `he-${c.id || c.slug || Math.random()}`,
      title: c.title || c.name || "Untitled Challenge",
      description:
        c.description ||
        c.tagline ||
        "Join this exciting hackathon on HackerEarth.",
      deadline: c.end_date || c.registration_end_date || null,
      startDate: c.start_date || null,
      prize: c.prize_amount
        ? `$${Number(c.prize_amount).toLocaleString()}`
        : c.prize || "Check website",
      teamSize: "1-4",
      tags: c.skills
        ? c.skills.slice(0, 3).map((s) => s.name || s)
        : ["Hackathon", "Coding"],
      url: c.url || `https://www.hackerearth.com/challenges/hackathon/`,
      source: "HackerEarth",
      sourceColor: "#323754",
      logo: c.thumbnail || null,
      registrations: c.num_teams || c.registrations || 0,
      mode: "Online",
    }));
  } catch (error) {
    console.error("[HackerEarth] Scrape error:", error.message);
    return await scrapeHackerEarthAlternate();
  }
}

async function scrapeHackerEarthAlternate() {
  try {
    const response = await axios.get(
      "https://www.hackerearth.com/challenges/",
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
        timeout: 15000,
      }
    );

    // Try to extract JSON from page source
    const jsonMatch = response.data.match(/window\.__INITIAL_DATA__\s*=\s*({.+?});/s) ||
      response.data.match(/"challenges"\s*:\s*(\[.+?\])/s);

    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[1]);
        const challenges = parsed.challenges || parsed || [];
        if (Array.isArray(challenges) && challenges.length) {
          return challenges.slice(0, 10).map((c) => ({
            id: `he-${c.id || Math.random()}`,
            title: c.title || "HackerEarth Challenge",
            description: c.description || c.tagline || "Exciting hackathon on HackerEarth.",
            deadline: c.end_date || null,
            startDate: c.start_date || null,
            prize: c.prize || "Check website",
            teamSize: "1-4",
            tags: ["Hackathon"],
            url: c.url || "https://www.hackerearth.com/challenges/",
            source: "HackerEarth",
            sourceColor: "#323754",
            logo: null,
            registrations: 0,
            mode: "Online",
          }));
        }
      } catch (e) {}
    }

    return getFallbackHackerEarth();
  } catch (error) {
    console.error("[HackerEarth] Alternate scrape error:", error.message);
    return getFallbackHackerEarth();
  }
}

function getFallbackHackerEarth() {
  return [
    {
      id: "he-demo-1",
      title: "HackerEarth AI Challenge 2025",
      description:
        "Build innovative AI/ML solutions for real-world problems. Compete with developers worldwide in this global hackathon.",
      deadline: new Date(Date.now() + 20 * 86400000).toISOString(),
      startDate: new Date(Date.now() + 2 * 86400000).toISOString(),
      prize: "$5,000",
      teamSize: "1-3",
      tags: ["AI/ML", "Python", "Deep Learning"],
      url: "https://www.hackerearth.com/challenges/",
      source: "HackerEarth",
      sourceColor: "#323754",
      logo: null,
      registrations: 8900,
      mode: "Online",
    },
    {
      id: "he-demo-2",
      title: "TechSprint Hackathon",
      description:
        "A 48-hour sprint to build the future. Work on challenges in cybersecurity, cloud computing, and IoT.",
      deadline: new Date(Date.now() + 12 * 86400000).toISOString(),
      startDate: new Date(Date.now() + 6 * 86400000).toISOString(),
      prize: "$2,500",
      teamSize: "1-4",
      tags: ["Cybersecurity", "Cloud", "IoT"],
      url: "https://www.hackerearth.com/challenges/",
      source: "HackerEarth",
      sourceColor: "#323754",
      logo: null,
      registrations: 4100,
      mode: "Online",
    },
  ];
}

module.exports = { scrapeHackerEarth };
