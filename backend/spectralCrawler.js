// backend/spectralCrawler.js - OneTrust Only Version
// Optimized for production: OneTrust support with multi-language EU compliance

'use strict';

const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');
const { inferCookiesFromNetwork, categorizeUnknownCookie, getETLD } = require('./cookieIntelligence');
const learningSystem = require('./cookieLearning');

// EU MULTI-LANGUAGE DICTIONARY
const EU_CONSENT_TEXTS = {
    reject: [
        // English
        'Reject', 'Decline', 'Reject all', 'Decline all', 'Required only', 'Necessary only', 'Essential only',
        // German
        'Ablehnen', 'Alle ablehnen', 'Nur erforderliche', 'Nur notwendige', 'Nur Erforderliche',
        // French
        'Refuser', 'Tout refuser', 'Rejeter', 'Uniquement nécessaires', 'Refuser tout',
        // Spanish
        'Rechazar', 'Rechazar todo', 'Solo necesarias', 'Solo esenciales', 'Rechazar todas',
        // Italian
        'Rifiuta', 'Rifiuta tutto', 'Solo necessari', 'Solo essenziali', 'Rifiuta tutti',
        // Dutch
        'Weigeren', 'Alles weigeren', 'Alleen noodzakelijke', 'Weiger alles',
        // Polish
        'Odrzuć', 'Odrzuć wszystkie', 'Tylko niezbędne',
        // Swedish
        'Avvisa', 'Avvisa alla', 'Endast nödvändiga', 'Neka alla',
        // Portuguese
        'Rejeitar', 'Rejeitar tudo', 'Apenas necessários', 'Rejeitar todos'
    ],
    accept: [
        // English
        'Accept', 'Accept all', 'Agree', 'I agree', 'Allow all', 'Accept All', 'Allow All',
        // German
        'Akzeptieren', 'Alle akzeptieren', 'Zustimmen', 'Einverstanden', 'Alle Akzeptieren',
        // French
        'Accepter', 'Tout accepter', 'J\'accepte', 'Autoriser', 'Accepter tout',
        // Spanish
        'Aceptar', 'Aceptar todo', 'Acepto', 'Permitir todo', 'Aceptar todas',
        // Italian
        'Accetta', 'Accetta tutto', 'Accetto', 'Consenti tutto', 'Accetta tutti',
        // Dutch
        'Accepteren', 'Alles accepteren', 'Akkoord', 'Accepteer alles',
        // Polish
        'Zaakceptuj', 'Zaakceptuj wszystkie', 'Zgadzam się',
        // Swedish
        'Acceptera', 'Acceptera alla', 'Godkänn', 'Tillåt alla',
        // Portuguese
        'Aceitar', 'Aceitar tudo', 'Concordo', 'Aceitar todos'
    ]
};

// Core Functions
function ts() {
    return new Date().toISOString();
}

function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

function parseUrl(url) {
    try {
        const u = new URL(url);
        return {
            hostname: u.hostname,
            origin: u.origin,
            protocol: u.protocol,
            pathname: u.pathname
        };
    } catch(e) {
        console.error('[spectralCrawler] Invalid URL:', url);
        return null;
    }
}

// Technical 1P/3P detection (based on domain only)
function isTechnicallyFirstParty(cookieDomain, pageHostname) {
    if (!cookieDomain || !pageHostname) return true;
    
    let cleanCookie = cookieDomain.toLowerCase().replace(/^\./, '');
    let cleanPage = pageHostname.toLowerCase().replace(/^www\./, '');
    
    // Localhost is always 1P
    if (cleanCookie === 'localhost' || cleanCookie.includes('127.0.0.1')) {
        return true;
    }
    
    const cookieBase = getETLD(cleanCookie);
    const pageBase = getETLD(cleanPage);
    
    // Same base domain = technically 1P
    return cookieBase === pageBase;
}

// Cookie inference handled by cookieIntelligence.js
function inferThirdPartyCookies(requests, pageHostname, stageName) {
    return inferCookiesFromNetwork(requests, pageHostname, stageName);
}

