// api/generate.js
// Main endpoint — triggered by cron-job.org or manual visit
// URL: https://your-app.vercel.app/api/generate
// Protected by Bearer token in Authorization header

import { buildTopicPool } from '../lib/fetcher.js';
import { writePost } from '../lib/writer.js';
import { buildBloggerPost } from '../lib/formatter.js';
import { publishToBlogger } from '../lib/publisher.js';
import { wasRecentlyPosted, markAsPosted } from '../lib/kv.js';

export const config = {
  maxDuration: 60, // Vercel max for hobby tier
};

export default async function handler(req, res) {
  const startTime = Date.now();
  console.log(`\n${'='.repeat(50)}`);
  console.log(`[Bot] Run started at ${new Date().toISOString()}`);
  console.log(`${'='.repeat(50)}`);

  // ── SECURITY CHECK ──────────────────────────────────────────────────────────
  const cronSecret = process.env.CRON_SECRET || 'isekai2026xBotSecure!';
  const authHeader = req.headers.authorization;

  // Allow both: Authorization header (cron-job.org) OR manual visit with ?key= param
  const providedKey = authHeader?.replace('Bearer ', '') || req.query.key;

  if (providedKey !== cronSecret) {
    console.warn('[Bot] Unauthorized access attempt');
    return res.status(401).json({
      success: false,
      error: 'Unauthorized. Add Authorization: Bearer YOUR_CRON_SECRET header or ?key=YOUR_CRON_SECRET param',
    });
  }

  // ── HEALTH CHECK MODE ────────────────────────────────────────────────────────
  if (req.query.health === 'true') {
    return res.status(200).json({
      success: true,
      message: 'Bot is healthy and ready!',
      env: {
        openrouter: !!process.env.OPENROUTER_API_KEY,
        googleClientId: !!process.env.GOOGLE_CLIENT_ID,
        googleSecret: !!process.env.GOOGLE_CLIENT_SECRET,
        refreshToken: !!process.env.GOOGLE_REFRESH_TOKEN,
        bloggerId: !!process.env.BLOGGER_BLOG_ID,
        kvUrl: !!process.env.KV_REST_API_URL,
      },
    });
  }

  try {
    // ── STEP 1: BUILD TOPIC POOL ───────────────────────────────────────────────
    console.log('\n[Bot] STEP 1 — Fetching trending topics...');
    const topicPool = await buildTopicPool();

    if (!topicPool || topicPool.length === 0) {
      return res.status(200).json({
        success: false,
        message: 'No topics found from APIs — will retry next run',
      });
    }

    console.log(`[Bot] Found ${topicPool.length} potential topics`);

    // ── STEP 2: PICK FRESH TOPIC ───────────────────────────────────────────────
    console.log('\n[Bot] STEP 2 — Checking for fresh topic...');
    let selectedTopic = null;

    for (const topic of topicPool) {
      const alreadyPosted = await wasRecentlyPosted(topic.slug);
      if (!alreadyPosted) {
        selectedTopic = topic;
        console.log(`[Bot] Selected topic: "${topic.title}" (${topic.postType})`);
        break;
      } else {
        console.log(`[Bot] Skipping "${topic.title}" — posted in last 24hrs`);
      }
    }

    if (!selectedTopic) {
      return res.status(200).json({
        success: false,
        message: 'All topics were posted in last 24 hours — try again later or add more topic sources',
      });
    }

    // ── STEP 3: WRITE BLOG POST ────────────────────────────────────────────────
    console.log('\n[Bot] STEP 3 — Writing blog post with AI...');
    const { html: rawHtml, model } = await writePost(selectedTopic);
    console.log(`[Bot] AI wrote ${rawHtml.length} chars using model: ${model}`);

    // ── STEP 4: FORMAT POST ────────────────────────────────────────────────────
    console.log('\n[Bot] STEP 4 — Formatting post with schema + images...');
    const formatted = buildBloggerPost(selectedTopic, rawHtml);
    console.log(`[Bot] Formatted post: "${formatted.title}" — Labels: ${formatted.labels.join(', ')}`);

    // ── STEP 5: PUBLISH TO BLOGGER ─────────────────────────────────────────────
    console.log('\n[Bot] STEP 5 — Publishing to Blogger...');
    const published = await publishToBlogger(formatted);

    // ── STEP 6: STORE IN KV ────────────────────────────────────────────────────
    console.log('\n[Bot] STEP 6 — Storing in KV (24hr TTL)...');
    await markAsPosted(selectedTopic.slug, {
      title: formatted.title,
      url: published.url,
      publishedAt: new Date().toISOString(),
      model,
      topicType: selectedTopic.postType,
    });

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`\n[Bot] ✅ COMPLETE in ${duration}s`);
    console.log(`[Bot] Post URL: ${published.url}`);
    console.log(`${'='.repeat(50)}\n`);

    return res.status(200).json({
      success: true,
      duration: `${duration}s`,
      post: {
        title: formatted.title,
        url: published.url,
        labels: formatted.labels,
        topicType: selectedTopic.postType,
        model,
        publishedAt: published.published,
      },
    });

  } catch (error) {
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.error(`\n[Bot] ❌ FAILED after ${duration}s:`, error.message);
    console.error(error.stack);

    return res.status(500).json({
      success: false,
      duration: `${duration}s`,
      error: error.message,
    });
  }
}
