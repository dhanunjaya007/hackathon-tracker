const axios = require("axios");
const cheerio = require("cheerio");

async function scrapeHack2Skill() {
  try {
    const response = await axios.get("https://hack2skill.com/hackathons", {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        "Accept-Encoding": "gzip, deflate, br",
        Connection: "keep-alive",
      },
      timeout: 20000,
    });

    const $ = cheerio.load(response.data);
    const hackathons = [];

    // Try multiple selectors for Hack2Skill's card-based layout
    const cardSelectors = [
      ".hackathon-card",
      ".challenge-card",
      ".event-card",
      "[class*='hackathon']",
      "[class*='challenge']",
      ".card",
      "article",
    ];

    let cards = $();
    for (const sel of cardSelectors) {
      cards = $(sel);
      if (cards.length > 2) break;
    }

    if (cards.length > 0) {
      cards.slice(0, 15).each((i, el) => {
        const card = $(el);
        const title =
          card.find("h1,h2,h3,h4,.title,.name").first().text().trim() ||
          card.find("[class*='title']").first().text().trim();
        const description =
          card
            .find("p,.description,.desc,[class*='desc']")
            .first()
            .text()
            .trim() || "";
        const deadline =
          card
            .find("[class*='deadline'],[class*='date'],[class*='end']")
            .first()
            .text()
            .trim() || "";
        const prize =
          card
            .find("[class*='prize'],[class*='reward']")
            .first()
            .text()
            .trim() || "";
        const link =
          card.find("a").first().attr("href") ||
          card.attr("href") ||
          "";

        if (title && title.length > 3) {
          hackathons.push({
            id: `h2s-${i}-${Date.now()}`,
            title,
            description: description.substring(0, 300) || "Exciting hackathon on Hack2Skill.",
            deadline: parseDeadlineText(deadline),
            startDate: null,
            prize: prize || "Check website",
            teamSize: "2-4",
            tags: extractTags(title + " " + description),
            url: link.startsWith("http")
              ? link
              : `https://hack2skill.com${link}`,
            source: "Hack2Skill",
            sourceColor: "#FF6B35",
            logo: card.find("img").first().attr("src") || null,
            registrations: 0,
            mode: "Online",
          });
        }
      });
    }

    // Also try Next.js/React embedded JSON data
    const scriptData = extractNextJSData(response.data);
    if (scriptData.length > 0 && hackathons.length < 3) {
      return [...hackathons, ...scriptData];
    }

    if (hackathons.length > 0) return hackathons;
    return getFallbackHack2Skill();
  } catch (error) {
    console.error("[Hack2Skill] Scrape error:", error.message);
    return getFallbackHack2Skill();
  }
}

function extractNextJSData(html) {
  const results = [];
  try {
    const matches = [
      ...html.matchAll(
        /"title"\s*:\s*"([^"]+)"[^}]*"description"\s*:\s*"([^"]+)"/g
      ),
    ];
    matches.slice(0, 5).forEach((m, i) => {
      results.push({
        id: `h2s-json-${i}`,
        title: m[1],
        description: m[2],
        deadline: null,
        startDate: null,
        prize: "Check website",
        teamSize: "2-4",
        tags: extractTags(m[1]),
        url: "https://hack2skill.com/hackathons",
        source: "Hack2Skill",
        sourceColor: "#FF6B35",
        logo: null,
        registrations: 0,
        mode: "Online",
      });
    });
  } catch (e) {}
  return results;
}

function parseDeadlineText(text) {
  if (!text) return null;
  const dateMatch = text.match(
    /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\w+ \d{1,2},?\s*\d{4})/
  );
  if (dateMatch) {
    const d = new Date(dateMatch[0]);
    if (!isNaN(d)) return d.toISOString();
  }
  // Check for relative time
  if (text.toLowerCase().includes("day")) {
    const daysMatch = text.match(/(\d+)\s*day/i);
    if (daysMatch) {
      return new Date(Date.now() + parseInt(daysMatch[1]) * 86400000).toISOString();
    }
  }
  return null;
}

function extractTags(text) {
  const keywords = [
    "AI", "ML", "Machine Learning", "Web3", "Blockchain", "IoT",
    "Healthcare", "FinTech", "EdTech", "AR/VR", "Cloud", "Cybersecurity",
    "Data Science", "Mobile", "Sustainability", "Green Tech", "Social Good",
  ];
  return keywords
    .filter((k) => text.toLowerCase().includes(k.toLowerCase()))
    .slice(0, 3)
    .concat(["Hackathon"])
    .slice(0, 3);
}

function getFallbackHack2Skill() {
  return [
    {
      id: "h2s-demo-1",
      title: "InnovateTech Hackathon 2025",
      description:
        "Build innovative tech solutions for India's biggest challenges. Focus areas: AgriTech, EduTech, and Smart Cities.",
      deadline: new Date(Date.now() + 18 * 86400000).toISOString(),
      startDate: new Date(Date.now() + 4 * 86400000).toISOString(),
      prize: "₹75,000",
      teamSize: "2-5",
      tags: ["AgriTech", "EduTech", "Smart City"],
      url: "https://hack2skill.com/hackathons",
      source: "Hack2Skill",
      sourceColor: "#FF6B35",
      logo: null,
      registrations: 2800,
      mode: "Hybrid",
    },
    {
      id: "h2s-demo-2",
      title: "GreenCode Sustainability Hackathon",
      description:
        "Code for the planet. Build solutions that reduce carbon footprint, promote clean energy, and support sustainable development.",
      deadline: new Date(Date.now() + 25 * 86400000).toISOString(),
      startDate: new Date(Date.now() + 10 * 86400000).toISOString(),
      prize: "₹40,000",
      teamSize: "2-4",
      tags: ["Green Tech", "Sustainability", "Clean Energy"],
      url: "https://hack2skill.com/hackathons",
      source: "Hack2Skill",
      sourceColor: "#FF6B35",
      logo: null,
      registrations: 1500,
      mode: "Online",
    },
  ];
}

module.exports = { scrapeHack2Skill };
