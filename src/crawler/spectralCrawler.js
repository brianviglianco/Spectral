/**
 * SPECTRAL CRAWLER — P0+P1 (v22 safe, sin createIncognitoBrowserContext)
 * - Espera de banner (retry) antes de baseline
 * - CDP: requests/responses/Set-Cookie por stage (HAR-lite)
 * - Estado OneTrust (OptanonActiveGroups / OptanonConsent)
 * - Idle de red adaptativo
 * - Sin incognito API; se usan newPage() y limpieza de estado
 */

const puppeteer = require('puppeteer');

const DEFAULT_VIEWPORT = { width: 1366, height: 900 };
const NAV_TIMEOUT = 45000;
const STAGE_IDLE_MS = 1200;
const STAGE_IDLE_MAX_MS = 3500;
const OVERLAY_MAX_WAIT_MS = 5000;
const MAX_REQ_PER_STAGE = 50;

const LAUNCH_ARGS = [
  '--no-sandbox',
  '--disable-web-security',
  '--disable-features=BlockThirdPartyCookies,TrackingProtection3pcd,PrivacySandboxAdsAPIs,FirstPartySets',
  '--disable-blink-features=AutomationControlled',
  '--disable-dev-shm-usage'
];

const TRACKING_ENDPOINT_REGEX = new RegExp([
  '\\bgoogle-analytics\\.com/(collect|g\\/collect|j\\/collect)',
  '\\bwww\\.google-analytics\\.com/(collect|r/collect)',
  '\\bwww\\.googletagmanager\\.com/gtag/js',
  '\\b(?:omtrdc|2o7|adobedtm|sc-omtrdc)\\.(net|com)/',
  '/b/ss/',
  'AMCV_[A-Z0-9]+%40AdobeOrg',
  '\\bconnect\\.facebook\\.net/.*/fbevents\\.js',
  'facebook\\.com/tr/?\\?',
  '\\bj\\.6sc\\.co/',
  '\\bsecure\\.quantserve\\.com/quant\\.js',
  '\\banalytics\\.tiktok\\.com/i18n/event',
  '\\bstatic\\.hotjar\\.com/c/hotjar-',
  '\\bscript\\.hotjar\\.com/modules',
  '\\bsnap\\.licdn\\.com/li.lms-analytics',
  '\\bbat\\.bing\\.com/(bat|action)\\.js',
  '\\b/collect\\b',
  '\\b/events\\b',
  '\\b/pixel\\b'
].join('|'), 'i');

const ONETRUST = {
  banner: ['#onetrust-banner-sdk','div#onetrust-consent-sdk','div.ot-sdk-container'],
  accept: ['#onetrust-accept-btn-handler','button#onetrust-accept-btn-handler','button[aria-label*="Accept"]'],
  reject: ['#onetrust-reject-all-handler','button#onetrust-reject-all-handler','button[aria-label*="Reject"]'],
  settings: ['#onetrust-pc-btn-handler','button#onetrust-pc-btn-handler','button[aria-label*="Settings"]'],
};

const STAGES = { BASELINE:'baseline', REJECT_PRE:'reject_pre', REJECT:'reject', ACCEPT_PRE:'accept_pre', ACCEPT:'accept' };
const dly = (ms)=>new Promise(r=>setTimeout(r,ms));

async function waitForNetworkQuiet(page, minMs=STAGE_IDLE_MS, maxMs=STAGE_IDLE_MAX_MS){
  const client = await page.createCDPSession();
  await client.send('Network.enable');
  let inflight = 0, last = Date.now();
  const bump=()=>{ last=Date.now(); };
  const onReq = ()=>{ inflight++; bump(); };
  const onDone= ()=>{ inflight=Math.max(0,inflight-1); bump(); };
  client.on('Network.requestWillBeSent', onReq);
  client.on('Network.loadingFinished', onDone);
  client.on('Network.loadingFailed', onDone);
  const start = Date.now();
  while (Date.now()-start < maxMs){
    await dly(100);
    if (inflight===0 && Date.now()-last>=minMs) break;
  }
  client.detach().catch(()=>{});
}

async function ensureVisibleHandle(page, selectors){
  for (const sel of selectors){
    try{
      const h = await page.$(sel);
      if (!h) continue;
      const box = await h.boundingBox();
      if (box) return h;
    }catch{}
  }
  return null;
}

async function detectCMP(page){
  const banner = await ensureVisibleHandle(page, ONETRUST.banner);
  if (banner){
    const accept = await ensureVisibleHandle(page, ONETRUST.accept);
    const reject = await ensureVisibleHandle(page, ONETRUST.reject);
    const settings = await ensureVisibleHandle(page, ONETRUST.settings);
    return { detected:true, provider:'OneTrust', buttons:{accept:!!accept,reject:!!reject,settings:!!settings}, handles:{banner,accept,reject,settings} };
  }
  return { detected:false, provider:'None', buttons:{accept:false,reject:false,settings:false}, handles:{} };
}

