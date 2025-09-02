// intelligentClassifier.js - Sistema de clasificación inteligente con auto-aprendizaje
// Aprende de cada análisis y mejora automáticamente
// ENHANCED: Auto-detecta first-party scripts como necesarios

const fs = require('fs').promises;
const path = require('path');

class IntelligentScriptClassifier {
    constructor() {
        // Múltiples archivos para diferentes tipos de datos
        this.knownDomainsFile = path.join(__dirname, 'knownDomains.json');
        this.unknownScriptsFile = path.join(__dirname, 'unknownScripts.json');
        this.pendingClassificationFile = path.join(__dirname, 'pendingClassification.json');
        this.learningPatternsFile = path.join(__dirname, 'learningPatterns.json');
        
        this.knownDomains = {};
        this.unknownScripts = {};
        this.pendingClassification = {};
        this.learningPatterns = {};
        this.currentPageDomain = null; // Track current page domain for first-party detection
        
        this.initialize();
    }

    async initialize() {
        await this.loadAllData();
        await this.runAutoClassification();
    }

    async loadAllData() {
        // Cargar dominios conocidos
        try {
            const data = await fs.readFile(this.knownDomainsFile, 'utf8');
            this.knownDomains = JSON.parse(data);
            console.log(`📚 Loaded ${Object.keys(this.knownDomains).length} known domains`);
        } catch (error) {
            this.knownDomains = this.getInitialKnownDomains();
            await this.saveKnownDomains();
        }

        // Cargar scripts desconocidos acumulados
        try {
            const data = await fs.readFile(this.unknownScriptsFile, 'utf8');
            this.unknownScripts = JSON.parse(data);
            console.log(`❓ Loaded ${Object.keys(this.unknownScripts).length} unknown scripts for analysis`);
        } catch (error) {
            this.unknownScripts = {};
        }

        // Cargar clasificaciones pendientes de confirmar
        try {
            const data = await fs.readFile(this.pendingClassificationFile, 'utf8');
            this.pendingClassification = JSON.parse(data);
        } catch (error) {
            this.pendingClassification = {};
        }

        // Cargar patrones aprendidos
        try {
            const data = await fs.readFile(this.learningPatternsFile, 'utf8');
            this.learningPatterns = JSON.parse(data);
            // Reconstruct RegExp from strings
            if (this.learningPatterns.trackingPatterns) {
                this.learningPatterns.trackingPatterns = this.learningPatterns.trackingPatterns.map(p => ({
                    ...p,
                    pattern: new RegExp(p.pattern.slice(1, -1), p.pattern.slice(-1))
                }));
            }
            if (this.learningPatterns.necessaryPatterns) {
                this.learningPatterns.necessaryPatterns = this.learningPatterns.necessaryPatterns.map(p => ({
                    ...p,
                    pattern: new RegExp(p.pattern.slice(1, -1), p.pattern.slice(-1))
                }));
            }
            if (this.learningPatterns.companyPatterns) {
                this.learningPatterns.companyPatterns = this.learningPatterns.companyPatterns.map(p => ({
                    ...p,
                    pattern: new RegExp(p.pattern.slice(1, -1), p.pattern.slice(-1))
                }));
            }
        } catch (error) {
            this.learningPatterns = this.getInitialPatterns();
            await this.saveLearningPatterns();
        }
    }

