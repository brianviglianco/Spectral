// backend/cookieIntelligence.js
'use strict';

// PATTERN-BASED DETECTION
const TRACKING_PATTERNS = {
    // Google ecosystem
    google: {
        patterns: ['google-analytics', 'googletagmanager', 'googlesyndication', 'googleadservices', 'doubleclick', 'google.com/gen_204', 'gstatic.com', '2mdn.net', 'google.com/pagead'],
        cookies: [
            { name: '_ga', category: 'analytics', duration: '2 years', probability: 0.95 },
            { name: '_gid', category: 'analytics', duration: '24 hours', probability: 0.95 },
            { name: '_gat', category: 'analytics', duration: '1 minute', probability: 0.80 },
            { name: '_gcl_au', category: 'marketing', duration: '90 days', probability: 0.70 },
            { name: '_gcl_aw', category: 'marketing', duration: '90 days', probability: 0.70 },
            { name: 'IDE', category: 'marketing', duration: '13 months', probability: 0.85 },
            { name: 'test_cookie', category: 'marketing', duration: '15 minutes', probability: 0.60 },
            { name: '__gads', category: 'marketing', duration: '13 months', probability: 0.75 },
            { name: '__gpi', category: 'marketing', duration: '13 months', probability: 0.75 },
            { name: 'DSID', category: 'marketing', duration: '2 weeks', probability: 0.70 }
        ]
    },

    // Adobe/Omniture - EXPANDIDO
    adobe: {
        patterns: ['omtrdc', 'demdex', 'adobe', 'adobedtm', 'omniture', 'scene7', 'adobedc', '2o7.net'],
        cookies: [
            { name: 'mbox', category: 'analytics', duration: '2 years', probability: 0.90 },
            { name: 'mboxEdgeCluster', category: 'analytics', duration: '30 minutes', probability: 0.85 },
            { name: 's_vi', category: 'analytics', duration: '2 years', probability: 0.90 },
            { name: 's_fid', category: 'analytics', duration: '2 years', probability: 0.85 },
            { name: 's_cc', category: 'analytics', duration: 'session', probability: 0.80 },
            { name: 's_sq', category: 'analytics', duration: 'session', probability: 0.80 },
            { name: 'AMCV_', category: 'analytics', duration: '2 years', probability: 0.90 },
            { name: 'AMCVS_', category: 'analytics', duration: 'session', probability: 0.85 },
            { name: 'demdex', category: 'marketing', duration: '180 days', probability: 0.85 },
            // NUEVOS ADOBE ANALYTICS PATTERNS
            { name: 's_tp', category: 'analytics', duration: 'session', probability: 0.95 },
            { name: 's_vnc365', category: 'analytics', duration: '1 year', probability: 0.95 },
            { name: 's_ips', category: 'analytics', duration: 'session', probability: 0.95 },
            { name: 's_ppv', category: 'analytics', duration: 'session', probability: 0.95 },
            { name: 's_c49', category: 'analytics', duration: 'session', probability: 0.90 },
            { name: 's_ivc', category: 'analytics', duration: 'session', probability: 0.90 },
            { name: 's_ecid', category: 'analytics', duration: '2 years', probability: 0.95 }
        ]
    },

    // NUEVO: Akamai Bot Manager
    akamai: {
        patterns: ['akamai', 'akamaiedge', 'akamaihd', 'akstat'],
        cookies: [
            { name: 'bm_sz', category: 'necessary', duration: '4 hours', probability: 0.95 },
            { name: 'bm_sv', category: 'necessary', duration: '2 hours', probability: 0.95 },
            { name: 'bm_mi', category: 'necessary', duration: '2 hours', probability: 0.95 },
            { name: 'bm_ss', category: 'necessary', duration: 'session', probability: 0.95 },
            { name: 'bm_so', category: 'necessary', duration: 'session', probability: 0.95 },
            { name: 'bm_s', category: 'necessary', duration: 'session', probability: 0.90 },
            { name: 'bm_lso', category: 'necessary', duration: 'session', probability: 0.90 },
            { name: 'ak_bmsc', category: 'necessary', duration: '2 hours', probability: 0.95 },
            { name: '_abck', category: 'necessary', duration: '1 year', probability: 0.95 },
            { name: 'akGD', category: 'necessary', duration: 'session', probability: 0.90 }
        ]
    },

    // Facebook/Meta
    facebook: {
        patterns: ['facebook', 'fbcdn', 'fbsbx', 'instagram', 'whatsapp', 'messenger', 'fb.com'],
        cookies: [
            { name: '_fbp', category: 'marketing', duration: '90 days', probability: 0.95 },
            { name: '_fbc', category: 'marketing', duration: '90 days', probability: 0.85 },
            { name: 'fbm_', category: 'marketing', duration: '1 year', probability: 0.70 },
            { name: 'xs', category: 'marketing', duration: '1 year', probability: 0.60 },
            { name: 'fr', category: 'marketing', duration: '90 days', probability: 0.80 }
        ]
    },

    // Microsoft/Bing
    microsoft: {
        patterns: ['bing', 'microsoft', 'msn', 'clarity.ms', 'azure', 'outlook', 'live.com'],
        cookies: [
            { name: '_uetsid', category: 'marketing', duration: '1 day', probability: 0.90 },
            { name: '_uetvid', category: 'marketing', duration: '16 days', probability: 0.90 },
            { name: 'MUID', category: 'marketing', duration: '1 year', probability: 0.85 },
            { name: 'CLID', category: 'analytics', duration: '1 year', probability: 0.85 },
            { name: '_clck', category: 'analytics', duration: '1 year', probability: 0.85 },
            { name: '_clsk', category: 'analytics', duration: '1 day', probability: 0.80 }
        ]
    },

    // TikTok
    tiktok: {
        patterns: ['tiktok', 'byteoversea', 'ibytedtos'],
        cookies: [
            { name: '_tt_enable_cookie', category: 'marketing', duration: '13 months', probability: 0.90 },
            { name: '_ttp', category: 'marketing', duration: '13 months', probability: 0.90 },
            { name: 'tt_webid', category: 'marketing', duration: '13 months', probability: 0.85 },
            { name: 'tt_webid_v2', category: 'marketing', duration: '13 months', probability: 0.85 }
        ]
    },

    // LinkedIn
    linkedin: {
        patterns: ['linkedin', 'licdn'],
        cookies: [
            { name: 'li_gc', category: 'marketing', duration: '2 years', probability: 0.85 },
            { name: 'lidc', category: 'marketing', duration: '24 hours', probability: 0.85 },
            { name: 'bcookie', category: 'marketing', duration: '2 years', probability: 0.85 },
            { name: 'UserMatchHistory', category: 'marketing', duration: '30 days', probability: 0.80 }
        ]
    },

    // Pinterest
    pinterest: {
        patterns: ['pinterest', 'pinimg'],
        cookies: [
            { name: '_pinterest_sess', category: 'marketing', duration: '1 year', probability: 0.85 },
            { name: '_epik', category: 'marketing', duration: '1 year', probability: 0.80 },
            { name: '_derived_epik', category: 'marketing', duration: '1 year', probability: 0.75 }
        ]
    },

    // Snapchat
    snapchat: {
        patterns: ['snapchat', 'sc-cdn', 'snap.com'],
        cookies: [
            { name: '_scid', category: 'marketing', duration: '13 months', probability: 0.85 },
            { name: '_scsrid', category: 'marketing', duration: '8 hours', probability: 0.75 }
        ]
    },

    // Trade Desk
    tradedesk: {
        patterns: ['adsrvr', 'thetradedesk'],
        cookies: [
            { name: 'TDID', category: 'marketing', duration: '1 year', probability: 0.90 },
            { name: 'TDCPM', category: 'marketing', duration: '1 year', probability: 0.90 },
            { name: 'TTDOptOut', category: 'functional', duration: '5 years', probability: 0.70 }
        ]
    },

    // Criteo
    criteo: {
        patterns: ['criteo'],
        cookies: [
            { name: 'uid', category: 'marketing', duration: '13 months', probability: 0.85 },
            { name: 'cto_bundle', category: 'marketing', duration: '13 months', probability: 0.80 },
            { name: 'optout', category: 'functional', duration: '5 years', probability: 0.70 }
        ]
    },

    // Analytics platforms
    analytics: {
        patterns: ['hotjar', 'mixpanel', 'segment', 'amplitude', 'heap', 'fullstory', 'mouseflow', 'crazyegg', 'inspectlet', 'smartlook', 'logrocket', 'sessionstack'],
        cookies: [
            { name: '_hjSessionUser', category: 'analytics', duration: '1 year', probability: 0.90 },
            { name: '_hjSession', category: 'analytics', duration: '30 minutes', probability: 0.90 },
            { name: 'mp_', category: 'analytics', duration: '1 year', probability: 0.85 },
            { name: 'ajs_user_id', category: 'analytics', duration: '1 year', probability: 0.85 },
            { name: 'ajs_anonymous_id', category: 'analytics', duration: '1 year', probability: 0.85 },
            { name: 'amplitude_id', category: 'analytics', duration: '10 years', probability: 0.85 }
        ]
    },

    // Advertising networks
    adnetworks: {
        patterns: ['outbrain', 'taboola', 'pubmatic', 'rubicon', 'openx', 'appnexus', 'adnxs', 'amazon-adsystem', 'tribalfusion', 'exponential', 'adsystem'],
        cookies: [
            { name: 'uuid2', category: 'marketing', duration: '3 months', probability: 0.85 },
            { name: 'obuid', category: 'marketing', duration: '3 months', probability: 0.85 },
            { name: 't_gid', category: 'marketing', duration: '1 year', probability: 0.85 },
            { name: 'KRTBCOOKIE_', category: 'marketing', duration: '3 months', probability: 0.80 },
            { name: 'ad-id', category: 'marketing', duration: '9 months', probability: 0.85 }
        ]
    },

    // Video platforms
    video: {
        patterns: ['brightcove', 'jwplayer', 'vimeo', 'youtube', 'dailymotion', 'twitch', 'boltdns', 'kaltura', 'wistia', 'vidyard'],
        cookies: [
            { name: 'BC_BANDWIDTH', category: 'analytics', duration: '10 minutes', probability: 0.85 },
            { name: 'BC_TOKEN', category: 'analytics', duration: 'session', probability: 0.80 },
            { name: 'BC_VOLUME', category: 'functional', duration: 'persistent', probability: 0.75 },
            { name: 'YSC', category: 'analytics', duration: 'session', probability: 0.85 },
            { name: 'VISITOR_INFO1_LIVE', category: 'analytics', duration: '180 days', probability: 0.85 }
        ]
    },

    // Live chat
    livechat: {
        patterns: ['liveperson', 'zendesk', 'intercom', 'drift', 'tawk.to', 'freshchat', 'crisp', 'olark', 'livechatinc', 'comm100'],
        cookies: [
            { name: 'LP_VISITOR', category: 'functional', duration: '1 year', probability: 0.80 },
            { name: 'intercom-id', category: 'functional', duration: '9 months', probability: 0.85 },
            { name: 'drift_aid', category: 'functional', duration: '2 years', probability: 0.80 },
            { name: '__tawkuuid', category: 'functional', duration: '6 months', probability: 0.80 }
        ]
    },

    // Review platforms
    reviews: {
        patterns: ['bazaarvoice', 'trustpilot', 'yotpo', 'powerreviews', 'reevoo', 'feefo'],
        cookies: [
            { name: 'BVImplMain', category: 'analytics', duration: '1 year', probability: 0.80 },
            { name: 'BVBRANDID', category: 'analytics', duration: '1 year', probability: 0.75 },
            { name: 'yotpo_', category: 'analytics', duration: '1 year', probability: 0.75 }
        ]
    },

    // Performance monitoring
    monitoring: {
        patterns: ['newrelic', 'datadog', 'dynatrace', 'appdynamics', 'pingdom', 'sentry', 'raygun', 'rollbar'],
        cookies: [
            { name: 'JSESSIONID', category: 'analytics', duration: 'session', probability: 0.75 },
            { name: 'ADRUM', category: 'analytics', duration: 'session', probability: 0.80 },
            { name: '_dd_s', category: 'analytics', duration: '4 hours', probability: 0.80 }
        ]
    },

    // Marketing automation
    marketing: {
        patterns: ['hubspot', 'marketo', 'pardot', 'eloqua', 'mailchimp', 'klaviyo', 'braze', 'sendgrid', 'salesforce', 'exacttarget'],
        cookies: [
            { name: '__hstc', category: 'analytics', duration: '13 months', probability: 0.90 },
            { name: 'hubspotutk', category: 'analytics', duration: '13 months', probability: 0.90 },
            { name: '_mkto_trk', category: 'marketing', duration: '2 years', probability: 0.85 },
            { name: 'visitor_id', category: 'marketing', duration: '10 years', probability: 0.80 },
            { name: 'eloqua', category: 'marketing', duration: '13 months', probability: 0.80 }
        ]
    },

    // Data management
    dmp: {
        patterns: ['krux', 'bluekai', 'lotame', 'neustar', 'acxiom', 'liveramp', 'treasuredata', 'oracle.com/cx'],
        cookies: [
            { name: '_kuid_', category: 'marketing', duration: '180 days', probability: 0.85 },
            { name: 'bku', category: 'marketing', duration: '180 days', probability: 0.80 },
            { name: 'pid', category: 'marketing', duration: '13 months', probability: 0.80 }
        ]
    },

    // AB Testing
    testing: {
        patterns: ['optimizely', 'vwo', 'unbounce', 'googleoptimize', 'crazyegg', 'convert.com'],
        cookies: [
            { name: 'optimizelyEndUserId', category: 'analytics', duration: '10 years', probability: 0.85 },
            { name: '_vis_opt', category: 'analytics', duration: '100 days', probability: 0.80 },
            { name: '_gaexp', category: 'analytics', duration: '90 days', probability: 0.80 }
        ]
    },

    // Survey
    survey: {
        patterns: ['qualtrics', 'surveymonkey', 'typeform', 'usabilla', 'surveygizmo', 'getfeedback'],
        cookies: [
            { name: 'QSI_SI', category: 'analytics', duration: 'session', probability: 0.85 },
            { name: 'QSI_S', category: 'analytics', duration: 'session', probability: 0.85 },
            { name: 'sm_', category: 'analytics', duration: '2 years', probability: 0.75 }
        ]
    },

    // CDN
    cdn: {
        patterns: ['cloudflare', 'cloudfront', 'akamai', 'fastly', 'cdn77', 'stackpath', 'maxcdn', 'keycdn'],
        cookies: [
            { name: '__cf_bm', category: 'necessary', duration: '30 minutes', probability: 0.90 },
            { name: '__cfduid', category: 'necessary', duration: '30 days', probability: 0.85 },
            { name: 'akavpau', category: 'necessary', duration: '5 minutes', probability: 0.80 },
            { name: '_abck', category: 'necessary', duration: '1 year', probability: 0.85 }
        ]
    },

    // Yahoo
    yahoo: {
        patterns: ['yahoo', 'yimg', 'yahooapis'],
        cookies: [
            { name: 'B', category: 'marketing', duration: '1 year', probability: 0.80 },
            { name: 'GUC', category: 'functional', duration: '1 year', probability: 0.75 },
            { name: 'A3', category: 'marketing', duration: '1 year', probability: 0.75 }
        ]
    },

    // Twitter
    twitter: {
        patterns: ['twitter', 'twimg', 't.co'],
        cookies: [
            { name: 'personalization_id', category: 'marketing', duration: '2 years', probability: 0.85 },
            { name: 'guest_id', category: 'marketing', duration: '2 years', probability: 0.80 },
            { name: 'muc_ads', category: 'marketing', duration: '2 years', probability: 0.75 }
        ]
    },

    // Reddit
    reddit: {
        patterns: ['reddit', 'redditmedia'],
        cookies: [
            { name: '_rdt_uuid', category: 'marketing', duration: '90 days', probability: 0.80 },
            { name: 'loid', category: 'analytics', duration: '2 years', probability: 0.75 }
        ]
    }
};

