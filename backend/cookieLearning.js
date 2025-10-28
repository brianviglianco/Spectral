// backend/cookieLearning.js - GLOBAL LEARNING VERSION - FIXED SYNC LOADING

'use strict';

const fs = require('fs');
const fsPromises = require('fs').promises;
const path = require('path');

const LEARNING_DB_PATH = path.join(__dirname, '../data/cookie_learning.json');

class CookieLearningSystem {
    constructor() {
        this.knowledge = {
            patterns: {},
            domains: {},
            cooccurrence: {},
            confidence: {},
            globalPatterns: {}
        };
        
        // CRITICAL FIX: Load synchronously on instantiation
        this.loadKnowledgeSync();
    }

    // SYNC LOADING - RUNS IN CONSTRUCTOR
    loadKnowledgeSync() {
        try {
            if (fs.existsSync(LEARNING_DB_PATH)) {
                const data = fs.readFileSync(LEARNING_DB_PATH, 'utf8');
                this.knowledge = JSON.parse(data);
                console.log(`[Learning] Loaded ${Object.keys(this.knowledge.patterns).length} patterns, ${Object.keys(this.knowledge.globalPatterns).length} global patterns on init`);
            } else {
                console.log('[Learning] No previous knowledge found, starting fresh');
            }
        } catch(e) {
            console.log('[Learning] Error loading knowledge:', e.message);
        }
    }

    async loadKnowledge() {
        // Keep for backward compatibility but data is already loaded
        try {
            const data = await fsPromises.readFile(LEARNING_DB_PATH, 'utf8');
            this.knowledge = JSON.parse(data);
            
            // Migrate old data if necessary
            if (!this.knowledge.globalPatterns) {
                this.knowledge.globalPatterns = {};
            }
            
            console.log(`[Learning] Reloaded knowledge: ${Object.keys(this.knowledge.patterns).length} patterns, ${Object.keys(this.knowledge.globalPatterns).length} global`);
        } catch(e) {
            console.log('[Learning] No previous knowledge found, starting fresh');
            await this.saveKnowledge();
        }
    }

    async saveKnowledge() {
        const dir = path.dirname(LEARNING_DB_PATH);
        await fsPromises.mkdir(dir, { recursive: true });
        await fsPromises.writeFile(LEARNING_DB_PATH, JSON.stringify(this.knowledge, null, 2));
    }

    async learn(crawlResult, domain) {
        console.log(`[Learning] Processing ${domain}...`);
        
        for (const stage of crawlResult.stages) {
            if (!stage.cookieBreakdown) continue;
            
            const cookies = stage.cookieBreakdown.all;
            
            for (const cookie of cookies) {
                // 1. Register by domain
                const domainKey = domain.replace('www.', '');
                
                if (!this.knowledge.domains[domainKey]) {
                    this.knowledge.domains[domainKey] = {};
                }
                
                if (!this.knowledge.domains[domainKey][cookie.name]) {
                    this.knowledge.domains[domainKey][cookie.name] = {
                        firstSeen: new Date().toISOString(),
                        occurrences: 0,
                        categories: {},
                        stages: {},
                        values: []
                    };
                }
                
                const entry = this.knowledge.domains[domainKey][cookie.name];
                entry.occurrences++;
                entry.lastSeen = new Date().toISOString();
                
                // 2. Learn GLOBALLY
                if (!this.knowledge.globalPatterns[cookie.name]) {
                    this.knowledge.globalPatterns[cookie.name] = {
                        domains: [],
                        totalOccurrences: 0,
                        categories: {},
                        confidence: 0
                    };
                }
                
                const globalEntry = this.knowledge.globalPatterns[cookie.name];
                
                if (!globalEntry.domains.includes(domainKey)) {
                    globalEntry.domains.push(domainKey);
                }
                
                globalEntry.totalOccurrences++;
                
                // 3. Learn categories
                if (cookie.gdprCategory !== 'unknown') {
                    entry.categories[cookie.gdprCategory] = (entry.categories[cookie.gdprCategory] || 0) + 1;
                    globalEntry.categories[cookie.gdprCategory] = (globalEntry.categories[cookie.gdprCategory] || 0) + 1;
                }
                
                // 4. Co-occurrence (what cookies appear together)
                for (const otherCookie of cookies) {
                    if (otherCookie.name !== cookie.name) {
                        const pairKey = [cookie.name, otherCookie.name].sort().join('::');
                        this.knowledge.cooccurrence[pairKey] = (this.knowledge.cooccurrence[pairKey] || 0) + 1;
                    }
                }
            }
        }
        
        // 5. Update global patterns
        this.updateGlobalPatterns();
        
        await this.saveKnowledge();
        console.log(`[Learning] Saved knowledge from ${domain}`);
    }