    getInitialKnownDomains() {
        return {
            // Google ecosystem - completo
            'google-analytics.com': { category: 'analytics', company: 'Google', confidence: 1.0, tracking: true },
            'googletagmanager.com': { category: 'tag-manager', company: 'Google', confidence: 1.0, tracking: true },
            'googlesyndication.com': { category: 'advertising', company: 'Google', confidence: 1.0, tracking: true },
            'doubleclick.net': { category: 'advertising', company: 'Google', confidence: 1.0, tracking: true },
            'googleadservices.com': { category: 'advertising', company: 'Google', confidence: 1.0, tracking: true },
            'google.com': { category: 'mixed', company: 'Google', confidence: 0.8, tracking: false },
            
            // Meta/Facebook ecosystem
            'facebook.com': { category: 'social-tracking', company: 'Meta', confidence: 1.0, tracking: true },
            'facebook.net': { category: 'social-tracking', company: 'Meta', confidence: 1.0, tracking: true },
            'connect.facebook.net': { category: 'social-tracking', company: 'Meta', confidence: 1.0, tracking: true },
            'fbcdn.net': { category: 'social-content', company: 'Meta', confidence: 0.9, tracking: false },
            
            // Microsoft ecosystem
            'clarity.ms': { category: 'analytics', company: 'Microsoft', confidence: 1.0, tracking: true },
            'bing.com': { category: 'mixed', company: 'Microsoft', confidence: 0.8, tracking: true },
            'bat.bing.com': { category: 'advertising', company: 'Microsoft', confidence: 1.0, tracking: true },
            'microsoftonline.com': { category: 'authentication', company: 'Microsoft', confidence: 1.0, tracking: false },
            
            // LinkedIn
            'linkedin.com': { category: 'social-tracking', company: 'LinkedIn', confidence: 1.0, tracking: true },
            'snap.licdn.com': { category: 'social-tracking', company: 'LinkedIn', confidence: 1.0, tracking: true },
            'li.lms-analytics': { category: 'social-tracking', company: 'LinkedIn', confidence: 1.0, tracking: true },
            
            // Adobe ecosystem
            'adobe.com': { category: 'mixed', company: 'Adobe', confidence: 0.8, tracking: true },
            'adobedtm.com': { category: 'tag-manager', company: 'Adobe', confidence: 1.0, tracking: true },
            'omtrdc.net': { category: 'analytics', company: 'Adobe', confidence: 1.0, tracking: true },
            'demdex.net': { category: 'analytics', company: 'Adobe', confidence: 1.0, tracking: true },
            
            // Analytics platforms
            'segment.com': { category: 'analytics', company: 'Segment', confidence: 1.0, tracking: true },
            'segment.io': { category: 'analytics', company: 'Segment', confidence: 1.0, tracking: true },
            'mixpanel.com': { category: 'analytics', company: 'Mixpanel', confidence: 1.0, tracking: true },
            'amplitude.com': { category: 'analytics', company: 'Amplitude', confidence: 1.0, tracking: true },
            'hotjar.com': { category: 'analytics', company: 'Hotjar', confidence: 1.0, tracking: true },
            'mouseflow.com': { category: 'analytics', company: 'Mouseflow', confidence: 1.0, tracking: true },
            'fullstory.com': { category: 'analytics', company: 'FullStory', confidence: 1.0, tracking: true },
            
            // Advertising & Marketing
            '6sc.co': { category: 'analytics', company: '6sense', confidence: 1.0, tracking: true },
            'quantserve.com': { category: 'advertising', company: 'Quantcast', confidence: 1.0, tracking: true },
            'quantcast.com': { category: 'advertising', company: 'Quantcast', confidence: 1.0, tracking: true },
            'scorecardresearch.com': { category: 'analytics', company: 'Comscore', confidence: 1.0, tracking: true },
            
            // CDNs - necesarios
            'cloudflare.com': { category: 'cdn', company: 'Cloudflare', confidence: 1.0, tracking: false },
            'cloudflare.net': { category: 'cdn', company: 'Cloudflare', confidence: 1.0, tracking: false },
            'fastly.net': { category: 'cdn', company: 'Fastly', confidence: 1.0, tracking: false },
            'amazonaws.com': { category: 'cdn', company: 'Amazon', confidence: 0.9, tracking: false },
            'jsdelivr.net': { category: 'cdn', company: 'JSDelivr', confidence: 1.0, tracking: false },
            'unpkg.com': { category: 'cdn', company: 'Unpkg', confidence: 1.0, tracking: false },
            'cdnjs.cloudflare.com': { category: 'cdn', company: 'Cloudflare', confidence: 1.0, tracking: false },
            
            // CMPs - necesarios
            'cookielaw.org': { category: 'cmp', company: 'OneTrust', confidence: 1.0, tracking: false },
            'onetrust.com': { category: 'cmp', company: 'OneTrust', confidence: 1.0, tracking: false },
            'cookiebot.com': { category: 'cmp', company: 'Cookiebot', confidence: 1.0, tracking: false },
            'trustarc.com': { category: 'cmp', company: 'TrustArc', confidence: 1.0, tracking: false },
            'consent.trustarc.com': { category: 'cmp', company: 'TrustArc', confidence: 1.0, tracking: false },
            'usercentrics.com': { category: 'cmp', company: 'Usercentrics', confidence: 1.0, tracking: false },
            
            // Payment processors - necesarios
            'stripe.com': { category: 'payment', company: 'Stripe', confidence: 1.0, tracking: false },
            'paypal.com': { category: 'payment', company: 'PayPal', confidence: 1.0, tracking: false },
            
            // Social media
            'twitter.com': { category: 'social', company: 'Twitter', confidence: 0.9, tracking: true },
            'tiktok.com': { category: 'social-tracking', company: 'TikTok', confidence: 1.0, tracking: true },
            'pinterest.com': { category: 'social-tracking', company: 'Pinterest', confidence: 1.0, tracking: true },
            
            // Salesforce
            'evgnet.com': { category: 'analytics', company: 'Salesforce', confidence: 1.0, tracking: true },
            'cdn.evgnet.com': { category: 'analytics', company: 'Salesforce', confidence: 1.0, tracking: true },
            's.go-mpulse.net': { category: 'analytics', company: 'Salesforce', confidence: 1.0, tracking: true },
            
            // Akamai RUM
            'go-mpulse.net': { category: 'analytics', company: 'Akamai', confidence: 1.0, tracking: true }
        };
    }

