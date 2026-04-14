'use client';

import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';

interface ProgressTrackerProps {
  step: number;
  total: number;
  message: string;
}

const STEP_ICONS = ['🔍', '🧠', '📐', '✏️', '💾'];
const STEP_LABELS = [
  'Fetching Landing Page',
  'Analyzing Ad Creative',
  'Building CRO Strategy',
  'Applying Changes',
  'Saving Result',
];

export default function ProgressTracker({ step, total, message }: ProgressTrackerProps) {
  const pct = total > 0 ? Math.round((step / total) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="text-center space-y-1">
        <h2 className="text-xl font-semibold">AI Pipeline Running</h2>
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>

      <Progress value={pct} className="h-2" />
      <p className="text-center text-sm text-muted-foreground">{pct}% complete</p>

      <div className="grid grid-cols-5 gap-2">
        {STEP_LABELS.map((label, i) => {
          const stepNum = i + 1;
          const isDone = step > stepNum;
          const isActive = step === stepNum;

          return (
            <div key={label} className="flex flex-col items-center gap-1 text-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center text-lg transition-all ${
                  isDone
                    ? 'bg-green-100 text-green-700 ring-2 ring-green-500'
                    : isActive
                    ? 'bg-primary/10 text-primary ring-2 ring-primary animate-pulse'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {isDone ? '✓' : STEP_ICONS[i]}
              </div>
              <span className={`text-xs leading-tight ${isActive ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
                {label}
              </span>
            </div>
          );
        })}
      </div>

      <Card className="bg-muted/30">
        <CardContent className="pt-4">
          <div className="flex items-start gap-3">
            <span className="text-2xl animate-bounce">⚡</span>
            <div className="text-sm space-y-1">
              <p className="font-medium">What's happening:</p>
              <p className="text-muted-foreground">{message}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
