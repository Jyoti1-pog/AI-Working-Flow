'use client';

import { useState } from 'react';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';
import InputForm from '@/components/InputForm';
import ProgressTracker from '@/components/ProgressTracker';
import ChangeSummary from '@/components/ChangeSummary';
import PagePreview from '@/components/PagePreview';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import type { PersonalizeResult } from '@/lib/types';

type AppState = 'input' | 'processing' | 'result';

export default function Home() {
  const [appState, setAppState] = useState<AppState>('input');
  const [progress, setProgress] = useState({ step: 0, total: 5, message: 'Starting...' });
  const [result, setResult] = useState<PersonalizeResult | null>(null);
  const [resultId, setResultId] = useState<string>('');

  function handleStart() {
    setAppState('processing');
    setProgress({ step: 0, total: 5, message: 'Initializing pipeline...' });
  }

  function handleProgress(step: number, total: number, message: string) {
    setProgress({ step, total, message });
  }

  function handleComplete(id: string, data: PersonalizeResult) {
    setResultId(id);
    setResult(data);
    setAppState('result');
    toast.success(`Done! ${data.changes.length} personalization${data.changes.length !== 1 ? 's' : ''} applied.`);
  }

  function handleError(message: string) {
    toast.error(message);
    setAppState('input');
  }

  function handleReset() {
    setAppState('input');
    setResult(null);
    setResultId('');
  }

  return (
    <>
      <Toaster richColors position="top-right" />

      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50/30">
        {/* Header */}
        <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
                AdMatch
              </span>
              <Badge variant="secondary" className="text-xs">AI-Powered</Badge>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="hidden sm:inline">Powered by</span>
              <Badge variant="outline" className="text-xs">Gemini 1.5 Flash</Badge>
              <Badge variant="outline" className="text-xs">Supabase</Badge>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 py-8">
          {/* Hero */}
          {appState === 'input' && (
            <div className="text-center mb-8 space-y-3">
              <h1 className="text-4xl font-bold tracking-tight">
                Personalize Landing Pages{' '}
                <span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
                  with AI
                </span>
              </h1>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                Input an ad creative + landing page URL. Get an AI-personalized page aligned with
                your ad messaging using CRO principles — in seconds.
              </p>
              <div className="flex flex-wrap justify-center gap-4 text-sm text-muted-foreground pt-2">
                <span>✦ Message Match</span>
                <span>✦ CRO Optimized</span>
                <span>✦ Non-destructive</span>
                <span>✦ Shareable Preview</span>
              </div>
            </div>
          )}

          {/* Result Header */}
          {appState === 'result' && result && (
            <div className="mb-6 flex items-center justify-between flex-wrap gap-4">
              <div>
                <h1 className="text-2xl font-bold">Personalization Complete</h1>
                <p className="text-muted-foreground text-sm mt-1">
                  {result.changes.length} change{result.changes.length !== 1 ? 's' : ''} applied ·{' '}
                  Match score: <strong>{result.message_match_score}/100</strong>
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/result/${resultId}`);
                    toast.success('Share link copied!');
                  }}
                >
                  📋 Copy Share Link
                </Button>
                <Button variant="outline" size="sm" onClick={handleReset}>
                  ← New Session
                </Button>
              </div>
            </div>
          )}

          {/* Content */}
          {appState === 'input' && (
            <div className="max-w-2xl mx-auto">
              <InputForm
                onStart={handleStart}
                onProgress={handleProgress}
                onComplete={handleComplete}
                onError={handleError}
              />
            </div>
          )}

          {appState === 'processing' && (
            <div className="max-w-lg mx-auto mt-8">
              <ProgressTracker
                step={progress.step}
                total={progress.total}
                message={progress.message}
              />
            </div>
          )}

          {appState === 'result' && result && (
            <div className="space-y-8">
              <PagePreview resultId={resultId} landingUrl={result.landing_url} />
              <Separator />
              <div className="max-w-3xl mx-auto">
                <h2 className="text-lg font-semibold mb-4">What Changed & Why</h2>
                <ChangeSummary
                  changes={result.changes}
                  matchScore={result.message_match_score}
                  adAnalysis={result.ad_analysis}
                  gapAnalysis={(result as any).gap_analysis}
                />
              </div>
            </div>
          )}
        </main>
      </div>
    </>
  );
}