    getInitialPatterns() {
        return {
            // Patrones de URL que indican tracking
            trackingPatterns: [
                { pattern: /analytics/i, confidence: 0.9, category: 'analytics' },
                { pattern: /track/i, confidence: 0.8, category: 'tracking' },
                { pattern: /pixel/i, confidence: 0.9, category: 'tracking' },
                { pattern: /beacon/i, confidence: 0.9, category: 'tracking' },
                { pattern: /collect/i, confidence: 0.7, category: 'analytics' },
                { pattern: /metrics/i, confidence: 0.8, category: 'analytics' },
                { pattern: /telemetry/i, confidence: 0.9, category: 'analytics' },
                { pattern: /_ga|_gid|_utm/i, confidence: 0.95, category: 'analytics' },
                { pattern: /conversion/i, confidence: 0.85, category: 'advertising' },
                { pattern: /boomerang/i, confidence: 0.9, category: 'analytics' }  // Added for Akamai
            ],
            
            // Patrones de URL que indican necesario
            necessaryPatterns: [
                { pattern: /jquery|bootstrap|react|angular|vue/i, confidence: 0.95, category: 'library' },
                { pattern: /polyfill/i, confidence: 0.95, category: 'compatibility' },
                { pattern: /\.min\.js$/i, confidence: 0.3, category: 'library' },
                { pattern: /api\./i, confidence: 0.7, category: 'api' },
                { pattern: /cdn\./i, confidence: 0.8, category: 'cdn' },
                { pattern: /static\./i, confidence: 0.7, category: 'static' },
                { pattern: /assets\./i, confidence: 0.8, category: 'assets' },
                { pattern: /clientlibs/i, confidence: 0.9, category: 'library' }  // Common in enterprise CMSs
            ],
            
            // Patrones de compañías por subdominio
            companyPatterns: [
                { pattern: /google/i, company: 'Google' },
                { pattern: /facebook|fb/i, company: 'Meta' },
                { pattern: /microsoft|msft|azure/i, company: 'Microsoft' },
                { pattern: /amazon|aws/i, company: 'Amazon' },
                { pattern: /adobe/i, company: 'Adobe' },
                { pattern: /linkedin/i, company: 'LinkedIn' },
                { pattern: /twitter/i, company: 'Twitter' },
                { pattern: /akamai/i, company: 'Akamai' }
            ]
        };
    }

