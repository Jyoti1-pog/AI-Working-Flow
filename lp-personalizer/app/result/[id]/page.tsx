import { notFound } from 'next/navigation';
import { supabaseAdmin } from '@/lib/supabase';
import ChangeSummary from '@/components/ChangeSummary';
import PagePreview from '@/components/PagePreview';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import type { PersonalizeResult } from '@/lib/types';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ResultPage({ params }: Props) {
  const { id } = await params;

  const { data, error } = await supabaseAdmin
    .from('results')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) notFound();

  const result = data as PersonalizeResult & { gap_analysis?: string };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50/30">
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <a href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <span className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
              AdMatch
            </span>
            <Badge variant="secondary" className="text-xs">AI-Powered</Badge>
          </a>
          <span className="text-sm text-muted-foreground">Shared Result</span>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        <div>
          <h1 className="text-2xl font-bold">Personalized Landing Page</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {result.changes.length} change{result.changes.length !== 1 ? 's' : ''} applied ·{' '}
            Match score: <strong>{result.message_match_score}/100</strong> ·{' '}
            <a
              href={result.landing_url}
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-2 hover:text-primary"
            >
              {result.landing_url}
            </a>
          </p>
        </div>

        <PagePreview resultId={id} landingUrl={result.landing_url} />

        <Separator />

        <div className="max-w-3xl mx-auto">
          <h2 className="text-lg font-semibold mb-4">What Changed & Why</h2>
          <ChangeSummary
            changes={result.changes}
            matchScore={result.message_match_score}
            adAnalysis={result.ad_analysis}
            gapAnalysis={result.gap_analysis}
          />
        </div>
      </main>
    </div>
  );
}
