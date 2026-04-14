'use client';

import { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';

interface PagePreviewProps {
  resultId: string;
  landingUrl: string;
}

export default function PagePreview({ resultId, landingUrl }: PagePreviewProps) {
  const [view, setView] = useState<'side-by-side' | 'original' | 'personalized'>('side-by-side');

  const originalSrc = `/api/preview/${resultId}?v=original`;
  const personalizedSrc = `/api/preview/${resultId}?v=modified`;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {(['side-by-side', 'original', 'personalized'] as const).map((v) => (
            <Button
              key={v}
              variant={view === v ? 'default' : 'outline'}
              size="sm"
              onClick={() => setView(v)}
            >
              {v === 'side-by-side' ? '⚡ Side by Side' : v === 'original' ? '📄 Original' : '✨ Personalized'}
            </Button>
          ))}
        </div>
        <a
          href={personalizedSrc}
          target="_blank"
          rel="noreferrer"
          className="text-xs text-muted-foreground hover:text-primary underline underline-offset-2"
        >
          Open full preview ↗
        </a>
      </div>

      {view === 'side-by-side' && (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium bg-muted px-2 py-1 rounded">ORIGINAL</span>
              <a
                href={landingUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-muted-foreground truncate hover:text-primary"
              >
                {landingUrl}
              </a>
            </div>
            <div className="rounded-xl overflow-hidden border shadow-sm bg-white h-[500px]">
              <iframe
                src={originalSrc}
                className="w-full h-full"
                style={{ zoom: 0.6 }}
                title="Original Landing Page"
                sandbox="allow-same-origin allow-scripts"
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium bg-primary/10 text-primary px-2 py-1 rounded">
                ✨ PERSONALIZED
              </span>
            </div>
            <div className="rounded-xl overflow-hidden border-2 border-primary/30 shadow-sm bg-white h-[500px]">
              <iframe
                src={personalizedSrc}
                className="w-full h-full"
                style={{ zoom: 0.6 }}
                title="Personalized Landing Page"
                sandbox="allow-same-origin allow-scripts"
              />
            </div>
          </div>
        </div>
      )}

      {view === 'original' && (
        <div className="rounded-xl overflow-hidden border shadow-sm bg-white h-[600px]">
          <iframe
            src={originalSrc}
            className="w-full h-full"
            title="Original Landing Page"
            sandbox="allow-same-origin allow-scripts"
          />
        </div>
      )}

      {view === 'personalized' && (
        <div className="rounded-xl overflow-hidden border-2 border-primary/30 shadow-sm bg-white h-[600px]">
          <iframe
            src={personalizedSrc}
            className="w-full h-full"
            title="Personalized Landing Page"
            sandbox="allow-same-origin allow-scripts"
          />
        </div>
      )}
    </div>
  );
}
