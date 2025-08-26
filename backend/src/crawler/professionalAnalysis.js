const SpectralCrawler = require('./spectralCrawler');
const fs = require('fs').promises;
const path = require('path');

class SpectralAnalysisRunner {
    constructor() {
        this.reportDir = path.join(__dirname, '../../reports');
    }

    async generateExecutiveReport(url) {
        console.log('🏢 SPECTRAL PRIVACY COMPLIANCE ANALYSIS');
        console.log('=' .repeat(60));
        console.log(`🌐 Target: ${url}`);
        console.log(`📅 Analysis Date: ${new Date().toLocaleString()}`);
        console.log('=' .repeat(60));
        
        const crawler = new SpectralCrawler({ headless: false });
        
        try {
            await crawler.init();
            const results = await crawler.crawlSite(url);
            
            // Use the new violation engine's report directly
            if (results.gdprCompliance && results.gdprCompliance.report) {
                console.log(results.gdprCompliance.report);
            } else {
                console.log('❌ GDPR compliance analysis failed or incomplete');
            }
            
            // Save comprehensive report
            await this.saveReport(url, results);
            
            return results;
            
        } catch (error) {
            console.error('❌ Analysis failed:', error.message);
            throw error;
        } finally {
            await crawler.close();
        }
    }

    async saveReport(url, results) {
        try {
            await fs.mkdir(this.reportDir, { recursive: true });
            
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const domain = new URL(url).hostname;
            const filename = `spectral-analysis-${domain}-${timestamp}.json`;
            const filepath = path.join(this.reportDir, filename);
            
            const reportData = {
                url,
                timestamp: new Date().toISOString(),
                complianceScore: results.gdprCompliance?.complianceScore || 0,
                riskLevel: results.gdprCompliance?.riskLevel || 'UNKNOWN',
                violations: results.gdprCompliance?.violations || [],
                fullReport: results.gdprCompliance?.report || '',
                detailedResults: results,
                metadata: {
                    spectralVersion: '1.0.0',
                    analysisType: 'comprehensive-privacy-compliance',
                    reportGeneration: 'automated'
                }
            };
            
            await fs.writeFile(filepath, JSON.stringify(reportData, null, 2));
            
            console.log(`\n💾 COMPREHENSIVE REPORT SAVED:`);
            console.log(`   📁 Location: ${filepath}`);
            console.log(`   📊 Size: ${(JSON.stringify(reportData).length / 1024).toFixed(1)} KB`);
            console.log(`   🔗 Share with legal/compliance teams for review`);
            
        } catch (error) {
            console.error('❌ Failed to save report:', error.message);
        }
    }
}

// Main execution
async function runAnalysis() {
    if (process.argv.length < 3) {
        console.log('Usage: node professionalAnalysis.js <URL>');
        console.log('Example: node professionalAnalysis.js https://example.com');
        process.exit(1);
    }
    
    const url = process.argv[2];
    const analyzer = new SpectralAnalysisRunner();
    
    try {
        await analyzer.generateExecutiveReport(url);
    } catch (error) {
        console.error('Analysis failed:', error.message);
        process.exit(1);
    }
}

// Export for use as module
module.exports = SpectralAnalysisRunner;

// Run if called directly
if (require.main === module) {
    runAnalysis();
}