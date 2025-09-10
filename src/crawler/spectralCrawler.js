'use strict';
/**
 * SPECTRAL CRAWLER (P0) — CJS, default UI visible
 * - Puppeteer ^24.9
 * - Etapas: baseline, reject_pre, reject, accept_pre, accept
 * - Evidencia por etapa: requests, set-cookie, har-lite, storage, scripts, screenshot, cmpState
 * - Espera CMP OneTrust antes de baseline; click Reject/Accept con log
 */

const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

// Default visible: abre Chrome salvo que HEADLESS=true
const HEADLESS = String(process.env.HEADLESS ?? 'false').toLowerCase() === 'true';
// EU defaults suaves para levantar banners en pruebas
const ACCEPT_LANG = process.env.RAN_ACCEPT_LANGUAGE || process.env.ACCEPT_LANG || 'de-DE,de;q=0.9,en;q=0.8';

const OUT_DIR = path.join(process.cwd(), 'reports');
const SS_DIR  = path.join(process.cwd(), 'public', 'screenshots');
const HAR_DIR = path.join(process.cwd(), 'public', 'har-files');
for (const d of [OUT_DIR, SS_DIR, HAR_DIR]) if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });

function ts(){ return new Date().toISOString().replace(/[:.]/g,'-'); }
function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }
function etldPlus1(host){
  if (!host) return host;
  const p = host.split('.').filter(Boolean);
  if (p.length <= 2) return host;
  const cc = new Set(['uk','de','fr','it','es','nl','se','no','dk','pl','pt','be','at','ch','ie','cz','gr','ro','hu']);
  return cc.has(p[p.length-1]) ? p.slice(-3).join('.') : p.slice(-2).join('.');
}
function isFirstParty(u, siteETLD){
  try { return etldPlus1(new URL(u).hostname) === siteETLD; } catch { return false; }
}

// ---------- CMP OneTrust ----------
async function detectCMP(page){
  try {
    return await page.evaluate(()=>{
      const sdk = document.getElementById('onetrust-consent-sdk');
      const rej = document.getElementById('onetrust-reject-all-handler');
      const acc = document.getElementById('onetrust-accept-btn-handler');
      const set = document.getElementById('onetrust-pc-btn-handler') || document.querySelector('[aria-label*="settings"],[aria-label*="opciones"]');
      return { detected: !!sdk, provider: sdk ? 'OneTrust':'None', reject:!!rej, accept:!!acc, settings:!!set };
    });
  } catch { return { detected:false, provider:'None', reject:false, accept:false, settings:false }; }
}
async function waitForCMPOverlay(page,{timeoutMs=5000,retry=3}={}){
  const start=Date.now();
  for(let i=0;i<=retry;i++){
    const cmp=await detectCMP(page);
    if(cmp.detected) return { ...cmp, waitedMs:Date.now()-start, tries:i+1 };
    await sleep(Math.min(800, timeoutMs/(retry||1)));
  }
  return { detected:false, provider:'None', reject:false, accept:false, settings:false, waitedMs:Date.now()-start, tries:retry+1 };
}
async function clickReject(page){
  return page.evaluate(()=>{ const el=document.getElementById('onetrust-reject-all-handler'); if(el){el.click(); return true;} return false; });
}
async function clickAccept(page){
  return page.evaluate(()=>{ const el=document.getElementById('onetrust-accept-btn-handler'); if(el){el.click(); return true;} return false; });
}

