import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { analyzeAdCreative, buildCROStrategy } from '@/lib/gemini';
import { injectModifications } from '@/lib/htmlInjector';
import type { PageAnalysis, PersonalizeResult, SSEEvent } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';

export const runtime = 'nodejs';
export const maxDuration = 300;

const SCRAPER_URL = process.env.SCRAPER_URL ?? 'http://localhost:8001';

// ─── SSE Helpers ──────────────────────────────────────────────────────────────
function createEncoder() {
  const encoder = new TextEncoder();
  return {
    encode: (event: SSEEvent) =>
      encoder.encode(`data: ${JSON.stringify(event)}\n\n`),
  };
}

// ─── Scraper Call ─────────────────────────────────────────────────────────────
async function scrapePage(
  url: string,
  screenshot = false
): Promise<{ html: string; screenshot_base64: string | null; parsed: PageAnalysis }> {
  const res = await fetch(`${SCRAPER_URL}/scrape`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, screenshot }),
    signal: AbortSignal.timeout(60_000),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Scraper error (${res.status}): ${err}`);
  }

  return res.json();
}

// ─── Fetch image as base64 from a URL ─────────────────────────────────────────
async function fetchImageAsBase64(url: string): Promise<{ base64: string; mimeType: string }> {
  const res = await fetch(url, { signal: AbortSignal.timeout(30_000) });
  if (!res.ok) throw new Error(`Failed to fetch image: ${res.status}`);
  const buffer = await res.arrayBuffer();
  const base64 = Buffer.from(buffer).toString('base64');
  const mimeType = res.headers.get('content-type') ?? 'image/jpeg';
  return { base64, mimeType };
}

// ─── Main Handler ─────────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  const enc = createEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: SSEEvent) => controller.enqueue(enc.encode(event));
      const TOTAL_STEPS = 5;

      try {
        const body = await request.json();
        const { ad_type, ad_image_url, ad_url, landing_url } = body as {
          ad_type: 'image' | 'url';
          ad_image_url?: string;
          ad_url?: string;
          landing_url: string;
        };

        if (!landing_url) {
          send({ type: 'error', message: 'landing_url is required' });
          controller.close();
          return;
        }

        // ── Step 1: Scrape landing page ──────────────────────────────────────
        send({ type: 'progress', step: 1, total: TOTAL_STEPS, message: 'Fetching and parsing landing page...' });

        const { html: originalHtml, parsed: pageAnalysis } = await scrapePage(landing_url, false);

        // ── Step 2: Analyze ad creative ──────────────────────────────────────
        send({ type: 'progress', step: 2, total: TOTAL_STEPS, message: 'Analyzing ad creative with Gemini Vision...' });

        let adAnalysis;
        if (ad_type === 'image' && ad_image_url) {
          const { base64, mimeType } = await fetchImageAsBase64(ad_image_url);
          adAnalysis = await analyzeAdCreative({ type: 'image', base64, mimeType });
        } else if (ad_type === 'url' && ad_url) {
          // Scrape the ad URL and take a screenshot for vision analysis
          const { screenshot_base64, html: adHtml } = await scrapePage(ad_url, true);
          if (screenshot_base64) {
            adAnalysis = await analyzeAdCreative({
              type: 'image',
              base64: screenshot_base64,
              mimeType: 'image/png',
            });
          } else {
            // Fallback: send raw text to Gemini
            adAnalysis = await analyzeAdCreative({ type: 'text', content: adHtml.substring(0, 3000) });
          }
        } else {
          send({ type: 'error', message: 'Either ad_image_url or ad_url must be provided.' });
          controller.close();
          return;
        }

        // ── Step 3: CRO Strategy ─────────────────────────────────────────────
        send({ type: 'progress', step: 3, total: TOTAL_STEPS, message: 'Building CRO personalization strategy...' });

        const modPlan = await buildCROStrategy(adAnalysis, pageAnalysis);

        // ── Step 4: Inject changes ───────────────────────────────────────────
        send({ type: 'progress', step: 4, total: TOTAL_STEPS, message: `Applying ${modPlan.modifications.length} targeted changes...` });

        const { modifiedHtml, appliedChanges } = injectModifications(originalHtml, modPlan.modifications);

        // ── Step 5: Save to Supabase ─────────────────────────────────────────
        send({ type: 'progress', step: 5, total: TOTAL_STEPS, message: 'Saving result...' });

        const resultId = uuidv4();
        const jobId = uuidv4();

        // Save job
        const { error: jobErr } = await supabaseAdmin.from('jobs').insert({
          id: jobId,
          status: 'done',
          ad_type,
          ad_image_url: ad_image_url ?? null,
          ad_url: ad_url ?? null,
          landing_url,
        });
        if (jobErr) throw new Error(`Failed to save job: ${jobErr.message}`);

        // Save result
        const { error: resErr } = await supabaseAdmin.from('results').insert({
          id: resultId,
          job_id: jobId,
          original_html: originalHtml,
          modified_html: modifiedHtml,
          changes: appliedChanges,
          message_match_score: modPlan.message_match_score,
          ad_analysis: adAnalysis,
          page_analysis: pageAnalysis,
          gap_analysis: modPlan.gap_analysis,
          landing_url,
        });
        if (resErr) throw new Error(`Failed to save result: ${resErr.message}`);

        const result: PersonalizeResult = {
          id: resultId,
          job_id: jobId,
          landing_url,
          original_html: originalHtml,
          modified_html: modifiedHtml,
          changes: appliedChanges,
          message_match_score: modPlan.message_match_score,
          ad_analysis: adAnalysis,
          page_analysis: pageAnalysis,
          created_at: new Date().toISOString(),
        };

        send({ type: 'complete', resultId, data: result });
        controller.close();
      } catch (err) {
        console.error('Personalize pipeline error:', err);
        send({
          type: 'error',
          message: err instanceof Error ? err.message : 'An unexpected error occurred',
        });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