    setCurrentPageDomain(url) {
        try {
            const urlObj = new URL(url);
            this.currentPageDomain = urlObj.hostname;
            console.log(`🌐 Current page domain set to: ${this.currentPageDomain}`);
        } catch (error) {
            console.error('Failed to set current page domain:', error.message);
            this.currentPageDomain = null;
        }
    }

    isFirstPartyScript(scriptUrl) {
        if (!this.currentPageDomain || !scriptUrl || scriptUrl === '[inline]') {
            return false;
        }

        try {
            const url = new URL(scriptUrl);
            const scriptDomain = url.hostname;
            
            // Exact match or subdomain of current domain
            if (scriptDomain === this.currentPageDomain) {
                return true;
            }
            
            // Check if script is from a subdomain of current domain
            // e.g., cdn.bmw.de is first-party for bmw.de
            const currentBaseDomain = this.currentPageDomain.split('.').slice(-2).join('.');
            const scriptBaseDomain = scriptDomain.split('.').slice(-2).join('.');
            
            return currentBaseDomain === scriptBaseDomain;
        } catch (error) {
            return false;
        }
    }

    hasTrackingPattern(url) {
        const urlLower = url.toLowerCase();
        const strongTrackingPatterns = [
            '/analytics/',
            '/tracking/',
            '/metrics/',
            '/telemetry/',
            '/collect',
            '/beacon',
            '/pixel',
            '/_ga',
            '/_gid',
            '/gtag/',
            '/gtm.',
            '/tag-manager/',
            '/matomo',
            '/piwik',
            '/omniture',
            '/webtrends'
        ];
        
        return strongTrackingPatterns.some(pattern => urlLower.includes(pattern));
    }

    async classifyScript(scriptUrl) {
        try {
            // Handle inline scripts
            if (!scriptUrl || scriptUrl === '[inline]') {
                return {
                    category: 'inline',
                    company: 'Self',
                    confidence: 1.0,
                    tracking: false,
                    source: 'inline'
                };
            }

            const url = new URL(scriptUrl);
            const domain = url.hostname;
            const pathname = url.pathname;
            const fullUrl = scriptUrl;
            
            // 1. Check known domains first
            if (this.knownDomains[domain]) {
                return {
                    ...this.knownDomains[domain],
                    source: 'known-domain',
                    domain
                };
            }
            
            // 2. Check subdomain variations
            const domainParts = domain.split('.');
            if (domainParts.length > 2) {
                const parentDomain = domainParts.slice(-2).join('.');
                if (this.knownDomains[parentDomain]) {
                    // Inherit from parent domain
                    const classification = {
                        ...this.knownDomains[parentDomain],
                        confidence: this.knownDomains[parentDomain].confidence * 0.9,
                        source: 'parent-domain',
                        domain
                    };
                    
                    // Learn this subdomain for future
                    this.knownDomains[domain] = classification;
                    this.saveKnownDomains();
                    
                    return classification;
                }
            }
            
            // 3. ENHANCED: Check if it's a first-party script
            if (this.isFirstPartyScript(scriptUrl)) {
                // Check if it has clear tracking patterns
                if (this.hasTrackingPattern(scriptUrl)) {
                    console.log(`🎯 First-party tracking detected: ${scriptUrl.substring(0, 80)}...`);
                    return {
                        category: 'first-party-tracking',
                        company: 'Self',
                        confidence: 0.95,
                        tracking: true,
                        source: 'first-party-tracking-pattern',
                        domain
                    };
                } else {
                    // First-party without tracking patterns = necessary
                    return {
                        category: 'first-party',
                        company: 'Self',
                        confidence: 0.9,
                        tracking: false,
                        source: 'first-party-necessary',
                        domain
                    };
                }
            }
            
            // 4. Apply learned patterns for third-party scripts
            let classification = this.applyPatterns(scriptUrl, domain, pathname);
            
            // 5. If still unknown, record it for future learning
            if (classification.category === 'unknown' || classification.confidence < 0.5) {
                await this.recordUnknownScript(scriptUrl, domain);
            }
            
            // 6. If confident enough, add to known domains
            if (classification.confidence >= 0.7 && classification.category !== 'unknown') {
                this.knownDomains[domain] = {
                    category: classification.category,
                    company: classification.company,
                    confidence: classification.confidence,
                    tracking: classification.tracking,
                    learned: true,
                    firstSeen: new Date().toISOString()
                };
                this.saveKnownDomains();
            }
            
            return classification;
            
        } catch (error) {
            // Inline script or malformed URL
            return {
                category: 'inline',
                company: 'Self',
                confidence: 1.0,
                tracking: false,
                source: 'inline'
            };
        }
    }

