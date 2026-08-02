// lib/fetcher.js - Expanded topic pool: trending, popular, evergreen, genre lists, news

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function slugify(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 60);
}

// ─── ANILIST ──────────────────────────────────────────────────────────────────

async function anilistQuery(query, variables = {}) {
  try {
    const res = await fetch('https://graphql.anilist.co', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ query, variables }),
    });
    const data = await res.json();
    return data?.data || null;
  } catch (e) {
    console.error('[Fetcher] AniList error:', e.message);
    return null;
  }
}

// Trending right now
async function getTrending(page = 1) {
  const data = await anilistQuery(`
    query ($page: Int) {
      Page(page: $page, perPage: 20) {
        media(sort: TRENDING_DESC, type: ANIME, status: RELEASING) {
          id title { romaji english } coverImage { extraLarge large }
          bannerImage averageScore episodes genres description(asHtml: false)
          studios(isMain: true) { nodes { name } } seasonYear
        }
      }
    }
  `, { page });
  return data?.Page?.media || [];
}

// All-time popular
async function getPopular() {
  const data = await anilistQuery(`
    query {
      Page(page: 1, perPage: 20) {
        media(sort: POPULARITY_DESC, type: ANIME) {
          id title { romaji english } coverImage { extraLarge large }
          bannerImage averageScore episodes genres description(asHtml: false)
          studios(isMain: true) { nodes { name } } seasonYear
        }
      }
    }
  `);
  return data?.Page?.media || [];
}

// Top rated of all time
async function getTopRated() {
  const data = await anilistQuery(`
    query {
      Page(page: 1, perPage: 20) {
        media(sort: SCORE_DESC, type: ANIME, status_not: NOT_YET_RELEASED) {
          id title { romaji english } coverImage { extraLarge large }
          bannerImage averageScore episodes genres description(asHtml: false)
          studios(isMain: true) { nodes { name } } seasonYear
        }
      }
    }
  `);
  return data?.Page?.media || [];
}

// By genre (for niche/rare coverage)
async function getByGenre(genre) {
  await sleep(400);
  const data = await anilistQuery(`
    query ($genre: String) {
      Page(page: 1, perPage: 10) {
        media(sort: POPULARITY_DESC, type: ANIME, genre: $genre) {
          id title { romaji english } coverImage { extraLarge large }
          bannerImage averageScore episodes genres description(asHtml: false)
          studios(isMain: true) { nodes { name } } seasonYear
        }
      }
    }
  `, { genre });
  return data?.Page?.media || [];
}

// ─── JIKAN (MAL) ─────────────────────────────────────────────────────────────

async function getJikanTop(filter = 'airing', page = 1) {
  try {
    await sleep(600);
    const res = await fetch(`https://api.jikan.moe/v4/top/anime?limit=20&filter=${filter}&page=${page}`);
    const data = await res.json();
    return data.data || [];
  } catch (e) {
    console.error(`[Fetcher] Jikan ${filter} error:`, e.message);
    return [];
  }
}

async function getJikanSeasonal() {
  try {
    await sleep(600);
    const res = await fetch('https://api.jikan.moe/v4/seasons/now?limit=20');
    const data = await res.json();
    return data.data || [];
  } catch (e) {
    console.error('[Fetcher] Jikan seasonal error:', e.message);
    return [];
  }
}

async function getJikanUpcoming() {
  try {
    await sleep(600);
    const res = await fetch('https://api.jikan.moe/v4/seasons/upcoming?limit=10');
    const data = await res.json();
    return data.data || [];
  } catch (e) {
    console.error('[Fetcher] Jikan upcoming error:', e.message);
    return [];
  }
}

// ─── NEWS ─────────────────────────────────────────────────────────────────────

async function getAnimeNews() {
  try {
    const res = await fetch('https://www.animenewsnetwork.com/all/rss.xml?ann-edition=us');
    const text = await res.text();
    const titles = [...text.matchAll(/<title><!\[CDATA\[(.+?)\]\]><\/title>/g)]
      .slice(1, 10)
      .map((m) => ({ title: m[1], source: 'ANN' }));
    return titles;
  } catch (e) {
    console.error('[Fetcher] ANN RSS error:', e.message);
    return [];
  }
}

