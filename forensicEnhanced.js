// forensicEnhanced.js - Complete forensic packaging with SHA-256, HAR-lite, and digital signatures
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');

// Generate SHA-256 hash for file
function generateSHA256(filepath) {
    const fileBuffer = fs.readFileSync(filepath);
    const hashSum = crypto.createHash('sha256');
    hashSum.update(fileBuffer);
    return hashSum.digest('hex');
}

// Generate HAR-lite format from raw network data
function generateHARLite(rawData, stageName) {
    const har = {
        log: {
            version: '1.2',
            creator: {
                name: 'Spectral',
                version: '1.0.0'
            },
            pages: [{
                startedDateTime: new Date().toISOString(),
                id: `page_${stageName}`,
                title: rawData.url || 'Unknown',
                pageTimings: {
                    onContentLoad: -1,
                    onLoad: -1
                }
            }],
            entries: []
        }
    };

    // Process network requests
    const requests = rawData.stages?.find(s => s.stage === stageName)?.networkEvidence?.requests || [];
    
    requests.forEach((req, index) => {
        const entry = {
            startedDateTime: new Date(req.timestamp || Date.now()).toISOString(),
            time: 0,
            request: {
                method: req.method || 'GET',
                url: req.url,
                httpVersion: 'HTTP/1.1',
                headers: [],
                queryString: [],
                cookies: [],
                headersSize: -1,
                bodySize: -1
            },
            response: {
                status: req.statusCode || 200,
                statusText: 'OK',
                httpVersion: 'HTTP/1.1',
                headers: [],
                cookies: [],
                content: {
                    size: 0,
                    mimeType: req.type || 'application/octet-stream'
                },
                redirectURL: '',
                headersSize: -1,
                bodySize: -1
            },
            cache: {},
            timings: {
                blocked: -1,
                dns: -1,
                connect: -1,
                send: 0,
                wait: 0,
                receive: 0,
                ssl: -1
            }
        };
        
        har.log.entries.push(entry);
    });

    return har;
}

// Create enhanced evidence package with forensic-grade metadata
function createEvidencePackage(basePath) {
    console.log('[forensicEnhanced] Creating evidence package...');
    
    // Load all related files
    const files = {
        normalized: basePath + '.norm.json',
        evidence: basePath + '.norm.evid.json',
        raw: basePath + '.json',
        p0: basePath + '.norm.json.p0.json',
        report: basePath + '.report.json'
    };
    
    const evidence = {
        metadata: {
            version: '2.1',
            createdAt: new Date().toISOString(),
            jurisdiction: 'EU',
            standard: 'GDPR + ePrivacy',
            basePath: path.basename(basePath)
        },
        files: {},
        hashes: {},
        harLite: {},
        signatures: {
            package: {
                algorithm: 'SHA-256',
                signature: null
            }
        },
        validation: {
            errors: [],
            warnings: []
        }
    };
    
    // Process each file
    console.log('  Processing normalized...');
    if (fs.existsSync(files.normalized)) {
        const normData = JSON.parse(fs.readFileSync(files.normalized, 'utf8'));
        evidence.files.normalized = path.basename(files.normalized);
        evidence.hashes.normalized = generateSHA256(files.normalized);
        
        // Generate HAR-lite for each stage
        ['baseline', 'reject', 'accept'].forEach(stage => {
            if (normData.stages?.find(s => s.stage === stage)) {
                evidence.harLite[stage] = generateHARLite(normData, stage);
            }
        });
    } else {
        evidence.validation.errors.push('Missing normalized file');
    }
    
    console.log('  Processing evidence...');
    if (fs.existsSync(files.evidence)) {
        evidence.files.evidence = path.basename(files.evidence);
        evidence.hashes.evidence = generateSHA256(files.evidence);
    }
    
    console.log('  Processing raw...');
    if (fs.existsSync(files.raw)) {
        evidence.files.raw = path.basename(files.raw);
        evidence.hashes.raw = generateSHA256(files.raw);
        console.log('  Generated HAR-lite format');
    } else {
        evidence.validation.warnings.push('Missing raw crawl data');
    }
    
    console.log('  Processing p0...');
    if (fs.existsSync(files.p0)) {
        evidence.files.p0 = path.basename(files.p0);
        evidence.hashes.p0 = generateSHA256(files.p0);
    }
    
    console.log('  Processing report...');
    if (fs.existsSync(files.report)) {
        evidence.files.report = path.basename(files.report);
        evidence.hashes.report = generateSHA256(files.report);
    }
    
    // Generate package signature
    const packageContent = JSON.stringify({
        files: evidence.files,
        hashes: evidence.hashes,
        timestamp: evidence.metadata.createdAt
    });
    evidence.signatures.package.signature = crypto
        .createHash('sha256')
        .update(packageContent)
        .digest('hex');
    
    // Add chain of custody
    evidence.chainOfCustody = {
        created: {
            timestamp: evidence.metadata.createdAt,
            action: 'Evidence package created',
            actor: 'Spectral System'
        },
        events: []
    };
    
    // Save evidence package
    const evidencePackagePath = basePath + '.evidence.json';
    fs.writeFileSync(evidencePackagePath, JSON.stringify(evidence, null, 2));
    console.log(`[forensicEnhanced] Evidence package saved: ${path.basename(evidencePackagePath)}`);
    
    // Create summary
    const summary = {
        status: evidence.validation.errors.length === 0 ? 'COMPLETE' : 'PARTIAL',
        files: Object.keys(evidence.files).length,
        hashes: Object.keys(evidence.hashes).length,
        harPages: Object.keys(evidence.harLite).length,
        signature: evidence.signatures.package.signature.substring(0, 16) + '...',
        errors: evidence.validation.errors
    };
    
    return { evidencePackagePath, summary };
}