    applyPatterns(scriptUrl, domain, pathname) {
        let bestMatch = {
            category: 'unknown',
            company: 'Unknown',
            confidence: 0,
            tracking: false,
            source: 'pattern-analysis'
        };
        
        // Check tracking patterns
        for (const pattern of this.learningPatterns.trackingPatterns) {
            if (pattern.pattern.test(scriptUrl)) {
                if (pattern.confidence > bestMatch.confidence) {
                    bestMatch = {
                        category: pattern.category,
                        company: this.guessCompany(domain),
                        confidence: pattern.confidence,
                        tracking: true,
                        source: 'tracking-pattern'
                    };
                }
            }
        }
        
        // Check necessary patterns
        for (const pattern of this.learningPatterns.necessaryPatterns) {
            if (pattern.pattern.test(scriptUrl)) {
                if (pattern.confidence > bestMatch.confidence) {
                    bestMatch = {
                        category: pattern.category,
                        company: this.guessCompany(domain),
                        confidence: pattern.confidence,
                        tracking: false,
                        source: 'necessary-pattern'
                    };
                }
            }
        }
        
        // Domain-based heuristics
        if (bestMatch.confidence < 0.5) {
            if (domain.includes('cdn') || domain.includes('static')) {
                bestMatch = {
                    category: 'cdn',
                    company: this.guessCompany(domain),
                    confidence: 0.6,
                    tracking: false,
                    source: 'domain-heuristic'
                };
            } else if (domain.includes('api')) {
                bestMatch = {
                    category: 'api',
                    company: this.guessCompany(domain),
                    confidence: 0.6,
                    tracking: false,
                    source: 'domain-heuristic'
                };
            }
        }
        
        return bestMatch;
    }

    guessCompany(domain) {
        for (const pattern of this.learningPatterns.companyPatterns) {
            if (pattern.pattern.test(domain)) {
                return pattern.company;
            }
        }
        
        // Use second-level domain as company guess
        const parts = domain.split('.');
        if (parts.length >= 2) {
            const name = parts[parts.length - 2];
            return name.charAt(0).toUpperCase() + name.slice(1);
        }
        
        return 'Unknown';
    }