async function waitCMPOverlayOrTimeout(page, maxWaitMs=OVERLAY_MAX_WAIT_MS){
  const t0 = Date.now();
  while (Date.now()-t0 < maxWaitMs){
    const cmp = await detectCMP(page);
    if (cmp.detected) return cmp;
    await page.evaluate(()=>{ try{ window.scrollBy(0,200); }catch{} });
    await dly(150);
  }
  return detectCMP(page);
}

async function clickIfPresent(page, handle){
  if(!handle) return false;
  try{
    await handle.evaluate(el=>el.scrollIntoView({block:'center'}));
    await dly(60);
    await handle.click({delay:40});
    return true;
  }catch{
    try{ await page.evaluate(el=>el.click(), handle); return true; }catch{ return false; }
  }
}

function isLikelyTrackingUrl(url){ return TRACKING_ENDPOINT_REGEX.test(url||''); }

function classifyCookie(entry){
  const name = entry?.name || '';
  const domain = (entry?.domain || '').toLowerCase();
  const sameSite = String(entry?.sameSite || '');
  if (/^_ga|^_gid|^_gcl_|^_gat/.test(name)) return 'tracking';
  if (/^_fbp|^_fbc/.test(name)) return 'tracking';
  if (/^AMCV_/.test(name)) return 'tracking';
  if (/^Optanon/.test(name)) return 'consent';
  if (domain && /none/i.test(sameSite)) return 'likely_tracking';
  return 'unknown';
}

function buildHarLite(stageName, reqs){
  const sorted = [...reqs].sort((a,b)=>(a.ts||0)-(b.ts||0)).slice(0, MAX_REQ_PER_STAGE);
  return {
    stage: stageName,
    entries: sorted.map(r=>({
      url: r.url, method: r.method, status: r.status, mimeType: r.mimeType,
      ts: r.ts, fromCache: !!(r.fromDiskCache||r.fromServiceWorker),
      ip: r.remoteIP, initiator: r.initiatorType, setCookies: r.setCookies||[]
    }))
  };
}

async function readOneTrustState(page){
  try{
    return await page.evaluate(()=>({
      OptanonActiveGroups: window.OptanonActiveGroups,
      OptanonConsent: window.OptanonConsent
    }));
  }catch{ return {}; }
}

async function collectStorageSnapshot(page){
  try{
    return await page.evaluate(()=>{
      const ksLS = Object.keys(window.localStorage||{});
      const ksSS = Object.keys(window.sessionStorage||{});
      const sample=(st,ks,cap=20)=>ks.slice(0,cap).map(k=>({key:k,value:String(st.getItem(k)).slice(0,128)}));
      return {
        localStorageKeys: ksLS, sessionStorageKeys: ksSS,
        localStorageSample: sample(localStorage, ksLS),
        sessionStorageSample: sample(sessionStorage, ksSS),
      };
    });
  }catch{
    return { localStorageKeys:[], sessionStorageKeys:[], localStorageSample:[], sessionStorageSample:[] };
  }
}

function safeHeader(h, key){
  if (!h) return undefined;
  const k = Object.keys(h).find(k=>k.toLowerCase()===String(key).toLowerCase());
  return k ? h[k] : undefined;
}

async function clearPageState(page){
  try{
    const client = await page.createCDPSession();
    await client.send('Network.clearBrowserCookies').catch(()=>{});
    await client.send('Network.clearBrowserCache').catch(()=>{});
  }catch{}
  try{ await page.evaluate(()=>{ try{ localStorage.clear(); sessionStorage.clear(); }catch{} }); }catch{}
}

async function stageCapture(page, url, stageName, opts={}){
  const client = await page.createCDPSession();
  await client.send('Network.enable');

  const stageReqs = [];
  const trackingHits = [];
  const setCookies = [];

  const onReq = (e)=>{
    try{
      stageReqs.push({
        url: e.request?.url, method: e.request?.method, ts: e.timestamp,
        initiatorType: e.initiator?.type
      });
      if (isLikelyTrackingUrl(e.request?.url)){
        trackingHits.push({ url: e.request.url, method: e.request.method, ts: e.timestamp });
      }
    }catch{}
  };

  const onResp = (e)=>{
    try{
      const url = e.response?.url;
      const m = stageReqs.find(r=>r.url===url && !r.status);
      if (m){
        m.status = e.response.status;
        m.mimeType = e.response.mimeType;
        m.remoteIP = e.response.remoteIPAddress;
      }
    }catch{}
  };

  const onRespExtra = (e)=>{
    try{
      const headers = e.headers || {};
      const authority = safeHeader(headers, ':authority');
      const hostHdr = authority || safeHeader(headers, 'host') || '';
      const rawSet = headers['set-cookie'] || headers['Set-Cookie'];
      if (rawSet){
        const lines = Array.isArray(rawSet) ? rawSet : String(rawSet).split(/,(?=[^ ;]+=)/);
        for (const line of lines){
          const name = String(line).split('=')[0].trim();
          const sameSite = (String(line).match(/samesite=([^;]+)/i)||[])[1] || '';
          const cat = classifyCookie({ name, domain: hostHdr, sameSite });
          setCookies.push({ name, raw: line, domain: hostHdr, category: cat });
        }
      }
    }catch{}
  };

  client.on('Network.requestWillBeSent', onReq);
  client.on('Network.responseReceived', onResp);
  client.on('Network.responseReceivedExtraInfo', onRespExtra);

  if (opts.navigate){
    await clearPageState(page);
    await page.goto(url, { waitUntil:'domcontentloaded', timeout:NAV_TIMEOUT }).catch(()=>{});
  }
  await waitForNetworkQuiet(page);

  const cookies = await page.cookies().catch(()=>[]);
  const storage = await collectStorageSnapshot(page);
  const cmp = await detectCMP(page);
  const cmpState = await readOneTrustState(page);
  const har = buildHarLite(stageName, stageReqs);

  try{ client.detach().catch(()=>{}); }catch{}

  return {
    stage: stageName,
    cmp: { detected: cmp.detected, provider: cmp.provider, buttons: cmp.buttons },
    cmpState,
    cookies,
    storage,
    networkEvidence: {
      trackingHits,
      setCookies,
      harLite: har,
      totals: { requests: stageReqs.length, trackingHits: trackingHits.length, setCookies: setCookies.length },
    }
  };
}

