import { NextResponse } from 'next/server';
import { getScreenshotPath } from '@/lib/api';
import fs from 'fs';

export async function GET(request, { params }) {
  try {
    const filename = params.filename;
    const filepath = getScreenshotPath(filename);

    if (!fs.existsSync(filepath)) {
      return new NextResponse('Screenshot not found', { status: 404 });
    }

    const imageBuffer = fs.readFileSync(filepath);
    
    return new NextResponse(imageBuffer, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('Error serving screenshot:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