// GDPR categorization with ENHANCED intelligence
function categorizeGDPR(cookieName, cookieDomain, cookieValue) {
    const n = cookieName.toLowerCase();
    const d = (cookieDomain || '').toLowerCase();
    
    // CMP/Consent cookies = necessary
    if (d.includes('onetrust') || d.includes('cookielaw') || d.includes('privacyportal') ||
        n.includes('optanon') || n.includes('onetrust') || n.includes('euconsent') ||
        n.includes('cookie_consent') || n.includes('gdpr')) {
        return 'necessary';
    }
    
    // Security = necessary
    if (n.includes('_abck') || n.includes('bm_sz') || n.includes('ak_bmsc') ||
        n.includes('__cf_bm') || n.includes('awsalb') || n.includes('csrf') ||
        n.includes('xsrf') || n.includes('session') || n.includes('auth')) {
        return 'necessary';
    }
    
    // Akamai Bot Manager = necessary
    if (n.startsWith('bm_') || n.startsWith('ak')) {
        return 'necessary';
    }
    
    // Analytics - EXPANDIDO
    if (n.startsWith('_ga') || n.startsWith('_gid') || n.startsWith('_gat') ||
        n.includes('_hj') || n.includes('_clck') || n.includes('mbox') ||
        n.includes('s_vi') || n.includes('s_cc') || n.includes('amcv') ||
        n.includes('bc_') || n.includes('qsi_') || n.includes('dell') ||
        n === 'uuid' || n === 'txuid') {
        return 'analytics';
    }
    
    // Adobe Analytics patterns
    if (n.startsWith('s_') && n.length <= 10) {
        return 'analytics';
    }
    
    // Marketing
    if (n.includes('_fbp') || n.includes('_fbc') || n.includes('ide') ||
        n.includes('_gcl') || n.includes('__gads') || n.includes('_uets') ||
        n.includes('_tt') || n.includes('li_') || n.includes('bcookie')) {
        return 'marketing';
    }
    
    // Functional
    if (n.includes('lang') || n.includes('locale') || n.includes('theme') ||
        n.includes('preference') || n.includes('settings')) {
        return 'functional';
    }
    
    // Learning system
    const learned = learningSystem.predict(cookieName, cookieDomain, cookieValue);
    if (learned && learned.confidence > 0.6) {
        console.log(`[Learning] Applied: ${cookieName} -> ${learned.category} (${learned.reason})`);
        return learned.category;
    }
    
    // Intelligent categorization
    const smart = categorizeUnknownCookie(cookieName, cookieDomain, cookieValue);
    if (smart.confidence > 0.5) {
        console.log(`[Intelligence] Applied: ${cookieName} -> ${smart.category} (${smart.reason})`);
        return smart.category;
    }
    
    return 'unknown';
}

// Bucket cookies into categories with proper 3P detection
function bucketCookiesWithInference(realCookies, inferredCookies, pageHostname) {
    const tracking = [];
    const consent = [];
    const unknown = [];
    const all = [];
    
    const gdprCounts = {
        necessary: 0,
        functional: 0,
        analytics: 0,
        marketing: 0,
        unknown: 0
    };
    
    let firstPartyCount = 0;
    let thirdPartyCount = 0;
    let inferredCount = 0;
    
    // Process real cookies
    for (const c of realCookies) {
        if (!c || typeof c !== 'object' || !c.name) continue;
        
        const gdprCategory = categorizeGDPR(c.name, c.domain, c.value);
        gdprCounts[gdprCategory]++;
        
        // Check if technically 1P
        const isTechnically1P = isTechnicallyFirstParty(c.domain, pageHostname);
        
        // Check if functionally 3P (GA, FB, etc even on dell.com)
        const isFunctionally3P = (
            c.name.startsWith('_ga') ||
            c.name.startsWith('_gid') ||
            c.name.startsWith('_fbp') ||
            c.name.startsWith('_tt') ||
            c.name === 'IDE'
        );
        
        // For counting: functionally 3P counts as 3P
        if (isTechnically1P && !isFunctionally3P) {
            firstPartyCount++;
        } else {
            thirdPartyCount++;
        }
        
        const cookieData = {
            name: c.name,
            value: c.value,
            domain: c.domain,
            path: c.path,
            expires: c.expires,
            httpOnly: c.httpOnly,
            secure: c.secure,
            sameSite: c.sameSite,
            session: c.session,
            size: c.size || (c.name.length + (c.value ? c.value.length : 0)),
            gdprCategory: gdprCategory,
            isFirstParty: isTechnically1P && !isFunctionally3P,
            functionally3P: isFunctionally3P,
            isInferred: false
        };
        
        all.push(cookieData);
        
        // Bucket by GDPR category
        if (gdprCategory === 'analytics' || gdprCategory === 'marketing') {
            tracking.push(cookieData);
        } else if (gdprCategory === 'necessary' && c.name.toLowerCase().includes('consent')) {
            consent.push(cookieData);
        } else {
            unknown.push(cookieData);
        }
    }
    
    // Add inferred cookies
    const seenCookies = new Set();
    for (const c of all) {
        seenCookies.add(`${c.name}-${c.domain}`);
    }
    
    for (const c of inferredCookies) {
        const key = `${c.name}-${c.domain}`;
        if (!seenCookies.has(key)) {
            gdprCounts[c.gdprCategory]++;
            
            // Inferred cookies count based on their nature
            if (!c.isFirstParty || c.functionally3P) {
                thirdPartyCount++;
            } else {
                firstPartyCount++;
            }
            
            inferredCount++;
            all.push(c);
            
            // Bucket by category
            if (c.gdprCategory === 'analytics' || c.gdprCategory === 'marketing') {
                tracking.push(c);
            } else if (c.gdprCategory === 'necessary') {
                consent.push(c);
            } else {
                unknown.push(c);
            }
            
            seenCookies.add(key);
        }
    }
    
    console.log(`[spectralCrawler] Cookie bucketing: Total=${all.length} (Real=${realCookies.length} Inferred=${inferredCount})`);
    console.log(`[spectralCrawler] Breakdown: T=${tracking.length} C=${consent.length} U=${unknown.length}`);
    console.log(`[spectralCrawler] GDPR Categories: N=${gdprCounts.necessary} F=${gdprCounts.functional} A=${gdprCounts.analytics} M=${gdprCounts.marketing} U=${gdprCounts.unknown}`);
    console.log(`[spectralCrawler] Cookie Parties: 1P=${firstPartyCount} 3P=${thirdPartyCount}`);
    
    return {
        tracking: tracking.length,
        consent: consent.length,
        unknown: unknown.length,
        all,
        gdprCategories: gdprCounts,
        firstParty: firstPartyCount,
        thirdParty: thirdPartyCount,
        inferredCount: inferredCount
    };
}

