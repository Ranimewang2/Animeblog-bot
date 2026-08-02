# 🎌 Isekai Blog Bot

Automated anime blog generator for **isekaiblogging.blogspot.com**
Powered by AniList + Jikan + AniNews + OpenRouter AI + Blogger API

---

## 🚀 Quick Deploy

### Step 1 — GitHub
```bash
# Create new PRIVATE repo on github.com → "isekai-blog-bot"
git init
git add .
git commit -m "Initial bot setup"
git remote add origin https://github.com/YOUR_USERNAME/isekai-blog-bot.git
git push -u origin main
```

### Step 2 — Vercel
1. Go to **vercel.com** → Sign up with GitHub
2. Click **"Add New Project"** → Import `isekai-blog-bot`
3. Framework: **Other**
4. Click **Deploy**

### Step 3 — Vercel KV Database
1. Vercel Dashboard → **Storage** tab
2. Click **Create Database** → Select **KV**
3. Name: `blog-bot-kv` → Create
4. Click **Connect to Project** → Select your project
5. KV env vars are auto-added ✅

### Step 4 — Add Environment Variables
In Vercel Dashboard → Settings → Environment Variables, add:

```
OPENROUTER_API_KEY      = sk-or-your-key-here
GOOGLE_CLIENT_ID        = your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET    = GOCSPX-your-secret
GOOGLE_REFRESH_TOKEN    = 1//your-refresh-token
BLOGGER_BLOG_ID         = your-blog-id
CRON_SECRET             = isekai2026xBotSecure!
```

### Step 5 — Redeploy
After adding env vars → Vercel → **Redeploy** once

### Step 6 — Test It
Visit: `https://your-app.vercel.app/api/dashboard`
Enter your CRON_SECRET → Click Health Check → Click Generate!

### Step 7 — Set Up Cron-Job.org
1. Go to **cron-job.org** → Create free account
2. New Cronjob:
   - Title: `Isekai Blog Bot`
   - URL: `https://your-app.vercel.app/api/generate`
   - Schedule: Daily 08:00 UTC
   - Header: `Authorization: Bearer isekai2026xBotSecure!`
3. Save → Enable ✅
4. Add 2 more jobs for 14:00 and 20:00 UTC = **3 posts/day!**

---

## 📁 File Structure

```
isekai-blog-bot/
├── api/
│   ├── generate.js      ← Main bot endpoint (hit by cron-job.org)
│   ├── posts.js         ← Recent posts API for dashboard
│   └── dashboard.js     ← Serves dashboard HTML
├── lib/
│   ├── fetcher.js       ← AniList + Jikan + AniNews data
│   ├── writer.js        ← OpenRouter AI blog writer
│   ├── formatter.js     ← HTML + Schema builder
│   ├── publisher.js     ← Blogger API publisher
│   ├── auth.js          ← Google OAuth2 token handler
│   └── kv.js            ← Vercel KV 24hr storage
├── dashboard/
│   └── index.html       ← Control panel UI
├── vercel.json          ← Vercel config + cron
├── package.json
└── .env.example         ← Template for env vars
```

---

## 🔗 Your URLs (after deploy)

| URL | What it does |
|-----|-------------|
| `/api/dashboard` | Control panel |
| `/api/generate?key=YOUR_SECRET` | Manual trigger |
| `/api/generate?health=true&key=YOUR_SECRET` | Health check |
| `/api/posts?key=YOUR_SECRET` | Recent posts JSON |

---

## ⚡ How It Works

1. **cron-job.org** hits `/api/generate` daily (or 3x/day)
2. Bot fetches **trending anime** from AniList + Jikan + AniNews
3. Checks **Vercel KV** — skips topics posted in last 24hrs
4. Calls **OpenRouter AI** (4-model fallback chain) to write full SEO blog post
5. **Formats HTML** with schema markup + featured image from AniList
6. **Publishes to Blogger** via API — goes live instantly
7. **Stores in KV** with 24hr TTL — auto-deleted next day

---

## 🛠️ Troubleshooting

**"Unauthorized" error** → Wrong CRON_SECRET in dashboard input

**"Token refresh failed"** → GOOGLE_REFRESH_TOKEN expired or wrong. Redo OAuth Playground step. Make sure OAuth consent screen is "In Production" not "Testing".

**"All models failed"** → OpenRouter free models may be down. Check openrouter.ai status. Your account may have hit daily limit (50 req/day free).

**"No topics found"** → AniList/Jikan APIs may be temporarily down. Bot will retry next cron run.

**Post published but no images** → AniList didn't return banner/cover for that specific anime. Post still publishes fine — just without featured image.
