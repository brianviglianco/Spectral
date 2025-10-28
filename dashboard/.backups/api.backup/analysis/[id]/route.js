import { NextResponse } from 'next/server';
import { getAnalysisById } from '@/lib/api';

export async function GET(request, { params }) {
  try {
    const analysis = getAnalysisById(params.id);
    
    if (!analysis) {
      return NextResponse.json({ error: 'Analysis not found' }, { status: 404 });
    }
    
    return NextResponse.json(analysis);
  } catch (error) {
    console.error('Error fetching analysis:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