// Network Evidence Collection
function collectNetworkEvidence(requests, realCookies, pageHostname, stageName) {
    const trackingHits = [];
    const allRequests = [];
    const endpoints = new Set();
    const thirdPartyHosts = new Set();
    
    for (const req of requests) {
        const url = req.url;
        const host = new URL(url).hostname;
        
        allRequests.push({
            url,
            method: req.method,
            resourceType: req.resourceType,
            timestamp: req.timestamp
        });
        
        endpoints.add(host);
        
        // Comprehensive tracking patterns
        const trackingPatterns = [
            // Analytics
            'google-analytics', 'googletagmanager', 'google.com/tag', 'google.com/gen_204',
            'clarity.ms', 'hotjar', 'mixpanel', 'segment', 'amplitude',
            'adobe', 'omtrdc', 'demdex',
            'brightcove', 'brightcovecdn', 'boltdns',
            'qualtrics', 'siteintercept',
            'bazaarvoice', 'trustpilot',
            // Advertising
            'doubleclick', 'googlesyndication', 'googleadservices',
            'facebook', 'connect.facebook', 'fbcdn',
            'tiktok', 'snapchat', 'pinterest', 'linkedin', 'twitter',
            'adsrvr', 'adnxs', 'criteo', 'amazon-adsystem',
            'tribalfusion', 'exponential',
            // Performance/Monitoring
            'appdynamics', 'newrelic', 'datadog',
            // Generic tracking patterns
            '/pixel', '/beacon', '/collect', '/track', '/analytics', '/metrics', '/telemetry'
        ];
        
        // Exclude CMPs
        const cmpPatterns = ['onetrust', 'cookielaw', 'privacyportal'];
        
        const isTracking = trackingPatterns.some(pattern => url.toLowerCase().includes(pattern)) &&
                           !cmpPatterns.some(pattern => url.toLowerCase().includes(pattern));
        
        if (isTracking) {
            trackingHits.push({
                url,
                type: 'tracking',
                timestamp: req.timestamp
            });
            
            const domainBase = getETLD(host);
            const pageBase = getETLD(pageHostname);
            
            if (domainBase !== pageBase) {
                thirdPartyHosts.add(host);
            }
            
            console.log(`[spectralCrawler] Tracking hit detected: ${host}`);
        }
    }
    
    // Infer cookies for this stage
    const inferredCookies = inferThirdPartyCookies(requests, pageHostname, stageName);
    
    // Combine and bucket
    const cookieBreakdown = bucketCookiesWithInference(realCookies, inferredCookies, pageHostname);
    
    return {
        requests: allRequests,
        trackingHits,
        endpoints: Array.from(endpoints),
        thirdPartyHosts: Array.from(thirdPartyHosts),
        cookieBreakdown,
        statistics: {
            totalRequests: allRequests.length,
            trackingRequests: trackingHits.length,
            uniqueEndpoints: endpoints.size,
            thirdPartyCount: thirdPartyHosts.size
        }
    };
}

// Script Analysis
function analyzeScripts(scripts) {
    const thirdParty = [];
    const firstParty = [];
    const inline = [];
    
    for (const script of scripts) {
        if (script.inline) {
            inline.push(script);
        } else if (script.thirdParty) {
            thirdParty.push(script);
        } else {
            firstParty.push(script);
        }
    }
    
    return {
        scripts,
        statistics: {
            total: scripts.length,
            thirdParty: thirdParty.length,
            firstParty: firstParty.length,
            inline: inline.length
        }
    };
}

