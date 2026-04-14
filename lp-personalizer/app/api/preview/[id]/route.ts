import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';

// Serves the raw modified HTML so it can be loaded in an iframe
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const url = new URL(request.url);
  const variant = url.searchParams.get('v') ?? 'modified'; // 'original' or 'modified'

  const { data, error } = await supabaseAdmin
    .from('results')
    .select('original_html, modified_html')
    .eq('id', id)
    .single();

  if (error || !data) {
    return new NextResponse('<h1>Result not found</h1>', {
      status: 404,
      headers: { 'Content-Type': 'text/html' },
    });
  }

  const html = variant === 'original' ? data.original_html : data.modified_html;

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'X-Frame-Options': 'SAMEORIGIN',
    },
  });
}