// ---------- network capture ----------
function wireNetwork(page, siteETLD, buckets){
  buckets.inflight = new Set();
  page.on('request', (req)=>{ buckets.inflight.add(req._id||req.url()); buckets.requests.push({ url:req.url(), method:req.method(), ts:Date.now() }); });
  page.on('requestfinished', async (req)=>{
    buckets.inflight.delete(req._id||req.url());
    try{
      const res = await req.response();
      const url = req.url();
      const status = res?.status();
      const headers = await res?.headers();
      const setCookieRaw = headers?.['set-cookie'];
      if(setCookieRaw){
        const list = Array.isArray(setCookieRaw) ? setCookieRaw : [setCookieRaw];
        for(const sc of list) buckets.setCookies.push({ url, setCookie:sc, ts:Date.now() });
      }
      buckets.harLite.entries.push({ url, status, mimeType: headers?.['content-type']||'', ts:Date.now() });
      if(!isFirstParty(url, siteETLD)){
        const hit = /collect|pixel|gtag\/js|analytics|insight\.min\.js|quant\.js|tiktok|\/g\/collect|\/r\/collect|ads|doubleclick|px\.ads\.|snap\.licdn|6si\.min\.js/i.test(url);
        if(hit) buckets.trackingHits.push({ url, status, ts:Date.now() });
      }
    } catch {}
  });
  page.on('requestfailed', (req)=>{ buckets.inflight.delete(req._id||req.url()); });
}
async function waitForNetworkIdle(buckets, idleMs=2500, maxWaitMs=15000){
  const start=Date.now();
  while(Date.now()-start < maxWaitMs){
    if(buckets.inflight.size===0){
      const t=Date.now();
      while(Date.now()-t < idleMs){ if(buckets.inflight.size!==0) break; await sleep(100); }
      if(buckets.inflight.size===0) return true;
    }
    await sleep(150);
  }
  return false;
}

// ---------- per-stage ----------
async function deepScroll(page){
  try{ await page.evaluate(async ()=>{
    const d=(ms)=>new Promise(r=>setTimeout(r,ms));
    let last=0; for(let i=0;i<20;i++){ window.scrollBy(0,Math.max(300, window.innerHeight*0.8)); await d(150); const y=window.scrollY; if(Math.abs(y-last)<50) break; last=y; }
    window.scrollTo(0,0);
  }); } catch {}
}
async function readStorage(page){
  try { return await page.evaluate(()=>{ const ls=[], ss=[]; for(let i=0;i<localStorage.length;i++) ls.push(localStorage.key(i)); for(let i=0;i<sessionStorage.length;i++) ss.push(sessionStorage.key(i)); return { localStorageKeys:ls, sessionStorageKeys:ss }; }); }
  catch { return { localStorageKeys:[], sessionStorageKeys:[] }; }
}
async function readScripts(page, siteETLD){
  try{
    const { list, thirdParty } = await page.evaluate((siteETLD)=>{
      const srcs=[...document.querySelectorAll('script')].map(s=>s.src||'[inline]');
      const set=Array.from(new Set(srcs));
      const third=set.filter(u=>{ if(u==='[inline]') return false; try{ const h=new URL(u,location.href).hostname; const isFP=(h.split('.').slice(-2).join('.'))===siteETLD; return !isFP; }catch{return false;} }).length;
      return { list:set, thirdParty:third };
    }, siteETLD);
    return { scripts:list, statistics:{ total:list.length, thirdParty }, tracking:0, necessary:0, unknown:list.length };
  } catch { return { scripts:[], statistics:{ total:0, thirdParty:0 }, tracking:0, necessary:0, unknown:0 }; }
}
async function readCMPState(page){
  try{
    return await page.evaluate(()=>{
      const st={};
      try{ st.OptanonActiveGroups = (window.Optanon && typeof Optanon.GetDomainData==='function') ? (window.OptanonActiveGroups||null) : null; }catch{ st.OptanonActiveGroups=null; }
      try{ st.OptanonConsent = (window.Optanon && window.Optanon.GetConsentData) ? (window.Optanon.GetConsentData()||null) : null; }catch{ st.OptanonConsent=null; }
      return st;
    });
  } catch { return {}; }
}
function bucketCookies(setCookies){
  const out={ tracking:0, consent:0, unknown:0, all:[] };
  const CONSENT=/optanon|onetrust|consent|euconsent|didomi/i;
  const TRACK=/(^|;|\s)(_ga=|_gid=|_fbp=|_gcl_au=|_uetvid=|_uetsid=|amplitude_id|ajs_)/i;
  for(const it of setCookies){ const sc=String(it.setCookie||''); if(CONSENT.test(sc)) out.consent++; else if(TRACK.test(sc)) out.tracking++; else out.unknown++; out.all.push(sc); }
  return out;
}
async function captureStage(page, name, siteETLD){
  const buckets={ requests:[], trackingHits:[], setCookies:[], harLite:{entries:[]} };
  wireNetwork(page, siteETLD, buckets);
  await deepScroll(page);
  await waitForNetworkIdle(buckets, 2500, 15000);
  const scriptAnalysis = await readScripts(page, siteETLD);
  const storage = await readStorage(page);
  const cmpState = await readCMPState(page);
  const ssName = `${ts()}-${name}.png`;
  const ssPath = path.join(SS_DIR, ssName);
  try { await page.screenshot({ path:ssPath, fullPage:true }).catch(()=>{}); } catch {}
  const cookieBreakdown = bucketCookies(buckets.setCookies);
  return {
    stage:name,
    timestamp:new Date().toISOString(),
    url: page.url(),
    host: (()=>{ try{ return new URL(page.url()).hostname; }catch{return '';} })(),
    eTLDplus1: siteETLD,
    screenshot: path.relative(process.cwd(), ssPath),
    networkEvidence: { requests:buckets.requests, trackingHits:buckets.trackingHits, setCookies:buckets.setCookies, cookieBreakdown, harLite:buckets.harLite },
    scriptAnalysis, storage, cookies:[], cmpState
  };
}