    updateGlobalPatterns() {
        // Update patterns based on global knowledge
        for (const [cookieName, globalData] of Object.entries(this.knowledge.globalPatterns)) {
            // If appears in 2+ domains with same category
            if (globalData.domains.length >= 2) {
                const categories = Object.entries(globalData.categories);
                if (categories.length > 0) {
                    const [topCategory, count] = categories.reduce((a, b) => b[1] > a[1] ? b : a);
                    const confidence = count / globalData.totalOccurrences;
                    
                    if (confidence > 0.7) {
                        // Create global pattern
                        this.knowledge.patterns[cookieName] = {
                            category: topCategory,
                            confidence: Math.min(0.95, confidence + (globalData.domains.length * 0.05)),
                            basedOn: globalData.totalOccurrences,
                            domains: globalData.domains
                        };
                        
                        console.log(`[Learning] Global pattern: ${cookieName} -> ${topCategory} (${Math.round(confidence*100)}% from ${globalData.domains.length} domains)`);
                    }
                }
            }
        }
    }

    predict(cookieName, cookieDomain, cookieValue) {
        // 1. FIRST look for global patterns
        if (this.knowledge.patterns[cookieName]) {
            const pattern = this.knowledge.patterns[cookieName];
            return {
                category: pattern.category,
                confidence: pattern.confidence,
                reason: `Learned globally from ${pattern.domains.length} domains (${pattern.basedOn} occurrences)`
            };
        }
        
        // 2. Look for name variations
        for (const [pattern, data] of Object.entries(this.knowledge.patterns)) {
            // If cookie starts with same prefix
            if (cookieName.startsWith(pattern.split('_')[0] + '_') && pattern !== cookieName) {
                return {
                    category: data.category,
                    confidence: data.confidence * 0.85,
                    reason: `Similar to known pattern: ${pattern}`
                };
            }
        }
        
        // 3. Look in global patterns even if not definitive
        if (this.knowledge.globalPatterns[cookieName]) {
            const global = this.knowledge.globalPatterns[cookieName];
            
            if (global.categories && Object.keys(global.categories).length > 0) {
                const [topCategory] = Object.entries(global.categories).reduce((a, b) => b[1] > a[1] ? b : a);
                
                return {
                    category: topCategory,
                    confidence: 0.6,
                    reason: `Seen in ${global.domains.length} domains`
                };
            }
        }
        
        // 4. By co-occurrence
        for (const [pair, count] of Object.entries(this.knowledge.cooccurrence)) {
            if (pair.includes(cookieName) && count > 5) {
                const otherCookie = pair.split('::').find(c => c !== cookieName);
                if (this.knowledge.patterns[otherCookie]) {
                    return {
                        category: this.knowledge.patterns[otherCookie].category,
                        confidence: 0.5,
                        reason: `Often appears with ${otherCookie}`
                    };
                }
            }
        }
        
        return null;
    }

    getStats() {
        return {
            totalDomains: Object.keys(this.knowledge.domains).length,
            totalPatterns: Object.keys(this.knowledge.patterns).length,
            globalPatterns: Object.keys(this.knowledge.globalPatterns).length,
            totalCooccurrences: Object.keys(this.knowledge.cooccurrence).length,
            topPatterns: Object.entries(this.knowledge.patterns)
                .sort((a, b) => b[1].confidence - a[1].confidence)
                .slice(0, 10)
                .map(([name, data]) => ({
                    cookie: name,
                    category: data.category,
                    confidence: (data.confidence * 100).toFixed(1) + '%',
                    basedOn: data.basedOn,
                    domains: data.domains.length
                }))
        };
    }
}

// Create singleton instance
const learningSystem = new CookieLearningSystem();

module.exports = learningSystem;