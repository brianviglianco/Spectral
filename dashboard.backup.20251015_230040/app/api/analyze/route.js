import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const formData = await request.formData();
    const url = formData.get('url');

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    // Por ahora redirige con instrucciones
    return NextResponse.redirect(new URL(`/?analyze=${encodeURIComponent(url)}`, request.url));
  } catch (error) {
    console.error('[API] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
