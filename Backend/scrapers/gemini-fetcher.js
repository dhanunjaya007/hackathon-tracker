const axios = require("axios");

const SOURCE_COLORS = {
  Unstop: "#6C63FF",
  HackerEarth: "#44b0f0",
  Hack2Skill: "#FF6B35",
  Devpost: "#4ab3f4",
};

const SOURCE_URLS = {
  Unstop: "https://unstop.com/hackathons",
  HackerEarth: "https://www.hackerearth.com/challenges/hackathon/",
  Hack2Skill: "https://hack2skill.com/hackathons",
  Devpost: "https://devpost.com/hackathons",
};

async function fetchWithGemini(source) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error(`[${source}] No GEMINI_API_KEY set`);
    return [];
  }

  const prompt = `Go to ${SOURCE_URLS[source]} and find all currently OPEN or UPCOMING hackathons listed there right now.

For each hackathon extract:
- title: exact name of the hackathon
- description: 2-3 sentences about the theme and what to build
- deadline: registration or submission deadline as YYYY-MM-DD (or null)
- startDate: start date as YYYY-MM-DD (or null)
- prize: prize amount e.g. Rs.50000 or $5000 or "Check website"
- teamSize: e.g. "1-4" or "2-6" or "Solo"
- url: direct link to the hackathon page
- tags: array of 2-3 relevant tags like ["AI", "Web3", "HealthTech"]
- registrations: number of registered participants (0 if unknown)
- mode: "Online" or "Offline" or "Hybrid"

Return ONLY a raw JSON array. No markdown, no explanation, no code fences. Start with [ and end with ].
Return 5-8 real currently open hackathons. If none found return [].`;

  try {
    console.log(`[${source}] Fetching via Gemini + Google Search...`);

    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        contents: [
          {
            parts: [{ text: prompt }],
          },
        ],
        tools: [
          {
            google_search: {},
          },
        ],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 4000,
        },
      },
      {
        headers: { "Content-Type": "application/json" },
        timeout: 60000,
      }
    );

    // Extract text from Gemini response
    const candidates = response.data?.candidates || [];
    if (!candidates.length) {
      console.log(`[${source}] No candidates in Gemini response`);
      return [];
    }

    const parts = candidates[0]?.content?.parts || [];
    let rawText = parts
      .filter((p) => p.text)
      .map((p) => p.text)
      .join("\n")
      .trim();

    if (!rawText) {
      console.log(`[${source}] Empty text from Gemini`);
      return [];
    }

    // Strip markdown fences if present
    rawText = rawText
      .replace(/```json\s*/gi, "")
      .replace(/```\s*/g, "")
      .trim();

    // Extract JSON array
    const match = rawText.match(/\[[\s\S]*\]/);
    if (!match) {
      console.log(`[${source}] No JSON array found. Preview:`, rawText.substring(0, 300));
      return [];
    }

    let hackathons;
    try {
      hackathons = JSON.parse(match[0]);
    } catch (e) {
      console.error(`[${source}] JSON parse error:`, e.message);
      return [];
    }

    if (!Array.isArray(hackathons) || hackathons.length === 0) {
      console.log(`[${source}] Empty array returned`);
      return [];
    }

    console.log(`[${source}] ✓ ${hackathons.length} hackathons fetched`);

    return hackathons
      .filter((h) => h && h.title)
      .map((h, i) => ({
        id: `${source.toLowerCase().replace(/\W/g, "")}-${Date.now()}-${i}`,
        title: String(h.title).trim(),
        description: String(h.description || `A hackathon on ${source}`).trim(),
        deadline: toISO(h.deadline),
        startDate: toISO(h.startDate),
        prize: String(h.prize || "Check website").trim(),
        teamSize: String(h.teamSize || "1-4").trim(),
        tags: Array.isArray(h.tags)
          ? h.tags.slice(0, 3).map(String)
          : ["Hackathon"],
        url: String(h.url || SOURCE_URLS[source]).trim(),
        source,
        sourceColor: SOURCE_COLORS[source],
        logo: null,
        registrations: Number(h.registrations) || 0,
        mode: String(h.mode || "Online").trim(),
      }));
  } catch (err) {
    const status = err.response?.status;
    const detail = JSON.stringify(err.response?.data || {}).substring(0, 400);
    console.error(`[${source}] Gemini error (${status}): ${err.message}`);
    if (detail !== "{}") console.error(`[${source}] Detail:`, detail);
    return [];
  }
}

function toISO(val) {
  if (!val || val === "null" || val === "unknown") return null;
  const d = new Date(String(val).replace(/(\d+)(st|nd|rd|th)/gi, "$1"));
  return isNaN(d.getTime()) ? null : d.toISOString();
}

module.exports = { fetchWithGemini };