// Get eTLD+1 for domain comparison
function getETLD(hostname) {
    if (!hostname) return '';
    
    hostname = hostname.toLowerCase().replace(/^\./, '').replace(/^www\./, '');
    
    const parts = hostname.split('.').reverse();
    const twoPartTLDs = ['co.uk', 'com.au', 'com.br', 'co.jp', 'co.in', 'com.mx', 'com.ar', 'co.nz', 'co.za'];
    
    const lastTwo = parts.length >= 2 ? `${parts[1]}.${parts[0]}` : '';
    
    if (twoPartTLDs.includes(lastTwo) && parts.length >= 3) {
        return `${parts[2]}.${lastTwo}`;
    }
    
    if (parts.length >= 2) {
        return `${parts[1]}.${parts[0]}`;
    }
    
    return hostname;
}

// SMART UNKNOWN CATEGORIZATION - MEJORADO
function categorizeUnknownCookie(cookieName, cookieDomain, cookieValue) {
    const name = cookieName.toLowerCase();
    const domain = cookieDomain.toLowerCase();
    
    // Pattern-based categorization - EXPANDIDO
    const patterns = {
        necessary: {
            patterns: ['sess', 'session', 'auth', 'token', 'csrf', 'xsrf', 'security', 'login', 'logged', 'cart', 'basket', 'checkout', '__cf', '_abck', 'bm_', 'akavpau', 'ak', 'akaalb'],
            confidence: 0.85
        },
        functional: {
            patterns: ['lang', 'locale', 'theme', 'preference', 'setting', 'timezone', 'currency', 'country', 'region', 'player', 'volume', 'chat', 'support'],
            confidence: 0.80
        },
        analytics: {
            patterns: ['_ga', '_gid', 'analytics', 'metric', 'stats', 'visitor', 'user_id', 'client_id', 'uuid', '_hj', 'mp_', 'ajs_', 'amplitude', 'mixpanel', 's_'],
            confidence: 0.85
        },
        marketing: {
            patterns: ['utm', 'campaign', 'fbclid', 'gclid', 'msclkid', 'ad', 'affiliate', 'ref', 'source', 'medium', '_fbp', '_tt', 'ide', '__gads'],
            confidence: 0.85
        }
    };
    
    // NUEVO: Patterns específicos de empresas
    // Adobe Analytics
    if (name.startsWith('s_') && name.length <= 10) {
        return { category: 'analytics', confidence: 0.90, reason: 'Adobe Analytics pattern' };
    }
    
    // Akamai Bot Manager  
    if (name.startsWith('bm_') || (name.startsWith('ak') && name.length < 15)) {
        return { category: 'necessary', confidence: 0.95, reason: 'Akamai Bot Protection' };
    }
    
    // Adobe Marketing Cloud
    if (name.includes('amcv') || name.includes('amcvs')) {
        return { category: 'analytics', confidence: 0.90, reason: 'Adobe Marketing Cloud' };
    }
    
    // Check patterns
    for (const [category, config] of Object.entries(patterns)) {
        for (const pattern of config.patterns) {
            if (name.includes(pattern)) {
                return {
                    category,
                    confidence: config.confidence,
                    reason: `Pattern match: ${pattern}`
                };
            }
        }
    }
    
    // Check value characteristics
    if (cookieValue && typeof cookieValue === 'string') {
        // UUID patterns
        if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cookieValue)) {
            return { category: 'analytics', confidence: 0.75, reason: 'UUID format' };
        }
        
        // Base64 encoded
        if (/^[A-Za-z0-9+/]+=*$/.test(cookieValue) && cookieValue.length > 20) {
            return { category: 'analytics', confidence: 0.60, reason: 'Encoded identifier' };
        }
        
        // Timestamp
        if (/^\d{10,13}$/.test(cookieValue)) {
            return { category: 'functional', confidence: 0.65, reason: 'Timestamp value' };
        }
        
        // GA Client ID format
        if (/^\d+\.\d+$/.test(cookieValue)) {
            return { category: 'analytics', confidence: 0.70, reason: 'GA-style client ID' };
        }
    }
    
    // Domain-based inference
    if (domain.includes('cdn') || domain.includes('static') || domain.includes('akamai')) {
        return { category: 'necessary', confidence: 0.70, reason: 'CDN/Infrastructure domain' };
    }
    
    if (domain.includes('api') || domain.includes('service')) {
        return { category: 'functional', confidence: 0.65, reason: 'API domain' };
    }
    
    // Short cookie names (like Dell's uuid, txuid) are often tracking
    if (name.length <= 6 && !name.includes('_')) {
        return { category: 'analytics', confidence: 0.55, reason: 'Short identifier' };
    }
    
    return { category: 'unknown', confidence: 0.0, reason: 'No pattern match' };
}

