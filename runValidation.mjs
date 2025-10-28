#!/usr/bin/env node
// runValidation.mjs - SPECTRAL COMPLETE VALIDATION v2.1
// Fixed: Cookie increase in reject is a violation, not illogical

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const REPORTS_DIR = path.join(process.cwd(), 'reports');

function parseArgs() {
    const args = process.argv.slice(2);
    const out = { host: null, full: false, fix: false };
    for(let i = 0; i < args.length; i++) {
        if(args[i] === '--host' || args[i] === '--url') out.host = args[++i];
        if(args[i] === '--full') out.full = true;
        if(args[i] === '--fix') out.fix = true;
    }
    if(!out.host) {
        console.error('Usage: node runValidation.mjs --host <host> [--full] [--fix]');
        console.error('  --full: Show all details');
        console.error('  --fix: Suggest fixes for issues');
        process.exit(1);
    }
    return out;
}

function normalizeHost(h) {
    try {
        if(/^https?:\/\//i.test(h)) return new URL(h).hostname.replace(/^www\./, '');
        return h.replace(/^www\./, '');
    } catch {
        return h;
    }
}

function findLatestFiles(host) {
    const baseHost = normalizeHost(host);
    const files = fs.readdirSync(REPORTS_DIR);
    
    // Find latest analysis
    const analyses = files.filter(f => 
        f.includes(baseHost) && f.endsWith('.json') && !f.includes('.norm') && !f.includes('.p0') && !f.includes('.report') && !f.includes('.evid') && !f.includes('.evidence')
    ).sort((a, b) => {
        const tsA = a.match(/(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2})/)?.[1] || '';
        const tsB = b.match(/(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2})/)?.[1] || '';
        return tsB.localeCompare(tsA);
    });
    
    if(!analyses.length) return null;
    
    const baseName = analyses[0].replace('.json', '');
    const timestamp = baseName.match(/(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2})/)?.[1];
    
    return {
        baseName,
        timestamp,
        raw: path.join(REPORTS_DIR, baseName + '.json'),
        norm: path.join(REPORTS_DIR, baseName + '.norm.json'),
        p0: path.join(REPORTS_DIR, baseName + '.norm.json.p0.json'),
        evid: path.join(REPORTS_DIR, baseName + '.norm.evid.json'),
        report: path.join(REPORTS_DIR, baseName + '.report.json'),
        evidence: path.join(REPORTS_DIR, baseName + '.evidence.json'),
        console: path.join(REPORTS_DIR, baseName + '.console.txt'),
        marketing: path.join(REPORTS_DIR, baseName + '.marketing.txt'),
        tech: path.join(REPORTS_DIR, baseName + '.tech.txt'),
        legal: path.join(REPORTS_DIR, baseName + '.legal.txt')
    };
}

function loadIfExists(filePath) {
    if(!fs.existsSync(filePath)) return null;
    const ext = path.extname(filePath);
    if(ext === '.json') {
        return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } else {
        return fs.readFileSync(filePath, 'utf8');
    }
}

function getStageMetrics(data, stageName) {
    if(!data?.stages) return null;
    
    const stage = Array.isArray(data.stages) 
        ? data.stages.find(s => s.stage === stageName)
        : data.stages[stageName];
    
    if(!stage) return null;
    
    return {
        hits: stage.trackingHits || 0,
        cookies: stage.cookies || stage.cookieBreakdown?.all?.length || 0,
        trackingCookies: stage.cookieBreakdown?.tracking || 0,
        consentCookies: stage.cookieBreakdown?.consent || 0,
        unknownCookies: stage.cookieBreakdown?.unknown || 0,
        scripts: stage.thirdPartyScripts || 0,
        localStorage: stage.localStorageKeys?.length || stage.storage?.localStorageKeys?.length || 0,
        sessionStorage: stage.sessionStorageKeys?.length || stage.storage?.sessionStorageKeys?.length || 0
    };
}

