// lib/writer.js - AI Blog Writer with 10-model fallback chain

// Best non-reasoning free models as of August 2026
// Skipped: nemotron-ultra (thinking model), nemotron-reasoning (thinking), content-safety, lyria (vision only), coding-only models
const MODELS = [
  'google/gemma-4-31b-it:free',           // Quality 65 — best available
  'nvidia/nemotron-3-super-120b-a12b:free', // Quality 60
  'google/gemma-4-26b-a4b-it:free',       // Quality 52
  'openai/gpt-oss-20b:free',              // Quality 41
  'nvidia/nemotron-3-nano-30b-a3b:free',  // Quality 40
  'nvidia/nemotron-nano-9b-v2:free',      // Smaller fallback
  'inclusionai/ling-3.0-flash:free',      // Tools capable
  'poolside/laguna-s-2.1:free',           // General fallback
  'meta-llama/llama-3.3-70b-instruct:free', // If it comes back
  'openrouter/free',                      // Last resort auto-router
];

const SITE_URL = 'https://animereza.xyz';
const BLOG_NAME = 'Isekai Blogging';

// ─── SYSTEM PROMPT ────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are an expert anime blog writer for ${BLOG_NAME}.
Your writing style matches ScreenRant and CBR — authoritative, engaging, SEO-optimized, and always reader-first.

# IDENTITY
- You are a passionate anime expert who has watched 1000+ anime series
- You write for ALL audiences: complete beginners to hardcore veteran fans
- Tone: excited, knowledgeable, conversational — never robotic or generic
- You always back up opinions with real data (scores, episodes, studios)

# ABSOLUTE RULES — NEVER BREAK THESE
- Return ONLY valid HTML — zero markdown, zero backticks, zero explanations, zero planning text
- Start your response with <article> — absolutely nothing before it
- End your response with </article> — absolutely nothing after it
- Do NOT include any thinking, planning, reasoning, or notes — output HTML only
- Every anime title MUST be wrapped in <strong> tags on first mention
- Minimum 950 words, maximum 1300 words total
- Never fabricate data — only use what is provided in the user prompt
- Never write generic filler — every sentence must add real value to the reader
- Paragraphs maximum 3 sentences — short for mobile readability
- Use <em> for emphasis on key points sparingly

# CTA RULES
- Include EXACTLY 3 CTAs linking to ${SITE_URL}
- Use this HTML for every CTA:
  <p class="cta-box">🎌 <a href="${SITE_URL}" target="_blank" rel="noopener">Watch free on AnimeReza.xyz</a> — Sub &amp; Dub available, almost zero ads!</p>
- Place CTA #1 after section 2, CTA #2 after section 4, CTA #3 in conclusion

# SEO RULES
- Primary keyword must appear in: H1, first 100 words, one H2 heading, conclusion
- Bold key terms naturally — do not over-bold
- FAQ answers: answer the question directly in the FIRST sentence
- Keep H2 headings descriptive and keyword-rich

# QUALITY EXAMPLES
<example_hook>
"If you only watch one isekai this year, make it Overlord. Here is exactly why 3 million fans keep rewatching it."
</example_hook>
<example_data_usage>
"With a MAL score of 8.1 across 13 tight episodes, Overlord proved that a villain protagonist can carry an entire franchise on his skeletal shoulders."
</example_data_usage>
<example_cta>
<p class="cta-box">🎌 <a href="${SITE_URL}" target="_blank">Watch free on AnimeReza.xyz</a> — Sub &amp; Dub available, almost zero ads!</p>
</example_cta>`;

// ─── USER PROMPT BUILDER ──────────────────────────────────────────────────────

function buildUserPrompt(topic) {
  if (topic.postType === 'TOP_LIST') return buildTopListPrompt(topic);
  if (topic.postType === 'NEWS') return buildNewsPrompt(topic);
  return buildReviewPrompt(topic);
}

function buildReviewPrompt(topic) {
  return `# TASK
Write a complete SEO blog post — post type: ANIME REVIEW / RECOMMENDATION
Output ONLY the HTML. No planning. No notes. Start immediately with <article>.

