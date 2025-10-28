import { NextResponse } from 'next/server';
import { getAnalysisById } from '@/lib/api';

function isPromise(value) {
  return value && typeof value.then === 'function';
}

export async function GET(request, context) {
  try {
    const rawParams = context?.params;
    const resolvedParams = isPromise(rawParams) ? await rawParams : rawParams;
    const analysisId = resolvedParams?.id;

    if (!analysisId) {
      return NextResponse.json({ error: 'Missing analysis id' }, { status: 400 });
    }

    const analysis = getAnalysisById(analysisId);
    
    if (!analysis) {
      return NextResponse.json({ error: 'Analysis not found' }, { status: 404 });
    }
    
    return NextResponse.json(analysis);
  } catch (error) {
    console.error('Error fetching analysis:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