async function runCrawl(targetUrl){
  const browser = await puppeteer.launch({ headless:false, defaultViewport: DEFAULT_VIEWPORT, args: LAUNCH_ARGS });
  const pageA = await browser.newPage();
  pageA.setDefaultTimeout(NAV_TIMEOUT);
  if (process.env.ACCEPT_LANG) await pageA.setExtraHTTPHeaders({'Accept-Language': process.env.ACCEPT_LANG});

  const results = { url: targetUrl, analysisAt: new Date().toISOString(), stages: [], errors: [] };

  try{
    // A: baseline + reject flow
    await clearPageState(pageA);
    await pageA.goto(targetUrl, { waitUntil:'domcontentloaded', timeout:NAV_TIMEOUT }).catch(()=>{});
    const cmp0 = await waitCMPOverlayOrTimeout(pageA);
    console.log(`🧭 CMP detection → detected=${cmp0.detected} provider=${cmp0.provider} reject=${cmp0.buttons.reject} settings=${cmp0.buttons.settings}`);

    console.log(`📊 Capturing ${STAGES.BASELINE}...`);
    results.stages.push(await stageCapture(pageA, null, STAGES.BASELINE, { navigate:false }));

    console.log(`📊 Capturing ${STAGES.REJECT_PRE}...`);
    results.stages.push(await stageCapture(pageA, null, STAGES.REJECT_PRE, { navigate:false }));
    const cmpR = await detectCMP(pageA);
    if (cmpR.detected && cmpR.handles.reject){
      console.log('🖱️ Clicking Reject...');
      await clickIfPresent(pageA, cmpR.handles.reject);
      await waitForNetworkQuiet(pageA);
    } else {
      console.log('⚠️ Reject button not found');
    }

    console.log(`📊 Capturing ${STAGES.REJECT}...`);
    results.stages.push(await stageCapture(pageA, null, STAGES.REJECT, { navigate:false }));

    // B: accept flow en nueva pestaña (sin incognito)
    console.log(`🌐 Opening B tab for accept flow...`);
    const pageB = await browser.newPage();
    pageB.setDefaultTimeout(NAV_TIMEOUT);
    if (process.env.ACCEPT_LANG) await pageB.setExtraHTTPHeaders({'Accept-Language': process.env.ACCEPT_LANG});
    await clearPageState(pageB);
    await pageB.goto(targetUrl, { waitUntil:'domcontentloaded', timeout:NAV_TIMEOUT }).catch(()=>{});
    await waitCMPOverlayOrTimeout(pageB);

    console.log(`📊 Capturing ${STAGES.ACCEPT_PRE}...`);
    results.stages.push(await stageCapture(pageB, null, STAGES.ACCEPT_PRE, { navigate:false }));
    const cmpA = await detectCMP(pageB);
    if (cmpA.detected && cmpA.handles.accept){
      console.log('🖱️ Clicking Accept...');
      await clickIfPresent(pageB, cmpA.handles.accept);
      await waitForNetworkQuiet(pageB);
    } else {
      console.log('⚠️ Accept button not found');
    }

    console.log(`📊 Capturing ${STAGES.ACCEPT}...`);
    results.stages.push(await stageCapture(pageB, null, STAGES.ACCEPT, { navigate:false }));
    await pageB.close().catch(()=>{});
  }catch(e){
    console.error('❌ Crawl error:', e.message);
    results.errors.push({ where:'runCrawl', error:e.message, stack:String(e.stack).split('\n').slice(0,5).join(' | ') });
  }finally{
    await pageA.close().catch(()=>{});
    await browser.close().catch(()=>{});
  }

  return results;
}

module.exports = { runCrawl, constants:{ STAGES } };