    async recordUnknownScript(scriptUrl, domain) {
        // Don't record first-party scripts as unknown
        if (this.isFirstPartyScript(scriptUrl)) {
            return;
        }
        
        if (!this.unknownScripts[domain]) {
            this.unknownScripts[domain] = {
                firstSeen: new Date().toISOString(),
                lastSeen: new Date().toISOString(),
                occurrences: 0,
                examples: [],
                contexts: []
            };
        }
        
        this.unknownScripts[domain].occurrences++;
        this.unknownScripts[domain].lastSeen = new Date().toISOString();
        
        if (!this.unknownScripts[domain].examples.includes(scriptUrl)) {
            this.unknownScripts[domain].examples.push(scriptUrl);
        }
        
        // After 5+ occurrences, try to auto-classify
        if (this.unknownScripts[domain].occurrences >= 5) {
            await this.attemptAutoClassification(domain);
        }
        
        await this.saveUnknownScripts();
    }

    async attemptAutoClassification(domain) {
        const data = this.unknownScripts[domain];
        if (!data || !data.examples) {
    return;
}        
        // Analyze all example URLs for patterns
        let trackingSignals = 0;
        let necessarySignals = 0;
        
        data.examples.forEach(url => {
            if (/track|analytics|pixel|collect|metrics|telemetry|beacon|gtag|gtm/i.test(url)) trackingSignals++;
            if (/jquery|bootstrap|polyfill|api|static|assets|clientlibs/i.test(url)) necessarySignals++;
        });
        
        // If clear pattern emerges, auto-classify
        if (trackingSignals > necessarySignals && trackingSignals >= 3) {
            this.pendingClassification[domain] = {
                category: 'analytics',
                company: this.guessCompany(domain),
                confidence: 0.75,
                tracking: true,
                autoClassified: true,
                reason: `Tracking patterns found in ${trackingSignals} URLs`
            };
            
            console.log(`🤖 Auto-classified ${domain} as tracking (${trackingSignals} signals)`);
            
            // Move to known domains
            this.knownDomains[domain] = this.pendingClassification[domain];
            delete this.unknownScripts[domain];
            
            await this.saveKnownDomains();
            await this.saveUnknownScripts();
        } else if (necessarySignals > trackingSignals && necessarySignals >= 3) {
            this.pendingClassification[domain] = {
                category: 'library',
                company: this.guessCompany(domain),
                confidence: 0.75,
                tracking: false,
                autoClassified: true,
                reason: `Necessary patterns found in ${necessarySignals} URLs`
            };
            
            console.log(`🤖 Auto-classified ${domain} as necessary (${necessarySignals} signals)`);
            
            // Move to known domains
            this.knownDomains[domain] = this.pendingClassification[domain];
            delete this.unknownScripts[domain];
            
            await this.saveKnownDomains();
            await this.saveUnknownScripts();
        }
    }

    async runAutoClassification() {
        // Periodically review unknown scripts and try to classify them
        const unknownDomains = Object.keys(this.unknownScripts);
        
        if (unknownDomains.length === 0) return;
        
        console.log(`🔬 Analyzing ${unknownDomains.length} unknown domains...`);
        
        // Filter out first-party domains before auto-classification
        const thirdPartyUnknowns = unknownDomains.filter(domain => {
            // Can't check if first-party without current domain, so keep all for now
            return true;
        });
        
        for (const domain of thirdPartyUnknowns) {
            await this.attemptAutoClassification(domain);
        }
    }