// ---------- main crawl ----------
async function newIsolatedPage(browser, lang=ACCEPT_LANG){
  const ctx = await browser.createBrowserContext();
  const page = await ctx.newPage();
  await page.setExtraHTTPHeaders({ 'Accept-Language': lang });
  await page.setViewport({ width:1366, height:900 });
  return { ctx, page };
}
async function gotoAndPrep(page, url){ await page.goto(url, { waitUntil:'domcontentloaded', timeout:60000 }); }

async function runCrawl(url){
  const browser = await puppeteer.launch({
    headless: HEADLESS,
    args: ['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage','--window-size=1366,900']
  });

  const { ctx:ctxA, page:pageA } = await newIsolatedPage(browser);
  await gotoAndPrep(pageA, url);

  const siteHost = new URL(pageA.url()).hostname;
  const siteETLD = etldPlus1(siteHost);

  const cmpInitial = await waitForCMPOverlay(pageA, { timeoutMs:5000, retry:3 });

  const baseline   = await captureStage(pageA, 'baseline',    siteETLD);
  const rejectPre  = await captureStage(pageA, 'reject_pre',  siteETLD);
  try { console.log((await clickReject(pageA)) ? '🖱️ Clicked OneTrust Reject' : '🖱️ OneTrust Reject not found'); } catch { console.log('🖱️ OneTrust Reject click error'); }
  await sleep(400);
  const reject     = await captureStage(pageA, 'reject',      siteETLD);

  const { ctx:ctxB, page:pageB } = await newIsolatedPage(browser);
  await gotoAndPrep(pageB, url);
  await waitForCMPOverlay(pageB, { timeoutMs:5000, retry:3 });
  const acceptPre  = await captureStage(pageB, 'accept_pre',  siteETLD);
  try { console.log((await clickAccept(pageB)) ? '🖱️ Clicked OneTrust Accept' : '🖱️ OneTrust Accept not found'); } catch { console.log('🖱️ OneTrust Accept click error'); }
  await sleep(500);
  const accept     = await captureStage(pageB, 'accept',      siteETLD);

  const cmpFinalA = await detectCMP(pageA);
  const cmpFinalB = await detectCMP(pageB);

  await ctxA.close().catch(()=>{});
  await ctxB.close().catch(()=>{});
  await browser.close().catch(()=>{});

  const bannerSummary = {
    initial: cmpInitial, finalA: cmpFinalA, finalB: cmpFinalB,
    anyDetected: !!(cmpInitial?.detected || cmpFinalA?.detected || cmpFinalB?.detected),
    providers: ['OneTrust'],
    buttons: {
      reject:  !!(cmpInitial?.reject  || cmpFinalA?.reject  || cmpFinalB?.reject),
      accept:  !!(cmpInitial?.accept  || cmpFinalA?.accept  || cmpFinalB?.accept),
      settings:!!(cmpInitial?.settings|| cmpFinalA?.settings|| cmpFinalB?.settings)
    }
  };

  return {
    url, siteHost, siteETLD, bannerSummary,
    stages: [baseline, rejectPre, reject, acceptPre, accept],
    meta: { headless: HEADLESS, lang: ACCEPT_LANG, ts: new Date().toISOString() }
  };
}

function saveReportJSON(payload){
  const f = `spectral-analysis-${(new URL(payload.url)).hostname}-${ts()}.json`;
  const p = path.join(OUT_DIR, f);
  fs.writeFileSync(p, JSON.stringify(payload, null, 2));
  return p;
}

module.exports = { runCrawl, saveReportJSON };
