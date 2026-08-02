// api/generate.js
// Main endpoint — triggered by cron-job.org or manual visit
// URL: https://your-app.vercel.app/api/generate
// Protected by Bearer token in Authorization header

import { buildTopicPool } from '../lib/fetcher.js';
import { writePost } from '../lib/writer.js';
import { buildBloggerPost } from '../lib/formatter.js';
import { publishToBlogger } from '../lib/publisher.js';
export const config = {
  maxDuration: 60, // Vercel max for hobby tier
};

export default async function handler(req, res) {
  const startTime = Date.now();
  console.log(`\n${'='.repeat(50)}`);
  console.log(`[Bot] Run started at ${new Date().toISOString()}`);
  console.log(`${'='.repeat(50)}`);

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

    // ── STEP 2: PICK TOPIC ────────────────────────────────────────────────────
    console.log('\n[Bot] STEP 2 — Picking topic...');
    const randomIndex = Math.floor(Math.random() * Math.min(topicPool.length, 5));
    const selectedTopic = topicPool[randomIndex];
    console.log(`[Bot] Selected topic: "${selectedTopic.title}" (#${randomIndex + 1} of ${topicPool.length})`);

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
