// lib/writer.js - AI Blog Writer using OpenRouter with 4-model fallback chain

const MODELS = [
  'nvidia/nemotron-3-ultra-550b-a55b:free',
  'meta-llama/llama-3.3-70b-instruct:free',
  'mistralai/mistral-7b-instruct:free',
  'openrouter/auto',
];

const SITE_URL = 'https://animereza.xyz';
const BLOG_NAME = 'Isekai Blogging';

// ─── SYSTEM PROMPT (static - never changes) ───────────────────────────────────

const SYSTEM_PROMPT = `You are an expert anime blog writer for ${BLOG_NAME}.
Your writing style matches ScreenRant and CBR — authoritative, engaging, SEO-optimized, and always reader-first.

# IDENTITY
- You are a passionate anime expert who has watched 1000+ anime series
- You write for ALL audiences: complete beginners to hardcore veteran fans
- Tone: excited, knowledgeable, conversational — never robotic or generic
- You always back up opinions with real data (scores, episodes, studios)

# ABSOLUTE RULES — NEVER BREAK THESE
- Return ONLY valid HTML — zero markdown, zero backticks, zero explanations
- Start your response with <article> — absolutely nothing before it
- End your response with </article> — absolutely nothing after it
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
- Internal anchor text should sound natural, never forced

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
  if (topic.postType === 'TOP_LIST') {
    return buildTopListPrompt(topic);
  } else if (topic.postType === 'NEWS') {
    return buildNewsPrompt(topic);
  } else {
    return buildReviewPrompt(topic);
  }
}

function buildReviewPrompt(topic) {
  return `# TASK
Write a complete SEO blog post — post type: ANIME REVIEW / RECOMMENDATION

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

<p>[Hook: 2 sentences. Answer "is this worth watching?" immediately. Include primary keyword naturally. Make it exciting.]</p>

<p>[Brief intro: what this post covers and who it is for. 2-3 sentences max.]</p>

<h2>What Is ${topic.title}? [include secondary keyword naturally]</h2>
<p>[Explain the anime using the synopsis provided. Mention studio and year. Keep it engaging.]</p>
<p>[Talk about the score — what does ${topic.score}/10 mean for viewers? Is that good? Why?]</p>

