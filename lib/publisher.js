// lib/publisher.js - Publishes posts to Blogger API v3

import { getAccessToken } from './auth.js';

const BLOG_ID = process.env.BLOGGER_BLOG_ID;
const BLOGGER_API = 'https://www.googleapis.com/blogger/v3';

export async function publishToBlogger({ title, content, labels }) {
  if (!BLOG_ID || BLOG_ID === 'PASTE_BLOG_ID_HERE') {
    throw new Error('[Publisher] BLOGGER_BLOG_ID not configured in env vars');
  }

  console.log(`[Publisher] Publishing: "${title}"`);
  const accessToken = await getAccessToken();

  const postBody = {
    kind: 'blogger#post',
    title,
    content,
    labels,
    status: 'LIVE', // publish immediately
  };

  const res = await fetch(`${BLOGGER_API}/blogs/${BLOG_ID}/posts?isDraft=false&fetchBody=false`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(postBody),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`[Publisher] Blogger API error ${res.status}: ${errText}`);
  }

  const data = await res.json();
  console.log(`[Publisher] ✅ Published successfully: ${data.url}`);

  return {
    id: data.id,
    url: data.url,
    title: data.title,
    published: data.published,
  };
}

// Get recently published posts from Blogger (for dashboard)
export async function getRecentBloggerPosts(maxResults = 10) {
  try {
    const accessToken = await getAccessToken();
    const res = await fetch(
      `${BLOGGER_API}/blogs/${BLOG_ID}/posts?maxResults=${maxResults}&fetchBodies=false&status=live`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return data.items || [];
  } catch (e) {
    console.error('[Publisher] Failed to fetch recent posts:', e.message);
    return [];
  }
}
