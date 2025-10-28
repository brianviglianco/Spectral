import { NextResponse } from 'next/server';
import { getAllAnalyses } from '@/lib/api';

export async function GET() {
  try {
    const analyses = getAllAnalyses();
    return NextResponse.json(analyses);
  } catch (error) {
    console.error('Error fetching analyses:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