    // Integration method for the crawler - ENHANCED
    async analyzeScripts(scripts, pageUrl) {
        // Set current page domain for first-party detection
        if (pageUrl) {
            this.setCurrentPageDomain(pageUrl);
        }
        
        const results = {
            tracking: 0,
            necessary: 0,
            unknown: 0,
            trackingDetails: [],
            necessaryDetails: [],
            unknownDetails: [],
            statistics: {
                total: scripts.length,
                classified: 0,
                learned: 0,
                firstParty: 0,
                thirdParty: 0
            }
        };

        for (const scriptUrl of scripts) {
            const classification = await this.classifyScript(scriptUrl);
            
            const scriptInfo = {
                url: scriptUrl,
                ...classification
            };
            
            // Track first-party vs third-party
            if (classification.source === 'first-party-necessary' || 
                classification.source === 'first-party-tracking-pattern' ||
                classification.category === 'first-party' ||
                classification.category === 'first-party-tracking') {
                results.statistics.firstParty++;
            } else if (scriptUrl !== '[inline]') {
                results.statistics.thirdParty++;
            }
            
            if (classification.category === 'unknown') {
                results.unknown++;
                results.unknownDetails.push(scriptUrl);
            } else if (classification.tracking) {
                results.tracking++;
                results.trackingDetails.push(scriptUrl);
                results.statistics.classified++;
            } else {
                results.necessary++;
                results.necessaryDetails.push(scriptUrl);
                results.statistics.classified++;
            }
            
            if (classification.learned) {
                results.statistics.learned++;
            }
        }

        // Calculate improvement
        results.statistics.unknownRate = ((results.unknown / scripts.length) * 100).toFixed(1);
        results.statistics.classificationRate = ((results.statistics.classified / scripts.length) * 100).toFixed(1);
        
        if (results.statistics.learned > 0) {
            console.log(`   🧠 Learned ${results.statistics.learned} new patterns this session`);
        }
        
        if (results.statistics.firstParty > 0) {
            console.log(`   🏠 First-party scripts: ${results.statistics.firstParty} (automatically classified)`);
        }
        
        return results;
    }

    // Get learning report
    async getLearningReport() {
        const report = {
            knownDomains: Object.keys(this.knownDomains).length,
            unknownDomains: Object.keys(this.unknownScripts).length,
            pendingClassifications: Object.keys(this.pendingClassification).length,
            topUnknowns: [],
            recentlyLearned: []
        };
        
        // Filter out likely first-party domains from unknowns
        const thirdPartyUnknowns = Object.entries(this.unknownScripts)
            .filter(([domain, data]) => {
                // Exclude common first-party patterns
                return !domain.includes('www.bmw') && 
                       !domain.includes('www.dell') && 
                       !domain.includes('www.microsoft');
            });
        
        // Top unknowns by occurrence (excluding likely first-party)
        report.topUnknowns = thirdPartyUnknowns
            .sort((a, b) => b[1].occurrences - a[1].occurrences)
            .slice(0, 10)
            .map(([domain, data]) => ({
                domain,
                occurrences: data.occurrences,
                firstSeen: data.firstSeen
            }));
        
        // Recently learned domains
        report.recentlyLearned = Object.entries(this.knownDomains)
            .filter(([_, data]) => data.learned)
            .sort((a, b) => new Date(b[1].firstSeen || 0) - new Date(a[1].firstSeen || 0))
            .slice(0, 10)
            .map(([domain, data]) => ({
                domain,
                category: data.category,
                confidence: data.confidence
            }));
        
        return report;
    }

    // Save methods
    async saveKnownDomains() {
        try {
            await fs.writeFile(this.knownDomainsFile, JSON.stringify(this.knownDomains, null, 2));
        } catch (error) {
            console.error('Failed to save known domains:', error.message);
        }
    }

    async saveUnknownScripts() {
        try {
            await fs.writeFile(this.unknownScriptsFile, JSON.stringify(this.unknownScripts, null, 2));
        } catch (error) {
            console.error('Failed to save unknown scripts:', error.message);
        }
    }

    async saveLearningPatterns() {
        try {
            // Convert RegExp to strings for JSON
            const serializable = JSON.parse(JSON.stringify(this.learningPatterns, (key, value) => {
                if (value instanceof RegExp) {
                    return value.toString();
                }
                return value;
            }));
            
            await fs.writeFile(this.learningPatternsFile, JSON.stringify(serializable, null, 2));
        } catch (error) {
            console.error('Failed to save learning patterns:', error.message);
        }
    }
}

module.exports = IntelligentScriptClassifier;