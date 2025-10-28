#!/usr/bin/env node

// testLearningFixed.js - Testing script with proper learning integration
'use strict';

const fs = require('fs');
const path = require('path');
const { inferCookiesFromNetwork, categorizeUnknownCookie, TRACKING_PATTERNS } = require('../cookieIntelligence.js');

// Colors for console output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    red: '\x1b[31m',
    cyan: '\x1b[36m',
    magenta: '\x1b[35m'
};

// Load learning data directly
class LearningLoader {
    constructor() {
        this.dataPath = path.join(__dirname, '../data/cookie_learning.json');
        this.knowledge = {
            patterns: {},
            domains: {},
            cooccurrence: {},
            confidence: {},
            globalPatterns: {}
        };
        this.load();
    }
    
    load() {
        try {
            if (fs.existsSync(this.dataPath)) {
                const data = fs.readFileSync(this.dataPath, 'utf8');
                this.knowledge = JSON.parse(data);
                console.log(`[Learning] Loaded ${Object.keys(this.knowledge.patterns).length} patterns from database`);
            } else {
                console.log('[Learning] No learning database found');
            }
        } catch(e) {
            console.log('[Learning] Error loading database:', e.message);
        }
    }
    
    predict(cookieName, cookieDomain, cookieValue) {
        // Check learned patterns
        if (this.knowledge.patterns[cookieName]) {
            const pattern = this.knowledge.patterns[cookieName];
            return {
                category: pattern.category,
                confidence: pattern.confidence,
                reason: `Learned from ${pattern.domains ? pattern.domains.length : 'multiple'} domains`
            };
        }
        
        // Check global patterns
        if (this.knowledge.globalPatterns[cookieName]) {
            const global = this.knowledge.globalPatterns[cookieName];
            if (global.categories && Object.keys(global.categories).length > 0) {
                const [topCategory, count] = Object.entries(global.categories)
                    .reduce((a, b) => b[1] > a[1] ? b : a);
                const confidence = count / global.totalOccurrences;
                if (confidence > 0.5) {
                    return {
                        category: topCategory,
                        confidence: confidence,
                        reason: `Seen in ${global.domains.length} domains`
                    };
                }
            }
        }
        
        // Check for pattern variations
        for (const [pattern, data] of Object.entries(this.knowledge.patterns)) {
            // Check if cookie starts with same prefix
            if (cookieName.startsWith(pattern.split('_')[0] + '_') && pattern !== cookieName) {
                return {
                    category: data.category,
                    confidence: data.confidence * 0.85,
                    reason: `Similar to known pattern: ${pattern}`
                };
            }
        }
        
        return null;
    }
    
    getStats() {
        return {
            totalDomains: Object.keys(this.knowledge.domains).length,
            totalPatterns: Object.keys(this.knowledge.patterns).length,
            globalPatterns: Object.keys(this.knowledge.globalPatterns).length,
            totalCooccurrences: Object.keys(this.knowledge.cooccurrence).length
        };
    }
}

// Initialize learning
const learningSystem = new LearningLoader();

