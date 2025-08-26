const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs').promises;
const path = require('path');
const GDPRViolationEngine = require('./violationEngine');

puppeteer.use(StealthPlugin());

class SpectralCrawler {
    constructor(options = {}) {
        this.options = {
            headless: false,
            timeout: 60000,
            screenshotDir: path.join(__dirname, '../../public/screenshots'),
            ...options
        };
        this.browser = null;
        this.page = null;
        this.violationEngine = new GDPRViolationEngine();
    }

    async init() {
        console.log('🚀 Starting Spectral Crawler...');
        console.log('📊 GDPR Violation Engine loaded - 17 violation codes ready');
        
        await fs.mkdir(this.options.screenshotDir, { recursive: true });
        
        this.browser = await puppeteer.launch({
            headless: this.options.headless,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--disable-gpu',
                '--lang=de-DE',
                '--accept-lang=de-DE,de;q=0.9,en;q=0.8',
                '--disable-background-timer-throttling',
                '--disable-backgrounding-occluded-windows',
                '--disable-renderer-backgrounding'
            ],
            defaultViewport: { width: 1366, height: 768 }
        });

        this.page = await this.browser.newPage();
        await this.page.setGeolocation({ latitude: 52.5200, longitude: 13.4050 });
        await this.page.setExtraHTTPHeaders({
            'Accept-Language': 'de-DE,de;q=0.9,en;q=0.8'
        });
    }

    // ✅ UNIVERSAL MULTI-LANGUAGE DETECTION SYSTEM - ENTERPRISE ENHANCED
    async detectLanguageAndGetButtons(page) {
        return await page.evaluate(() => {
            // 1. GET PAGE CONTENT FOR LANGUAGE DETECTION
            const pageText = document.body.textContent || '';
            const htmlLang = document.documentElement.lang || '';
            const metaLang = document.querySelector('meta[name="language"]')?.content || '';
            
            // 2. COMPREHENSIVE LANGUAGE DETECTION PATTERNS
            const languageHints = {
                'de': [
                    // Cookie/Privacy terms
                    'datenschutz', 'cookie', 'einstellungen', 'verwalten', 'zustimmung',
                    'datenschutzerklärung', 'nutzungsbedingungen', 'impressum',
                    // Action words  
                    'annehmen', 'ablehnen', 'akzeptieren', 'zurückweisen', 'verweigern',
                    'alle akzeptieren', 'alle ablehnen', 'nur erforderliche',
                    // German specific words
                    'über uns', 'kontakt', 'unternehmen', 'produkte', 'lösungen'
                ],
                'es': [
                    // Cookie/Privacy terms
                    'privacidad', 'cookies', 'configuración', 'gestionar', 'consentimiento',
                    'política de privacidad', 'términos de uso', 'aviso legal',
                    // Action words
                    'aceptar', 'rechazar', 'declinar', 'permitir', 'denegar', 
                    'aceptar todo', 'rechazar todo', 'solo necesarias',
                    // Spanish specific words
                    'nosotros', 'contacto', 'empresa', 'productos', 'soluciones'
                ],
                'fr': [
                    // Cookie/Privacy terms
                    'confidentialité', 'cookies', 'paramètres', 'gérer', 'consentement',
                    'politique de confidentialité', 'conditions d\'utilisation', 'mentions légales',
                    // Action words
                    'accepter', 'refuser', 'rejeter', 'autoriser', 'interdire',
                    'tout accepter', 'tout refuser', 'seulement nécessaires',
                    // French specific words
                    'à propos', 'contact', 'entreprise', 'produits', 'solutions'
                ],
                'it': [
                    // Cookie/Privacy terms  
                    'privacy', 'cookie', 'impostazioni', 'gestisci', 'consenso',
                    'informativa privacy', 'termini di utilizzo', 'note legali',
                    // Action words
                    'accetta', 'rifiuta', 'declina', 'consenti', 'nega',
                    'accetta tutto', 'rifiuta tutto', 'solo necessari',
                    // Italian specific words
                    'chi siamo', 'contatti', 'azienda', 'prodotti', 'soluzioni'
                ],
                'nl': [
                    // Cookie/Privacy terms
                    'privacy', 'cookies', 'instellingen', 'beheren', 'toestemming',
                    'privacybeleid', 'gebruiksvoorwaarden', 'juridische informatie',
                    // Action words  
                    'accepteren', 'weigeren', 'afwijzen', 'toestaan', 'blokkeren',
                    'alles accepteren', 'alles weigeren', 'alleen noodzakelijke',
                    // Dutch specific words
                    'over ons', 'contact', 'bedrijf', 'producten', 'oplossingen'
                ],
                'da': [
                    // Cookie/Privacy terms
                    'privatliv', 'cookies', 'indstillinger', 'administrer', 'samtykke',
                    'privatlivspolitik', 'brugsvilkår', 'juridiske oplysninger',
                    // Action words
                    'accepter', 'afvis', 'tillade', 'blokere', 'nægte',
                    'tillad alle', 'afvis alle', 'kun nødvendige',
                    // Danish specific words
                    'om os', 'kontakt', 'virksomhed', 'produkter', 'løsninger'
                ],
                'sv': [
                    // Cookie/Privacy terms - ENHANCED
                    'integritet', 'cookies', 'inställningar', 'hantera', 'samtycke',
                    'integritetspolicy', 'användarvillkor', 'juridisk information',
                    // Action words - ENHANCED  
                    'acceptera', 'avvisa', 'tillåt', 'blockera', 'neka',
                    'acceptera alla', 'avvisa alla', 'endast nödvändiga',
                    // Swedish specific words - ENHANCED
                    'om oss', 'kontakt', 'företag', 'produkter', 'lösningar',
                    // ADDED: Microsoft-specific Swedish terms
                    'godkänn', 'godkann', 'hantera cookies', 'valfria cookies'
                ],
                'en': [
                    // Cookie/Privacy terms
                    'privacy', 'cookie', 'settings', 'manage', 'consent',
                    'privacy policy', 'terms of use', 'legal notice',
                    // Action words
                    'accept', 'reject', 'decline', 'allow', 'deny',
                    'accept all', 'reject all', 'only necessary', 'essential only',
                    // English specific words
                    'about', 'contact', 'company', 'products', 'solutions'
                ]
            };
            
            // 3. MULTI-LAYER LANGUAGE DETECTION
            let detectedLanguage = 'en'; // default fallback
            let maxScore = 0;
            const lowerText = pageText.toLowerCase();
            
            // Layer 1: HTML lang attribute (highest priority)
            if (htmlLang && languageHints[htmlLang.toLowerCase().substring(0, 2)]) {
                detectedLanguage = htmlLang.toLowerCase().substring(0, 2);
                console.log(`🌍 Language detected from HTML lang: ${detectedLanguage}`);
            } 
            // Layer 2: Meta language tag
            else if (metaLang && languageHints[metaLang.toLowerCase().substring(0, 2)]) {
                detectedLanguage = metaLang.toLowerCase().substring(0, 2);
                console.log(`🌍 Language detected from meta tag: ${detectedLanguage}`);
            }
            // Layer 3: Content analysis with scoring
            else {
                for (let [lang, hints] of Object.entries(languageHints)) {
                    let score = 0;
                    let matches = [];
                    
                    for (let hint of hints) {
                        if (lowerText.includes(hint.toLowerCase())) {
                            // Weight scoring: privacy terms = 3, action words = 2, generic = 1
                            let weight = 1;
                            if (hint.includes('privacy') || hint.includes('datenschutz') || hint.includes('cookie')) weight = 3;
                            else if (['accept', 'reject', 'annehmen', 'ablehnen', 'aceptar', 'rechazar'].includes(hint)) weight = 2;
                            
                            score += weight;
                            matches.push(hint);
                        }
                    }
                    
                    if (score > maxScore) {
                        maxScore = score;
                        detectedLanguage = lang;
                        console.log(`🌍 Language detected from content: ${lang} (score: ${score}, matches: ${matches.slice(0, 3).join(', ')})`);
                    }
                }
            }
            
            // 4. UNIVERSAL BUTTON PATTERNS BY LANGUAGE - ENTERPRISE ENHANCED
            const buttonPatterns = {
                'de': {
                    accept: [
                        'annehmen', 'akzeptieren', 'zustimmen', 'einverstanden',
                        'alle akzeptieren', 'alle cookies akzeptieren', 'alle zulassen',
                        'zustimmen und weiter'
                    ],
                    reject: [
                        'ablehnen', 'zurückweisen', 'verweigern', 'nicht einverstanden',
                        'alle ablehnen', 'alle cookies ablehnen', 'cookies ablehnen', 'verweigern',
                        'nur erforderliche', 'nur notwendige', 'minimal'
                    ],
                    settings: [
                        'einstellungen', 'verwalten', 'cookies verwalten', 'anpassen',
                        'mehr optionen', 'erweiterte einstellungen', 'details'
                    ]
                },
                'es': {
                    accept: [
                        'aceptar', 'acepto', 'de acuerdo', 'permitir',
                        'aceptar todo', 'aceptar todas', 'permitir todo',
                        'continuar', 'entendido', 'vale'
                    ],
                    reject: [
                        'rechazar', 'rechazo', 'declinar', 'no acepto',
                        'rechazar todo', 'rechazar todas', 'denegar',
                        'solo necesarias', 'solo esenciales', 'mínimo'
                    ],
                    settings: [
                        'configuración', 'gestionar', 'gestionar cookies', 'personalizar',
                        'más opciones', 'configuración avanzada', 'detalles'
                    ]
                },
                'fr': {
                    accept: [
                        'accepter', 'j\'accepte', 'd\'accord', 'autoriser',
                        'tout accepter', 'accepter tous', 'autoriser tout',
                        'continuer', 'compris', 'd\'accord'
                    ],
                    reject: [
                        'refuser', 'je refuse', 'décliner', 'rejeter',
                        'tout refuser', 'refuser tous', 'rejeter tout',
                        'seulement nécessaires', 'seulement essentiels', 'minimal'
                    ],
                    settings: [
                        'paramètres', 'gérer', 'gérer les cookies', 'personnaliser',
                        'plus d\'options', 'paramètres avancés', 'détails'
                    ]
                },
                'it': {
                    accept: [
                        'accetta', 'accetto', 'd\'accordo', 'consenti',
                        'accetta tutto', 'accetta tutti', 'consenti tutto',
                        'continua', 'capito', 'va bene'
                    ],
                    reject: [
                        'rifiuta', 'rifiuto', 'declina', 'nego',
                        'rifiuta tutto', 'rifiuta tutti', 'nega tutto',
                        'solo necessari', 'solo essenziali', 'minimale'
                    ],
                    settings: [
                        'impostazioni', 'gestisci', 'gestisci cookie', 'personalizza',
                        'più opzioni', 'impostazioni avanzate', 'dettagli'
                    ]
                },
                'nl': {
                    accept: [
                        'accepteren', 'accepteer', 'akkoord', 'toestaan',
                        'alles accepteren', 'alle accepteren', 'alles toestaan',
                        'doorgaan', 'begrepen', 'oké'
                    ],
                    reject: [
                        'weigeren', 'weiger', 'afwijzen', 'blokkeren',
                        'alles weigeren', 'alle weigeren', 'alles blokkeren',
                        'alleen noodzakelijke', 'alleen essentiële', 'minimaal'
                    ],
                    settings: [
                        'instellingen', 'beheren', 'cookies beheren', 'aanpassen',
                        'meer opties', 'geavanceerde instellingen', 'details'
                    ]
                },
                'da': {
                    accept: [
                        'accepter', 'acceptér', 'enig', 'tillad',
                        'tillad alle', 'accepter alle', 'tillad alt',
                        'fortsæt', 'forstået', 'okay'
                    ],
                    reject: [
                        'afvis', 'afvisning', 'nægt', 'blokér',
                        'afvis alle', 'nægt alle', 'blokér alt',
                        'kun nødvendige', 'kun væsentlige', 'minimal'
                    ],
                    settings: [
                        'indstillinger', 'administrer', 'administrer cookies', 'tilpas',
                        'flere muligheder', 'avancerede indstillinger', 'detaljer'
                    ]
                },
                'sv': {
                    accept: [
                        'acceptera', 'accepterar', 'godkänn', 'godkann', 'tillåt',
                        'acceptera alla', 'godkänn alla', 'tillåt alla',
                        'fortsätt', 'förstått', 'okej'
                    ],
                    reject: [
                        'avvisa', 'avvisar', 'neka', 'blockera', 'avböj',
                        'avvisa alla', 'neka alla', 'blockera alla',
                        'endast nödvändiga', 'endast väsentliga', 'minimal',
                        // ✅ SWEDISH FIX: Added specific Microsoft Swedish patterns
                        'neka cookies', 'avvisa cookies', 'blockera cookies'
                    ],
                    settings: [
                        'inställningar', 'hantera', 'hantera cookies', 'anpassa',
                        'fler alternativ', 'avancerade inställningar', 'detaljer'
                    ]
                },
                'en': {
                    accept: [
                        'accept', 'accept all', 'allow all', 'agree to all',
                        'continue'
                    ],
                    reject: [
                        'reject', 'decline', 'deny', 'disagree',
                        'reject all', 'decline all', 'deny all',
                        'only necessary', 'only essential', 'minimal', 'necessary only'
                    ],
                    settings: [
                        'settings', 'manage', 'manage cookies', 'customize',
                        'more options', 'advanced settings', 'details', 'preferences'
                    ]
                }
            };
            
            const patterns = buttonPatterns[detectedLanguage] || buttonPatterns['en'];
            
            return {
                detectedLanguage,
                patterns,
                pageHints: {
                    htmlLang,
                    metaLang,
                    contentScore: maxScore
                }
            };
        });
    }

    async captureEvidence(stage, url) {
        console.log(`📊 Capturing ${stage}...`);
        
        const evidence = { timestamp: new Date().toISOString(), stage, url };

        try {
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            let scriptsCount = 0;
            let scriptDetails = [];
            try {
                const scriptData = await this.page.evaluate(() => {
                    return Array.from(document.scripts).map(script => ({
                        src: script.src || '',
                        type: script.type || '',
                        innerHTML: script.innerHTML ? script.innerHTML.substring(0, 100) : ''
                    }));
                });
                scriptsCount = scriptData.length;
                scriptDetails = scriptData;
            } catch (frameError) {
                console.log('⚠️ Frame detached, retrying...');
                await new Promise(resolve => setTimeout(resolve, 1000));
                scriptsCount = await this.page.evaluate(() => document.scripts.length);
            }
            evidence.scriptsCount = scriptsCount;
            evidence.scripts = scriptDetails;

            // ENHANCED: Detailed Cookie Analysis with Specific Names
            const cookies = await this.page.cookies();
            evidence.cookiesCount = cookies.length;
            evidence.cookies = cookies;

            // NEW: Detailed Cookie Analysis with Tracking/Necessary Classification - FIXED
            const detailedCookieAnalysis = await this.page.evaluate(() => {
                try {
                    const cookies = document.cookie.split(';').filter(c => c.trim());
                    const trackingCookieDetails = [];
                    const necessaryCookieDetails = [];
                    
                    cookies.forEach(cookie => {
                        try {
                            const name = cookie.split('=')[0].trim();
                            const value = cookie.split('=')[1] || '';
                            
                            // Tracking cookie patterns
                            const isTracking = (
                                name.toLowerCase().includes('ga') || name.toLowerCase().includes('_utm') || 
                                name.toLowerCase().includes('facebook') || name.toLowerCase().includes('_fbp') ||
                                name.toLowerCase().includes('linkedin') || name.toLowerCase().includes('doubleclick') ||
                                name.toLowerCase().includes('_gid') || name.toLowerCase().includes('_gat') ||
                                name.toLowerCase().includes('fr') || name.toLowerCase().includes('tr') ||
                                name.toLowerCase().includes('_gcl') || name.toLowerCase().includes('ads') ||
                                name.toLowerCase().includes('analytics') || name.toLowerCase().includes('tracking') ||
                                name.toLowerCase().includes('mktrecipe') || name.toLowerCase().includes('_ga_')
                            );
                            
                            const cookieInfo = {
                                name: name,
                                value: value.substring(0, 50), // Truncate long values
                                classification: isTracking ? 'tracking' : 'necessary'
                            };
                            
                            if (isTracking) {
                                trackingCookieDetails.push(cookieInfo);
                            } else {
                                necessaryCookieDetails.push(cookieInfo);
                            }
                        } catch (cookieError) {
                            // Skip malformed cookies
                        }
                    });
                    
                    return {
                        total: cookies.length,
                        tracking: trackingCookieDetails.length,
                        necessary: necessaryCookieDetails.length,
                        trackingDetails: trackingCookieDetails,
                        necessaryDetails: necessaryCookieDetails.slice(0, 5) // Limit output
                    };
                } catch (error) {
                    return {
                        total: 0,
                        tracking: 0,
                        necessary: 0,
                        trackingDetails: [],
                        necessaryDetails: [],
                        error: error.message
                    };
                }
            });
            evidence.detailedCookieAnalysis = detailedCookieAnalysis;

            // FIXED: Enhanced LocalStorage Analysis with Comprehensive Patterns + Debug Logging
            const detailedStorageAnalysis = await this.page.evaluate(() => {
                try {
                    let trackingStorageItems = [];
                    let necessaryStorageItems = [];
                    let allKeys = []; // DEBUG: Capture all keys for analysis
                    
                    try {
                        for (let i = 0; i < localStorage.length; i++) {
                            const key = localStorage.key(i);
                            const value = localStorage.getItem(key);
                            
                            // DEBUG: Capture all keys
                            allKeys.push(key);
                            
                            // ENHANCED: Comprehensive tracking detection patterns
                            const isTracking = (
                                // Google ecosystem - ENHANCED
                                key.toLowerCase().includes('ga') || key.toLowerCase().includes('_ga') ||
                                key.toLowerCase().includes('gtag') || key.toLowerCase().includes('gtm') ||
                                key.toLowerCase().includes('google') || key.toLowerCase().includes('goog') ||
                                key.toLowerCase().includes('_gid') || key.toLowerCase().includes('_gat') ||
                                key.toLowerCase().includes('clientid') || key.toLowerCase().includes('client_id') ||
                                
                                // UTM and campaign tracking
                                key.toLowerCase().includes('utm') || key.toLowerCase().includes('campaign') ||
                                key.toLowerCase().includes('source') || key.toLowerCase().includes('medium') ||
                                
                                // Social media tracking - ENHANCED
                                key.toLowerCase().includes('facebook') || key.toLowerCase().includes('_fb') ||
                                key.toLowerCase().includes('linkedin') || key.toLowerCase().includes('twitter') ||
                                key.toLowerCase().includes('tiktok') || key.toLowerCase().includes('instagram') ||
                                key.toLowerCase().includes('pinterest') || key.toLowerCase().includes('snapchat') ||
                                
                                // Analytics platforms - ENHANCED
                                key.toLowerCase().includes('analytics') || key.toLowerCase().includes('tracking') ||
                                key.toLowerCase().includes('segment') || key.toLowerCase().includes('mixpanel') ||
                                key.toLowerCase().includes('amplitude') || key.toLowerCase().includes('hotjar') ||
                                key.toLowerCase().includes('fullstory') || key.toLowerCase().includes('mouseflow') ||
                                key.toLowerCase().includes('smartlook') || key.toLowerCase().includes('logrocket') ||
                                
                                // Advertising - ENHANCED
                                key.toLowerCase().includes('ads') || key.toLowerCase().includes('adwords') ||
                                key.toLowerCase().includes('doubleclick') || key.toLowerCase().includes('bing') ||
                                key.toLowerCase().includes('criteo') || key.toLowerCase().includes('outbrain') ||
                                key.toLowerCase().includes('taboula') || key.toLowerCase().includes('amazon') ||
                                
                                // User identification - ENHANCED
                                key.toLowerCase().includes('userid') || key.toLowerCase().includes('user_id') ||
                                key.toLowerCase().includes('visitor') || key.toLowerCase().includes('session') ||
                                key.toLowerCase().includes('uuid') || key.toLowerCase().includes('guid') ||
                                key.toLowerCase().includes('fingerprint') || key.toLowerCase().includes('device') ||
                                
                                // Marketing automation - NEW
                                key.toLowerCase().includes('marketo') || key.toLowerCase().includes('pardot') ||
                                key.toLowerCase().includes('hubspot') || key.toLowerCase().includes('eloqua') ||
                                key.toLowerCase().includes('salesforce') || key.toLowerCase().includes('6sense') ||
                                
                                // Common tracking patterns - NEW
                                key.toLowerCase().includes('track') || key.toLowerCase().includes('pixel') ||
                                key.toLowerCase().includes('beacon') || key.toLowerCase().includes('event') ||
                                key.toLowerCase().includes('conversion') || key.toLowerCase().includes('attribution') ||
                                
                                // E-commerce tracking - NEW
                                key.toLowerCase().includes('cart') || key.toLowerCase().includes('purchase') ||
                                key.toLowerCase().includes('checkout') || key.toLowerCase().includes('order') ||
                                key.toLowerCase().includes('product') || key.toLowerCase().includes('wishlist') ||
                                
                                // A/B Testing - NEW
                                key.toLowerCase().includes('experiment') || key.toLowerCase().includes('test') ||
                                key.toLowerCase().includes('variant') || key.toLowerCase().includes('optimize') ||
                                
                                // Personalization - NEW
                                key.toLowerCase().includes('personalization') || key.toLowerCase().includes('recommend') ||
                                key.toLowerCase().includes('profile') || key.toLowerCase().includes('preference') ||
                                
                                // Heat mapping - NEW
                                key.toLowerCase().includes('heatmap') || key.toLowerCase().includes('click') ||
                                key.toLowerCase().includes('scroll') || key.toLowerCase().includes('mouse') ||
                                
                                // Company-specific patterns for Dell
                                key.toLowerCase().includes('dell') || key.toLowerCase().includes('dtm') ||
                                key.toLowerCase().includes('adobe') || key.toLowerCase().includes('omniture') ||
                                key.toLowerCase().includes('mbox') || key.toLowerCase().includes('target')
                            );
                            
                            const storageInfo = {
                                key: key,
                                value: value ? value.substring(0, 100) : '', // Truncate long values
                                classification: isTracking ? 'tracking' : 'necessary'
                            };
                            
                            if (isTracking) {
                                trackingStorageItems.push(storageInfo);
                            } else {
                                necessaryStorageItems.push(storageInfo);
                            }
                        }
                    } catch (storageError) {
                        // localStorage not accessible or empty
                    }
                    
                    return {
                        total: localStorage.length || 0,
                        tracking: trackingStorageItems.length,
                        necessary: necessaryStorageItems.length,
                        trackingDetails: trackingStorageItems,
                        necessaryDetails: necessaryStorageItems.slice(0, 5), // Limit output
                        allKeys: allKeys, // DEBUG: All localStorage keys found
                        debug: true
                    };
                } catch (error) {
                    return {
                        total: 0,
                        tracking: 0,
                        necessary: 0,
                        trackingDetails: [],
                        necessaryDetails: [],
                        allKeys: [],
                        error: error.message,
                        debug: true
                    };
                }
            });
            evidence.detailedStorageAnalysis = detailedStorageAnalysis;
            evidence.localStorageCount = detailedStorageAnalysis.total; // Keep compatibility

            // ENHANCED: Debug logging to see all localStorage keys
            if (detailedStorageAnalysis.debug && detailedStorageAnalysis.allKeys.length > 0) {
                console.log(`🔧 DEBUG: All localStorage keys found (${detailedStorageAnalysis.allKeys.length}):`);
                detailedStorageAnalysis.allKeys.slice(0, 10).forEach((key, i) => {
                    console.log(`  ${i + 1}. ${key}`);
                });
                if (detailedStorageAnalysis.allKeys.length > 10) {
                    console.log(`  ... and ${detailedStorageAnalysis.allKeys.length - 10} more keys`);
                }
            }

            // FIXED: Show specific tracking localStorage items if found
            if (detailedStorageAnalysis.tracking > 0 && detailedStorageAnalysis.trackingDetails) {
                console.log(`💾 TRACKING LOCALSTORAGE FOUND (${detailedStorageAnalysis.tracking}):`);
                detailedStorageAnalysis.trackingDetails.forEach((item, i) => {
                    console.log(`  ${i + 1}. ${item.key}`);
                });
            } else if (detailedStorageAnalysis.total > 0) {
                // DEBUG: Show why no tracking was detected
                console.log(`💾 LocalStorage found (${detailedStorageAnalysis.total} total) but none classified as tracking`);
            }

            // ENHANCED: Detailed Tracking Pixels Analysis with URLs - FIXED
            const detailedPixelAnalysis = await this.page.evaluate(() => {
                try {
                    const images = Array.from(document.querySelectorAll('img'));
                    const trackingPixelDetails = [];
                    
                    images.forEach(img => {
                        try {
                            if (!img.src) return;
                            
                            const isTrackingPixel = (
                                (img.width === 1 && img.height === 1) ||
                                img.src.includes('analytics') ||
                                img.src.includes('tracking') ||
                                img.src.includes('pixel') ||
                                img.src.includes('facebook.com') ||
                                img.src.includes('google-analytics.com') ||
                                img.src.includes('doubleclick.net') ||
                                img.src.includes('linkedin.com/px') ||
                                img.src.includes('bing.com/tr') ||
                                img.src.includes('tr?') ||
                                img.src.includes('collect?') ||
                                img.src.includes('pagead/viewthroughconversion')
                            );
                            
                            if (isTrackingPixel) {
                                // FIXED: Safe URL parsing
                                let hostname = 'unknown';
                                try {
                                    hostname = new URL(img.src).hostname;
                                } catch (urlError) {
                                    hostname = img.src.split('/')[2] || 'malformed-url';
                                }
                                
                                trackingPixelDetails.push({
                                    url: img.src,
                                    hostname: hostname,
                                    dimensions: `${img.width}x${img.height}`,
                                    classification: 'tracking-pixel'
                                });
                            }
                        } catch (imgError) {
                            // Skip problematic images
                        }
                    });
                    
                    return {
                        total: trackingPixelDetails.length,
                        details: trackingPixelDetails
                    };
                } catch (error) {
                    return {
                        total: 0,
                        details: [],
                        error: error.message
                    };
                }
            });
            evidence.detailedPixelAnalysis = detailedPixelAnalysis;
            evidence.trackingPixels = detailedPixelAnalysis.total; // Keep compatibility

            // FIXED: Show tracking pixels if found with proper hostname extraction
            if (detailedPixelAnalysis.total > 0 && detailedPixelAnalysis.details) {
                console.log(`🖼️ TRACKING PIXELS FOUND (${detailedPixelAnalysis.total}):`);
                detailedPixelAnalysis.details.forEach((pixel, i) => {
                    console.log(`  ${i + 1}. ${pixel.hostname} (${pixel.dimensions})`);
                });
            }

            // ENHANCED: Detailed Third-party Requests with Domain Classification - FIXED
            const detailedThirdPartyAnalysis = await this.page.evaluate(() => {
                try {
                    const scripts = Array.from(document.scripts);
                    const thirdPartyDetails = [];
                    const currentHostname = window.location.hostname;
                    
                    scripts.forEach(script => {
                        try {
                            const src = script.src;
                            if (!src) return;
                            
                            let scriptHostname;
                            try {
                                scriptHostname = new URL(src).hostname;
                            } catch (urlError) {
                                // FIXED: Fallback for malformed URLs
                                const parts = src.split('/');
                                scriptHostname = parts[2] || 'unknown';
                            }
                            
                            if (scriptHostname && scriptHostname !== currentHostname) {
                                // Classify the third-party domain
                                let category = 'unknown';
                                let company = 'Unknown';
                                
                                const srcLower = src.toLowerCase();
                                
                                if (srcLower.includes('google')) {
                                    category = 'analytics';
                                    company = 'Google';
                                } else if (srcLower.includes('facebook')) {
                                    category = 'social-tracking';
                                    company = 'Facebook/Meta';
                                } else if (srcLower.includes('linkedin')) {
                                    category = 'social-tracking';
                                    company = 'LinkedIn';
                                } else if (srcLower.includes('adobe') || srcLower.includes('omtrdc')) {
                                    category = 'analytics';
                                    company = 'Adobe';
                                } else if (srcLower.includes('amazon') || srcLower.includes('aws')) {
                                    category = 'infrastructure';
                                    company = 'Amazon';
                                } else if (srcLower.includes('microsoft') || srcLower.includes('bing')) {
                                    category = 'analytics';
                                    company = 'Microsoft';
                                } else if (srcLower.includes('tiktok')) {
                                    category = 'social-tracking';
                                    company = 'TikTok';
                                } else if (srcLower.includes('quantserve') || srcLower.includes('quantcast')) {
                                    category = 'analytics';
                                    company = 'Quantcast';
                                } else if (srcLower.includes('6sc.co')) {
                                    category = 'analytics';
                                    company = '6sense';
                                }
                                
                                thirdPartyDetails.push({
                                    url: src,
                                    domain: scriptHostname,
                                    company: company,
                                    category: category
                                });
                            }
                        } catch (scriptError) {
                            // Skip problematic scripts
                        }
                    });
                    
                    return {
                        total: thirdPartyDetails.length,
                        details: thirdPartyDetails
                    };
                } catch (error) {
                    return {
                        total: 0,
                        details: [],
                        error: error.message
                    };
                }
            });
            evidence.detailedThirdPartyAnalysis = detailedThirdPartyAnalysis;
            evidence.thirdPartyScripts = detailedThirdPartyAnalysis.total; // Keep compatibility

            // Keep existing script analysis for compatibility
            const scriptAnalysis = await this.page.evaluate(() => {
                const scripts = Array.from(document.scripts);
                
                // COMPLETE ENTERPRISE TRACKING DOMAINS DATABASE - FULLY UPDATED
                const trackingDomains = [
                    // Google ecosystem
                    'google-analytics.com', 'googletagmanager.com', 'googlesyndication.com', 'doubleclick.net',
                    'google.com/analytics', 'gstatic.com/analytics', 'googleadservices.com',
                    
                    // Facebook ecosystem  
                    'facebook.com', 'facebook.net', 'connect.facebook.net',
                    
                    // Adobe Analytics ecosystem - COMPLETE
                    'adobe.com', 'adobedtm.com', 'assets.adobedtm.com', 'omtrdc.net',
                    'demdex.net', 'everesttech.net', 'omniture.com',
                    
                    // Major analytics platforms
                    'segment.com', 'segment.io', 'cdn.segment.com', 'api.segment.io',
                    'mixpanel.com', 'amplitude.com', 'hotjar.com', 'mouseflow.com', 
                    'crazyegg.com', 'fullstory.com', 'logrocket.com', 'smartlook.com',
                    
                    // Advertising platforms
                    'amazon-adsystem.com', 'adsystem.amazon.com', 'scorecardresearch.com',
                    'quantserve.com', 'quantcast.com', 'outbrain.com', 'taboola.com',
                    'criteo.com', '6sc.co', 'bizible.com', 'marketo.net',
                    
                    // Social media tracking
                    'twitter.com/analytics', 'analytics.twitter.com', 
                    'linkedin.com/analytics', 'ads.linkedin.com', 'snap.licdn.com',
                    'pinterest.com/analytics', 'snapchat.com/analytics', 'tiktok.com/analytics',
                    
                    // Chat/support tracking
                    'drift.com', 'driftt.com', 'intercom.io', 'zendesk.com/embeddable_framework',
                    
                    // Other tracking services
                    'newrelic.com', 'bugsnag.com', 'sentry.io', 'datadog.com',
                    'pingdom.com', 'gtm.start.dk', 'gemius.dk',
                    
                    // MICROSOFT ENTERPRISE TRACKING DOMAINS
                    'clarity.ms', 'www.clarity.ms', 'scripts.clarity.ms',        
                    'monitor.azure.com', 'js.monitor.azure.com',                
                    'applicationinsights.microsoft.com',                        
                    'dc.services.visualstudio.com',                            
                    'vortex.data.microsoft.com',                               
                    'browser.pipe.aria.microsoft.com',
                    
                    // BING ADS CONVERSION TRACKING
                    'bat.bing.com', 'bing.com/analytics', 'uet.bing.com',
                    
                    // SALESFORCE ENTERPRISE TRACKING - NEWLY DISCOVERED
                    'evgnet.com', 'cdn.evgnet.com',                           
                    's.go-mpulse.net',                                        
                ];
                
                const necessaryDomains = [
                    // CMP scripts
                    'cookielaw.org', 'onetrust.com', 'cookiebot.com', 'cookieinformation.com',
                    'sourcepoint.mgr.consensu.org',
                    
                    // Core libraries
                    'jquery.com', 'jsdelivr.net', 'unpkg.com', 'cdnjs.cloudflare.com',
                    
                    // Security & Infrastructure
                    'recaptcha.net', 'hcaptcha.com', 'cloudflare.com', 'challenges.cloudflare.com',
                    'turnstile.cloudflare.com', 'cf-assets.com',
                    
                    // Payment processing
                    'stripe.com', 'paypal.com', 'checkout.com',
                    
                    // CDN and infrastructure
                    'amazonaws.com', 'fastly.com', 'akamai.net', 'maxcdn.com',
                    
                    // Essential functionality
                    'polyfill.io', 'bootstrapcdn.com', 'fontawesome.com', 'fonts.googleapis.com'
                ];
                
                let trackingScripts = 0;
                let necessaryScripts = 0;
                let unknownScripts = 0;
                let trackingScriptDetails = [];
                let unknownScriptDetails = [];
                let necessaryScriptDetails = [];
                
                scripts.forEach((script, index) => {
                    const src = script.src || '';
                    const hostname = window.location.hostname;
                    
                    if (!src || src.includes(hostname)) {
                        necessaryScripts++;
                        necessaryScriptDetails.push(src || '[inline]');
                    } else if (trackingDomains.some(domain => src.toLowerCase().includes(domain.toLowerCase()))) {
                        trackingScripts++;
                        trackingScriptDetails.push(src);
                    } else if (necessaryDomains.some(domain => src.toLowerCase().includes(domain.toLowerCase()))) {
                        necessaryScripts++;
                        necessaryScriptDetails.push(src);
                    } else {
                        unknownScripts++;
                        unknownScriptDetails.push(src);
                    }
                });
                
                // Math validation
                const totalCalculated = trackingScripts + necessaryScripts + unknownScripts;
                
                return {
                    total: scripts.length,
                    tracking: trackingScripts,
                    necessary: necessaryScripts,
                    unknown: unknownScripts,
                    trackingDetails: trackingScriptDetails,
                    unknownDetails: unknownScriptDetails,
                    necessaryDetails: necessaryScriptDetails.slice(0, 5),
                    mathCheck: totalCalculated === scripts.length ? 'PASS' : 'FAIL'
                };
            });
            evidence.scriptAnalysis = scriptAnalysis;

            // Keep existing cookie and localStorage analysis for compatibility
            const cookieAnalysis = await this.page.evaluate(() => {
                const cookies = document.cookie.split(';');
                const trackingCookies = cookies.filter(cookie => {
                    const name = cookie.split('=')[0].trim().toLowerCase();
                    return name.includes('ga') || name.includes('_utm') || 
                           name.includes('facebook') || name.includes('_fbp') ||
                           name.includes('linkedin') || name.includes('doubleclick');
                });
                
                return {
                    total: cookies.length,
                    tracking: trackingCookies.length,
                    necessary: cookies.length - trackingCookies.length
                };
            });
            evidence.cookieAnalysis = cookieAnalysis;

            const localStorageAnalysis = await this.page.evaluate(() => {
                let trackingItems = 0;
                try {
                    for (let i = 0; i < localStorage.length; i++) {
                        const key = localStorage.key(i).toLowerCase();
                        if (key.includes('ga') || key.includes('utm') || key.includes('facebook') || 
                            key.includes('analytics') || key.includes('tracking')) {
                            trackingItems++;
                        }
                    }
                } catch (e) {
                    // localStorage not accessible
                }
                return {
                    total: localStorage.length || 0,
                    tracking: trackingItems,
                    necessary: (localStorage.length || 0) - trackingItems
                };
            });
            evidence.localStorageAnalysis = localStorageAnalysis;

            const screenshotName = `${Date.now()}_${stage}.png`;
            await this.page.screenshot({ 
                path: path.join(this.options.screenshotDir, screenshotName),
                timeout: 10000
            });
            evidence.screenshot = screenshotName;

            // Enhanced logging with specific details - IMPROVED
            console.log(`📸 ${stage}: ${scriptsCount} scripts (${scriptAnalysis.tracking} tracking, ${scriptAnalysis.necessary} necessary, ${scriptAnalysis.unknown} unknown), ${cookies.length} cookies (${detailedCookieAnalysis.tracking} tracking), ${detailedStorageAnalysis.total} localStorage (${detailedStorageAnalysis.tracking} tracking), ${detailedPixelAnalysis.total} pixels, ${detailedThirdPartyAnalysis.total} 3rd-party`);
            
            // Math validation logging
            if (scriptAnalysis.mathCheck === 'FAIL') {
                console.log(`⚠️ MATH ERROR: Script totals don't add up for ${stage}`);
            }

            // Show detailed tracking information
            if (scriptAnalysis.tracking > 0) {
                console.log(`🎯 TRACKING SCRIPTS FOUND (${scriptAnalysis.tracking}):`);
                scriptAnalysis.trackingDetails.forEach((script, i) => {
                    console.log(`  ${i + 1}. ${script}`);
                });
            }

            // FIXED: Show specific tracking cookies if found with deduplication
            if (detailedCookieAnalysis.tracking > 0 && detailedCookieAnalysis.trackingDetails) {
                const uniqueCookies = [...new Set(detailedCookieAnalysis.trackingDetails.map(c => c.name))];
                console.log(`🍪 TRACKING COOKIES FOUND (${uniqueCookies.length}):`);
                uniqueCookies.forEach((cookieName, i) => {
                    console.log(`  ${i + 1}. ${cookieName}`);
                });
            }

            // FIXED: Show third-party companies classification
            if (detailedThirdPartyAnalysis.total > 0 && detailedThirdPartyAnalysis.details) {
                const companiesSummary = {};
                detailedThirdPartyAnalysis.details.forEach(script => {
                    if (!companiesSummary[script.company]) {
                        companiesSummary[script.company] = 0;
                    }
                    companiesSummary[script.company]++;
                });
                
                const topCompanies = Object.entries(companiesSummary)
                    .sort(([,a], [,b]) => b - a)
                    .slice(0, 5);
                
                if (topCompanies.length > 0) {
                    console.log(`🏢 TOP 3RD-PARTY COMPANIES:`);
                    topCompanies.forEach(([company, count], i) => {
                        console.log(`  ${i + 1}. ${company}: ${count} scripts`);
                    });
                }
            }

            // FIXED: Better unknown scripts logging
            if (scriptAnalysis.unknown > 0 && scriptAnalysis.unknownDetails) {
                const displayCount = Math.min(3, scriptAnalysis.unknown);
                console.log(`❓ UNKNOWN SCRIPTS (${scriptAnalysis.unknown})${scriptAnalysis.unknown > 3 ? ' - First 3:' : ':'}`);
                scriptAnalysis.unknownDetails.slice(0, displayCount).forEach((script, i) => {
                    console.log(`  ${i + 1}. ${script}`);
                });
                if (scriptAnalysis.unknown > 3) {
                    console.log(`  ... and ${scriptAnalysis.unknown - 3} more unknown scripts`);
                }
            }
            
            return evidence;

        } catch (error) {
            console.error(`❌ Error capturing ${stage}:`, error.message);
            evidence.error = error.message;
            evidence.scriptsCount = 0;
            evidence.cookiesCount = 0;
            evidence.localStorageCount = 0;
            evidence.trackingPixels = 0;
            evidence.thirdPartyScripts = 0;
            return evidence;
        }
    }

    async clickCMPButton(action) {
        console.log(`🖱️ Looking for ${action} button...`);
        
        // ✅ UNIVERSAL MULTI-LANGUAGE BUTTON DETECTION - ENTERPRISE FIXED
        const languageInfo = await this.detectLanguageAndGetButtons(this.page);
        const { detectedLanguage, patterns } = languageInfo;
        const targetPatterns = patterns[action] || [];
        
        console.log(`🌍 Detected language: ${detectedLanguage.toUpperCase()}`);
        console.log(`🎯 Searching for ${action} patterns: ${targetPatterns.slice(0, 3).join(', ')}${targetPatterns.length > 3 ? '...' : ''}`);
        
        // ✅ PRIORITY 1: UNIVERSAL MULTI-LANGUAGE CMP DETECTION - CRITICAL FIXES APPLIED
        const universalFound = await this.page.evaluate((actionType, patterns) => {
            const elements = Array.from(document.querySelectorAll('button, a, [role="button"], input[type="button"], input[type="submit"]'));
            
            for (const element of elements) {
                const text = element.textContent?.trim() || '';
                const value = element.value || '';
                const ariaLabel = element.getAttribute('aria-label') || '';
                const title = element.getAttribute('title') || '';
                const combinedText = (text + ' ' + value + ' ' + ariaLabel + ' ' + title).toLowerCase();
                
                // Check against language-specific patterns with exact and partial matching
                for (const pattern of patterns) {
                    const patternLower = pattern.toLowerCase();
                    
                    // Exact match (highest priority)
                    if (text.toLowerCase() === patternLower || 
                        value.toLowerCase() === patternLower) {
                        
                        // Additional safety check: avoid clicking links or explanatory text
                        const isClickableButton = element.tagName === 'BUTTON' || 
                                                  element.getAttribute('role') === 'button' || 
                                                  element.type === 'button' || 
                                                  element.type === 'submit';
                        
                        if (isClickableButton || element.tagName === 'A') {
                            element.click();
                            return `Universal ${actionType}: "${text || value}" (exact match)`;
                        }
                    }
                    
                    // 🚨 CRITICAL FIX: Enhanced partial matching with negative filtering
                    if (combinedText.includes(patternLower) && 
                        combinedText.length < 200 &&  // Reasonable length limit
                        // ✅ ENTERPRISE CRITICAL FIXES - Reject negative patterns
                        !combinedText.includes('do not') &&           // English: "Do not accept"
                        !combinedText.includes('don\'t') &&           // English: "Don't accept"  
                        !combinedText.includes('sans') &&             // French: "sans accepter" = "without accepting"
                        !combinedText.includes('ohne') &&             // German: "ohne akzeptieren" = "without accepting"
                        !combinedText.includes('senza') &&            // Italian: "senza accettare" = "without accepting"
                        !combinedText.includes('sin') &&              // Spanish: "sin aceptar" = "without accepting"
                        !combinedText.includes('zonder') &&           // Dutch: "zonder accepteren" = "without accepting"
                        !combinedText.includes('continuer sans') &&   // French: "continuer sans accepter"
                        !combinedText.includes('weiter ohne') &&      // German: "weiter ohne akzeptieren"
                        !combinedText.includes('continue without') && // English: "continue without accepting"
                        // Existing safety filters
                        !combinedText.includes('drittanbieter') &&    // Avoid "third-party" links
                        !combinedText.includes('mehr informationen') && // Avoid "more info" links
                        !combinedText.includes('weitere informationen') && // Avoid "more info" links
                        !combinedText.includes('läs mer') &&          // Avoid Swedish "read more" links
                        !combinedText.includes('mer information')) {  // Avoid Swedish "more information" links
                        
                        // Only click actual buttons for partial matches
                        const isClickableButton = element.tagName === 'BUTTON' || 
                                                  element.getAttribute('role') === 'button' || 
                                                  element.type === 'button' || 
                                                  element.type === 'submit';
                        
                        if (isClickableButton) {
                            element.click();
                            return `Universal ${actionType}: "${text || value}" (partial match: ${pattern})`;
                        }
                    }
                }
            }
            return false;
        }, action, targetPatterns);

        if (universalFound) {
            console.log(`✅ Clicked universal ${action} button: ${universalFound} [${detectedLanguage}]`);
            await new Promise(resolve => setTimeout(resolve, 5000));
            return true;
        }

        // ✅ PRIORITY 2: OneTrust detection (with multi-language fallback)
        const oneTrustSelectors = {
            accept: [
                '#onetrust-accept-btn-handler',
                '#accept-recommended-btn-handler',
                '.onetrust-close-btn-handler'
            ],
            reject: [
                '#onetrust-reject-all-handler', 
                '#onetrust-pc-btn-handler',
                '.ot-pc-refuse-all-handler'
            ],
            settings: ['#onetrust-pc-btn-handler']
        };

        for (const selector of oneTrustSelectors[action] || []) {
            try {
                const button = await this.page.$(selector);
                if (button) {
                    const isVisible = await button.evaluate(el => el.offsetParent !== null);
                    if (isVisible) {
                        await button.click();
                        console.log(`✅ Clicked OneTrust ${action} button: ${selector} [${detectedLanguage}]`);
                        await new Promise(resolve => setTimeout(resolve, 5000));
                        return true;
                    }
                }
            } catch (error) {
                console.log(`⚠️ Error with OneTrust selector ${selector}:`, error.message);
            }
        }

        // ✅ PRIORITY 3: Cookiebot detection (with multi-language fallback)
        const cookiebotSelectors = {
            accept: [
                '#CybotCookiebotDialogBodyLevelButtonLevelOptinAllowAll',
                '#CybotCookiebotDialogBodyButtonAccept',
                'button[data-cookie-optin-type="all"]',
                'a[data-cookie-optin-type="all"]'
            ],
            reject: [
                '#CybotCookiebotDialogBodyLevelButtonLevelOptinDeclineAll', 
                '#CybotCookiebotDialogBodyButtonDecline',
                'button[data-cookie-optin-type="necessary"]',
                'a[data-cookie-optin-type="necessary"]'
            ],
            settings: [
                '#CybotCookiebotDialogBodyLevelButtonLevelDetails',
                'button[data-cookie-optin-type="details"]'
            ]
        };

        for (const selector of cookiebotSelectors[action] || []) {
            try {
                const button = await this.page.$(selector);
                if (button) {
                    const isVisible = await button.evaluate(el => el.offsetParent !== null);
                    if (isVisible) {
                        await button.click();
                        console.log(`✅ Clicked Cookiebot ${action} button: ${selector} [${detectedLanguage}]`);
                        await new Promise(resolve => setTimeout(resolve, 5000));
                        return true;
                    }
                }
            } catch (error) {
                console.log(`⚠️ Error with Cookiebot selector ${selector}:`, error.message);
            }
        }

        // ✅ PRIORITY 4: TrustArc detection - ENHANCED IMPLEMENTATION
        console.log(`🔍 Trying TrustArc-specific detection for ${action}...`);
        
        // Enhanced TrustArc text-based detection
        const trustArcTextResult = await this.page.evaluate((actionType, patterns) => {
            // TrustArc often uses iframes and specific text patterns
            const allElements = Array.from(document.querySelectorAll('button, a, [role="button"], input[type="button"], input[type="submit"], div[onclick]'));
            
            // TrustArc-specific patterns by language
            const trustArcPatterns = {
                accept: {
                    'de': ['akzeptieren', 'annehmen', 'zustimmen', 'alle akzeptieren', 'cookies akzeptieren'],
                    'en': ['accept', 'accept all', 'agree', 'allow all', 'consent']
                },
                reject: {
                    'de': ['ablehnen', 'zurückweisen', 'verweigern', 'alle ablehnen', 'cookies ablehnen'],
                    'en': ['reject', 'decline', 'deny', 'reject all', 'opt out']
                },
                settings: {
                    'de': ['einstellungen', 'anpassen', 'verwalten', 'mehr optionen'],
                    'en': ['settings', 'preferences', 'manage', 'more options']
                }
            };
            
            // Detect language from page
            const htmlLang = document.documentElement.lang || 'en';
            const detectedLang = htmlLang.toLowerCase().substring(0, 2);
            const currentPatterns = trustArcPatterns[actionType][detectedLang] || trustArcPatterns[actionType]['en'];
            
            for (const element of allElements) {
                const text = (element.textContent || element.value || '').toLowerCase().trim();
                const ariaLabel = element.getAttribute('aria-label')?.toLowerCase() || '';
                const title = element.getAttribute('title')?.toLowerCase() || '';
                const onclick = element.getAttribute('onclick') || '';
                const combinedText = text + ' ' + ariaLabel + ' ' + title;
                
                // Check TrustArc patterns
                for (const pattern of currentPatterns) {
                    if (combinedText.includes(pattern) || onclick.includes(pattern)) {
                        // Additional validation for TrustArc elements
                        if (onclick.includes('truste') || 
                            element.className.includes('truste') ||
                            element.id.includes('truste') ||
                            text.length < 50) { // Avoid long explanatory text
                            
                            const rect = element.getBoundingClientRect();
                            if (rect.width > 0 && rect.height > 0) {
                                element.click();
                                return `TrustArc ${actionType}: "${text || ariaLabel || 'button'}" (${pattern})`;
                            }
                        }
                    }
                }
            }
            
            // Also check iframes for TrustArc content
            const iframes = document.querySelectorAll('iframe[src*="trustarc"], iframe[src*="truste"]');
            for (const iframe of iframes) {
                try {
                    const rect = iframe.getBoundingClientRect();
                    if (rect.width > 100 && rect.height > 50) {
                        // Try to access iframe content
                        const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
                        if (iframeDoc) {
                            const iframeButtons = iframeDoc.querySelectorAll('button, a, [role="button"]');
                            for (const btn of iframeButtons) {
                                const btnText = btn.textContent?.toLowerCase() || '';
                                for (const pattern of currentPatterns) {
                                    if (btnText.includes(pattern)) {
                                        btn.click();
                                        return `TrustArc iframe ${actionType}: "${btnText}" (${pattern})`;
                                    }
                                }
                            }
                        }
                    }
                } catch (e) {
                    // Cross-origin iframe, continue to fallback
                }
            }
            
            return false;
        }, action, targetPatterns);

        if (trustArcTextResult) {
            console.log(`✅ Clicked TrustArc ${action} button: ${trustArcTextResult} [${detectedLanguage}]`);
            await new Promise(resolve => setTimeout(resolve, 5000));
            return true;
        }
        
        // Fallback to standard selectors
        const trustArcSelectors = {
            accept: [
                'button[onclick*="truste"]',
                '.truste-button-1', 
                '.call',
                'input[value*="accept"], input[value*="akzeptieren"]',
                // Oracle-specific patterns observed
                'button[class*="accept"]', 
                'a[href*="consent"][href*="accept"]'
            ],
            reject: [
                'button[onclick*="reject"]',
                '.truste-button-2',
                '.call2',
                'input[value*="reject"], input[value*="ablehnen"]',
                // Oracle-specific patterns observed
                'button[class*="reject"]',
                'a[href*="consent"][href*="reject"]'
            ],
            settings: [
                '.truste-button-3',
                'button[onclick*="preferences"]',
                'a[href*="privacy-preferences"]',
                'button[class*="settings"]'
            ]
        };

        for (const selector of trustArcSelectors[action] || []) {
            try {
                const button = await this.page.$(selector);
                if (button) {
                    const isVisible = await button.evaluate(el => el.offsetParent !== null);
                    if (isVisible) {
                        await button.click();
                        console.log(`✅ Clicked TrustArc ${action} button: ${selector} [${detectedLanguage}]`);
                        await new Promise(resolve => setTimeout(resolve, 5000));
                        return true;
                    }
                }
            } catch (error) {
                console.log(`⚠️ Error with TrustArc selector ${selector}:`, error.message);
            }
        }

        // ✅ PRIORITY 5: AmEx UCM detection - NEW IMPLEMENTATION  
        console.log(`🔍 Trying AmEx UCM-specific detection for ${action}...`);
        
        // UCM uses standard button text but may need specific handling
        const ucmTextBased = await this.page.evaluate((actionType) => {
            const buttons = document.querySelectorAll('button, a[role="button"], input[type="button"]');
            const patterns = {
                accept: ['alle akzeptieren', 'akzeptieren', 'accept all', 'accept'],
                reject: ['alle ablehnen', 'ablehnen', 'reject all', 'reject', 'decline'],
                settings: ['mehr optionen', 'optionen', 'more options', 'settings', 'preferences']
            };
            
            const targetPatterns = patterns[actionType] || [];
            
            for (const button of buttons) {
                const text = button.textContent?.toLowerCase().trim() || '';
                const value = button.value?.toLowerCase() || '';
                const combinedText = text + ' ' + value;
                
                for (const pattern of targetPatterns) {
                    if (combinedText.includes(pattern)) {
                        const rect = button.getBoundingClientRect();
                        if (rect.width > 0 && rect.height > 0) {
                            button.click();
                            return `UCM ${actionType}: "${text || value}"`;
                        }
                    }
                }
            }
            return false;
        }, action);

        if (ucmTextBased) {
            console.log(`✅ Clicked UCM ${action} button: ${ucmTextBased} [${detectedLanguage}]`);
            await new Promise(resolve => setTimeout(resolve, 5000));
            return true;
        }

        // ✅ PRIORITY 6: Usercentrics detection - ENHANCED & FIXED
        console.log(`🔍 Trying Usercentrics-specific detection for ${action}...`);
        
        // First try text-based detection with proper async handling
        try {
            const usercentricsTextResult = await this.page.evaluate(async (actionType) => {
                // Wait for potential dynamic content
                await new Promise(resolve => setTimeout(resolve, 2000));
                
                // Enhanced element selection including shadow DOM
                let allElements = Array.from(document.querySelectorAll('button, a, [role="button"], div[onclick], [class*="button"], [data-testid]'));
                
                // Check for shadow DOM elements
                document.querySelectorAll('*').forEach(el => {
                    if (el.shadowRoot) {
                        const shadowButtons = Array.from(el.shadowRoot.querySelectorAll('button, a, [role="button"]'));
                        allElements = allElements.concat(shadowButtons);
                    }
                });
                
                const patterns = {
                    accept: ['alle cookies akzeptieren', 'alle akzeptieren', 'akzeptieren', 'zustimmen'],
                    reject: ['cookies ablehnen', 'alle ablehnen', 'ablehnen', 'zurückweisen'],
                    settings: ['einstellungen verwalten', 'einstellungen', 'cookie-einstellungen', 'verwalten']
                };
                
                const targetPatterns = patterns[actionType] || [];
                
                for (const element of allElements) {
                    const text = element.textContent?.toLowerCase().trim() || '';
                    const ariaLabel = element.getAttribute('aria-label')?.toLowerCase() || '';
                    const title = element.getAttribute('title')?.toLowerCase() || '';
                    // ✅ CRITICAL FIX: Safe className access
                    const className = String(element.className || '').toLowerCase();
                    const combinedText = text + ' ' + ariaLabel + ' ' + title + ' ' + className;
                    
                    for (const pattern of targetPatterns) {
                        if (combinedText.includes(pattern)) {
                            const rect = element.getBoundingClientRect();
                            if (rect.width > 0 && rect.height > 0) {
                                element.click();
                                return `Usercentrics ${actionType}: "${text || ariaLabel || 'unlabeled'}"`;
                            }
                        }
                    }
                }
                return false;
            }, action);

            if (usercentricsTextResult) {
                console.log(`✅ Clicked Usercentrics ${action} button via enhanced detection: ${usercentricsTextResult} [${detectedLanguage}]`);
                await new Promise(resolve => setTimeout(resolve, 5000));
                return true;
            }
        } catch (error) {
            console.log(`⚠️ Error with Usercentrics text detection:`, error.message);
        }

        // Fallback to standard selectors
        const usercentricsSelectors = {
            accept: [
                '[data-usercentrics="accept"]',
                '[data-usercentrics="accept-all"]', 
                '.usercentrics-accept-all',
                'button[data-testid="uc-accept-all-button"]',
                '[data-testid="uc-accept-all-button"]'
            ],
            reject: [
                '[data-usercentrics="deny"]',
                '[data-usercentrics="reject-all"]',
                '.usercentrics-deny-all', 
                'button[data-testid="uc-deny-all-button"]',
                '[data-testid="uc-deny-all-button"]'
            ],
            settings: [
                '[data-usercentrics="settings"]',
                '.usercentrics-settings',
                'button[data-testid="uc-more-information-button"]',
                '[data-testid="uc-more-information-button"]'
            ]
        };

        for (const selector of usercentricsSelectors[action] || []) {
            try {
                const button = await this.page.$(selector);
                if (button) {
                    const isVisible = await button.evaluate(el => el.offsetParent !== null);
                    if (isVisible) {
                        await button.click();
                        console.log(`✅ Clicked Usercentrics ${action} button: ${selector} [${detectedLanguage}]`);
                        await new Promise(resolve => setTimeout(resolve, 5000));
                        return true;
                    }
                }
            } catch (error) {
                console.log(`⚠️ Error with Usercentrics selector ${selector}:`, error.message);
            }
        }

        // ✅ PRIORITY 7: Iframe handling (with multi-language support)
        const iframeSuccess = await this.page.evaluate((actionType, patterns) => {
            const iframes = document.querySelectorAll('iframe');
            for (const iframe of iframes) {
                try {
                    const rect = iframe.getBoundingClientRect();
                    if (rect.width > 100 && rect.height > 100) {
                        try {
                            const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
                            if (iframeDoc) {
                                const buttons = iframeDoc.querySelectorAll('button, a, [role="button"]');
                                for (const btn of buttons) {
                                    const text = btn.textContent.toLowerCase();
                                    
                                    // Use language-specific patterns
                                    for (const pattern of patterns) {
                                        if (text.includes(pattern.toLowerCase())) {
                                            btn.click();
                                            return `iframe_multilang_${actionType}_${pattern}`;
                                        }
                                    }
                                }
                            }
                        } catch (crossOriginError) {}
                        
                        // Fallback positioning for iframes
                        if (actionType === 'accept') {
                            const event = new MouseEvent('click', {
                                clientX: rect.left + rect.width * 0.7,
                                clientY: rect.top + rect.height * 0.8
                            });
                            document.elementFromPoint(event.clientX, event.clientY)?.click();
                            return 'iframe_fallback_accept';
                        } else if (actionType === 'reject') {
                            const event = new MouseEvent('click', {
                                clientX: rect.left + rect.width * 0.3,
                                clientY: rect.top + rect.height * 0.8
                            });
                            document.elementFromPoint(event.clientX, event.clientY)?.click();
                            return 'iframe_fallback_reject';
                        }
                    }
                } catch (e) {}
            }
            return false;
        }, action, targetPatterns);

        if (iframeSuccess) {
            console.log(`✅ Clicked ${action} in iframe: ${iframeSuccess} [${detectedLanguage}]`);
            await new Promise(resolve => setTimeout(resolve, 5000));
            
            try {
                await this.page.waitForFunction(
                    () => document.readyState === 'complete',
                    { timeout: 10000 }
                );
            } catch (timeoutError) {
                console.log('⚠️ Page load timeout after consent click, continuing...');
            }
            
            return true;
        }

        console.log(`❌ No ${action} button found for language ${detectedLanguage.toUpperCase()}`);
        return false;
    }

    async analyzeBanner() {
        const bannerInfo = await this.page.evaluate(() => {
            const oneTrustBanner = document.querySelector('#onetrust-banner-sdk, #onetrust-consent-sdk');
            const cookiebotBanner = document.querySelector('#CybotCookiebotDialog, [id*="Cookiebot"], [id*="cookiebot"], .cookiebot') ||
                                   document.querySelector('iframe[src*="cookiebot"], iframe[src*="cookieinformation"]');
            const sourcePointBanner = document.querySelector('[class*="sp_choice"], [id*="sp_"], .message-container') ||
                                     document.querySelector('iframe[src*="sourcepoint"], iframe[title*="SP Consent"]');
            
            // ✅ ENHANCED: MICROSOFT CUSTOM CONSENT DETECTION
            const microsoftBanner = document.querySelector('[data-module="cookiebanner"], .mscc-banner, #msccBanner, [id*="mscc"]') ||
                                   document.querySelector('script[src*="wcpstatic.microsoft.com"]')?.parentElement;
            
            // ✅ ENHANCED: USERCENTRICS CMP DETECTION - Major European CMP
            const usercentricsBanner = document.querySelector('[data-usercentrics], #usercentrics-root, .usercentrics') ||
                                      document.querySelector('script[src*="usercentrics"]')?.parentElement ||
                                      document.querySelector('script[src*="app.usercentrics.eu"]')?.parentElement;
            
            // ✅ NEW: TRUSTARC CMP DETECTION - Based on Oracle patterns
            const trustArcBanner = document.querySelector('script[src*="consent.trustarc.com"]')?.parentElement ||
                                  document.querySelector('iframe[src*="consent.trustarc.com"]') ||
                                  document.querySelector('[data-domain*="trustarc"], [id*="truste"], [class*="truste"]') ||
                                  document.querySelector('#truste-consent-track, .truste_box_overlay') ||
                                  // Text-based detection for TrustArc content
                                  Array.from(document.querySelectorAll('div, section')).find(el => 
                                      el.textContent && (
                                          el.textContent.includes('Powered by TrustArc') ||
                                          el.textContent.includes('TrustArc') ||
                                          (el.textContent.includes('Cookie-Einstellungen') && el.textContent.length < 500)
                                      )
                                  );
            
            // ✅ NEW: AMERICAN EXPRESS UCM DETECTION - Custom consent management
            const ucmBanner = document.querySelector('script[src*="user-consent-management"]')?.parentElement ||
                             document.querySelector('script[src*="/ucm/"]')?.parentElement ||
                             // AmEx-specific patterns
                             document.querySelector('script[src*="aexp-static.com"][src*="consent"]')?.parentElement ||
                             // Text-based detection for AmEx cookie settings
                             Array.from(document.querySelectorAll('div, section')).find(el => 
                                 el.textContent && (
                                     el.textContent.includes('American Express Cookie-Einstellungen') ||
                                     el.textContent.includes('Unsere Verwendung von Cookies')
                                 )
                             );
            
            const banner = oneTrustBanner || cookiebotBanner || sourcePointBanner || microsoftBanner || usercentricsBanner || trustArcBanner || ucmBanner;
            if (!banner) return { detected: false };
            
            const consentButtons = [];
            const iframeButtons = [];
            
            // Universal consent button detection with multi-language support - USERCENTRICS ENHANCED
            const universalButtonPatterns = [
                // English
                'accept', 'reject', 'decline', 'allow', 'deny', 'manage', 'settings',
                // German - USERCENTRICS ENHANCED
                'annehmen', 'ablehnen', 'akzeptieren', 'verweigern', 'einstellungen', 'verwalten',
                'alle cookies akzeptieren', 'cookies ablehnen', 'alle akzeptieren', 'alle ablehnen',
                // Spanish
                'aceptar', 'rechazar', 'gestionar', 'configuración',
                // French  
                'accepter', 'refuser', 'gérer', 'paramètres',
                // Italian
                'accetta', 'rifiuta', 'gestisci', 'impostazioni',
                // Dutch
                'accepteren', 'weigeren', 'beheren', 'instellingen',
                // Danish
                'accepter', 'afvis', 'administrer', 'indstillinger',
                // Swedish - ENHANCED
                'acceptera', 'avvisa', 'hantera', 'inställningar', 'godkänn', 'neka'
            ];
            
            // ✅ CRITICAL FIX: Safe property access to prevent className error + TrustArc Enhancement
            document.querySelectorAll('button, a[role="button"], [data-cookie-optin-type], input[type="button"], [class*="button"], [data-testid], iframe[src*="trustarc"], iframe[src*="truste"]').forEach(btn => {
                const text = (btn.textContent || btn.value || '').toLowerCase().trim();
                const ariaLabel = btn.getAttribute('aria-label')?.toLowerCase() || '';
                const title = btn.getAttribute('title')?.toLowerCase() || '';
                // ✅ FIXED: Safe className access
                const className = btn.className ? String(btn.className).toLowerCase() : '';
                const dataTestId = btn.getAttribute('data-testid')?.toLowerCase() || '';
                const onclick = btn.getAttribute('onclick')?.toLowerCase() || '';
                
                const combinedText = text + ' ' + ariaLabel + ' ' + title + ' ' + className + ' ' + dataTestId + ' ' + onclick;
                
                if (combinedText && (
                    universalButtonPatterns.some(pattern => combinedText.includes(pattern)) ||
                    combinedText.includes('cookie') || combinedText.includes('privacy') ||
                    combinedText.includes('consent') || combinedText.includes('trustarc') ||
                    combinedText.includes('truste') || onclick.includes('truste') ||
                    btn.id.includes('cookie') || btn.id.includes('consent') ||
                    className.includes('cookie') || className.includes('consent') ||
                    className.includes('truste')
                )) {
                    consentButtons.push(text || ariaLabel || title || 'unlabeled');
                }
                
                // ✅ ENHANCED: Special handling for TrustArc iframes
                if (btn.tagName === 'IFRAME' && (btn.src.includes('trustarc') || btn.src.includes('truste'))) {
                    consentButtons.push('trustarc-iframe');
                }
            });
            
            // ✅ NEW: Also check shadow DOM for buttons
            document.querySelectorAll('*').forEach(el => {
                if (el.shadowRoot) {
                    el.shadowRoot.querySelectorAll('button, a[role="button"]').forEach(btn => {
                        const text = btn.textContent?.toLowerCase().trim() || '';
                        if (text && text.length < 50) {
                            consentButtons.push(text);
                        }
                    });
                }
            });
            
            // ✅ NEW: TrustArc-specific iframe button detection
            document.querySelectorAll('iframe[src*="trustarc"], iframe[src*="truste"]').forEach(iframe => {
                try {
                    const iframeDoc = iframe.contentDocument;
                    if (iframeDoc) {
                        iframeDoc.querySelectorAll('button, a[role="button"], input[type="button"]').forEach(btn => {
                            const text = btn.textContent?.toLowerCase().trim() || btn.value?.toLowerCase() || '';
                            if (text && text.length < 50) {
                                iframeButtons.push(`trustarc-${text}`);
                            }
                        });
                    }
                } catch (e) {
                    // Cross-origin iframe - add placeholder
                    iframeButtons.push('trustarc-iframe-crossorigin');
                }
            });
            
            document.querySelectorAll('iframe').forEach(iframe => {
                try {
                    const iframeDoc = iframe.contentDocument;
                    if (iframeDoc) {
                        iframeDoc.querySelectorAll('button, a[role="button"]').forEach(btn => {
                            const text = btn.textContent.toLowerCase().trim();
                            if (text && text.length < 50) {
                                iframeButtons.push(text);
                            }
                        });
                    }
                } catch (e) {}
            });
            
            const allButtonTexts = [...consentButtons, ...iframeButtons].slice(0, 20);
            
            // Multi-language acceptance detection - TRUSTARC ENHANCED
            const hasAccept = allButtonTexts.some(text => 
                ['accept', 'allow', 'agree', 'consent', 'yes', 'ok',
                 'annehmen', 'akzeptieren', 'zustimmen', 'ja', 'alle akzeptieren', 'alle cookies akzeptieren',
                 'aceptar', 'permitir', 'acepto', 'sí',
                 'accepter', 'autoriser', 'oui',
                 'accetta', 'consenti', 'sì',
                 'accepteren', 'toestaan', 'ja',
                 'accepter', 'tillad', 'ja',
                 'acceptera', 'tillåt', 'ja', 'godkänn', // ✅ Swedish enhanced
                 // ✅ TrustArc specific patterns
                 'trustarc-accept', 'trustarc-allow', 'trustarc-iframe'
                ].some(pattern => text.includes(pattern))
            );
            
            // Multi-language rejection detection - TRUSTARC ENHANCED
            const hasReject = allButtonTexts.some(text => 
                ['reject', 'decline', 'deny', 'no', 'necessary', 'essential',
                 'ablehnen', 'verweigern', 'zurückweisen', 'nein', 'notwendige', 'erforderliche', 
                 'cookies ablehnen', 'alle ablehnen',
                 'rechazar', 'declinar', 'denegar', 'no', 'necesarias', 'esenciales', 
                 'refuser', 'décliner', 'non', 'nécessaires', 'essentiels',
                 'rifiuta', 'declina', 'no', 'necessari', 'essenziali',
                 'weigeren', 'afwijzen', 'nee', 'noodzakelijke', 'essentiële',
                 'afvis', 'nægt', 'nej', 'nødvendige', 'væsentlige',
                 'avvisa', 'neka', 'nej', 'nödvändiga', 'väsentliga', // ✅ Swedish enhanced
                 // ✅ TrustArc specific patterns
                 'trustarc-reject', 'trustarc-decline', 'trustarc-deny'
                ].some(pattern => text.includes(pattern))
            );
            
            // Multi-language settings detection - TRUSTARC ENHANCED
            const hasSettings = allButtonTexts.some(text => 
                ['manage', 'settings', 'preferences', 'customize', 'details', 'more',
                 'verwalten', 'einstellungen', 'anpassen', 'details', 'mehr',
                 'gestionar', 'configuración', 'personalizar', 'detalles', 'más',
                 'gérer', 'paramètres', 'personnaliser', 'détails', 'plus',
                 'gestisci', 'impostazioni', 'personalizza', 'dettagli', 'altro',
                 'beheren', 'instellingen', 'aanpassen', 'details', 'meer',
                 'administrer', 'indstillinger', 'tilpas', 'detaljer', 'flere',
                 'hantera', 'inställningar', 'anpassa', 'detaljer', 'fler', // ✅ Swedish enhanced
                 // ✅ TrustArc specific patterns
                 'trustarc-settings', 'trustarc-preferences', 'privacy-preferences'
                ].some(pattern => text.includes(pattern))
            );
            
            let provider = 'Unknown';
            if (oneTrustBanner) provider = 'OneTrust';
            else if (cookiebotBanner) provider = 'Cookiebot'; 
            else if (sourcePointBanner) provider = 'SourcePoint';
            else if (microsoftBanner) provider = 'Microsoft';
            else if (usercentricsBanner) provider = 'Usercentrics';  // ✅ ENHANCED
            else if (trustArcBanner) provider = 'TrustArc';  // ✅ NEW
            else if (ucmBanner) provider = 'AmEx UCM';  // ✅ NEW
            
            const textContent = banner.textContent || banner.innerText || '';
            
            return {
                detected: true,
                provider,
                text: textContent.substring(0, 200),
                hasDirectReject: hasReject,
                hasAccept: hasAccept,
                hasSettings: hasSettings,
                type: hasReject ? 'GDPR_style' : 'US_style',
                buttonTexts: allButtonTexts
            };
        });
        
        console.log('🎯 Banner Analysis:', bannerInfo);
        return bannerInfo;
    }

    async crawlSite(url) {
        console.log(`🌐 Crawling: ${url}`);
        const results = { url, evidence: {} };

        try {
            console.log('📋 Loading baseline...');
            await this.page.goto(url, { waitUntil: 'domcontentloaded', timeout: this.options.timeout });
            await new Promise(resolve => setTimeout(resolve, 5000));
            results.evidence.baseline = await this.captureEvidence('baseline', url);

            console.log('📋 Loading for reject...');
            await this.page.deleteCookie(...await this.page.cookies());
            await this.page.evaluate(() => localStorage.clear());
            await this.page.goto(url, { waitUntil: 'domcontentloaded', timeout: this.options.timeout });
            await new Promise(resolve => setTimeout(resolve, 5000));
            
            const bannerInfo = await this.analyzeBanner();
            results.bannerAnalysis = bannerInfo;
            
            results.evidence.reject_pre = await this.captureEvidence('reject_pre', url);
            
            if (bannerInfo.hasDirectReject) {
                const rejectSuccess = await this.clickCMPButton('reject');
                if (rejectSuccess) {
                    console.log('⏳ Waiting for rejection to take effect...');
                    await new Promise(resolve => setTimeout(resolve, 8000));
                    await this.page.reload({ waitUntil: 'domcontentloaded' });
                    await new Promise(resolve => setTimeout(resolve, 3000));
                }
                results.evidence.reject = await this.captureEvidence('reject', url);
            } else {
                console.log('⚠️ US-style banner: No reject option available');
                results.evidence.reject = {
                    ...results.evidence.reject_pre,
                    stage: 'reject_unavailable',
                    violation: 'No reject option provided (GDPR violation)'
                };
            }

            console.log('📋 Loading for accept...');
            await this.page.deleteCookie(...await this.page.cookies());
            await this.page.evaluate(() => localStorage.clear());
            await this.page.goto(url, { waitUntil: 'domcontentloaded', timeout: this.options.timeout });
            await new Promise(resolve => setTimeout(resolve, 5000));
            results.evidence.accept_pre = await this.captureEvidence('accept_pre', url);
            
            const acceptSuccess = await this.clickCMPButton('accept');
            if (acceptSuccess) {
                console.log('⏳ Waiting for acceptance to take effect and load tracking...');
                await new Promise(resolve => setTimeout(resolve, 10000));
                
                try {
                    await this.page.waitForFunction(
                        () => document.readyState === 'complete',
                        { timeout: 15000 }
                    );
                } catch (timeoutError) {
                    console.log('⚠️ Page complete timeout, continuing...');
                }
                
                await new Promise(resolve => setTimeout(resolve, 5000));
            }
            results.evidence.accept = await this.captureEvidence('accept', url);

            // ✅ GDPR VIOLATION ANALYSIS WITH CORRECT STAGE MAPPING
            console.log('\n🔍 ANALYZING GDPR COMPLIANCE...');
            console.log('📊 Running Professional Violation Detection Engine');

            const evidencePackage = {
                domain: url,
                stages: []
            };

            console.log('🔧 DEBUG: Raw evidence keys:', Object.keys(results.evidence));

            // CRITICAL FIX: stage MUST come AFTER spread operator to not be overwritten
            if (results.evidence.baseline) {
                console.log('📊 Mapping baseline to pre-consent stage (FINAL FIX)');
                const preConsentStage = {
                    ...results.evidence.baseline,
                    stage: 'pre-consent',
                    bannerAnalysis: bannerInfo
                };
                evidencePackage.stages.push(preConsentStage);
                console.log('🔧 DEBUG: Pre-consent stage created with stage name:', preConsentStage.stage);
            }

            if (results.evidence.reject_pre) {
                console.log('📊 Mapping reject_pre stage');
                evidencePackage.stages.push({
                    ...results.evidence.reject_pre,
                    stage: 'reject_pre'
                });
            }

            if (results.evidence.reject) {
                console.log('📊 Mapping post-reject stage (FINAL FIX)');
                evidencePackage.stages.push({
                    ...results.evidence.reject,
                    stage: 'post-reject'
                });
            }

            if (results.evidence.accept_pre) {
                console.log('📊 Mapping accept_pre stage');
                evidencePackage.stages.push({
                    ...results.evidence.accept_pre,
                    stage: 'accept_pre'
                });
            }

            if (results.evidence.accept) {
                console.log('📊 Mapping post-accept stage (FINAL FIX)');
                evidencePackage.stages.push({
                    ...results.evidence.accept,
                    stage: 'post-accept'
                });
            }

            console.log(`📊 Evidence package prepared with ${evidencePackage.stages.length} stages`);
            console.log(`📊 Stage names (FINAL FIX): ${evidencePackage.stages.map(s => s.stage).join(', ')}`);

            // DEBUG: Verify stages exist
            const preConsentCheck = evidencePackage.stages.find(s => s.stage === 'pre-consent');
            const postRejectCheck = evidencePackage.stages.find(s => s.stage === 'post-reject');
            const postAcceptCheck = evidencePackage.stages.find(s => s.stage === 'post-accept');

            console.log('✅ FINAL DEBUG VERIFICATION:');
            console.log('  Pre-consent stage found:', !!preConsentCheck, 'with tracking:', preConsentCheck?.scriptAnalysis?.tracking);
            console.log('  Post-reject stage found:', !!postRejectCheck);
            console.log('  Post-accept stage found:', !!postAcceptCheck);
            console.log('  Banner analysis attached:', !!preConsentCheck?.bannerAnalysis);

            const gdprReport = this.violationEngine.analyzeCompliance(evidencePackage);
            results.gdprCompliance = gdprReport;

        } catch (error) {
            console.error(`❌ Crawl error:`, error.message);
            results.error = error.message;
        }

        return results;
    }

    async close() {
        if (this.browser) {
            await this.browser.close();
        }
    }
}

module.exports = SpectralCrawler;