// ─── TOPIC CONVERTERS ─────────────────────────────────────────────────────────

function anilistToTopic(anime, type = 'TRENDING') {
  const title = anime.title?.english || anime.title?.romaji;
  if (!title) return null;
  const score = anime.averageScore ? (anime.averageScore / 10).toFixed(1) : 'N/A';
  if (score !== 'N/A' && parseFloat(score) < 5.0) return null; // skip very low quality
  return {
    type,
    title,
    score,
    episodes: anime.episodes || 'Ongoing',
    genres: anime.genres?.slice(0, 3).join(', ') || 'Action',
    studio: anime.studios?.nodes?.[0]?.name || 'Unknown',
    synopsis: anime.description?.replace(/<[^>]+>/g, '').slice(0, 500) || '',
    coverImage: anime.coverImage?.extraLarge || anime.coverImage?.large,
    bannerImage: anime.bannerImage,
    year: anime.seasonYear || 2026,
    slug: slugify(title),
    postType: 'REVIEW',
    keyword: `${title} anime ${anime.seasonYear || 2026}`,
  };
}

function jikanToTopic(anime, type = 'SEASONAL') {
  const title = anime.title_english || anime.title;
  if (!title) return null;
  const score = anime.score ? parseFloat(anime.score).toFixed(1) : 'N/A';
  if (score !== 'N/A' && parseFloat(score) < 5.0) return null;
  return {
    type,
    title,
    score,
    episodes: anime.episodes || 'Ongoing',
    genres: anime.genres?.map((g) => g.name).join(', ') || 'Action',
    studio: anime.studios?.[0]?.name || 'Unknown',
    synopsis: anime.synopsis?.slice(0, 500) || '',
    coverImage: anime.images?.jpg?.large_image_url || null,
    bannerImage: null,
    year: anime.year || 2026,
    slug: slugify(title),
    postType: 'REVIEW',
    keyword: `${title} anime ${anime.year || 2026}`,
  };
}

// ─── LIST TOPIC BUILDERS ──────────────────────────────────────────────────────

function buildGenreList(genre, animeList) {
  if (animeList.length < 3) return null;
  return {
    type: 'GENRE_LIST',
    title: `Best ${genre} Anime 2026`,
    animeList: animeList.slice(0, 10).map((a) => ({
      title: a.title?.english || a.title?.romaji || 'Unknown',
      score: a.averageScore ? (a.averageScore / 10).toFixed(1) : 'N/A',
      episodes: a.episodes || 'Ongoing',
      genres: a.genres?.slice(0, 3).join(', ') || genre,
      synopsis: a.description?.replace(/<[^>]+>/g, '').slice(0, 200) || '',
    })),
    slug: `best-${slugify(genre)}-anime-2026`,
    postType: 'TOP_LIST',
    keyword: `best ${genre.toLowerCase()} anime 2026`,
    coverImage: null,
    bannerImage: null,
  };
}

function buildSeasonalList(animeList, label) {
  if (animeList.length < 3) return null;
  return {
    type: 'SEASONAL_LIST',
    title: label,
    animeList: animeList.slice(0, 10).map((a) => ({
      title: a.title || a.titles?.[0]?.title || 'Unknown',
      score: a.score ? parseFloat(a.score).toFixed(1) : 'N/A',
      episodes: a.episodes || 'Ongoing',
      genres: a.genres?.map((g) => g.name).join(', ') || '',
      synopsis: a.synopsis?.slice(0, 200) || '',
    })),
    slug: slugify(label),
    postType: 'TOP_LIST',
    keyword: label.toLowerCase(),
    coverImage: null,
    bannerImage: null,
  };
}

// ─── DEDUP ───────────────────────────────────────────────────────────────────

function dedup(topics) {
  const seen = new Set();
  return topics.filter((t) => {
    if (!t || seen.has(t.slug)) return false;
    seen.add(t.slug);
    return true;
  });
}