// CMP State Extraction with OptanonConsent parsing
function extractCmpState(cookies) {
    const state = {
        optanonConsent: '',
        optanonActiveGroups: '',
        onetrustGroupsUpdated: '',
        eupubconsent: '',
        tcString: '',
        // Parsed groups from OptanonConsent
        parsedGroups: {
            C0001: false, // Strictly Necessary
            C0002: false, // Performance
            C0003: false, // Functional
            C0004: false, // Targeting
            C0005: false  // Social Media
        }
    };
    
    for (const c of cookies) {
        const name = c.name.toLowerCase();
        const value = c.value || '';
        
        if (name === 'optanonconsent') {
            state.optanonConsent = value;
            
            // Parse OptanonConsent value for groups
            try {
                if (value.includes('groups=')) {
                    const groupsMatch = value.match(/groups=([^&]+)/);
                    if (groupsMatch) {
                        const groupsValue = decodeURIComponent(groupsMatch[1]);
                        // Parse format: C0001:1,C0002:0,C0003:1,C0004:0
                        const groupPairs = groupsValue.split(',');
                        for (const pair of groupPairs) {
                            const [groupId, enabled] = pair.split(':');
                            if (state.parsedGroups.hasOwnProperty(groupId)) {
                                state.parsedGroups[groupId] = enabled === '1';
                            }
                        }
                        console.log(`[spectralCrawler] Parsed OptanonConsent groups:`, state.parsedGroups);
                    }
                }
            } catch(e) {
                console.log('[spectralCrawler] Error parsing OptanonConsent:', e.message);
            }
        } else if (name === 'optanonalertboxclosed' || name === 'optanonactivegroups') {
            state.optanonActiveGroups = value;
        } else if (name === 'onetrustgroupsupdated') {
            state.onetrustGroupsUpdated = value;
        } else if (name.includes('eupubconsent')) {
            state.eupubconsent = value;
        } else if (name.includes('tcstring')) {
            state.tcString = value;
        }
    }
    
    return state;
}

// Close modals (region, language, etc.)
async function closeModals(page) {
    try {
        await page.evaluate(() => {
            // Close common modal patterns
            const closeSelectors = [
                '[aria-label*="Close"]',
                '[aria-label*="Schließen"]',
                '[aria-label*="Fermer"]',
                '.modal-close',
                '.close-button',
                'button.close'
            ];
            
            closeSelectors.forEach(sel => {
                const elements = document.querySelectorAll(sel);
                elements.forEach(el => el.click());
            });
            
            // Click cancel/abort buttons
            const buttons = document.querySelectorAll('button');
            for (const btn of buttons) {
                const text = btn.textContent?.toLowerCase() || '';
                if (text.includes('abbrechen') || text.includes('cancel') ||
                    text.includes('close') || text.includes('fermer')) {
                    btn.click();
                    break;
                }
            }
        });
    } catch(e) {
        // Ignore errors
    }
}

