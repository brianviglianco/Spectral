import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const reportsDir = path.join(process.cwd(), '..', 'reports');
    
    if (!fs.existsSync(reportsDir)) {
      return NextResponse.json([]);
    }

    const files = fs.readdirSync(reportsDir);
    const reportFiles = files.filter(f => f.endsWith('.report.json'));

    const analyses = reportFiles.map(filename => {
      const filepath = path.join(reportsDir, filename);
      const content = JSON.parse(fs.readFileSync(filepath, 'utf8'));
      
      const id = filename.replace('.report.json', '');
      
      return {
        id,
        host: content.host || 'unknown',
        timestamp: content.timestamp,
        score: content.compliance?.score || 0,
        grade: content.compliance?.grade || 'F',
        risk: content.compliance?.risk || 'UNKNOWN',
        cmp: content.cmp?.provider || 'Unknown',
        violations: content.violations?.length || 0,
        critical: content.compliance?.violationsBySeverity?.critical || 0
      };
    });

    // Sort by timestamp descending
    analyses.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    return NextResponse.json(analyses);

  } catch (error) {
    console.error('Error loading analyses:', error);
    return NextResponse.json([]);
  }
}
