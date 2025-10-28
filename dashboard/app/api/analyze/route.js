import { NextResponse } from 'next/server';
import { spawn } from 'child_process';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    let validUrl;
    try {
      validUrl = new URL(url.startsWith('http') ? url : `https://${url}`);
    } catch (e) {
      return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 });
    }

    console.log('[API] Starting analysis for:', validUrl.href);

    // runconsolesingle.mjs is in Spectral root, not backend
    const pathParts = [
      process.env.HOME || '',
      'Desktop',
      'Spectral',
      'runconsolesingle.mjs'
    ];
    const scriptPath = pathParts.join('/');
    const spectralDir = pathParts.slice(0, -1).join('/');

    console.log('[API] Script path:', scriptPath);
    console.log('[API] Working dir:', spectralDir);

    const child = spawn('node', [scriptPath, '--host', validUrl.href], {
      detached: true,
      stdio: ['ignore', 'pipe', 'pipe'],
      cwd: spectralDir
    });

    child.stdout.on('data', (data) => {
      console.log('[CRAWLER]', data.toString());
    });

    child.stderr.on('data', (data) => {
      console.error('[CRAWLER ERROR]', data.toString());
    });

    child.on('error', (error) => {
      console.error('[SPAWN ERROR]', error);
    });

    child.on('exit', (code) => {
      console.log('[CRAWLER] Process exited with code:', code);
    });

    child.unref();

    console.log('[API] Analysis spawned with PID:', child.pid);

    return NextResponse.json({
      success: true,
      message: 'Analysis started',
      url: validUrl.href,
      estimatedTime: '45-60 seconds'
    });

  } catch (error) {
    console.error('[API] Error:', error);
    return NextResponse.json({ 
      error: 'Failed to start analysis',
      details: error.message 
    }, { status: 500 });
  }
}