// ─── MAIN TOPIC BUILDER ───────────────────────────────────────────────────────

export async function buildTopicPool() {
  console.log('[Fetcher] Building expanded topic pool...');

  // Fetch everything in parallel (grouped to avoid rate limits)
  const [
    trending1, trending2,
    popular, topRated,
    isekaiAnime, romanceAnime, actionAnime, horrorAnime, sportsAnime,
    jikanAiring, jikanPopular, jikanSeasonal, jikanUpcoming,
    news,
  ] = await Promise.allSettled([
    getTrending(1),
    getTrending(2),                    // page 2 for more trending
    getPopular(),
    getTopRated(),
    getByGenre('Isekai'),
    getByGenre('Romance'),
    getByGenre('Action'),
    getByGenre('Horror'),
    getByGenre('Sports'),
    getJikanTop('airing'),
    getJikanTop('bypopularity'),
    getJikanSeasonal(),
    getJikanUpcoming(),
    getAnimeNews(),
  ]);

  const topics = [];

  // ── Individual review topics ──────────────────────────────────────────────

  const val = (r) => (r.status === 'fulfilled' ? r.value : []);

  // Trending (highest priority — freshest content)
  for (const anime of val(trending1)) {
    const t = anilistToTopic(anime, 'TRENDING');
    if (t) topics.push(t);
  }
  for (const anime of val(trending2)) {
    const t = anilistToTopic(anime, 'TRENDING_P2');
    if (t) topics.push(t);
  }

  // Popular all-time (evergreen content)
  for (const anime of val(popular)) {
    const t = anilistToTopic(anime, 'POPULAR');
    if (t) topics.push(t);
  }

  // Top rated (high-quality evergreen)
  for (const anime of val(topRated)) {
    const t = anilistToTopic(anime, 'TOP_RATED');
    if (t) topics.push(t);
  }

  // Genre-specific (niche coverage)
  for (const anime of [...val(isekaiAnime), ...val(romanceAnime), ...val(actionAnime), ...val(horrorAnime), ...val(sportsAnime)]) {
    const t = anilistToTopic(anime, 'GENRE');
    if (t) topics.push(t);
  }

  // MAL airing and popular
  for (const anime of [...val(jikanAiring), ...val(jikanPopular)]) {
    const t = jikanToTopic(anime);
    if (t) topics.push(t);
  }

  // Upcoming anime (future content)
  for (const anime of val(jikanUpcoming)) {
    const t = jikanToTopic(anime, 'UPCOMING');
    if (t) {
      t.keyword = `${t.title} anime release date`;
      topics.push(t);
    }
  }

  // ── List / Top 10 topics ──────────────────────────────────────────────────

  const seasonal = val(jikanSeasonal);
  const upcoming = val(jikanUpcoming);

  const lists = [
    buildSeasonalList(seasonal, 'Best Anime This Season 2026'),
    buildSeasonalList(seasonal.filter((a) => a.genres?.some((g) => g.name === 'Action')), 'Best Action Anime This Season 2026'),
    buildSeasonalList(seasonal.filter((a) => a.genres?.some((g) => g.name === 'Romance')), 'Best Romance Anime This Season 2026'),
    buildSeasonalList(upcoming, 'Most Anticipated Upcoming Anime 2026'),
    buildGenreList('Isekai', val(isekaiAnime)),
    buildGenreList('Romance', val(romanceAnime)),
    buildGenreList('Horror', val(horrorAnime)),
    buildGenreList('Sports', val(sportsAnime)),
  ];

  for (const list of lists) {
    if (list) topics.push(list);
  }

  // ── News topics ───────────────────────────────────────────────────────────

  for (const item of val(news).slice(0, 8)) {
    const title = item.title || item.headline;
    if (!title) continue;
    topics.push({
      type: 'NEWS',
      title,
      newsHook: title,
      slug: slugify(title),
      postType: 'NEWS',
      keyword: title.split(' ').slice(0, 6).join(' ').toLowerCase(),
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

  const final = dedup(topics);
  console.log(`[Fetcher] Topic pool ready: ${final.length} unique topics`);
  return final;
}