function validateFileConsistency(files, data) {
    const issues = [];
    const warnings = [];
    
    // 1. Check file existence
    console.log('\n📁 FILE INTEGRITY CHECK');
    console.log('─────────────────────────────────────────────────');
    
    const requiredFiles = ['raw', 'norm', 'p0', 'evid', 'report'];
    const optionalFiles = ['console', 'marketing', 'tech', 'legal', 'evidence'];
    
    requiredFiles.forEach(key => {
        const exists = fs.existsSync(files[key]);
        const size = exists ? fs.statSync(files[key]).size : 0;
        const status = exists ? `✅ ${(size/1024).toFixed(1)}KB` : '❌ Missing';
        console.log(`  ${key.padEnd(10)}: ${status}`);
        
        if(!exists) {
            issues.push(`Missing required file: ${key}`);
        } else if(size === 0) {
            issues.push(`Empty file: ${key}`);
        }
    });
    
    optionalFiles.forEach(key => {
        if(fs.existsSync(files[key])) {
            const size = fs.statSync(files[key]).size;
            console.log(`  ${key.padEnd(10)}: ✅ ${(size/1024).toFixed(1)}KB`);
        }
    });
    
    // 2. Validate data consistency across files
    console.log('\n🔄 CROSS-FILE CONSISTENCY');
    console.log('─────────────────────────────────────────────────');
    
    // Compare RAW vs NORM
    if(data.raw && data.norm) {
        // Check URL consistency
        if(data.raw.url !== data.norm.url) {
            issues.push(`URL mismatch: raw="${data.raw.url}" norm="${data.norm.url}"`);
        }
        
        // Check stage count
        const rawStages = data.raw.stages?.length || 0;
        const normStages = data.norm.stages?.length || 0;
        if(rawStages !== normStages) {
            issues.push(`Stage count mismatch: raw=${rawStages} norm=${normStages}`);
        }
    }
    
    // Compare NORM vs P0
    if(data.norm && data.p0) {
        ['baseline', 'reject', 'accept'].forEach(stage => {
            const normStage = getStageMetrics(data.norm, stage);
            const p0Stage = data.p0.stages?.find(s => s.stage === stage);
            
            if(normStage && p0Stage) {
                if(normStage.hits !== p0Stage.trackingHits) {
                    issues.push(`P0 ${stage} hits mismatch: norm=${normStage.hits} p0=${p0Stage.trackingHits}`);
                }
                if(normStage.cookies !== p0Stage.cookies) {
                    issues.push(`P0 ${stage} cookies mismatch: norm=${normStage.cookies} p0=${p0Stage.cookies}`);
                }
                if(normStage.scripts !== p0Stage.thirdPartyScripts) {
                    issues.push(`P0 ${stage} scripts mismatch: norm=${normStage.scripts} p0=${p0Stage.thirdPartyScripts}`);
                }
            }
        });
    }
    
    // Compare NORM vs REPORT  
    if(data.norm && data.report) {
        const normBaseline = getStageMetrics(data.norm, 'baseline');
        const reportBaseline = data.report.metrics?.baseline;
        
        if(normBaseline && reportBaseline) {
            if(normBaseline.hits !== reportBaseline.hits) {
                issues.push(`Report baseline hits mismatch: norm=${normBaseline.hits} report=${reportBaseline.hits}`);
            }
            if(normBaseline.trackingCookies !== reportBaseline.trackingCookies) {
                issues.push(`Report baseline cookies mismatch: norm=${normBaseline.trackingCookies} report=${reportBaseline.trackingCookies}`);
            }
        }
    }
    
    // 3. Check SHA-256 if evidence exists
    if(data.evidence) {
        console.log('\n🔐 EVIDENCE INTEGRITY');
        console.log('─────────────────────────────────────────────────');
        
        Object.entries(data.evidence.hashes || {}).forEach(([fileType, expectedHash]) => {
            const filePath = files[fileType] || files.raw; // fallback to raw
            if(fs.existsSync(filePath)) {
                const content = fs.readFileSync(filePath);
                const actualHash = crypto.createHash('sha256').update(content).digest('hex');
                
                if(actualHash === expectedHash) {
                    console.log(`  ${fileType}: ✅ Hash verified`);
                } else {
                    console.log(`  ${fileType}: ❌ Hash mismatch`);
                    warnings.push(`Evidence hash mismatch for ${fileType} (files modified after evidence generation)`);
                }
            }
        });
    }
    
    return { issues, warnings };
}

