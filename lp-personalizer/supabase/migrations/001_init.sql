-- ─── Jobs Table ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS jobs (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  status       TEXT        NOT NULL DEFAULT 'pending',
  ad_type      TEXT        NOT NULL CHECK (ad_type IN ('image', 'url')),
  ad_image_url TEXT,
  ad_url       TEXT,
  landing_url  TEXT        NOT NULL,
  error_message TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Results Table ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS results (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id               UUID        REFERENCES jobs(id) ON DELETE CASCADE,
  landing_url          TEXT        NOT NULL,
  original_html        TEXT,
  modified_html        TEXT,
  changes              JSONB       DEFAULT '[]'::jsonb,
  message_match_score  INTEGER     DEFAULT 0,
  ad_analysis          JSONB       DEFAULT '{}'::jsonb,
  page_analysis        JSONB       DEFAULT '{}'::jsonb,
  gap_analysis         TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Indexes ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_results_job_id ON results(job_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);

-- ─── Row-Level Security ────────────────────────────────────────────────────────
ALTER TABLE jobs    ENABLE ROW LEVEL SECURITY;
ALTER TABLE results ENABLE ROW LEVEL SECURITY;

-- Public read/write for demo (tighten in production with auth)
CREATE POLICY "allow_all_jobs"    ON jobs    FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_results" ON results FOR ALL USING (true) WITH CHECK (true);

-- ─── Storage Buckets (run in Supabase Dashboard → Storage) ────────────────────
-- INSERT INTO storage.buckets (id, name, public) VALUES ('ad-creatives', 'ad-creatives', true);
-- CREATE POLICY "allow_public_read" ON storage.objects FOR SELECT USING (bucket_id = 'ad-creatives');
-- CREATE POLICY "allow_upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'ad-creatives');
