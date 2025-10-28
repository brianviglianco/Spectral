import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import os from 'os';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const analysisId = searchParams.get('id');

    if (!analysisId) {
      return NextResponse.json({ error: 'Analysis ID required' }, { status: 400 });
    }

    console.log('[Download] Analysis ID:', analysisId);

    const homeDir = os.homedir();
    const reportsDir = path.join(homeDir, 'Desktop', 'Spectral', 'reports');
    
    // Extraer el dominio del analysisId
    // Formato: spectral-analysis-DOMAIN-TIMESTAMP
    const domainMatch = analysisId.match(/spectral-analysis-([^-]+\.[^-]+)-/);
    if (!domainMatch) {
      return NextResponse.json({ error: 'Invalid analysis ID format' }, { status: 400 });
    }
    
    const domain = domainMatch[1];
    console.log('[Download] Extracted domain:', domain);
    
    // Buscar el ZIP forense más reciente para este dominio
    const files = fs.readdirSync(reportsDir);
    console.log('[Download] All files:', files.filter(f => f.endsWith('.zip')));
    
    const zipFiles = files
      .filter(f => f.startsWith(`forensic-${domain}-`) && f.endsWith('.zip'))
      .sort()
      .reverse(); // Más reciente primero
    
    console.log('[Download] Matching ZIPs:', zipFiles);
    
    if (zipFiles.length === 0) {
      return NextResponse.json({ error: `No forensic package found for ${domain}` }, { status: 404 });
    }

    const zipFile = zipFiles[0];
    console.log('[Download] Selected ZIP:', zipFile);
    
    const filepath = path.join(reportsDir, zipFile);
    const fileBuffer = fs.readFileSync(filepath);
    
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${zipFile}"`,
        'Content-Length': fileBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error('[Download] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