function validateLogic(data) {
    const issues = [];
    const warnings = [];
    
    console.log('\n🧠 LOGICAL CONSISTENCY');
    console.log('─────────────────────────────────────────────────');
    
    if(!data.norm) return { issues: ['No norm data to validate'], warnings };
    
    const baseline = getStageMetrics(data.norm, 'baseline');
    const reject = getStageMetrics(data.norm, 'reject');
    const accept = getStageMetrics(data.norm, 'accept');
    
    // 1. FIXED: Cookie increase in reject is a VIOLATION, not illogical
    if(reject && baseline) {
        if(reject.trackingCookies > baseline.trackingCookies) {
            // This is a GDPR violation (EU-C-013), not a logic error
            warnings.push(`⚠️ Tracking cookies increased after reject: ${baseline.trackingCookies}→${reject.trackingCookies} (EU-C-013 violation detected)`);
        }
        if(reject.hits > baseline.hits) {
            warnings.push(`⚠️ Tracking hits increased after reject: ${baseline.hits}→${reject.hits} (EU-C-013 violation)`);
        }
    }
    
    // 2. Accept should have >= tracking than reject (unless broken)
    if(accept && reject) {
        if(accept.trackingCookies < reject.trackingCookies) {
            issues.push(`ILLOGICAL: Accept has fewer tracking cookies than reject: ${reject.trackingCookies}→${accept.trackingCookies}`);
        }
    }
    
    // 3. If no CMP, all stages should be similar
    if(data.norm && !data.norm.cmpDetected) {
        if(baseline && accept) {
            const cookieDiff = Math.abs(accept.cookies - baseline.cookies);
            if(cookieDiff < 2) {
                warnings.push(`No CMP detected but stages are identical - possible detection failure`);
            }
        }
    }
    
    // 4. Check violations match reality
    if(data.report?.violations) {
        // Pre-consent cookies but no violation?
        if(baseline?.trackingCookies > 0) {
            const hasViolation = data.report.violations.some(v => v.code === 'EU-C-002');
            if(!hasViolation) {
                issues.push(`Missing violation EU-C-002: ${baseline.trackingCookies} pre-consent tracking cookies detected`);
            }
        }
        
        // Post-reject increase but no violation?
        if(reject && baseline && reject.trackingCookies > baseline.trackingCookies) {
            const hasViolation = data.report.violations.some(v => v.code === 'EU-C-013');
            if(!hasViolation) {
                issues.push(`Missing violation EU-C-013: Cookies increased after reject`);
            }
        }
    }
    
    // 5. Check scoring logic
    if(data.report?.compliance) {
        const score = data.report.compliance;
        
        // Pre-consent tracking but high score?
        if(baseline?.trackingCookies > 5 && score.score > 60) {
            warnings.push(`High score (${score.score}%) despite ${baseline.trackingCookies} pre-consent tracking cookies`);
        }
        
        // Check for incorrect bonuses
        if(score.scoring_details?.bonuses) {
            const zeroTrackingBonus = score.scoring_details.bonuses.find(b => 
                b.reason.includes('No tracking before consent') || 
                b.reason.includes('Zero pre-consent tracking')
            );
            
            if(zeroTrackingBonus && baseline?.hits > 0) {
                issues.push(`Incorrect bonus: "${zeroTrackingBonus.reason}" but ${baseline.hits} tracking hits detected`);
            }
            
            if(zeroTrackingBonus && baseline?.trackingCookies > 0) {
                issues.push(`Incorrect bonus: "${zeroTrackingBonus.reason}" but ${baseline.trackingCookies} tracking cookies detected`);
            }
        }
    }
    
    console.log(`  Found ${issues.length} logical issues, ${warnings.length} warnings`);
    
    return { issues, warnings };
}

