import fs from 'fs';
import path from 'path';

const REPORTS_DIR = path.join(process.cwd(), '..', 'reports');
const SCREENSHOTS_DIR = path.join(process.cwd(), '..', 'screenshots');

export function getAllAnalyses() {
  try {
    if (!fs.existsSync(REPORTS_DIR)) {
      console.log('Reports directory not found');
      return [];
    }

    const files = fs.readdirSync(REPORTS_DIR);
    const reportFiles = files.filter(f => f.endsWith('.report.json'));

    const analyses = reportFiles.map(filename => {
      const filepath = path.join(REPORTS_DIR, filename);
      const content = fs.readFileSync(filepath, 'utf-8');
      const data = JSON.parse(content);
      
      return {
        id: filename.replace('.report.json', ''),
        filename,
        domain: data.host || data.domain,
        timestamp: data.timestamp,
        score: data.compliance?.score || 0,
        grade: data.compliance?.grade || 'F',
        risk: data.compliance?.risk || 'UNKNOWN',
        cmp: data.cmp?.provider || 'Unknown',
        analysisMode: data.analysisMode || 'full',
        violations: data.violations || [],
        violationsBySeverity: data.compliance?.violationsBySeverity || {
          critical: 0,
          high: 0,
          medium: 0,
          low: 0
        }
      };
    });

    return analyses.sort((a, b) => 
      new Date(b.timestamp) - new Date(a.timestamp)
    );
  } catch (error) {
    console.error('Error reading analyses:', error);
    return [];
  }
}

export function getAnalysisById(id) {
  try {
    const reportPath = path.join(REPORTS_DIR, `${id}.report.json`);
    const fullJsonPath = path.join(REPORTS_DIR, `${id}.json`);
    
    if (!fs.existsSync(reportPath)) {
      return null;
    }

    const report = JSON.parse(fs.readFileSync(reportPath, 'utf-8'));
    
    // Read stages from the FULL JSON file (not p0)
    let stages = null;
    if (fs.existsSync(fullJsonPath)) {
      const fullData = JSON.parse(fs.readFileSync(fullJsonPath, 'utf-8'));
      stages = fullData.stages || null;
      console.log('[API] Loaded stages from full JSON:', stages ? stages.length : 0);
    }

    const screenshots = getScreenshotsForAnalysis(id);

    const reportFiles = {
      console: getReportText(id, 'console.txt'),
      marketing: getReportText(id, 'marketing.txt'),
      technical: getReportText(id, 'tech.txt'),
      legal: getReportText(id, 'legal.txt')
    };

    return {
      id,
      report,
      stages,
      screenshots,
      reportFiles
    };
  } catch (error) {
    console.error('Error reading analysis:', error);
    return null;
  }
}

function getScreenshotsForAnalysis(id) {
  try {
    if (!fs.existsSync(SCREENSHOTS_DIR)) {
      return [];
    }

    const files = fs.readdirSync(SCREENSHOTS_DIR);
    const pattern = id.replace('spectral-analysis-', 'spectral-');
    
    const screenshots = files
      .filter(f => f.startsWith(pattern) && f.endsWith('.png'))
      .map(filename => ({
        filename,
        stage: filename.includes('-baseline') ? 'baseline' :
               filename.includes('-reject_pre') ? 'reject_pre' :
               filename.includes('-reject-') ? 'reject' :
               filename.includes('-accept_pre') ? 'accept_pre' :
               filename.includes('-accept-') ? 'accept' : 'unknown',
        path: `/api/screenshot/${filename}`
      }));

    const stageOrder = ['baseline', 'reject_pre', 'reject', 'accept_pre', 'accept'];
    return screenshots.sort((a, b) => 
      stageOrder.indexOf(a.stage) - stageOrder.indexOf(b.stage)
    );
  } catch (error) {
    console.error('Error reading screenshots:', error);
    return [];
  }
}

function getReportText(id, suffix) {
  try {
    const reportPath = path.join(REPORTS_DIR, `${id}.${suffix}`);
    if (fs.existsSync(reportPath)) {
      return fs.readFileSync(reportPath, 'utf-8');
    }
    return null;
  } catch (error) {
    return null;
  }
}

export function getScreenshotPath(filename) {
  return path.join(SCREENSHOTS_DIR, filename);
}