# REAL DATA — USE THIS EXACTLY, DO NOT FABRICATE
Anime Title: ${topic.title}
MAL/AniList Score: ${topic.score}/10
Episodes: ${topic.episodes}
Studio: ${topic.studio}
Genres: ${topic.genres}
Year: ${topic.year}
Synopsis: ${topic.synopsis}
Primary Keyword: "${topic.keyword}"

# REQUIRED HTML STRUCTURE — FOLLOW EXACTLY

<article>

<h1>[Write title containing: "${topic.keyword}" — make it click-worthy]</h1>

<p>[Hook: 2 sentences. Answer "is this worth watching?" immediately. Include primary keyword naturally.]</p>

<p>[Brief intro: what this post covers and who it is for. 2-3 sentences max.]</p>

<h2>What Is ${topic.title} anime ${topic.year}?</h2>
<p>[Explain the anime using the synopsis provided. Mention studio and year.]</p>
<p>[Talk about the score — what does ${topic.score}/10 mean for viewers?]</p>

<h2>Why ${topic.title} Stands Out in ${topic.genres}</h2>
<p>[Deep dive into what makes this anime special. Reference specific genre elements.]</p>
<p>[Talk about animation quality, story pacing, or character depth.]</p>
<p class="cta-box">🎌 <a href="${SITE_URL}" target="_blank" rel="noopener">Watch free on AnimeReza.xyz</a> — Sub &amp; Dub available, almost zero ads!</p>

<h2>Who Should Watch ${topic.title}?</h2>
<p>[Describe the perfect viewer. Beginners? Veterans? Fans of specific genres?]</p>
<p>[Mention episode count (${topic.episodes}) — quick binge or long commitment?]</p>

<h2>Anime Similar to ${topic.title} You Should Watch Next</h2>
<p>[List 4-5 similar anime with ONE sentence each. Bold each title on first mention.]</p>
<p class="cta-box">🎌 <a href="${SITE_URL}" target="_blank" rel="noopener">Watch free on AnimeReza.xyz</a> — Sub &amp; Dub available, almost zero ads!</p>

<h2>Frequently Asked Questions About ${topic.title}</h2>

<div class="faq-item">
<h3>Is ${topic.title} worth watching in ${topic.year}?</h3>
<p>[Direct answer first. Mention score. 2-3 sentences.]</p>
</div>

<div class="faq-item">
<h3>How many episodes does ${topic.title} have?</h3>
<p>[Direct answer: ${topic.episodes}. Then context about more seasons.]</p>
</div>

<div class="faq-item">
<h3>Is ${topic.title} available in English dub?</h3>
<p>[Yes — mention AnimeReza.xyz has both sub and dub free.]</p>
</div>

<div class="faq-item">
<h3>What genre is ${topic.title}?</h3>
<p>[Answer: ${topic.genres}. Explain what that means for viewers.]</p>
</div>

<div class="faq-item">
<h3>Where can I watch ${topic.title} for free?</h3>
<p>[Answer: AnimeReza.xyz. No ads, sub and dub available.]</p>
</div>

<h2>Final Verdict — Should You Watch ${topic.title}?</h2>
<p>[Strong 3-sentence conclusion. Include "${topic.keyword}" naturally. Clear recommendation.]</p>
<p>[Summarize score, episodes, and what type of fan will love it most.]</p>
<p class="cta-box">🎌 <a href="${SITE_URL}" target="_blank" rel="noopener">Watch free on AnimeReza.xyz</a> — Sub &amp; Dub available, almost zero ads!</p>

</article>`;
}

function buildTopListPrompt(topic) {
  const listText = topic.animeList
    ?.map((a, i) => `${i + 1}. ${a.title} — Score: ${a.score}, Episodes: ${a.episodes}, Genres: ${a.genres}, Synopsis: ${a.synopsis}`)
    .join('\n') || 'Use your knowledge of top seasonal anime';

  return `# TASK
Write a complete SEO blog post — post type: TOP LIST
Output ONLY the HTML. No planning. No notes. Start immediately with <article>.

# REAL DATA
List Topic: ${topic.title}
Primary Keyword: "${topic.keyword}"
Anime List Data:
${listText}

# REQUIRED HTML STRUCTURE

<article>

<h1>[Title containing "${topic.keyword}" — include a number, make it click-worthy]</h1>

