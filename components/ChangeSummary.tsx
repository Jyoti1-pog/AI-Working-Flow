'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import type { AppliedChange, AdAnalysis } from '@/lib/types';

interface ChangeSummaryProps {
  changes: AppliedChange[];
  matchScore: number;
  adAnalysis: AdAnalysis;
  gapAnalysis?: string;
}

const PRINCIPLE_COLORS: Record<string, string> = {
  'Message Match': 'bg-blue-100 text-blue-800',
  'Value Proposition Clarity': 'bg-purple-100 text-purple-800',
  'CTA Alignment': 'bg-orange-100 text-orange-800',
  'Urgency/Scarcity': 'bg-red-100 text-red-800',
  'Audience Alignment': 'bg-green-100 text-green-800',
  'Trust Signals': 'bg-teal-100 text-teal-800',
};

function ScoreMeter({ score }: { score: number }) {
  const color = score >= 80 ? 'text-green-600' : score >= 50 ? 'text-amber-500' : 'text-red-500';
  const label = score >= 80 ? 'Strong Match' : score >= 50 ? 'Moderate Match' : 'Weak Match';

  return (
    <div className="flex flex-col items-center gap-1">
      <div className={`text-5xl font-bold ${color}`}>{score}</div>
      <div className={`text-sm font-medium ${color}`}>{label}</div>
      <div className="text-xs text-muted-foreground">message match score</div>
    </div>
  );
}

export default function ChangeSummary({ changes, matchScore, adAnalysis, gapAnalysis }: ChangeSummaryProps) {
  return (
    <div className="space-y-4">
      {/* Score + Ad Intel */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="flex items-center justify-center p-6">
          <ScoreMeter score={matchScore} />
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Ad Creative Detected</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {adAnalysis.headline && (
              <div>
                <span className="text-muted-foreground">Headline: </span>
                <span className="font-medium">{adAnalysis.headline}</span>
              </div>
            )}
            {adAnalysis.cta && (
              <div>
                <span className="text-muted-foreground">CTA: </span>
                <Badge variant="outline">{adAnalysis.cta}</Badge>
              </div>
            )}
            {adAnalysis.target_audience && (
              <div>
                <span className="text-muted-foreground">Audience: </span>
                <span>{adAnalysis.target_audience}</span>
              </div>
            )}
            {adAnalysis.tone && (
              <div>
                <span className="text-muted-foreground">Tone: </span>
                <span>{adAnalysis.tone}</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Gap Analysis */}
      {gapAnalysis && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardContent className="pt-4 text-sm">
            <span className="font-medium text-amber-700">Gap Analysis: </span>
            <span className="text-amber-800">{gapAnalysis}</span>
          </CardContent>
        </Card>
      )}

      {/* Changes Applied */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center justify-between">
            Changes Applied
            <Badge>{changes.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {changes.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-2">
              No changes could be applied — selectors did not match the live page.
            </p>
          )}
          {changes.map((change, i) => (
            <div key={i} className="space-y-2">
              {i > 0 && <Separator />}
              <div className="flex items-start justify-between gap-2">
                <code className="text-xs bg-muted px-2 py-0.5 rounded font-mono truncate max-w-[200px]">
                  {change.selector}
                </code>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${
                    PRINCIPLE_COLORS[change.cro_principle] ?? 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {change.cro_principle}
                </span>
              </div>
              <div className="space-y-1 text-sm">
                <div className="flex gap-2">
                  <span className="text-red-400 shrink-0 mt-0.5">−</span>
                  <span className="text-muted-foreground line-through line-clamp-2">{change.original}</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-green-600 shrink-0 mt-0.5">+</span>
                  <span className="font-medium line-clamp-2">{change.modified}</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground italic">{change.reason}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
