// ─── Shared Types ─────────────────────────────────────────────────────────────

export type JobStatus =
  | 'pending'
  | 'scraping'
  | 'analyzing'
  | 'strategizing'
  | 'generating'
  | 'injecting'
  | 'done'
  | 'failed';

export interface Job {
  id: string;
  status: JobStatus;
  ad_type: 'image' | 'url';
  ad_image_url?: string;
  ad_url?: string;
  landing_url: string;
  error_message?: string;
  created_at: string;
  updated_at: string;
}

export interface AdAnalysis {
  headline: string;
  tagline: string;
  cta: string;
  value_proposition: string;
  tone: string;
  target_audience: string;
  product_service: string;
  offer: string;
  key_benefits: string[];
}

export interface Heading {
  tag: string;
  index: number;
  text: string;
  selector: string;
}

export interface Paragraph {
  index: number;
  text: string;
  selector: string;
}

export interface PageAnalysis {
  title: string;
  meta_description: string;
  hero_headline: string;
  headings: Heading[];
  ctas: string[];
  paragraphs: Paragraph[];
  trust_signals: string[];
  form_present: boolean;
  hero_content: string;
}

export interface Modification {
  element: string;
  selector: string;
  original: string;
  new_content: string;
  reason: string;
  cro_principle: string;
}

export interface ModificationPlan {
  message_match_score: number;
  gap_analysis: string;
  modifications: Modification[];
}

export interface AppliedChange {
  selector: string;
  original: string;
  modified: string;
  reason: string;
  cro_principle: string;
}

export interface PersonalizeResult {
  id: string;
  job_id: string;
  landing_url: string;
  original_html: string;
  modified_html: string;
  changes: AppliedChange[];
  message_match_score: number;
  ad_analysis: AdAnalysis;
  page_analysis: PageAnalysis;
  created_at: string;
}

// ─── SSE Event Types ──────────────────────────────────────────────────────────

export type SSEEvent =
  | { type: 'progress'; step: number; total: number; message: string }
  | { type: 'complete'; resultId: string; data: PersonalizeResult }
  | { type: 'error'; message: string };
