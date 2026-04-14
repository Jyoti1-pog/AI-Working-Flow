import { GoogleGenerativeAI } from '@google/generative-ai';
import type { AdAnalysis, ModificationPlan, PageAnalysis } from './types';

if (!process.env.GEMINI_API_KEY) {
  throw new Error('GEMINI_API_KEY is missing. Set it in .env.local.');
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const MODEL = process.env.GEMINI_MODEL ?? 'gemini-flash-latest';

// ─── Helper: parse JSON safely ────────────────────────────────────────────────
function safeParseJSON<T>(raw: string, fallback: T): T {
  try {
    // Strip markdown code fences if present
    const cleaned = raw.replace(/^```(?:json)?\n?/m, '').replace(/\n?```$/m, '').trim();
    return JSON.parse(cleaned) as T;
  } catch {
    console.error('JSON parse failed:', raw.substring(0, 200));
    return fallback;
  }
}

// ─── Agent 1: Ad Intel Agent ──────────────────────────────────────────────────
// Accepts either a base64 image OR plain text (scraped ad copy)
export async function analyzeAdCreative(
  input: { type: 'image'; base64: string; mimeType: string } | { type: 'text'; content: string }
): Promise<AdAnalysis> {
  const model = genAI.getGenerativeModel({ model: MODEL });

  const SYSTEM_PROMPT = `You are an expert ad creative analyst. Analyze the provided ad creative and extract all key information.

IMPORTANT RULES:
- Only extract information ACTUALLY PRESENT in the ad
- Do not invent claims, statistics, or details not shown
- If a field is not present, use an empty string or empty array
- Return ONLY valid JSON with no markdown, no explanation

Return this exact JSON structure:
{
  "headline": "main headline text",
  "tagline": "secondary text or slogan (empty string if none)",
  "cta": "call-to-action button text",
  "value_proposition": "core benefit/promise being made",
  "tone": "tone of voice (e.g. urgent, friendly, professional, playful)",
  "target_audience": "who this ad targets",
  "product_service": "what product/service is advertised",
  "offer": "specific offer or discount (empty string if none)",
  "key_benefits": ["benefit 1", "benefit 2"]
}`;

  let result;
  try {
    if (input.type === 'image') {
      result = await model.generateContent([
        { inlineData: { mimeType: input.mimeType, data: input.base64 } },
        SYSTEM_PROMPT,
      ]);
    } else {
      result = await model.generateContent(`${SYSTEM_PROMPT}\n\nAd Content:\n${input.content}`);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Gemini ad analysis failed (model "${MODEL}"): ${msg}`);
  }

  const text = result.response.text();
  return safeParseJSON<AdAnalysis>(text, {
    headline: '',
    tagline: '',
    cta: 'Learn More',
    value_proposition: '',
    tone: 'professional',
    target_audience: 'general audience',
    product_service: '',
    offer: '',
    key_benefits: [],
  });
}

// ─── Agent 2: CRO Strategy Agent ─────────────────────────────────────────────
export async function buildCROStrategy(
  adAnalysis: AdAnalysis,
  pageAnalysis: PageAnalysis
): Promise<ModificationPlan> {
  const model = genAI.getGenerativeModel({ model: MODEL });

  const prompt = `You are a CRO (Conversion Rate Optimization) expert. Create a surgical modification plan to personalize a landing page to match an ad creative.

AD ANALYSIS:
${JSON.stringify(adAnalysis, null, 2)}

LANDING PAGE ANALYSIS:
${JSON.stringify(pageAnalysis, null, 2)}

RULES:
1. Modify ONLY existing text elements — never change layout, images, or structure
2. Maximum 6 modifications — prioritize highest-impact changes
3. Only use information from the ad analysis and existing page content — never invent new claims
4. Each selector MUST be from the page analysis (use exact selectors provided)
5. Focus on: hero headline → primary CTA → subheadlines → body copy (in that order)

CRO PRINCIPLES to apply:
- Message Match: Landing page headline should mirror ad headline/value prop
- Value Proposition Clarity: Primary benefit must be crystal clear above the fold
- CTA Alignment: CTA text should match or reinforce the ad's CTA
- Urgency/Scarcity: If the ad has urgency signals, reflect them on the page
- Audience Alignment: Copy should speak directly to the ad's target audience

Return ONLY this exact JSON structure (no markdown, no explanation):
{
  "message_match_score": <integer 0-100, current alignment before changes>,
  "gap_analysis": "1-2 sentence summary of the main misalignments found",
  "modifications": [
    {
      "element": "h1",
      "selector": "h1:nth-of-type(1)",
      "original": "exact original text from page analysis",
      "new_content": "new personalized text aligned with the ad",
      "reason": "why this change improves conversion",
      "cro_principle": "Message Match"
    }
  ]
}`;

  let result;
  try {
    result = await model.generateContent(prompt);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Gemini CRO strategy failed (model "${MODEL}"): ${msg}`);
  }
  const text = result.response.text();

  return safeParseJSON<ModificationPlan>(text, {
    message_match_score: 50,
    gap_analysis: 'Could not generate strategy. Using default plan.',
    modifications: [],
  });
}