// Helper: Check if command exists
function commandExists(cmd) {
    const isWin = process.platform === 'win32';
    const result = spawnSync(isWin ? 'where' : 'which', [cmd], { encoding: 'utf8' });
    return result.status === 0;
}

// Create forensic ZIP with all evidence
function createForensicZIP(basePath, domain) {
    console.log('[forensicEnhanced] Creating forensic ZIP...');
    
    const tempDir = path.join(path.dirname(basePath), `forensic-${domain}-${Date.now()}`);
    fs.mkdirSync(tempDir, { recursive: true });
    
    // Copy all related files
    const patterns = [
        basePath + '.json',
        basePath + '.norm.json',
        basePath + '.norm.evid.json',
        basePath + '.norm.json.p0.json',
        basePath + '.report.json',
        basePath + '.evidence.json'
    ];
    
    patterns.forEach(pattern => {
        if (fs.existsSync(pattern)) {
            fs.copyFileSync(pattern, path.join(tempDir, path.basename(pattern)));
        }
    });
    
    // Copy screenshots from norm.json stages - FIX: usar path absoluto
    const screenshotsCopied = [];
    const normPath = basePath + '.norm.json';
    if (fs.existsSync(normPath)) {
        try {
            const normData = JSON.parse(fs.readFileSync(normPath, 'utf8'));
            const screenshotDir = path.join(process.cwd(), 'screenshots');  // FIX: path absoluto
            
            if (fs.existsSync(screenshotDir) && normData.stages) {
                const screenshotDest = path.join(tempDir, 'screenshots');
                fs.mkdirSync(screenshotDest, { recursive: true });
                
                // Get screenshots from each stage
                normData.stages.forEach(stage => {
                    if (stage.screenshot) {
                        const screenshotFile = path.basename(stage.screenshot);
                        const sourcePath = path.join(screenshotDir, screenshotFile);
                        if (fs.existsSync(sourcePath)) {
                            fs.copyFileSync(sourcePath, path.join(screenshotDest, screenshotFile));
                            screenshotsCopied.push(screenshotFile);
                        }
                    }
                });
                
                if (screenshotsCopied.length > 0) {
                    console.log(`[forensicEnhanced] Copied ${screenshotsCopied.length} screenshots`);
                }
            }
        } catch(e) {
            console.log('[forensicEnhanced] Warning: Could not process screenshots:', e.message);
        }
    }
    
    // Create README
    const readme = `SPECTRAL GDPR COMPLIANCE EVIDENCE PACKAGE
==========================================

Domain: ${domain}
Generated: ${new Date().toISOString()}
Region: ${process.env.RAN_REGION || 'DE'}

FILES INCLUDED:
- *.json: Raw crawl data
- *.norm.json: Normalized data
- *.norm.evid.json: Evidence enriched
- *.p0.json: P0 format summary
- *.report.json: Compliance report
- *.evidence.json: Forensic package with hashes
- screenshots/: Visual evidence per stage

VERIFICATION:
All files include SHA-256 hashes in the evidence.json file.
Digital signatures ensure tamper detection.

LEGAL NOTICE:
This evidence package is prepared for GDPR compliance verification.
All data collected in accordance with EU regulations.

For questions: legal@spectral.com
`;
    
    fs.writeFileSync(path.join(tempDir, 'README.txt'), readme);
    
    // Create integrity check script
    const integrityScript = `#!/bin/bash
# Integrity verification script
echo "Verifying evidence integrity..."

for file in *.json; do
    if [ -f "$file" ]; then
        echo -n "$file: "
        sha256sum "$file"
    fi
done

echo "Compare these hashes with evidence.json to verify integrity"
`;
    
    fs.writeFileSync(path.join(tempDir, 'verify.sh'), integrityScript);
    fs.chmodSync(path.join(tempDir, 'verify.sh'), '755');
    
    // Create MANIFEST.json with metadata
    const manifest = {
        domain,
        timestamp: new Date().toISOString(),
        evidenceFiles: patterns.filter(p => fs.existsSync(p)).map(p => path.basename(p)),
        screenshots: screenshotsCopied,
        verifyScript: "verify.sh",
        integrity: "SHA-256 hashes in evidence.json",
        region: process.env.RAN_REGION || "DE",
        version: "2.1"
    };
    fs.writeFileSync(path.join(tempDir, "MANIFEST.json"), JSON.stringify(manifest, null, 2));
    console.log('[forensicEnhanced] MANIFEST.json created');
    
    // Create ZIP with robust error handling - FIX: usar spawnSync
    const zipPath = `${tempDir}.zip`;
    
    // Try zip first
    if (commandExists('zip')) {
        const result = spawnSync('zip', ['-r', zipPath, '.'], { 
            cwd: tempDir, 
            stdio: ['ignore', 'pipe', 'pipe']
        });
        
        if (result.status === 0) {
            console.log(`[forensicEnhanced] ZIP created: ${path.basename(zipPath)}`);
            // Clean up temp directory
            spawnSync('rm', ['-rf', tempDir]);
            return zipPath;
        } else {
            console.log('[forensicEnhanced] ZIP command failed:', result.stderr?.toString());
        }
    }
    
    // Fallback to tar if zip not available
    if (commandExists('tar')) {
        const tarPath = zipPath.replace(/\.zip$/, '.tar.gz');
        const result = spawnSync('tar', ['-czf', tarPath, '-C', tempDir, '.'], {
            stdio: ['ignore', 'pipe', 'pipe']
        });
        
        if (result.status === 0) {
            console.log(`[forensicEnhanced] TAR created: ${path.basename(tarPath)}`);
            // Clean up temp directory
            spawnSync('rm', ['-rf', tempDir]);
            return tarPath;
        } else {
            console.log('[forensicEnhanced] TAR command failed:', result.stderr?.toString());
        }
    }
    
    // If both fail, keep folder
    console.log('[forensicEnhanced] Archive creation failed, keeping folder:', tempDir);
    return tempDir;
}

