#!/usr/bin/env node

// relearnFromReports.js - Re-learn from existing reports
'use strict';

const fs = require('fs');
const path = require('path');

// Initialize learning system
class SimpleLearningSystem {
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
            }
        } catch(e) {
            console.log('[Learning] Starting with empty knowledge base');
        }
    }
    
    save() {
        const dir = path.dirname(this.dataPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(this.dataPath, JSON.stringify(this.knowledge, null, 2));
    }
    
    learn(crawlResult, domain) {
        console.log(`[Learning] Processing ${domain}...`);
        
        for (const stage of crawlResult.stages) {
            if (!stage.cookieBreakdown) continue;
            
            const cookies = stage.cookieBreakdown.all || [];
            
            for (const cookie of cookies) {
                // Skip unknown cookies for learning
                if (cookie.gdprCategory === 'unknown') continue;
                
                // Learn globally
                if (!this.knowledge.globalPatterns[cookie.name]) {
                    this.knowledge.globalPatterns[cookie.name] = {
                        domains: [],
                        totalOccurrences: 0,
                        categories: {}
                    };
                }
                
                const globalEntry = this.knowledge.globalPatterns[cookie.name];
                const domainKey = domain.replace('www.', '');
                
                if (!globalEntry.domains.includes(domainKey)) {
                    globalEntry.domains.push(domainKey);
                }
                globalEntry.totalOccurrences++;
                
                // Track category
                globalEntry.categories[cookie.gdprCategory] = 
                    (globalEntry.categories[cookie.gdprCategory] || 0) + 1;
                
                // Store in domain-specific knowledge
                if (!this.knowledge.domains[domainKey]) {
                    this.knowledge.domains[domainKey] = {};
                }
                
                if (!this.knowledge.domains[domainKey][cookie.name]) {
                    this.knowledge.domains[domainKey][cookie.name] = {
                        firstSeen: new Date().toISOString(),
                        occurrences: 0,
                        categories: {}
                    };
                }
                
                const domainEntry = this.knowledge.domains[domainKey][cookie.name];
                domainEntry.occurrences++;
                domainEntry.categories[cookie.gdprCategory] = 
                    (domainEntry.categories[cookie.gdprCategory] || 0) + 1;
            }
        }
        
        // Update patterns
        this.updatePatterns();
        this.save();
        
        console.log(`[Learning] Learned from ${domain}`);
    }
    
    updatePatterns() {
        // Create patterns from global data
        for (const [cookieName, globalData] of Object.entries(this.knowledge.globalPatterns)) {
            if (globalData.domains.length >= 2) {
                const categories = Object.entries(globalData.categories);
                if (categories.length > 0) {
                    const [topCategory, count] = categories.reduce((a, b) => b[1] > a[1] ? b : a);
                    const confidence = count / globalData.totalOccurrences;
                    
                    if (confidence > 0.7) {
                        this.knowledge.patterns[cookieName] = {
                            category: topCategory,
                            confidence: Math.min(0.95, confidence + (globalData.domains.length * 0.05)),
                            basedOn: globalData.totalOccurrences,
                            domains: globalData.domains
                        };
                    }
                }
            }
        }
    }
    
    getStats() {
        return {
            patterns: Object.keys(this.knowledge.patterns).length,
            domains: Object.keys(this.knowledge.domains).length,
            globalPatterns: Object.keys(this.knowledge.globalPatterns).length,
            topPatterns: Object.entries(this.knowledge.patterns)
                .sort((a, b) => b[1].confidence - a[1].confidence)
                .slice(0, 10)
                .map(([name, data]) => ({
                    cookie: name,
                    category: data.category,
                    confidence: (data.confidence * 100).toFixed(1) + '%',
                    domains: data.domains.length
                }))
        };
    }
}

// Main function
async function relearnFromReports() {
    console.log('\n=== RE-LEARNING FROM EXISTING REPORTS ===\n');
    
    const learningSystem = new SimpleLearningSystem();
    const reportsDir = path.join(process.cwd(), 'reports');
    
    // Find all norm.json files
    const files = fs.readdirSync(reportsDir);
    const normFiles = files.filter(f => f.endsWith('.norm.json')).sort();
    
    console.log(`Found ${normFiles.length} analysis files to learn from\n`);
    
    let processedCount = 0;
    const sitesSeen = new Set();
    
    for (const file of normFiles) {
        const filePath = path.join(reportsDir, file);
        
        try {
            // Extract domain from filename
            const match = file.match(/spectral-analysis-([^-]+)-/);
            if (!match) continue;
            
            const domain = match[1];
            
            // Skip if we've already processed this domain (use latest only)
            if (sitesSeen.has(domain)) continue;
            sitesSeen.add(domain);
            
            console.log(`Processing: ${domain}`);
            const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            
            // Learn from this analysis
            learningSystem.learn(data, domain);
            processedCount++;
            
        } catch(e) {
            console.log(`Error processing ${file}: ${e.message}`);
        }
    }
    
    console.log(`\n=== LEARNING COMPLETE ===`);
    console.log(`Processed ${processedCount} unique domains\n`);
    
    // Show final stats
    const stats = learningSystem.getStats();
    console.log('Learning Statistics:');
    console.log(`  Total patterns: ${stats.patterns}`);
    console.log(`  Total domains: ${stats.domains}`);
    console.log(`  Global patterns: ${stats.globalPatterns}`);
    
    if (stats.topPatterns.length > 0) {
        console.log('\nTop Learned Patterns:');
        stats.topPatterns.forEach(p => {
            console.log(`  ${p.cookie}: ${p.category} (${p.confidence} from ${p.domains} domains)`);
        });
    }
    
    console.log('\nLearning data saved to backend/data/cookie_learning.json');
}

// Run
relearnFromReports().catch(console.error);