// lib/fetcher.js - Fetches real anime data from free APIs

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ─── JIKAN (MyAnimeList) ──────────────────────────────────────────────────────

export async function getTopAnime() {
  try {
    await sleep(500); // respect Jikan rate limit
    const res = await fetch('https://api.jikan.moe/v4/top/anime?limit=10&filter=airing');
    const data = await res.json();
    return data.data || [];
  } catch (e) {
    console.error('[Fetcher] Jikan top anime error:', e.message);
    return [];
  }
}

export async function getAnimeDetails(malId) {
  try {
    await sleep(500);
    const res = await fetch(`https://api.jikan.moe/v4/anime/${malId}/full`);
    const data = await res.json();
    return data.data || null;
  } catch (e) {
    console.error('[Fetcher] Jikan details error:', e.message);
    return null;
  }
}

export async function getSeasonalAnime() {
  try {
    await sleep(500);
    const res = await fetch('https://api.jikan.moe/v4/seasons/now?limit=10');
    const data = await res.json();
    return data.data || [];
  } catch (e) {
    console.error('[Fetcher] Jikan seasonal error:', e.message);
    return [];
  }
}

// ─── ANILIST (Trending + Images) ─────────────────────────────────────────────

export async function getTrendingAniList() {
  const query = `
    query {
      Page(page: 1, perPage: 10) {
        media(sort: TRENDING_DESC, type: ANIME, status: RELEASING) {
          id
          title { romaji english }
          coverImage { extraLarge large }
          bannerImage
          averageScore
          episodes
          genres
          trending
          description(asHtml: false)
          studios(isMain: true) { nodes { name } }
          season
          seasonYear
        }
      }
    }
  `;
  try {
    const res = await fetch('https://graphql.anilist.co', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ query }),
    });
    const data = await res.json();
    return data?.data?.Page?.media || [];
  } catch (e) {
    console.error('[Fetcher] AniList trending error:', e.message);
    return [];
  }
}

export async function getAnimeImageAniList(title) {
  const query = `
    query ($search: String) {
      Media(search: $search, type: ANIME) {
        title { romaji english }
        coverImage { extraLarge large }
        bannerImage
      }
    }
  `;
  try {
    const res = await fetch('https://graphql.anilist.co', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ query, variables: { search: title } }),
    });
    const data = await res.json();
    const media = data?.data?.Media;
    return {
      cover: media?.coverImage?.extraLarge || media?.coverImage?.large || null,
      banner: media?.bannerImage || null,
    };
  } catch (e) {
    console.error('[Fetcher] AniList image error:', e.message);
    return { cover: null, banner: null };
  }
}

// ─── ANIME NEWS ───────────────────────────────────────────────────────────────

export async function getAnimeNews() {
  try {
    // AniNewsAPI - real news from 7 sources
    const res = await fetch('https://aninews.vercel.app/api/news?limit=10');
    if (res.ok) {
      const data = await res.json();
      return data.articles || data.news || data || [];
    }
  } catch (e) {
    console.log('[Fetcher] AniNewsAPI failed, trying ANN RSS...');
  }

  // Fallback: Anime News Network RSS
  try {
    const res = await fetch('https://www.animenewsnetwork.com/all/rss.xml?ann-edition=us');
    const text = await res.text();
    // Parse RSS titles from XML
    const titles = [...text.matchAll(/<title><!\[CDATA\[(.+?)\]\]><\/title>/g)]
      .slice(1, 8)
      .map((m) => ({ title: m[1], source: 'ANN' }));
    return titles;
  } catch (e) {
    console.error('[Fetcher] ANN RSS error:', e.message);
    return [];
  }
}

// ─── TOPIC BUILDER ────────────────────────────────────────────────────────────

export async function buildTopicPool() {
  console.log('[Fetcher] Building topic pool from all APIs...');

  const [trending, seasonal, news] = await Promise.allSettled([
    getTrendingAniList(),
    getSeasonalAnime(),
    getAnimeNews(),
  ]);

  const topics = [];

  // From AniList trending
  if (trending.status === 'fulfilled') {
    for (const anime of trending.value.slice(0, 5)) {
      const title = anime.title?.english || anime.title?.romaji;
      if (!title) continue;
      topics.push({
        type: 'TRENDING',
        title,
        score: anime.averageScore ? (anime.averageScore / 10).toFixed(1) : 'N/A',
        episodes: anime.episodes || 'Ongoing',
        genres: anime.genres?.slice(0, 3).join(', ') || 'Action',
        studio: anime.studios?.nodes?.[0]?.name || 'Unknown',
        synopsis: anime.description?.slice(0, 500) || '',
        coverImage: anime.coverImage?.extraLarge || anime.coverImage?.large,
        bannerImage: anime.bannerImage,
        year: anime.seasonYear || 2026,
        slug: title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 50),
        postType: 'REVIEW',
        keyword: `${title} anime 2026`,
      });
    }
  }

  // From seasonal anime - build top list topics
  if (seasonal.status === 'fulfilled' && seasonal.value.length > 0) {
    topics.push({
      type: 'SEASONAL_LIST',
      title: 'Best Anime This Season 2026',
      animeList: seasonal.value.slice(0, 10).map((a) => ({
        title: a.title || a.titles?.[0]?.title || 'Unknown',
        score: a.score || 'N/A',
        episodes: a.episodes || 'Ongoing',
        genres: a.genres?.map((g) => g.name).join(', ') || '',
        synopsis: a.synopsis?.slice(0, 200) || '',
      })),
      slug: 'best-anime-this-season-2026',
      postType: 'TOP_LIST',
      keyword: 'best anime 2026 season',
      coverImage: null,
      bannerImage: null,
    });
  }

  // From news - news post topics
  if (news.status === 'fulfilled') {
    for (const item of news.value.slice(0, 3)) {
      const title = item.title || item.headline;
      if (!title) continue;
      topics.push({
        type: 'NEWS',
        title,
        newsHook: title,
        slug: title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 50),
        postType: 'NEWS',
        keyword: title.split(' ').slice(0, 5).join(' ').toLowerCase(),
        coverImage: null,
        bannerImage: null,
        score: 'N/A',
        episodes: 'N/A',
        genres: 'Anime News',
        studio: 'N/A',
        synopsis: title,
        year: 2026,
      });
    }
  }

  console.log(`[Fetcher] Topic pool ready: ${topics.length} topics`);
  return topics;
}