async function analyzeUnknownCookies(site) {
    console.log(`\n${colors.bright}=== ANALYZING ${site.toUpperCase()} ===${colors.reset}`);
    
    // Find latest norm.json for the site
    const reportsDir = path.join(process.cwd(), 'reports');
    const files = fs.readdirSync(reportsDir);
    const normFiles = files.filter(f => 
        f.includes(site.replace('https://', '').replace('http://', '').split('/')[0]) && 
        f.endsWith('.norm.json')
    ).sort().reverse();
    
    if (normFiles.length === 0) {
        console.log(`${colors.red}No analysis found for ${site}${colors.reset}`);
        return null;
    }
    
    const normPath = path.join(reportsDir, normFiles[0]);
    const normData = JSON.parse(fs.readFileSync(normPath, 'utf8'));
    
    let totalCookies = 0;
    let unknownCookies = 0;
    let categorizedByLearning = 0;
    let categorizedByIntelligence = 0;
    let stillUnknown = [];
    let categorizedDetails = {
        learning: [],
        intelligence: []
    };
    
    // Analyze each stage
    for (const stage of normData.stages) {
        if (!stage.cookieBreakdown) continue;
        
        const cookies = stage.cookieBreakdown.all || [];
        
        for (const cookie of cookies) {
            totalCookies++;
            
            if (cookie.gdprCategory === 'unknown') {
                unknownCookies++;
                
                // Try learning system FIRST
                const learned = learningSystem.predict(cookie.name, cookie.domain, cookie.value);
                if (learned && learned.confidence > 0.6) {
                    categorizedByLearning++;
                    categorizedDetails.learning.push({
                        name: cookie.name,
                        category: learned.category,
                        confidence: Math.round(learned.confidence*100)
                    });
                    console.log(`${colors.green}  ✓ LEARNED: ${cookie.name} -> ${learned.category} (${Math.round(learned.confidence*100)}%)${colors.reset}`);
                    console.log(`    Reason: ${learned.reason}`);
                } else {
                    // Try intelligence system
                    const smart = categorizeUnknownCookie(cookie.name, cookie.domain, cookie.value);
                    if (smart.confidence > 0.5) {
                        categorizedByIntelligence++;
                        categorizedDetails.intelligence.push({
                            name: cookie.name,
                            category: smart.category,
                            confidence: Math.round(smart.confidence*100)
                        });
                        console.log(`${colors.yellow}  ✓ INTELLIGENT: ${cookie.name} -> ${smart.category} (${Math.round(smart.confidence*100)}%)${colors.reset}`);
                        console.log(`    Reason: ${smart.reason}`);
                    } else {
                        stillUnknown.push({
                            name: cookie.name,
                            domain: cookie.domain,
                            stage: stage.stage
                        });
                    }
                }
            }
        }
    }
    
    // Calculate percentages
    const unknownPercentage = totalCookies > 0 ? (unknownCookies / totalCookies * 100).toFixed(1) : 0;
    const resolvedPercentage = unknownCookies > 0 ? 
        ((categorizedByLearning + categorizedByIntelligence) / unknownCookies * 100).toFixed(1) : 0;
    
    console.log(`\n${colors.bright}SUMMARY:${colors.reset}`);
    console.log(`Total cookies: ${totalCookies}`);
    console.log(`Unknown cookies: ${unknownCookies} (${unknownPercentage}%)`);
    console.log(`Resolved by Learning: ${categorizedByLearning}`);
    console.log(`Resolved by Intelligence: ${categorizedByIntelligence}`);
    console.log(`Still unknown: ${stillUnknown.length} (${((stillUnknown.length/totalCookies)*100).toFixed(1)}%)`);
    
    if (stillUnknown.length > 0 && stillUnknown.length <= 10) {
        console.log(`\n${colors.red}STILL UNKNOWN COOKIES:${colors.reset}`);
        stillUnknown.forEach(c => {
            console.log(`  - ${c.name} (${c.domain}) in ${c.stage}`);
        });
    }
    
    return {
        site,
        totalCookies,
        unknownCookies,
        unknownPercentage: parseFloat(unknownPercentage),
        categorizedByLearning,
        categorizedByIntelligence,
        stillUnknown: stillUnknown.length,
        finalUnknownPercentage: parseFloat(((stillUnknown.length/totalCookies)*100).toFixed(1)),
        details: categorizedDetails
    };
}

async function showLearningStats() {
    console.log(`\n${colors.cyan}=== LEARNING SYSTEM STATS ===${colors.reset}`);
    
    const stats = learningSystem.getStats();
    console.log(`Total domains analyzed: ${stats.totalDomains}`);
    console.log(`Patterns learned: ${stats.totalPatterns}`);
    console.log(`Global patterns: ${stats.globalPatterns}`);
    console.log(`Co-occurrence patterns: ${stats.totalCooccurrences}`);
    
    // Show top patterns
    if (learningSystem.knowledge.patterns && Object.keys(learningSystem.knowledge.patterns).length > 0) {
        console.log(`\n${colors.bright}TOP LEARNED PATTERNS:${colors.reset}`);
        const patterns = Object.entries(learningSystem.knowledge.patterns)
            .sort((a, b) => (b[1].confidence || 0) - (a[1].confidence || 0))
            .slice(0, 10);
        
        patterns.forEach(([name, data]) => {
            const domains = data.domains ? data.domains.length : 'N/A';
            const conf = data.confidence ? (data.confidence * 100).toFixed(1) : 'N/A';
            console.log(`  ${name}: ${data.category} (${conf}% from ${domains} domains)`);
        });
    }
    
    // Show intelligence patterns count
    const intelligencePatterns = Object.keys(TRACKING_PATTERNS);
    console.log(`\n${colors.bright}INTELLIGENCE PATTERNS:${colors.reset}`);
    console.log(`Services tracked: ${intelligencePatterns.length}`);
    
    let totalKnownCookies = 0;
    for (const service of intelligencePatterns) {
        totalKnownCookies += TRACKING_PATTERNS[service].cookies.length;
    }
    console.log(`Known cookie patterns: ${totalKnownCookies}`);
}

