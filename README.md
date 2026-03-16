# ⚡ HackFinder — Hackathon Aggregator

A full-stack web app that scrapes and displays live hackathons from:
- **Unstop** (unstop.com)
- **HackerEarth** (hackerearth.com)
- **Hack2Skill** (hack2skill.com)
- **Devpost** (devpost.com)

## Features
- 🔄 Auto-refreshes every 30 minutes
- 🔍 Search & filter by source, mode, deadline
- 📊 Stats: total hackathons, upcoming count
- 💰 Prize amounts, team sizes, deadlines
- 🎨 Beautiful dark UI with deadline progress bars

---

## 🚀 Deploy to Render (Free)

### Step 1: Push to GitHub
```bash
cd hackathon-tracker
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/hackathon-tracker.git
git push -u origin main
```

### Step 2: Deploy on Render
1. Go to [render.com](https://render.com) and sign up / log in
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repo
4. Configure:
   - **Name**: `hackathon-tracker`
   - **Root Directory**: `backend`
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
   - **Plan**: Free
5. Click **"Create Web Service"**

Render will give you a URL like: `https://hackathon-tracker.onrender.com`

> **Note**: Free Render instances spin down after 15 min of inactivity. First request after sleep takes ~30s. Upgrade to Starter ($7/mo) for always-on.

---

## 🛠 Run Locally

```bash
# Install dependencies
cd backend
npm install

# Start server
node server.js
# or for dev with auto-reload:
npx nodemon server.js

# Open browser
open http://localhost:3000
```

---

## 📁 Project Structure

```
hackathon-tracker/
├── backend/
│   ├── server.js              # Express server + caching + cron
│   ├── package.json
│   └── scrapers/
│       ├── unstop.js          # Unstop scraper
│       ├── hackerearth.js     # HackerEarth scraper
│       ├── hack2skill.js      # Hack2Skill scraper (Cheerio)
│       └── devpost.js         # Devpost API scraper
├── frontend/
│   └── public/
│       └── index.html         # Single-page frontend
├── render.yaml                # Render deployment config
└── README.md
```

---

## 🔌 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/hackathons` | All hackathons (with filters) |
| GET | `/api/hackathons?source=unstop` | Filter by source |
| GET | `/api/hackathons?search=AI` | Search hackathons |
| GET | `/api/hackathons?mode=online` | Filter by mode |
| GET | `/api/hackathons?sort=prize` | Sort by prize |
| GET | `/api/stats` | Aggregated stats |
| POST | `/api/refresh` | Force re-scrape |
| GET | `/api/health` | Health check |

---

## ⚙️ Customization

**Add more sources**: Create a new file in `backend/scrapers/` following the same pattern, then import and add it to the `Promise.allSettled` array in `server.js`.

**Change cache duration**: Edit `CACHE_DURATION` in `server.js` (default: 30 min).

**Change scrape frequency**: Edit the cron expression in `server.js` (default: `*/30 * * * *`).