// OneTrust-Only Banner Detection
async function detectBanner(page) {
    console.log('[spectralCrawler] Detecting banner...');
    
    // Close any modals first
    await closeModals(page);
    await sleep(500);
    
    // Check for OneTrust API
    const hasOneTrust = await page.evaluate(() => {
        return !!(window.OneTrust || window.Optanon);
    });
    
    console.log(`[spectralCrawler] OneTrust API detected: ${hasOneTrust}`);
    
    // OneTrust banner detection
    const onetrustSelectors = [
        '#onetrust-banner-sdk',
        '#onetrust-consent-sdk',
        '.onetrust-pc-dark-filter',
        '#ot-sdk-container'
    ];
    
    for (const sel of onetrustSelectors) {
        try {
            const el = await page.$(sel);
            if (el) {
                const visible = await el.isIntersectingViewport();
                if (visible) {
                    console.log(`[spectralCrawler] OneTrust banner detected: ${sel}`);
                    
                    // Analyze OneTrust banner for dark patterns
                    const bannerDOMAnalysis = await page.evaluate(() => {
                        const accept = document.querySelector('#onetrust-accept-btn-handler');
                        const reject = document.querySelector('#onetrust-reject-all-handler');
                        const settings = document.querySelector('#onetrust-pc-btn-handler');
                        
                        if (!accept) return null;
                        
                        const analysis = {
                            acceptButton: {
                                exists: !!accept,
                                text: accept?.textContent?.trim(),
                                backgroundColor: accept ? getComputedStyle(accept).backgroundColor : null,
                                color: accept ? getComputedStyle(accept).color : null,
                                width: accept?.offsetWidth,
                                height: accept?.offsetHeight
                            },
                            rejectButton: {
                                exists: !!reject,
                                visible: reject ? reject.offsetParent !== null : false,
                                text: reject?.textContent?.trim(),
                                backgroundColor: reject ? getComputedStyle(reject).backgroundColor : null,
                                color: reject ? getComputedStyle(reject).color : null,
                                width: reject?.offsetWidth,
                                height: reject?.offsetHeight
                            },
                            settingsButton: {
                                exists: !!settings,
                                visible: settings ? settings.offsetParent !== null : false
                            }
                        };
                        
                        return analysis;
                    });
                    
                    return {
                        detected: true,
                        selector: sel,
                        provider: 'OneTrust',
                        domAnalysis: bannerDOMAnalysis
                    };
                }
            }
        } catch(e) {
            // Ignore errors
        }
    }
    
    // Check for other CMPs
    const otherCMPs = await page.evaluate(() => {
        const detected = [];
        if (window.__tcfapi || window.__cmp) detected.push('Quantcast/TCF');
        if (window.Cookiebot || window.CookieConsent) detected.push('Cookiebot');
        if (window.truste || window.TrustArc) detected.push('TrustArc');
        if (window.UC_UI || window.usercentrics) detected.push('Usercentrics');
        if (window.Didomi) detected.push('Didomi');
        return detected;
    });
    
    if (otherCMPs.length > 0) {
        console.log(`[spectralCrawler] ⚠️  Unsupported CMP detected: ${otherCMPs.join(', ')}`);
        console.log('[spectralCrawler] Spectral currently supports OneTrust only. Results may be inaccurate.');
        return {
            detected: false,
            provider: 'Unsupported',
            unsupportedCMP: otherCMPs[0],
            message: `CMP not supported: ${otherCMPs[0]}. Spectral currently supports OneTrust only. Analysis results may be inaccurate.`
        };
    }
    
    // No CMP detected
    console.log('[spectralCrawler] No CMP detected');
    return {
        detected: false,
        provider: 'None',
        message: 'No consent management platform detected. Analysis results may be inaccurate.'
    };
}

// OneTrust-Only Reject Cookies
async function rejectCookies(page, provider) {
    console.log(`[spectralCrawler] Attempting to reject cookies (${provider})...`);
    
    if (provider !== 'OneTrust') {
        console.log(`[spectralCrawler] ⚠️  Cannot reject: ${provider} not supported`);
        return false;
    }
    
    // Close modals first
    await closeModals(page);
    await sleep(500);
    
    // Try multi-language text-based rejection
    for (const rejectText of EU_CONSENT_TEXTS.reject) {
        try {
            const clicked = await page.evaluate((text) => {
                const elements = document.querySelectorAll('button, a[role="button"], div[role="button"], span[role="button"]');
                for (const el of elements) {
                    if (el.textContent && el.textContent.includes(text)) {
                        el.click();
                        return true;
                    }
                }
                return false;
            }, rejectText);
            
            if (clicked) {
                console.log(`[spectralCrawler] ✓ Rejected via text: "${rejectText}"`);
                return true;
            }
        } catch(e) {
            // Continue
        }
    }
    
    // OneTrust-specific CSS selectors
    const rejectSelectors = [
        '#onetrust-reject-all-handler',
        '.ot-pc-refuse-all-handler',
        '.onetrust-close-btn-handler'
    ];
    
    for (const selector of rejectSelectors) {
        try {
            await page.click(selector, { timeout: 1000 });
            console.log(`[spectralCrawler] ✓ Rejected via selector: ${selector}`);
            return true;
        } catch(e) {
            // Try next
        }
    }
    
    console.log('[spectralCrawler] ✗ Could not find reject button');
    return false;
}

// OneTrust-Only Accept Cookies
async function acceptCookies(page, provider) {
    console.log(`[spectralCrawler] Attempting to accept cookies (${provider})...`);
    
    if (provider !== 'OneTrust') {
        console.log(`[spectralCrawler] ⚠️  Cannot accept: ${provider} not supported`);
        return false;
    }
    
    // Close modals first
    await closeModals(page);
    await sleep(500);
    
    // Try multi-language text-based acceptance
    for (const acceptText of EU_CONSENT_TEXTS.accept) {
        try {
            const clicked = await page.evaluate((text) => {
                const elements = document.querySelectorAll('button, a[role="button"], div[role="button"], span[role="button"]');
                for (const el of elements) {
                    if (el.textContent && el.textContent.includes(text)) {
                        el.click();
                        return true;
                    }
                }
                return false;
            }, acceptText);
            
            if (clicked) {
                console.log(`[spectralCrawler] ✓ Accepted via text: "${acceptText}"`);
                return true;
            }
        } catch(e) {
            // Continue
        }
    }
    
    // OneTrust-specific CSS selectors
    const acceptSelectors = [
        '#onetrust-accept-btn-handler',
        '.onetrust-accept-btn-handler'
    ];
    
    for (const selector of acceptSelectors) {
        try {
            await page.click(selector, { timeout: 1000 });
            console.log(`[spectralCrawler] ✓ Accepted via selector: ${selector}`);
            return true;
        } catch(e) {
            // Try next
        }
    }
    
    console.log('[spectralCrawler] ✗ Could not find accept button');
    return false;
}