<p>[Hook: 2 sentences. Tell reader exactly what they will get. Include primary keyword.]</p>
<p>[Brief intro: ranking criteria, who it is for. 2-3 sentences.]</p>

<h2>How We Ranked These ${topic.keyword}</h2>
<p>[Explain ranking criteria: scores, episode quality, fan reception. 3 sentences.]</p>

<h2>The Best ${topic.keyword} Right Now</h2>

[For EACH anime, use this format:]
<h3>[Rank]. <strong>[Anime Title]</strong> — [Score]/10</h3>
<p>[What makes this anime great. Reference genres and episodes. 2-3 sentences.]</p>
<p>[Who should watch it. One recommendation sentence.]</p>

[After anime #3, insert:]
<p class="cta-box">🎌 <a href="${SITE_URL}" target="_blank" rel="noopener">Watch free on AnimeReza.xyz</a> — Sub &amp; Dub available, almost zero ads!</p>

[After anime #7, insert:]
<p class="cta-box">🎌 <a href="${SITE_URL}" target="_blank" rel="noopener">Watch free on AnimeReza.xyz</a> — Sub &amp; Dub available, almost zero ads!</p>

<h2>Frequently Asked Questions</h2>

<div class="faq-item">
<h3>What is the best anime of 2026?</h3>
<p>[Direct answer naming #1 from your list. 2-3 sentences with reasoning.]</p>
</div>

<div class="faq-item">
<h3>Where can I watch these anime for free?</h3>
<p>[Answer: AnimeReza.xyz. All listed anime available free, sub and dub.]</p>
</div>

<div class="faq-item">
<h3>Which anime on this list is best for beginners?</h3>
<p>[Pick the most accessible one and explain why.]</p>
</div>

<div class="faq-item">
<h3>Are there both subbed and dubbed versions available?</h3>
<p>[Yes — AnimeReza.xyz has both for all major titles.]</p>
</div>

<div class="faq-item">
<h3>How often is this list updated?</h3>
<p>[Updated seasonally based on current scores and new releases.]</p>
</div>

<h2>Final Thoughts on ${topic.keyword}</h2>
<p>[Strong conclusion. Restate primary keyword naturally. 3 sentences.]</p>
<p class="cta-box">🎌 <a href="${SITE_URL}" target="_blank" rel="noopener">Watch free on AnimeReza.xyz</a> — Sub &amp; Dub available, almost zero ads!</p>

</article>`;
}

function buildNewsPrompt(topic) {
  return `# TASK
Write a complete SEO blog post — post type: ANIME NEWS
Output ONLY the HTML. No planning. No notes. Start immediately with <article>.

# REAL DATA
News Topic: ${topic.newsHook}
Primary Keyword: "${topic.keyword}"
Year: 2026

# REQUIRED HTML STRUCTURE

<article>

<h1>[News headline containing "${topic.keyword}" — factual and click-worthy]</h1>

<p>[Hook: 2 sentences. State the news clearly. Include primary keyword.]</p>
<p>[Context: background on the anime for new readers. 2-3 sentences.]</p>

<h2>Everything We Know So Far About ${topic.keyword}</h2>
<p>[Detail what is confirmed. Be specific. Do not speculate beyond the data.]</p>
<p>[What this means for fans practically.]</p>
<p class="cta-box">🎌 <a href="${SITE_URL}" target="_blank" rel="noopener">Watch free on AnimeReza.xyz</a> — Sub &amp; Dub available, almost zero ads!</p>

<h2>Why This Matters to Anime Fans</h2>
<p>[Context about the anime involved. History, popularity, fan reception.]</p>
<p>[Why the anime community cares about this specific news.]</p>

<h2>What Fans Are Saying</h2>
<p>[General community reaction — keep it positive and fan-focused. 2-3 sentences.]</p>
<p>[What fans are most excited about or hoping for.]</p>
<p class="cta-box">🎌 <a href="${SITE_URL}" target="_blank" rel="noopener">Watch free on AnimeReza.xyz</a> — Sub &amp; Dub available, almost zero ads!</p>

<h2>What to Expect Next</h2>
<p>[Based on the news, what logically comes next? 2-3 sentences.]</p>
<p>[When to expect more updates or announcements.]</p>

<h2>Frequently Asked Questions</h2>

<div class="faq-item">
<h3>What do we know about ${topic.keyword}?</h3>
<p>[Direct answer summarizing key facts. 2-3 sentences.]</p>
</div>

<div class="faq-item">
<h3>Where can I watch this anime for free?</h3>
<p>[AnimeReza.xyz. Sub and dub available, almost no ads.]</p>
</div>

<div class="faq-item">
<h3>When will more information be available?</h3>
<p>[Realistic expectation based on typical anime announcement timelines.]</p>
</div>

<div class="faq-item">
<h3>Is this anime beginner-friendly?</h3>
<p>[General answer about accessibility of the anime.]</p>
</div>

<div class="faq-item">
<h3>What similar anime should fans watch while waiting?</h3>
<p>[Recommend 2-3 similar anime. Bold each title. One sentence per recommendation.]</p>
</div>

<h2>Stay Updated on ${topic.keyword}</h2>
<p>[Conclude by telling readers to bookmark the blog. Restate primary keyword. 3 sentences.]</p>
<p class="cta-box">🎌 <a href="${SITE_URL}" target="_blank" rel="noopener">Watch free on AnimeReza.xyz</a> — Sub &amp; Dub available, almost zero ads!</p>

</article>`;
}

// ─── OUTPUT VALIDATOR ─────────────────────────────────────────────────────────

function validateOutput(html) {
  const checks = {
    hasArticleOpen: html.trimStart().startsWith('<article>'),
    hasArticleClose: html.trimEnd().endsWith('</article>'),
    hasCTAs: (html.match(/animereza\.xyz/gi) || []).length >= 3,
    hasH1: html.includes('<h1>') && html.includes('</h1>'),
    hasH2: html.includes('<h2>'),
    hasFAQ: html.includes('faq-item'),
    notEmpty: html.length > 2000,
  };
  const passed = Object.values(checks).every(Boolean);
  const failed = Object.entries(checks).filter(([, v]) => !v).map(([k]) => k);
  return { passed, failed };
}

// ─── MAIN WRITER ─────────────────────────────────────────────────────────────

export async function writePost(topic) {
  const userPrompt = buildUserPrompt(topic);
  let lastError = null;

  for (const model of MODELS) {
    console.log(`[Writer] Trying model: ${model}`);
    try {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://isekaiblogging.blogspot.com',
          'X-Title': 'Isekai Blogging Bot',
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: userPrompt },
          ],
          max_tokens: 3000,
          temperature: 0.7,
        }),
      });

      const rawText = await res.text();
      if (!res.ok) {
        console.warn(`[Writer] Model ${model} HTTP ${res.status}: ${rawText.slice(0, 150)}`);
        lastError = rawText;
        continue;
      }

      let data;
      try {
        data = JSON.parse(rawText);
      } catch {
        console.warn(`[Writer] Model ${model} non-JSON response: ${rawText.slice(0, 100)}`);
        lastError = rawText;
        continue;
      }

      const content = data?.choices?.[0]?.message?.content;
      if (!content) {
        console.warn(`[Writer] Model ${model} returned empty content`);
        continue;
      }

      // Strip markdown wrappers
      let html = content
        .replace(/^```html\n?/i, '')
        .replace(/^```\n?/, '')
        .replace(/\n?```$/, '')
        .trim();

      // Extract only <article>...</article> — strips any thinking/planning preamble
      const articleMatch = html.match(/<article>[\s\S]*<\/article>/i);
      if (articleMatch) {
        html = articleMatch[0];
      }

      // Validate
      const validation = validateOutput(html);
      if (!validation.passed) {
        console.warn(`[Writer] Model ${model} failed validation:`, validation.failed);
        if (!html.startsWith('<article>')) html = '<article>\n' + html;
        if (!html.endsWith('</article>')) html = html + '\n</article>';
        const recheck = validateOutput(html);
        if (!recheck.passed) {
          console.warn(`[Writer] Auto-fix failed, trying next model`);
          continue;
        }
      }

      console.log(`[Writer] ✅ Success with model: ${model} (${html.length} chars)`);
      return { html, model };

    } catch (e) {
      console.error(`[Writer] Model ${model} threw:`, e.message);
      lastError = e.message;
    }
  }

  throw new Error(`[Writer] All ${MODELS.length} models failed. Last error: ${lastError}`);
}
