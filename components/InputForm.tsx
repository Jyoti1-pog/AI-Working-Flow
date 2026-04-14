'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import type { SSEEvent, PersonalizeResult } from '@/lib/types';

interface InputFormProps {
  onStart: () => void;
  onProgress: (step: number, total: number, message: string) => void;
  onComplete: (resultId: string, data: PersonalizeResult) => void;
  onError: (message: string) => void;
}

export default function InputForm({ onStart, onProgress, onComplete, onError }: InputFormProps) {
  const [adTab, setAdTab] = useState<'image' | 'url'>('image');
  const [adFile, setAdFile] = useState<File | null>(null);
  const [adFilePreview, setAdFilePreview] = useState<string | null>(null);
  const [adUrl, setAdUrl] = useState('');
  const [landingUrl, setLandingUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAdFile(file);
    setAdFilePreview(URL.createObjectURL(file));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!landingUrl.trim()) {
      onError('Please enter a landing page URL.');
      return;
    }
    if (adTab === 'image' && !adFile) {
      onError('Please upload an ad creative image.');
      return;
    }
    if (adTab === 'url' && !adUrl.trim()) {
      onError('Please enter the ad URL.');
      return;
    }

    setLoading(true);
    onStart();

    try {
      let adImageUrl: string | undefined;
      let adType: 'image' | 'url' = adTab;

      // Upload image if needed
      if (adTab === 'image' && adFile) {
        const fd = new FormData();
        fd.append('file', adFile);
        const uploadRes = await fetch('/api/upload', { method: 'POST', body: fd });
        if (!uploadRes.ok) {
          const err = await uploadRes.json();
          throw new Error(err.error ?? 'Image upload failed');
        }
        const uploadData = await uploadRes.json();
        adImageUrl = uploadData.url;
      }

      // Start personalization stream
      const res = await fetch('/api/personalize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ad_type: adType,
          ad_image_url: adImageUrl,
          ad_url: adTab === 'url' ? adUrl : undefined,
          landing_url: landingUrl,
        }),
      });

      if (!res.body) throw new Error('No response body from server');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const raw = line.slice(6);
          const event: SSEEvent = JSON.parse(raw);

          if (event.type === 'progress') {
            onProgress(event.step, event.total, event.message);
          } else if (event.type === 'complete') {
            onComplete(event.resultId, event.data);
          } else if (event.type === 'error') {
            throw new Error(event.message);
          }
        }
      }
    } catch (err) {
      onError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Ad Creative Input */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="text-2xl">📣</span> Ad Creative
          </CardTitle>
          <CardDescription>
            Upload your ad image or provide the URL of the ad
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={adTab} onValueChange={(v) => setAdTab(v as 'image' | 'url')}>
            <TabsList className="mb-4">
              <TabsTrigger value="image">Upload Image</TabsTrigger>
              <TabsTrigger value="url">Ad URL</TabsTrigger>
            </TabsList>

            <TabsContent value="image">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-muted-foreground/30 rounded-xl p-8 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-all"
              >
                {adFilePreview ? (
                  <img
                    src={adFilePreview}
                    alt="Ad preview"
                    className="max-h-48 mx-auto rounded-lg object-contain"
                  />
                ) : (
                  <div className="space-y-2 text-muted-foreground">
                    <div className="text-4xl">🖼️</div>
                    <p className="font-medium">Click to upload ad image</p>
                    <p className="text-sm">JPEG, PNG, WebP, GIF · Max 10MB</p>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>
              {adFile && (
                <p className="mt-2 text-sm text-muted-foreground text-center">
                  {adFile.name} ({(adFile.size / 1024).toFixed(0)} KB)
                </p>
              )}
            </TabsContent>

            <TabsContent value="url">
              <div className="space-y-2">
                <Label htmlFor="adUrl">Ad URL</Label>
                <Input
                  id="adUrl"
                  type="url"
                  placeholder="https://example.com/ad-page"
                  value={adUrl}
                  onChange={(e) => setAdUrl(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  The scraper will take a screenshot of this URL and analyze it
                </p>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Landing Page URL */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="text-2xl">🌐</span> Landing Page
          </CardTitle>
          <CardDescription>
            The page you want to personalize based on the ad creative
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <Label htmlFor="landingUrl">Landing Page URL</Label>
          <Input
            id="landingUrl"
            type="url"
            placeholder="https://yoursite.com/landing-page"
            value={landingUrl}
            onChange={(e) => setLandingUrl(e.target.value)}
            required
          />
          <p className="text-xs text-muted-foreground">
            Must be a publicly accessible URL (no login required)
          </p>
        </CardContent>
      </Card>

      <Button type="submit" size="lg" className="w-full" disabled={loading}>
        {loading ? (
          <span className="flex items-center gap-2">
            <span className="animate-spin">⚙️</span> Processing...
          </span>
        ) : (
          <span className="flex items-center gap-2">
            ✨ Personalize Landing Page
          </span>
        )}
      </Button>

      <div className="flex flex-wrap gap-2 justify-center text-xs text-muted-foreground">
        <Badge variant="secondary">Gemini 1.5 Flash</Badge>
        <Badge variant="secondary">CRO Principles</Badge>
        <Badge variant="secondary">Message Match</Badge>
        <Badge variant="secondary">Non-destructive</Badge>
      </div>
    </form>
  );
}
