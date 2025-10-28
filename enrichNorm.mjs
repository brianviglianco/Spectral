#!/usr/bin/env node

// enrichNorm.mjs - FIXED VERSION

// Genera <base>.norm.evid.json a partir de RAW + NORM.

import fs from "node:fs";
import path from "node:path";

const STAGES = ["baseline","reject_pre","reject","accept_pre","accept"];

function fail(m){ console.error("[enrichNorm][error]", m); process.exit(1); }
function read(p){ return JSON.parse(fs.readFileSync(p,"utf8")); }
function write(p,o){ fs.writeFileSync(p, JSON.stringify(o,null,2),"utf8"); console.log("[enrichNorm] Wrote", p); }

function normalizeHost(h){ 
    try{ 
        return new URL(/^https?:\/\//.test(h)?h:`https://${h}`).hostname.replace(/^www\./,""); 
    }catch{ 
        return h; 
    } 
}

function newest(dir, rx, filterFn=()=>true){
    const files = fs.existsSync(dir)? fs.readdirSync(dir):[];
    const hits = files.filter(f=>rx.test(f)).filter(filterFn).map(f=>path.join(dir,f)).sort((a,b)=>fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
    return hits[0]||null;
}

const isRawJson = (f)=> !/\.norm\.json$/i.test(f) && !/\.norm\.evid\.json$/i.test(f) && !/\.p0\.json$/i.test(f) && !/\.report\.json$/i.test(f);

function arrayify(x){ return Array.isArray(x)? x : (x? [x] : []); }

function parseSetCookie(line){
    if(typeof line!=="string") return null;
    const parts = line.split(";").map(s=>s.trim());
    const [nv, ...attrs] = parts;
    const [name, ...vv] = nv.split("=");
    const value = vv.join("=");
    const attr = { Domain:"", Path:"", SameSite:"", Secure:false, HttpOnly:false, Expires:"", "Max-Age":"" };
    
    for(const a of attrs){
        const [k,...rest] = a.split("="); 
        const key=(k||"").toLowerCase(); 
        const val=rest.join("=");
        
        if(key==="domain") attr.Domain = val;
        else if(key==="path") attr.Path = val;
        else if(key==="samesite") attr.SameSite = val;
        else if(key==="secure") attr.Secure = true;
        else if(key==="httponly") attr.HttpOnly = true;
        else if(key==="expires") attr.Expires = val;
        else if(key==="max-age") attr["Max-Age"] = val;
    }
    
    return { name: name||"", value: value||"", attrs: attr };
}

function etld1(h){ 
    if(!h) return ""; 
    const p=h.toLowerCase().split(".").filter(Boolean); 
    if(p.length<=2) return p.join("."); 
    const t3=new Set(["co.uk","com.au","com.br","com.ar","com.mx","co.jp","com.sg","com.tr","com.es"]); 
    const l2=p.slice(-2).join("."),l3=p.slice(-3).join("."); 
    if(t3.has(l2)) return p.slice(-3).join("."); 
    if(t3.has(l3)) return p.slice(-4).join("."); 
    return l2; 
}

function is3P(h, site){ return etld1(h) && etld1(h)!==etld1(site); }

function summarizeEndpoints(siteHost, reqs){
    const byHost=new Map(), byEnd=new Map();
    
    for(const r of reqs){
        try{
            const u = new URL(r.url || r);
            const m = (r.method||"GET").toUpperCase();
            const keyE = `${m} ${u.hostname}${u.pathname}`;
            byHost.set(u.hostname, (byHost.get(u.hostname)||0)+1);
            byEnd.set(keyE, (byEnd.get(keyE)||0)+1);
        }catch{}
    }
    
    const hosts = [...byHost.entries()].map(([host,count])=>({host,count,is3P:is3P(host,siteHost)})).sort((a,b)=>b.count-a.count).slice(0,100);
    const endpoints = [...byEnd.entries()].map(([endpoint,count])=>({endpoint,count})).sort((a,b)=>b.count-a.count).slice(0,200);
    
    return { hostsByStage: hosts, topEndpointsByStage: endpoints, thirdPartyTop: hosts.filter(h=>h.is3P).slice(0,100) };
}

function extractOT(cookies, ls){
    const out = { OptanonConsent:"", OptanonActiveGroups:"" };
    
    for(const c of cookies){
        if(/^optanonconsent$/i.test(c.name)) out.OptanonConsent = c.value;
        if(/^optanonactivegroups$/i.test(c.name)) out.OptanonActiveGroups = c.value;
    }
    
    if(!out.OptanonConsent && typeof ls?.OptanonConsent==="string") out.OptanonConsent = ls.OptanonConsent;
    if(!out.OptanonActiveGroups && typeof ls?.OptanonActiveGroups==="string") out.OptanonActiveGroups = ls.OptanonActiveGroups;
    
    return out;
}

// FIXED: Get cookie count from norm stage data
function getCookieCount(normStage) {
    // Priority 1: cookieBreakdown.all array (most reliable)
    if (normStage?.cookieBreakdown?.all && Array.isArray(normStage.cookieBreakdown.all)) {
        return normStage.cookieBreakdown.all.length;
    }
    
    // Priority 2: sum of T+C+U from cookieBreakdown
    if (normStage?.cookieBreakdown) {
        const total = (normStage.cookieBreakdown.tracking || 0) + 
                      (normStage.cookieBreakdown.consent || 0) + 
                      (normStage.cookieBreakdown.unknown || 0);
        if (total > 0) return total;
    }
    
    // Priority 3: direct cookies field
    if (typeof normStage?.cookies === 'number') return normStage.cookies;
    if (Array.isArray(normStage?.cookies)) return normStage.cookies.length;
    
    // Priority 4: from networkEvidence
    if (normStage?.networkEvidence?.cookieBreakdown?.all) {
        return normStage.networkEvidence.cookieBreakdown.all.length;
    }
    
    return 0;
}

function parseArgs(){
    const a = process.argv.slice(2);
    const out = { norm:null, raw:null, host:null };
    
    for(let i=0;i<a.length;i++){
        if(a[i]==="--norm") out.norm = a[++i];
        else if(a[i]==="--raw") out.raw = a[++i];
        else if(a[i]==="--host"||a[i]==="--url") out.host = a[++i];
    }
    
    if(!out.norm && !out.raw && !out.host) fail("Usage: node enrichNorm.mjs (--norm ... --raw ...) | --host <host|url>");
    return out;
}

function main(){
    const args = parseArgs();
    let normPath = args.norm, rawPath = args.raw;
    
    if(args.host && (!normPath || !rawPath)){
        const h = normalizeHost(args.host).replace(/\./g,'\\.');
        normPath = normPath || newest("reports", new RegExp(`spectral-analysis-${h}.*\\.norm\\.json$`));
        rawPath = rawPath || newest("reports", new RegExp(`spectral-analysis-${h}.*\\.json$`), f=>isRawJson(path.basename(f)));
    }
    
    if(!normPath) fail("Missing .norm.json path");
    if(!rawPath) fail("Missing RAW .json path");
    
    // Si accidentalmente nos pasaron un *.norm.evid.json como RAW, corrige al RAW "base"
    if(/\.norm\.evid\.json$/i.test(rawPath)){
        const base = rawPath.replace(/\.norm\.evid\.json$/i, ".json");
        if(fs.existsSync(base)) rawPath = base;
    }
    
    const norm = read(normPath);
    const raw = read(rawPath);
    const siteHost = norm.host || raw.siteHost || raw.meta?.host || "(unknown)";
    
    // Map de stages sin importar si RAW trae array u objeto
    const sMap = {};
    if(Array.isArray(raw.stages)) for(const s of raw.stages){ if(s?.stage) sMap[String(s.stage).toLowerCase()] = s; }
    else if(raw.stages && typeof raw.stages==="object") for(const k of Object.keys(raw.stages)) sMap[String(k).toLowerCase()] = raw.stages[k];
    
    // Also get norm stages for cookie counts
    const normSMap = {};
    if(Array.isArray(norm.stages)) {
        for(const s of norm.stages){ 
            if(s?.stage) normSMap[String(s.stage).toLowerCase()] = s; 
        }
    }
    
    const evid = { 
        meta:{ 
            siteHost, 
            url: norm.url || raw.url || raw.meta?.url || null, 
            generatedAt: new Date().toISOString() 
        }, 
        stages:{}, 
        rollup:{} 
    };
    
    for(const key of STAGES){
        const st = sMap[key] || {};
        const normSt = normSMap[key] || {};
        const reqs = Array.isArray(st?.networkEvidence?.requests) ? st.networkEvidence.requests : [];
        
        const setC = Array.isArray(st?.networkEvidence?.setCookies)
            ? st.networkEvidence.setCookies.map(x => typeof x==="string" ? x : (x.setCookie||""))
            : [];
        
        const cookies = [];
        for(const line of setC){ 
            const p = parseSetCookie(line); 
            if(p && p.name) cookies.push(p); 
        }
        
        const hosts = summarizeEndpoints(siteHost, reqs);
        const lsKeys = Array.isArray(st?.storage?.localStorageKeys) ? st.storage.localStorageKeys : [];
        const ssKeys = Array.isArray(st?.storage?.sessionStorageKeys) ? st.storage.sessionStorageKeys : [];
        const cmp = extractOT(cookies, st?.storage?.localStorage);
        
        evid.stages[key] = {
            cookies,
            storage: { localStorageKeys: lsKeys, sessionStorageKeys: ssKeys },
            endpoints: hosts,
            cmp
        };
    }
    
    // FIXED: Get cookie counts from norm.json stages
    evid.rollup = {
        totalTrackingHitsByStage: Object.fromEntries(STAGES.map(k => [k,
            sMap[k]?.networkEvidence?.trackingHits?.length || 0])),
        
        // FIX: Get actual cookie counts from norm stages
        totalCookiesByStage: Object.fromEntries(STAGES.map(k => [k, 
            getCookieCount(normSMap[k])
        ])),
        
        thirdPartyHostsByStage: Object.fromEntries(STAGES.map(k => [k, 
            evid.stages[k]?.endpoints?.thirdPartyTop||[]]))
    };
    
    const out = normPath.replace(/\.norm\.json$/i, ".norm.evid.json");
    write(out, evid);
}

try{ main(); }catch(e){ fail(e?.stack||String(e)); }