<h2>Why ${topic.title} Stands Out in ${topic.genres}</h2>
<p>[Deep dive into what makes this anime special. Reference specific genre elements.]</p>
<p>[Talk about animation quality, story pacing, or character depth — keep it specific.]</p>
[CTA #1 HERE]

<h2>Who Should Watch ${topic.title}?</h2>
<p>[Describe the perfect viewer for this anime. Beginners? Veterans? Fans of specific genres?]</p>
<p>[Mention episode count (${topic.episodes}) — is it a quick binge or long commitment?]</p>

<h2>Anime Similar to ${topic.title} You Should Watch Next</h2>
<p>[List 4-5 similar anime with ONE sentence each explaining why it is similar. Bold each title.]</p>
[CTA #2 HERE]

<h2>Frequently Asked Questions About ${topic.title}</h2>

<div class="faq-item">
<h3>Is ${topic.title} worth watching in 2026?</h3>
<p>[Direct answer first sentence. Mention score and why. 2-3 sentences.]</p>
</div>

<div class="faq-item">
<h3>How many episodes does ${topic.title} have?</h3>
<p>[Direct answer: ${topic.episodes}. Then context about whether more seasons are expected.]</p>
</div>

<div class="faq-item">
<h3>Is ${topic.title} available in English dub?</h3>
<p>[Answer yes and mention AnimeReza.xyz has both sub and dub free.]</p>
</div>

<div class="faq-item">
<h3>What genre is ${topic.title}?</h3>
<p>[Answer: ${topic.genres}. Then 1-2 sentences explaining what that means for viewers.]</p>
</div>

<div class="faq-item">
<h3>Where can I watch ${topic.title} for free?</h3>
<p>[Answer: AnimeReza.xyz. Mention no ads, sub and dub both available.]</p>
</div>

<h2>Final Verdict — Should You Watch ${topic.title}?</h2>
<p>[Strong 3-sentence conclusion. Restate primary keyword: "${topic.keyword}" naturally. Give a clear recommendation.]</p>
<p>[Summarize score, episodes, and what type of fan will love it most.]</p>
[CTA #3 HERE]

</article>

# INTERNAL VALIDATION — CHECK BEFORE RESPONDING
✓ Starts with <article> — nothing before it?
✓ Ends with </article> — nothing after it?
✓ Primary keyword "${topic.keyword}" in H1?
✓ Primary keyword in first paragraph?
✓ Exactly 3 CTAs placed correctly?
✓ All anime titles in <strong> tags?
✓ All 5 FAQ items present?
✓ No markdown, no backticks, no text outside <article>?
✓ Between 950-1300 words?`;
}

function buildTopListPrompt(topic) {
  const listText = topic.animeList
    ?.map((a, i) => `${i + 1}. ${a.title} — Score: ${a.score}, Episodes: ${a.episodes}, Genres: ${a.genres}, Synopsis: ${a.synopsis}`)
    .join('\n') || 'Use your knowledge of top seasonal anime';

  return `# TASK
Write a complete SEO blog post — post type: TOP 10 LIST

# REAL DATA — USE THIS EXACTLY
List Topic: ${topic.title}
Primary Keyword: "${topic.keyword}"
Anime List Data:
${listText}

# REQUIRED HTML STRUCTURE — FOLLOW EXACTLY

<article>

<h1>[Write title containing: "${topic.keyword}" — include a number, make it click-worthy]</h1>

<p>[Hook: 2 sentences. Tell reader exactly what they will get. Include primary keyword. Make them want to read on.]</p>

<p>[Brief intro: what makes this list authoritative, who it is for, what criteria was used to rank. 2-3 sentences.]</p>

<h2>How We Ranked These Anime</h2>
<p>[Explain ranking criteria: MAL/AniList scores, episode quality, fan reception, rewatch value. Keep it short — 3 sentences.]</p>

<h2>The Best Anime List: ${topic.keyword}</h2>

[For EACH anime in the list, use this format:]
<h3>[Rank]. <strong>[Anime Title]</strong> — [Score]/10</h3>
<p>[What makes this anime great. Reference genres and episodes. 2-3 sentences max.]</p>
<p>[Who should watch it. One specific recommendation sentence.]</p>

[After anime #3, insert CTA #1]
[After anime #7, insert CTA #2]

<h2>Frequently Asked Questions</h2>

<div class="faq-item">
<h3>What is the best anime of 2026?</h3>
<p>[Direct answer naming the #1 from your list. 2-3 sentences with reasoning.]</p>
</div>

<div class="faq-item">
<h3>Where can I watch these anime for free?</h3>
<p>[Answer: AnimeReza.xyz. All listed anime available free, sub and dub, almost no ads.]</p>
</div>

<div class="faq-item">
<h3>Which anime on this list is best for beginners?</h3>
<p>[Pick the most accessible one from the list and explain why briefly.]</p>
</div>

<div class="faq-item">
<h3>Are there both subbed and dubbed versions available?</h3>
<p>[Yes — mention AnimeReza.xyz has both for all major titles on this list.]</p>
</div>

<div class="faq-item">
<h3>How often is this list updated?</h3>
<p>[Explain the list is updated seasonally based on current scores and new releases.]</p>
</div>

<h2>Final Thoughts on ${topic.keyword}</h2>
<p>[Strong conclusion. Restate primary keyword naturally. Tell reader to bookmark for updates. 3 sentences.]</p>
[CTA #3 HERE]

</article>

# INTERNAL VALIDATION — CHECK BEFORE RESPONDING
✓ Starts with <article> — nothing before it?
✓ Ends with </article> — nothing after it?
✓ Primary keyword "${topic.keyword}" in H1?
✓ Exactly 3 CTAs?
✓ All anime titles in <strong> tags?
✓ All 5 FAQ items present?
✓ No markdown, no backticks?
✓ Between 950-1300 words?`;
}

function buildNewsPrompt(topic) {
  return `# TASK
Write a complete SEO blog post — post type: ANIME NEWS ARTICLE

# REAL DATA — USE THIS EXACTLY
News Topic: ${topic.newsHook}
Primary Keyword: "${topic.keyword}"
Year: 2026

# REQUIRED HTML STRUCTURE — FOLLOW EXACTLY

<article>

<h1>[Write news headline containing: "${topic.keyword}" — factual, exciting, click-worthy]</h1>

<p>[Hook: 2 sentences. State the news clearly. What happened? Why does it matter? Include primary keyword.]</p>

<p>[Brief context: background on the anime/topic for readers who may be new to it. 2-3 sentences.]</p>

<h2>Everything We Know So Far</h2>
<p>[Detail what is confirmed about this news. Be specific. Do not speculate beyond the data given.]</p>
<p>[What does this mean for fans? Practical implications.]</p>
[CTA #1 HERE]

<h2>Background: Why This Matters to Anime Fans</h2>
<p>[Context about the anime or topic involved. History, popularity, fan reception.]</p>
<p>[Why the anime community cares about this specific news.]</p>

<h2>What Fans Are Saying</h2>
<p>[General community reaction — keep it positive and fan-focused. 2-3 sentences.]</p>
<p>[What fans are most excited about or hoping for.]</p>
[CTA #2 HERE]

<h2>What to Expect Next</h2>
<p>[Based on the news, what logically comes next? Keep realistic. 2-3 sentences.]</p>
<p>[When to expect more updates or announcements.]</p>

<h2>Frequently Asked Questions</h2>

<div class="faq-item">
<h3>${topic.newsHook?.split(' ').slice(0, 8).join(' ')} — What do we know?</h3>
<p>[Direct answer summarizing the key facts. 2-3 sentences.]</p>
</div>

<div class="faq-item">
<h3>Where can I watch this anime for free?</h3>
<p>[Answer: AnimeReza.xyz. Sub and dub available, almost no ads.]</p>
</div>

<div class="faq-item">
<h3>When will more information be available?</h3>
<p>[Realistic expectation based on typical anime announcement timelines.]</p>
</div>

<div class="faq-item">
<h3>Is this anime beginner-friendly?</h3>
<p>[General answer about accessibility of the anime or topic.]</p>
</div>

<div class="faq-item">
<h3>What similar anime should fans watch while waiting?</h3>
<p>[Recommend 2-3 similar anime. Bold each title. One sentence per recommendation.]</p>
</div>

<h2>Stay Updated on ${topic.keyword}</h2>
<p>[Conclude by telling readers to bookmark the blog for updates. Restate primary keyword. 3 sentences.]</p>
[CTA #3 HERE]

</article>

# INTERNAL VALIDATION — CHECK BEFORE RESPONDING
✓ Starts with <article> — nothing before it?
✓ Ends with </article> — nothing after it?
✓ Primary keyword in H1 and first paragraph?
✓ Exactly 3 CTAs?
✓ All anime titles in <strong> tags?
✓ All 5 FAQ items?
✓ No markdown, no backticks?
✓ Between 950-1300 words?`;
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
  const failed = Object.entries(checks)
    .filter(([, v]) => !v)
    .map(([k]) => k);

  return { passed, failed };
}

// ─── MAIN WRITER FUNCTION ─────────────────────────────────────────────────────

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

      if (!res.ok) {
        const errText = await res.text();
        console.warn(`[Writer] Model ${model} failed: ${res.status} - ${errText}`);
        lastError = errText;
        continue;
      }

      const rawText = await res.text();
      let data;
      try {
        data = JSON.parse(rawText);
      } catch {
        console.warn(`[Writer] Model ${model} returned non-JSON: ${rawText.slice(0, 100)}`);
        lastError = rawText;
        continue;
      }
      const content = data?.choices?.[0]?.message?.content;

      if (!content) {
        console.warn(`[Writer] Model ${model} returned empty content`);
        continue;
      }

      // Clean up any accidental markdown wrappers
      let html = content
        .replace(/^```html\n?/i, '')
        .replace(/^```\n?/, '')
        .replace(/\n?```$/, '')
        .trim();

      // Strip thinking/reasoning preamble — extract only <article>...</article>
      const articleMatch = html.match(/<article>[\s\S]*<\/article>/i);
      if (articleMatch) {
        html = articleMatch[0];
      }

      // Validate output
      const validation = validateOutput(html);
      if (!validation.passed) {
        console.warn(`[Writer] Model ${model} output failed validation. Failed checks:`, validation.failed);
        // Try to auto-fix common issues
        if (!html.startsWith('<article>')) html = '<article>\n' + html;
        if (!html.endsWith('</article>')) html = html + '\n</article>';
        // Re-validate after fix
        const recheck = validateOutput(html);
        if (!recheck.passed) {
          console.warn(`[Writer] Auto-fix failed, trying next model`);
          continue;
        }
      }

      console.log(`[Writer] ✅ Success with model: ${model} (${html.length} chars)`);
      return { html, model };

    } catch (e) {
      console.error(`[Writer] Model ${model} threw error:`, e.message);
      lastError = e.message;
    }
  }

  throw new Error(`[Writer] All models failed. Last error: ${lastError}`);
}