function validateReports(data) {
    const issues = [];
    const warnings = [];
    
    console.log('\n📝 REPORT CONSISTENCY');
    console.log('─────────────────────────────────────────────────');
    
    // Check console report
    if(data.console && data.norm) {
        // Check if privacy flow correctly reports increases
        const baseline = getStageMetrics(data.norm, 'baseline');
        const reject = getStageMetrics(data.norm, 'reject');
        
        if(baseline && reject && reject.trackingCookies > baseline.trackingCookies) {
            if(data.console.includes('cookies remain after rejection')) {
                issues.push(`Console report says "remain" but cookies INCREASED from ${baseline.trackingCookies} to ${reject.trackingCookies}`);
            }
            
            if(!data.console.includes('increase')) {
                warnings.push('Console report should say "increase" not "remain" for cookie changes');
            }
        }
    }
    
    // Check marketing report
    if(data.marketing && data.norm) {
        const baseline = getStageMetrics(data.norm, 'baseline');
        if(baseline?.trackingCookies > 0 && !data.marketing.includes('Currently Non-Compliant')) {
            warnings.push('Marketing report may not properly identify non-compliant tools');
        }
    }
    
    return { issues, warnings };
}

async function main() {
    const { host, full, fix } = parseArgs();
    
    console.log('\n╔══════════════════════════════════════════════════════╗');
    console.log('║       SPECTRAL COMPLETE VALIDATION v2.1              ║');
    console.log('╚══════════════════════════════════════════════════════╝');
    console.log(`Host: ${host}`);
    
    // Find all files
    const files = findLatestFiles(host);
    if(!files) {
        console.error('❌ No analysis found for this host');
        process.exit(1);
    }
    
    console.log(`Analysis: ${files.timestamp}`);
    
    // Load all data
    const data = {
        raw: loadIfExists(files.raw),
        norm: loadIfExists(files.norm),
        p0: loadIfExists(files.p0),
        evid: loadIfExists(files.evid),
        report: loadIfExists(files.report),
        evidence: loadIfExists(files.evidence),
        console: loadIfExists(files.console),
        marketing: loadIfExists(files.marketing)
    };
    
    // Run validations
    const fileCheck = validateFileConsistency(files, data);
    const logicCheck = validateLogic(data);
    const reportCheck = validateReports(data);
    
    // Combine all issues
    const allIssues = [
        ...fileCheck.issues,
        ...logicCheck.issues,
        ...reportCheck.issues
    ];
    
    const allWarnings = [
        ...fileCheck.warnings,
        ...logicCheck.warnings,
        ...reportCheck.warnings
    ];
    
    // Summary metrics
    console.log('\n📊 KEY METRICS');
    console.log('─────────────────────────────────────────────────');
    
    if(data.norm) {
        const baseline = getStageMetrics(data.norm, 'baseline');
        const reject = getStageMetrics(data.norm, 'reject');
        const accept = getStageMetrics(data.norm, 'accept');
        
        console.log('         Hits | T.Cookies | Total | Storage');
        console.log('─────────────────────────────────────────────');
        
        if(baseline) {
            console.log(`Baseline: ${String(baseline.hits).padStart(3)} | ${String(baseline.trackingCookies).padStart(9)} | ${String(baseline.cookies).padStart(5)} | LS:${baseline.localStorage} SS:${baseline.sessionStorage}`);
        }
        
        if(reject) {
            const cookieChange = reject.trackingCookies - (baseline?.trackingCookies || 0);
            const changeStr = cookieChange > 0 ? ` (+${cookieChange})⚠️` : '';
            console.log(`Reject:   ${String(reject.hits).padStart(3)} | ${String(reject.trackingCookies).padStart(9)}${changeStr} | ${String(reject.cookies).padStart(5)} | LS:${reject.localStorage} SS:${reject.sessionStorage}`);
        }
        
        if(accept) {
            console.log(`Accept:   ${String(accept.hits).padStart(3)} | ${String(accept.trackingCookies).padStart(9)} | ${String(accept.cookies).padStart(5)} | LS:${accept.localStorage} SS:${accept.sessionStorage}`);
        }
    }
    
    // Score & Violations
    if(data.report) {
        console.log('\n⚖️ COMPLIANCE');
        console.log('─────────────────────────────────────────────────');
        console.log(`Score: ${data.report.compliance?.score}% (${data.report.compliance?.grade})`);
        console.log(`Risk: ${data.report.compliance?.risk}`);
        console.log(`Violations: ${data.report.violations?.length || 0}`);
        
        if(!full && data.report.violations?.length > 0) {
            const criticals = data.report.violations.filter(v => v.severity === 'CRITICAL');
            if(criticals.length > 0) {
                console.log('\nCritical violations:');
                criticals.forEach(v => {
                    console.log(`  • ${v.code}: ${v.title}`);
                    if(v.code === 'EU-C-013' && v.evidence?.cookieIncrease) {
                        console.log(`    Cookie increase: +${v.evidence.cookieIncrease}`);
                    }
                });
            }
        }
    }
    
    // Validation Results
    console.log('\n✅ VALIDATION RESULTS');
    console.log('─────────────────────────────────────────────────');
    
    if(allIssues.length === 0 && allWarnings.length === 0) {
        console.log('✅ All validations passed!');
    } else {
        if(allIssues.length > 0) {
            console.log(`\n❌ ISSUES (${allIssues.length}):`);
            allIssues.forEach((issue, i) => {
                console.log(`${i+1}. ${issue}`);
            });
        }
        
        if(allWarnings.length > 0 && full) {
            console.log(`\n⚠️ WARNINGS (${allWarnings.length}):`);
            allWarnings.forEach((warning, i) => {
                console.log(`${i+1}. ${warning}`);
            });
        } else if(allWarnings.length > 0) {
            console.log(`\n⚠️ ${allWarnings.length} warnings (use --full to see)`);
        }
    }
    
    // Fix suggestions
    if(fix && allIssues.length > 0) {
        console.log('\n🔧 SUGGESTED FIXES');
        console.log('─────────────────────────────────────────────────');
        
        if(allIssues.some(i => i.includes('Missing violation EU-C-013'))) {
            console.log('1. Update auditDeep.mjs to v2.4 (detects cookie increases)');
        }
        
        if(allIssues.some(i => i.includes('Incorrect bonus'))) {
            console.log('2. Fix scoring logic to not give "zero tracking" bonus when cookies exist');
        }
        
        if(allIssues.some(i => i.includes('Console report says "remain"'))) {
            console.log('3. Update reportGenerator to say "increase" not "remain" for cookies');
        }
        
        console.log('\nRun pipeline again after fixes:');
        console.log(`  node runConsoleSingle.mjs --host ${host}`);
    }
    
    // Full mode - show everything
    if(full) {
        console.log('\n📋 FULL VIOLATION DETAILS');
        console.log('─────────────────────────────────────────────────');
        
        data.report?.violations?.forEach((v, i) => {
            console.log(`\n${i+1}. [${v.code}] ${v.title}`);
            console.log(`  Severity: ${v.severity}`);
            console.log(`  Article: ${v.gdprArticle}`);
            
            if(v.evidence) {
                console.log(`  Evidence:`);
                Object.entries(v.evidence).forEach(([key, val]) => {
                    if(typeof val === 'object' && !Array.isArray(val)) {
                        console.log(`    ${key}: ${JSON.stringify(val)}`);
                    } else {
                        console.log(`    ${key}: ${val}`);
                    }
                });
            }
        });
    }
    
    console.log('\n─────────────────────────────────────────────────');
    console.log(`Validation complete (${allIssues.length} issues, ${allWarnings.length} warnings)`);
    
    process.exit(allIssues.length > 0 ? 1 : 0);
}

main().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});