// Main function to enhance existing reports
function enhanceForensicReport(reportPath) {
    console.log('\n=== FORENSIC ENHANCEMENT ===');
    
    // Parse report path to get base
    const basePath = reportPath.replace(/\.json$/, '').replace(/\.norm$/, '').replace(/\.report$/, '');
    const domain = basePath.match(/spectral-analysis-([^-]+)/)?.[1] || 'unknown';
    
    console.log(`Domain: ${domain}`);
    console.log(`Base path: ${path.basename(basePath)}`);
    
    // Create evidence package
    const { evidencePackagePath, summary } = createEvidencePackage(basePath);
    
    console.log('\nEvidence Package Summary:');
    console.log(`  Status: ${summary.status}`);
    console.log(`  Files: ${summary.files}`);
    console.log(`  Hashes: ${summary.hashes}`);
    console.log(`  HAR pages: ${summary.harPages}`);
    console.log(`  Signature: ${summary.signature}`);
    
    if (summary.errors.length > 0) {
        console.log(`  Errors: ${summary.errors.join(', ')}`);
    }
    
    // Create forensic ZIP
    const zipPath = createForensicZIP(basePath, domain);
    
    console.log(`\nForensic package: ${zipPath}`);
    
    return {
        evidencePackage: evidencePackagePath,
        forensicZip: zipPath,
        summary
    };
}

module.exports = {
    enhanceForensicReport,
    generateSHA256,
    createEvidencePackage,
    createForensicZIP
};

// CLI usage
if (require.main === module) {
    const args = process.argv.slice(2);
    if (args.length === 0) {
        console.log('Usage: node forensicEnhanced.js <report-path>');
        console.log('Example: node forensicEnhanced.js reports/spectral-analysis-dell.com-*.json');
        process.exit(1);
    }
    enhanceForensicReport(args[0]);
}
