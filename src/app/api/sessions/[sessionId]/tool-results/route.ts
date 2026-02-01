import { NextRequest, NextResponse } from 'next/server';
import { getToolResults } from '@/lib/tools/_toolResultCache';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;
  if (!sessionId) {
    return NextResponse.json({ error: 'sessionId required' }, { status: 400 });
  }
  const results = getToolResults(sessionId);
  return NextResponse.json(results ?? {});
}
