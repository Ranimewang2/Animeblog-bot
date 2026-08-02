// api/posts.js - Returns recent posts from Blogger for the dashboard

import { getRecentBloggerPosts } from '../lib/publisher.js';

export default async function handler(req, res) {
  try {
    const posts = await getRecentBloggerPosts(10);
    return res.status(200).json({ success: true, posts });
  } catch (e) {
    console.error('[Posts API] Error:', e.message);
    return res.status(500).json({ success: false, error: e.message, posts: [] });
  }
}
