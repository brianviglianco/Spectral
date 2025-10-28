// backend/detectCMP.js - STEALTH VERSION
'use strict';

const puppeteer = require('puppeteer');

function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

async function detectCMP(url) {
    console.log(`\n[CMP Detector] Analyzing: ${url}`);
    console.log('[CMP Detector] Using stealth mode...\n');
    
    const browser = await puppeteer.launch({
        headless: false,  // Keep visible to see what happens
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-blink-features=AutomationControlled',  // Anti-detection
            '--disable-dev-shm-usage',
            '--disable-web-security',
            '--disable-features=IsolateOrigins,site-per-process',
            '--window-size=1920,1080',
            '--start-maximized',
            '--user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        ],
        defaultViewport: null  // Use full window
    });
    
    const page = await browser.newPage();
    
    // STEALTH: Remove webdriver flag
    await page.evaluateOnNewDocument(() => {
        Object.defineProperty(navigator, 'webdriver', {
            get: () => false,
        });
    });
    
    // STEALTH: Mock plugins
    await page.evaluateOnNewDocument(() => {
        Object.defineProperty(navigator, 'plugins', {
            get: () => [1, 2, 3, 4, 5],
        });
    });
    
    // STEALTH: Mock languages
    await page.evaluateOnNewDocument(() => {
        Object.defineProperty(navigator, 'languages', {
            get: () => ['de-DE', 'de', 'en-US', 'en'],
        });
    });
    
    // STEALTH: Override permissions
    await page.evaluateOnNewDocument(() => {
        const originalQuery = window.navigator.permissions.query;
        window.navigator.permissions.query = (parameters) => (
            parameters.name === 'notifications' ?
                Promise.resolve({ state: Notification.permission }) :
                originalQuery(parameters)
        );
    });
    
    // Real Mac user agent
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    // German location for GDPR
    await page.setExtraHTTPHeaders({
        'Accept-Language': 'de-DE,de;q=0.9,en-US;q=0.8,en;q=0.7',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
    });
    
    const detectedSignals = {
        network: new Set(),
        dom: new Set(),
        final: null
    };
    
    // Monitor network
    page.on('request', req => {
        const url = req.url().toLowerCase();
        
        // Check all known CMPs
        if (url.includes('cookielaw.org') || url.includes('onetrust')) detectedSignals.network.add('OneTrust');
        if (url.includes('cookiebot')) detectedSignals.network.add('Cookiebot');
        if (url.includes('trustarc') || url.includes('truste')) detectedSignals.network.add('TrustArc');
        if (url.includes('usercentrics')) detectedSignals.network.add('Usercentrics');
        if (url.includes('didomi')) detectedSignals.network.add('Didomi');
        if (url.includes('quantcast') || url.includes('qconsent')) detectedSignals.network.add('Quantcast');
        if (url.includes('termly')) detectedSignals.network.add('Termly');
        if (url.includes('osano')) detectedSignals.network.add('Osano');
        if (url.includes('cookiepro')) detectedSignals.network.add('CookiePro');
    });
    
    try {
        // Navigate with random delay to seem human
        await sleep(Math.random() * 2000 + 1000);
        
        await page.goto(url, { 
            waitUntil: 'domcontentloaded',  // Don't wait too long
            timeout: 30000 
        });
        
        // Random human-like wait
        await sleep(Math.random() * 2000 + 3000);
        
        // Quick check for CMP
        const quickCheck = await page.evaluate(() => {
            const cmps = [];
            
            // Check common global objects
            if (window.OneTrust || window.Optanon) cmps.push('OneTrust');
            if (window.Cookiebot || window.CookieConsent) cmps.push('Cookiebot');
            if (window.truste || window.TrustArc) cmps.push('TrustArc');
            if (window.UC_UI || window.usercentrics) cmps.push('Usercentrics');
            if (window.Didomi) cmps.push('Didomi');
            if (window.__tcfapi) cmps.push('TCF/Quantcast');
            if (window.termly) cmps.push('Termly');
            if (window.Osano) cmps.push('Osano');
            
            // Check for visible banners
            const selectors = [
                '#onetrust-banner-sdk',
                '#CybotCookiebotDialog',
                '#truste-consent-track',
                '#usercentrics-root',
                '#didomi-popup',
                '.qc-cmp2-container',
                '.termly-consent-banner',
                '.osano-cm-window'
            ];
            
            for (const sel of selectors) {
                if (document.querySelector(sel)) {
                    if (sel.includes('onetrust')) cmps.push('OneTrust');
                    if (sel.includes('Cybot')) cmps.push('Cookiebot');
                    if (sel.includes('truste')) cmps.push('TrustArc');
                    if (sel.includes('usercentrics')) cmps.push('Usercentrics');
                    if (sel.includes('didomi')) cmps.push('Didomi');
                    if (sel.includes('qc-')) cmps.push('Quantcast');
                    if (sel.includes('termly')) cmps.push('Termly');
                    if (sel.includes('osano')) cmps.push('Osano');
                }
            }
            
            return [...new Set(cmps)];
        });
        
        quickCheck.forEach(cmp => detectedSignals.dom.add(cmp));
        
    } catch (error) {
        console.log('[CMP Detector] Error during detection:', error.message);
    }
    
    // Compile results
    const allDetected = new Set([...detectedSignals.network, ...detectedSignals.dom]);
    
    console.log('====== CMP DETECTION RESULTS ======\n');
    console.log(`URL: ${url}`);
    console.log(`Detected: ${allDetected.size > 0 ? [...allDetected].join(', ') : 'NONE'}\n`);
    
    if (allDetected.size === 1) {
        detectedSignals.final = [...allDetected][0];
        console.log(`✅ PRIMARY CMP: ${detectedSignals.final}`);
        console.log('Ready for analysis with professionalAnalysis.js');
    } else if (allDetected.size > 1) {
        detectedSignals.final = [...allDetected][0];
        console.log(`⚠️ MULTIPLE CMPs: Using ${detectedSignals.final} as primary`);
    } else {
        console.log('❌ No CMP detected - may be custom or blocked');
    }
    
    console.log('\n====================================');
    console.log('Closing in 5 seconds...\n');
    
    await sleep(5000);
    await browser.close();
    
    return detectedSignals.final;
}

// CLI
if (require.main === module) {
    const url = process.argv[2];
    if (!url) {
        console.log('Usage: node backend/detectCMP.js <url>');
        console.log('\n✅ SITES THAT WORK (no blocking):');
        console.log('  OneTrust:     dell.com, microsoft.com, cisco.com');
        console.log('  Cookiebot:    zendesk.com, mailchimp.com, wix.com'); 
        console.log('  TrustArc:     salesforce.com, zoom.us, docusign.com');
        console.log('  Usercentrics: zeit.de, heise.de, chip.de');
        console.log('  Quantcast:    techcrunch.com, politico.com, businessinsider.com');
        console.log('\n❌ SITES THAT BLOCK:');
        console.log('  adobe.com, oracle.com (show "technical difficulties")');
        process.exit(1);
    }
    
    detectCMP(url).catch(console.error);
}

module.exports = { detectCMP };