// Stage Execution
async function executeStage(page, stageName, options = {}) {
    console.log(`\n[spectralCrawler] === Stage: ${stageName} ===`);
    
    const pageHostname = await page.evaluate(() => window.location.hostname);
    
    // Auto-scroll
    if (stageName === 'baseline' || stageName === 'accept') {
        console.log('[spectralCrawler] Auto-scrolling page...');
        try {
            await page.evaluate(() => {
                return new Promise((resolve) => {
                    let totalHeight = 0;
                    const distance = 100;
                    const timer = setInterval(() => {
                        const scrollHeight = document.documentElement.scrollHeight;
                        window.scrollBy(0, distance);
                        totalHeight += distance;
                        
                        if(totalHeight >= scrollHeight){
                            clearInterval(timer);
                            window.scrollTo(0, 0);
                            resolve();
                        }
                    }, 100);
                });
            });
        } catch(e) {
            console.log('[spectralCrawler] Scroll error:', e.message);
        }
    }
    
    const stage = {
        stage: stageName,
        timestamp: ts(),
        networkEvidence: null,
        scriptAnalysis: null,
        cmpState: null,
        bannerState: null,
        screenshot: null,
        storage: {
            localStorageKeys: [],
            sessionStorageKeys: [],
            localStorageSize: 0,
            sessionStorageSize: 0
        },
        googleConsentMode: null
    };
    
    // Collect requests
    const requests = [];
    const requestHandler = req => {
        requests.push({
            url: req.url(),
            method: req.method(),
            resourceType: req.resourceType(),
            timestamp: Date.now()
        });
    };
    
    page.on('request', requestHandler);
    
    // Execute action
    if (options.action === 'reject') {
        await rejectCookies(page, options.provider);
        await sleep(2000);
    } else if (options.action === 'accept') {
        await acceptCookies(page, options.provider);
        await sleep(2000);
    } else if (options.action === 'wait') {
        await sleep(3000);
    }
    
    page.off('request', requestHandler);
    
    // Collect cookies
    let realCookies = [];
    try {
        const client = await page.target().createCDPSession();
        await client.send('Network.enable');
        const { cookies: cdpCookies } = await client.send('Network.getAllCookies');
        realCookies = cdpCookies;
        console.log(`[spectralCrawler] CDP cookies retrieved: ${cdpCookies.length}`);
    } catch(e) {
        console.error('[spectralCrawler] CDP error, using page.cookies():', e.message);
        realCookies = await page.cookies();
    }
    
    realCookies = realCookies.filter(c => c && typeof c === 'object' && c.name);
    console.log(`[spectralCrawler] Valid real cookies: ${realCookies.length}`);
    
    // Collect scripts
    const scripts = await page.evaluate(() => {
        const scripts = [];
        document.querySelectorAll('script').forEach(s => {
            const src = s.src;
            const inline = !src;
            const thirdParty = src && !src.includes(window.location.hostname);
            
            scripts.push({
                src: src || null,
                inline,
                thirdParty,
                async: s.async,
                defer: s.defer
            });
        });
        return scripts;
    });
    
    // Collect Storage Data
    try {
        const storageData = await page.evaluate(() => {
            const ls = Object.keys(localStorage);
            const ss = Object.keys(sessionStorage);
            
            // Calculate sizes
            let lsSize = 0;
            let ssSize = 0;
            
            for (const key of ls) {
                const value = localStorage.getItem(key) || '';
                lsSize += key.length + value.length;
            }
            
            for (const key of ss) {
                const value = sessionStorage.getItem(key) || '';
                ssSize += key.length + value.length;
            }
            
            return {
                localStorageKeys: ls,
                sessionStorageKeys: ss,
                localStorageSize: lsSize,
                sessionStorageSize: ssSize
            };
        });
        
        stage.storage = storageData;
        console.log(`[spectralCrawler] Storage: LS=${storageData.localStorageKeys.length} keys (${storageData.localStorageSize} bytes), SS=${storageData.sessionStorageKeys.length} keys (${storageData.sessionStorageSize} bytes)`);
    } catch(e) {
        console.log('[spectralCrawler] Storage collection error:', e.message);
    }
    
    // Detect Google Consent Mode
    try {
        const googleConsent = await page.evaluate(() => {
            const consent = {
                hasGtag: typeof window.gtag === 'function',
                hasDataLayer: Array.isArray(window.dataLayer),
                consentUpdates: [],
                defaultConsent: null,
                consentState: null
            };
            
            if (window.dataLayer) {
                // Find consent updates in dataLayer
                consent.consentUpdates = window.dataLayer.filter(e => 
                    e && e[0] === 'consent' && (e[1] === 'update' || e[1] === 'default')
                );
                
                // Extract default consent
                const defaultCmd = window.dataLayer.find(e => 
                    e && e[0] === 'consent' && e[1] === 'default'
                );
                if (defaultCmd && defaultCmd[2]) {
                    consent.defaultConsent = defaultCmd[2];
                }
            }
            
            // Check Google tag manager consent state
            if (window.google_tag_data && window.google_tag_data.consent) {
                consent.consentState = window.google_tag_data.consent.state;
            }
            
            return consent;
        });
        
        stage.googleConsentMode = googleConsent;
        
        if (googleConsent.hasGtag || googleConsent.hasDataLayer) {
            console.log(`[spectralCrawler] Google Consent Mode detected: gtag=${googleConsent.hasGtag}, dataLayer=${googleConsent.hasDataLayer}, updates=${googleConsent.consentUpdates.length}`);
        }
    } catch(e) {
        console.log('[spectralCrawler] Google Consent Mode detection error:', e.message);
    }
    
    // Build stage data
    stage.networkEvidence = collectNetworkEvidence(requests, realCookies, pageHostname, stageName);
    stage.scriptAnalysis = analyzeScripts(scripts);
    stage.cmpState = extractCmpState(realCookies);
    stage.bannerState = await detectBanner(page);
    
    // Enhanced cookieBreakdown for norm.json compatibility
    stage.cookieBreakdown = stage.networkEvidence.cookieBreakdown;
    stage.trackingHits = stage.networkEvidence.trackingHits.length;
    stage.thirdPartyScripts = stage.scriptAnalysis.statistics.thirdParty;
    stage.cookies = stage.networkEvidence.cookieBreakdown.all.length;
    
    // ENSURE storage is at stage root level for norm.json
    stage.localStorageKeys = stage.storage.localStorageKeys;
    stage.sessionStorageKeys = stage.storage.sessionStorageKeys;
    
    // Screenshot
    if (options.screenshot !== false) {
        try {
            const screenshotDir = 'screenshots';
            if (!fs.existsSync(screenshotDir)) {
                fs.mkdirSync(screenshotDir, { recursive: true });
            }
            
            const screenshotPath = path.join(screenshotDir, `${stageName}-${Date.now()}.png`);
            await page.screenshot({ path: screenshotPath, fullPage: false });
            stage.screenshot = screenshotPath;
            console.log(`[spectralCrawler] Screenshot saved: ${screenshotPath}`);
        } catch(e) {
            console.log('[spectralCrawler] Screenshot failed:', e.message);
        }
    }
    
    // Summary output
    const breakdown = stage.networkEvidence.cookieBreakdown;
    console.log(`[spectralCrawler] Stage ${stageName} complete:
  - Requests: ${requests.length}
  - Tracking: ${stage.networkEvidence.trackingHits.length}
  - Cookies: ${breakdown.all.length} (T:${breakdown.tracking} C:${breakdown.consent} U:${breakdown.unknown})
  - GDPR: N:${breakdown.gdprCategories.necessary} F:${breakdown.gdprCategories.functional} A:${breakdown.gdprCategories.analytics} M:${breakdown.gdprCategories.marketing}
  - Parties: 1P:${breakdown.firstParty} 3P:${breakdown.thirdParty} (${breakdown.inferredCount} inferred)
  - Scripts: ${scripts.length} (3P:${stage.scriptAnalysis.statistics.thirdParty})
  - Storage: LS=${stage.storage.localStorageKeys.length} SS=${stage.storage.sessionStorageKeys.length}
  - CMP State: ${stage.cmpState.optanonConsent ? 'Set' : 'Empty'}`);
    
    return stage;
}