async function runTest(sites) {
    console.log(`${colors.bright}${colors.magenta}\nSPECTRAL LEARNING SYSTEM TEST${colors.reset}`);
    console.log('=' .repeat(60));
    
    // Show initial stats
    await showLearningStats();
    
    // Analyze each site
    const results = [];
    for (const site of sites) {
        const result = await analyzeUnknownCookies(site);
        if (result) results.push(result);
    }
    
    // Show aggregate results
    if (results.length > 0) {
        console.log(`\n${colors.bright}${colors.cyan}=== AGGREGATE RESULTS ===${colors.reset}`);
        
        let totalCookiesAll = 0;
        let totalUnknownAll = 0;
        let totalResolvedLearning = 0;
        let totalResolvedIntelligence = 0;
        let totalStillUnknown = 0;
        
        results.forEach(r => {
            totalCookiesAll += r.totalCookies;
            totalUnknownAll += r.unknownCookies;
            totalResolvedLearning += r.categorizedByLearning;
            totalResolvedIntelligence += r.categorizedByIntelligence;
            totalStillUnknown += r.stillUnknown;
        });
        
        console.log(`\nAcross ${results.length} sites:`);
        console.log(`Total cookies: ${totalCookiesAll}`);
        console.log(`Initially unknown: ${totalUnknownAll} (${(totalUnknownAll/totalCookiesAll*100).toFixed(1)}%)`);
        console.log(`Resolved by Learning: ${totalResolvedLearning} (${(totalResolvedLearning/totalUnknownAll*100).toFixed(1)}%)`);
        console.log(`Resolved by Intelligence: ${totalResolvedIntelligence} (${(totalResolvedIntelligence/totalUnknownAll*100).toFixed(1)}%)`);
        console.log(`${colors.bright}FINAL UNKNOWN: ${totalStillUnknown} (${(totalStillUnknown/totalCookiesAll*100).toFixed(1)}%)${colors.reset}`);
        
        const targetMet = (totalStillUnknown/totalCookiesAll*100) <= 20;
        if (targetMet) {
            console.log(`\n${colors.green}${colors.bright}✓ TARGET MET: Unknown cookies below 20%${colors.reset}`);
        } else {
            console.log(`\n${colors.yellow}⚠ TARGET NOT MET: Unknown cookies still above 20%${colors.reset}`);
            console.log(`  Need to reduce unknowns by ${((totalStillUnknown/totalCookiesAll*100) - 20).toFixed(1)}%`);
        }
    }
}

// Main execution
const args = process.argv.slice(2);

if (args.length === 0) {
    console.log('Usage: node testLearningFixed.js <site1> [site2] [site3] ...');
    console.log('Example: node testLearningFixed.js dell.com cisco.com microsoft.com');
    console.log('\nOr use "latest" to test last 3 analyzed sites:');
    console.log('node testLearningFixed.js latest');
    process.exit(1);
}

if (args[0] === 'latest') {
    // Find latest analyzed sites
    const reportsDir = path.join(process.cwd(), 'reports');
    const files = fs.readdirSync(reportsDir);
    const normFiles = files.filter(f => f.endsWith('.norm.json')).sort().reverse();
    
    const sites = new Set();
    for (const file of normFiles) {
        const match = file.match(/spectral-analysis-([^-]+)-/);
        if (match) {
            sites.add(match[1]);
            if (sites.size >= 3) break;
        }
    }
    
    if (sites.size === 0) {
        console.log('No analyzed sites found');
        process.exit(1);
    }
    
    runTest(Array.from(sites)).catch(console.error);
} else {
    runTest(args).catch(console.error);
}