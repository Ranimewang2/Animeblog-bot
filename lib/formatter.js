// lib/formatter.js - Formats raw HTML into a complete SEO-ready blog post

export function buildBloggerPost(topic, rawHtml) {
  const title = extractTitle(rawHtml) || topic.title;
  const metaDesc = buildMetaDescription(topic);
  const slug = topic.slug;
  const labels = buildLabels(topic);
  const schemaJson = buildSchema(title, metaDesc, topic);
  const featuredImageHtml = buildFeaturedImage(topic);
  const content = buildFullContent(rawHtml, featuredImageHtml, schemaJson, metaDesc);

  return {
    title,
    content,
    labels,
    slug,
    metaDesc,
  };
}

// ─── EXTRACT TITLE FROM H1 ────────────────────────────────────────────────────

function extractTitle(html) {
  const match = html.match(/<h1[^>]*>(.*?)<\/h1>/is);
  if (match) {
    // Strip any HTML tags inside h1
    return match[1].replace(/<[^>]+>/g, '').trim();
  }
  return null;
}

// ─── META DESCRIPTION ─────────────────────────────────────────────────────────

function buildMetaDescription(topic) {
  const base = topic.synopsis
    ? topic.synopsis.slice(0, 120).replace(/['"]/g, '')
    : `${topic.title} — full guide, review and recommendations.`;
  return `${base} Watch free on AnimeReza.xyz — Sub & Dub, almost no ads!`.slice(0, 160);
}

// ─── LABELS / TAGS ────────────────────────────────────────────────────────────

function buildLabels(topic) {
  const labels = ['Anime', 'Anime Review', 'Watch Anime Free'];

  if (topic.genres) {
    topic.genres.split(',').forEach((g) => {
      const clean = g.trim();
      if (clean) labels.push(clean);
    });
  }

  if (topic.postType === 'TOP_LIST') labels.push('Top 10 Anime', 'Anime List');
  if (topic.postType === 'NEWS') labels.push('Anime News', '2026');
  if (topic.postType === 'REVIEW') labels.push('Anime 2026', topic.title);
  if (topic.year) labels.push(String(topic.year));

  // Deduplicate and limit to 10
  return [...new Set(labels)].slice(0, 10);
}

// ─── JSON-LD SCHEMA ───────────────────────────────────────────────────────────

function buildSchema(title, description, topic) {
  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': topic.postType === 'NEWS' ? 'NewsArticle' : 'Article',
    headline: title,
    description,
    author: {
      '@type': 'Organization',
      name: 'Isekai Blogging',
      url: 'https://isekaiblogging.blogspot.com',
    },
    publisher: {
      '@type': 'Organization',
      name: 'Isekai Blogging',
      url: 'https://isekaiblogging.blogspot.com',
    },
    datePublished: new Date().toISOString(),
    dateModified: new Date().toISOString(),
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `https://isekaiblogging.blogspot.com/search/label/${encodeURIComponent(topic.title || 'Anime')}`,
    },
  };

  if (topic.coverImage) {
    articleSchema.image = {
      '@type': 'ImageObject',
      url: topic.coverImage,
    };
  }

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: `Is ${topic.title} worth watching?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: `Yes! ${topic.title} has a score of ${topic.score}/10 and is available free on AnimeReza.xyz with both sub and dub options.`,
        },
      },
      {
        '@type': 'Question',
        name: `Where can I watch ${topic.title} for free?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: `You can watch ${topic.title} completely free on AnimeReza.xyz — both subbed and dubbed versions are available with almost no ads.`,
        },
      },
    ],
  };

  return `
<script type="application/ld+json">
${JSON.stringify(articleSchema, null, 2)}
</script>
<script type="application/ld+json">
${JSON.stringify(faqSchema, null, 2)}
</script>`;
}

// ─── FEATURED IMAGE ───────────────────────────────────────────────────────────

function buildFeaturedImage(topic) {
  if (!topic.bannerImage && !topic.coverImage) return '';

  const imgSrc = topic.bannerImage || topic.coverImage;
  const altText = `${topic.title} anime banner image`;

  return `
<div class="post-featured-image" style="margin-bottom:24px;border-radius:8px;overflow:hidden;">
  <img 
    src="${imgSrc}" 
    alt="${altText}"
    title="${topic.title} — Watch free on AnimeReza.xyz"
    style="width:100%;height:auto;display:block;"
    loading="eager"
  />
  <p style="font-size:12px;color:#888;text-align:center;margin:4px 0 0;">
    © ${topic.studio || 'Respective Studio'} — Image used for editorial/review purposes
  </p>
</div>`;
}

// ─── FULL CONTENT BUILDER ─────────────────────────────────────────────────────

function buildFullContent(rawHtml, featuredImageHtml, schemaJson, metaDesc) {
  // Inject CSS styles for the post
  const styles = `
<style>
  .post-body article { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.7; color: #1a1a1a; max-width: 800px; margin: 0 auto; }
  .post-body h1 { font-size: 2em; font-weight: 800; line-height: 1.2; margin-bottom: 16px; color: #111; }
  .post-body h2 { font-size: 1.4em; font-weight: 700; margin: 32px 0 12px; color: #1a1a1a; border-left: 4px solid #e63946; padding-left: 12px; }
  .post-body h3 { font-size: 1.15em; font-weight: 700; margin: 20px 0 8px; color: #222; }
  .post-body p { margin: 0 0 16px; font-size: 1.05em; }
  .post-body strong { color: #111; font-weight: 700; }
  .cta-box { background: linear-gradient(135deg, #1a1a2e 0%, #e63946 100%); color: #fff !important; padding: 16px 20px; border-radius: 8px; text-align: center; font-size: 1.1em; font-weight: 600; margin: 24px 0; }
  .cta-box a { color: #fff !important; text-decoration: underline; font-weight: 700; }
  .faq-item { background: #f8f9fa; border-left: 4px solid #e63946; padding: 16px 20px; margin: 16px 0; border-radius: 0 8px 8px 0; }
  .faq-item h3 { margin: 0 0 8px; font-size: 1em; color: #111; }
  .faq-item p { margin: 0; font-size: 0.95em; color: #444; }
  .post-meta-desc { display: none; }
</style>`;

  // Hidden meta description for SEO
  const metaHidden = `<p class="post-meta-desc" style="display:none;">${metaDesc}</p>`;

  return `${styles}
${schemaJson}
${metaHidden}
${featuredImageHtml}
${rawHtml}`;
}