// MAIN INFERENCE ENGINE
function inferCookiesFromNetwork(requests, pageHostname, stageName) {
    const inferredCookies = [];
    const detectedServices = new Map();
    const pageBase = getETLD(pageHostname);
    
    // Phase 1: Detect services from network requests
    for (const req of requests) {
        try {
            const url = new URL(req.url);
            const domain = url.hostname.toLowerCase();
            const path = url.pathname.toLowerCase();
            
            // Check each tracking pattern
            for (const [serviceName, config] of Object.entries(TRACKING_PATTERNS)) {
                for (const pattern of config.patterns) {
                    // Check both domain and path
                    if (domain.includes(pattern) || path.includes(pattern)) {
                        if (!detectedServices.has(serviceName)) {
                            detectedServices.set(serviceName, {
                                domains: new Set(),
                                confidence: 0,
                                hits: 0
                            });
                        }
                        
                        const service = detectedServices.get(serviceName);
                        service.domains.add(domain);
                        service.confidence = Math.min(1.0, service.confidence + 0.2);
                        service.hits++;
                        break;
                    }
                }
            }
        } catch(e) {
            // Skip invalid URLs
        }
    }
    
    // Phase 2: Infer cookies based on detected services
    for (const [serviceName, serviceData] of detectedServices) {
        const config = TRACKING_PATTERNS[serviceName];
        
        // Lower threshold for acceptance stage
        const confidenceThreshold = stageName === 'accept' ? 0.2 : 0.4;
        
        if (serviceData.confidence >= confidenceThreshold) {
            for (const cookieTemplate of config.cookies) {
                // Lower probability threshold for accept stage
                const probThreshold = stageName === 'accept' ? 0.5 : 0.7;
                
                if (cookieTemplate.probability >= probThreshold) {
                    // Determine if 3P
                    const domainArray = Array.from(serviceData.domains);
                    const is3P = domainArray.some(d => getETLD(d) !== pageBase);
                    
                    // Determine cookie domain
                    let cookieDomain;
                    if (is3P && domainArray.length > 0) {
                        cookieDomain = '.' + getETLD(domainArray[0]);
                    } else {
                        cookieDomain = '.' + pageBase;
                    }
                    
                    inferredCookies.push({
                        name: cookieTemplate.name,
                        value: '[INFERRED]',
                        domain: cookieDomain,
                        path: '/',
                        expires: -1,
                        httpOnly: false,
                        secure: true,
                        sameSite: is3P ? 'None' : 'Lax',
                        session: cookieTemplate.duration === 'session',
                        size: cookieTemplate.name.length + 50,
                        gdprCategory: cookieTemplate.category,
                        isFirstParty: !is3P,
                        isInferred: true,
                        inferredFrom: domainArray[0],
                        service: serviceName,
                        confidence: serviceData.confidence * cookieTemplate.probability
                    });
                }
            }
            
            console.log(`[cookieIntelligence] Detected ${serviceName} with confidence ${serviceData.confidence.toFixed(2)} (${serviceData.hits} hits)`);
        }
    }
    
    console.log(`[cookieIntelligence] Inferred ${inferredCookies.length} cookies from ${detectedServices.size} services`);
    
    return inferredCookies;
}

module.exports = {
    TRACKING_PATTERNS,
    inferCookiesFromNetwork,
    categorizeUnknownCookie,
    getETLD
};