// Main Crawl Function
async function runCrawl(url) {
    console.log(`\n[spectralCrawler] Starting crawl: ${url}`);
    console.log(`[spectralCrawler] Timestamp: ${ts()}`);
    console.log(`[spectralCrawler] Mode: OneTrust-Only with Multi-Language EU Support`);
    
    if (!fs.existsSync('screenshots')) {
        fs.mkdirSync('screenshots');
    }
    
    const browser = await puppeteer.launch({
        headless: process.env.HEADLESS !== 'false',
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-features=IsolateOrigins,site-per-process',
            '--lang=de-DE',
            '--window-size=1920,1080'
        ]
    });
    
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    await page.setExtraHTTPHeaders({
        'Accept-Language': process.env.RAN_ACCEPT_LANGUAGE || 'de-DE,de;q=0.9,en-US;q=0.8,en;q=0.7'
    });
    
    const result = {
        url,
        siteHost: parseUrl(url)?.hostname,
        siteETLD: parseUrl(url)?.hostname?.split('.').slice(-2).join('.'),
        timestamp: ts(),
        meta: {
            ts: ts(),
            region: process.env.RAN_REGION || 'DE',
            tz: process.env.RAN_TZ || 'Europe/Berlin',
            detectionMode: 'ONETRUST_ONLY'
        },
        stages: [],
        bannerSummary: {
            initial: null,
            finalA: null,
            anyDetected: false
        }
    };
    
    try {
        // Stage 1: Baseline
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
        const baseline = await executeStage(page, 'baseline', { action: 'wait' });
        result.stages.push(baseline);
        result.bannerSummary.initial = baseline.bannerState;
        result.bannerSummary.anyDetected = baseline.bannerState.detected;
        
        // Stages 2-5: Only if OneTrust banner detected
        if (baseline.bannerState.detected && baseline.bannerState.provider === 'OneTrust') {
            const rejectPre = await executeStage(page, 'reject_pre', { action: 'wait' });
            result.stages.push(rejectPre);
            
            const reject = await executeStage(page, 'reject', {
                action: 'reject',
                provider: baseline.bannerState.provider
            });
            result.stages.push(reject);
            
            // Clear and reload
            await page.deleteCookie(...await page.cookies());
            await page.evaluate(() => {
                localStorage.clear();
                sessionStorage.clear();
            });
            
            await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
            
            const acceptPre = await executeStage(page, 'accept_pre', { action: 'wait' });
            result.stages.push(acceptPre);
            
            const accept = await executeStage(page, 'accept', {
                action: 'accept',
                provider: baseline.bannerState.provider
            });
            result.stages.push(accept);
            result.bannerSummary.finalA = accept.bannerState;
        } else {
            if (baseline.bannerState.provider === 'Unsupported') {
                console.log(`[spectralCrawler] ⚠️  ${baseline.bannerState.message}`);
            } else {
                console.log('[spectralCrawler] No OneTrust banner detected, skipping consent stages');
            }
        }
        
    } catch(error) {
        console.error('[spectralCrawler] Error during crawl:', error.message);
        result.error = error.message;
    } finally {
        await browser.close();
    }
    
    // Final summary
    console.log(`\n[spectralCrawler] ========== FINAL SUMMARY ==========`);
    let totalTrackingHits = 0;
    let total3PCookies = 0;
    let totalInferred = 0;
    
    for (const stage of result.stages) {
        if (stage.networkEvidence) {
            const hits = stage.networkEvidence.trackingHits.length;
            const cookies3P = stage.networkEvidence.cookieBreakdown.thirdParty;
            const inferred = stage.networkEvidence.cookieBreakdown.inferredCount;
            
            totalTrackingHits += hits;
            total3PCookies += cookies3P;
            totalInferred += inferred;
            
            console.log(`Stage ${stage.stage}: ${hits} tracking hits, ${cookies3P} 3P cookies (${inferred} inferred), LS=${stage.storage.localStorageKeys.length} SS=${stage.storage.sessionStorageKeys.length}`);
        }
    }
    
    console.log(`\nTOTALS:`);
    console.log(`- Tracking hits: ${totalTrackingHits}`);
    console.log(`- 3P cookies: ${total3PCookies} (${totalInferred} inferred)`);
    console.log(`- CMP: ${result.bannerSummary.anyDetected ? result.stages[0].bannerState.provider : 'None'}`);
    
    // Learning system
    if (result.stages.length > 0) {
        try {
            await learningSystem.learn(result, result.siteHost);
            const stats = learningSystem.getStats();
            console.log(`\n[Learning] Knowledge base: ${stats.totalPatterns} patterns from ${stats.totalDomains} domains`);
            
            // Show top patterns learned
            if (stats.topPatterns.length > 0) {
                console.log(`[Learning] Top learned patterns:`);
                stats.topPatterns.slice(0, 5).forEach(p => {
                    console.log(`  - ${p.cookie}: ${p.category} (${p.confidence} from ${p.basedOn} sites)`);
                });
            }
        } catch(e) {
            console.log(`[Learning] Error saving knowledge: ${e.message}`);
        }
    }
    
    console.log(`====================================\n`);
    
    return result;
}

module.exports = { runCrawl };