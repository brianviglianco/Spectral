#!/usr/bin/env node
// runConsoleSingle.mjs - COMPLETE PIPELINE WITH FORENSIC PACKAGING & REPORTS
// Flujo: capture -> makeP0 -> verifyP0 --strict -> enrichNorm -> auditDeep --strict -> forensicEnhanced -> reportGenerator -> [zip]

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const REPORTS = path.join(ROOT, "reports");

function fail(msg){ console.error(msg); process.exit(1); }

function run(cmd, args, title){
    console.log(`\n=== ${title} ===`);
    const r = spawnSync(cmd, args, { stdio:"inherit", env: process.env });
    // Permitir que auditDeep falle en strict pero continúe para generar ZIP
    if(r.status !== 0) {
        if(title === "GDPR AUDIT") {
            console.log(`[RUN] auditDeep strict failed with violations (expected for non-compliant sites)`);
        } else {
            fail(`RUN FAILED: ${title}`);
        }
    }
}

function parseArgs(){
    const a = process.argv.slice(2);
    const out = { host:null, lang:null, zip:false };
    for(let i=0;i<a.length;i++){
        const x=a[i];
        if(x==="--host"||x==="--url") out.host=a[++i];
        else if(x==="--lang") out.lang=a[++i];
        else if(x==="--zip") out.zip=true;
    }
    if(!out.host) fail("missing --host <host|url>");
    return out;
}

function normalizeUrl(s){
    if(/^https?:\/\//i.test(s)) return s.endsWith("/")? s : s+"/";
    return `https://${s.replace(/\/.*$/,'')}/`;
}

function baseHost(u){ return new URL(u).hostname.replace(/^www\./,''); }

function listNew(host, filterFn, t0){
    if(!fs.existsSync(REPORTS)) return [];
    const rx = new RegExp(`^spectral-analysis-${host.replace(/\./g,"\\.")}.+\\.json$`);
    return fs.readdirSync(REPORTS)
        .filter(f=>rx.test(f))
        .filter(filterFn)
        .map(f=>({f, m: fs.statSync(path.join(REPORTS,f)).mtimeMs}))
        .filter(x=>x.m > t0)
        .sort((a,b)=>b.m-a.m)
        .map(x=>x.f);
}

const isRawJson = (f)=> !/\.norm\.json$/i.test(f) && 
                        !/\.norm\.evid\.json$/i.test(f) && 
                        !/\.p0\.json$/i.test(f) && 
                        !/\.report\.json$/i.test(f) &&
                        !/\.evidence\.json$/i.test(f);

async function main(){
    const { host, lang, zip } = parseArgs();
    const url = normalizeUrl(host);
    
    console.log("\n" + "=".repeat(60));
    console.log("SPECTRAL COMPLETE PIPELINE v2.1");
    console.log("=".repeat(60));
    console.log("TARGET:", url);
    console.log("STAGES: Crawl → Analyze → Package → Audit → Reports → Forensics");
    console.log("=".repeat(60));
    
    const h = baseHost(url);
    const t0 = Date.now();
    
    // 1) CRAWL - Professional Analysis
    run("node", ["backend/scripts/professionalAnalysis.js", url, ...(lang?["--lang",lang]:[])], "CRAWL");
    
    // 2) Validate artifacts
    const normsNew = listNew(h, f=>/\.norm\.json$/i.test(f), t0);
    const rawsNew = listNew(h, isRawJson, t0);
    const normNew = normsNew[0];
    const rawNew = rawsNew[0];
    
    if(!normNew || !rawNew) fail(`Capture failed: norm=${normNew||"NONE"} raw=${rawNew||"NONE"}`);
    console.log(`\n[✓] Artifacts created: ${normNew}`);
    
    // 3) ANALYZE - P0 Format
    run("node", ["makeP0.mjs", path.join(REPORTS, normNew)], "P0 GENERATION");
    
    // 4) VERIFY - P0 Validation (only validate the current file, not entire reports/)
    const p0File = normNew + ".p0.json";
    run("node", ["verifyP0.mjs", path.join(REPORTS, p0File), "--strict"], "P0 VERIFICATION");
    
    // 5) ENRICH - Evidence Enhancement  
    run("node", ["enrichNorm.mjs", "--norm", path.join(REPORTS, normNew), "--raw", path.join(REPORTS, rawNew)], "ENRICHMENT");
    
    // 6) AUDIT - GDPR Violations & Scoring
    run("node", ["auditDeep.mjs", "--host", h, "--strict"], "GDPR AUDIT");
    
    // 7) FORENSICS - Evidence Package with SHA-256
    const basePath = path.join(REPORTS, rawNew.replace(/\.json$/, ''));
    run("node", ["forensicEnhanced.js", basePath + ".json"], "FORENSIC PACKAGE");
    
    // 8) REPORTS - Multi-format Generation
    run("node", ["reportGenerator.mjs", "--host", h, "--format", "all"], "REPORT GENERATION");
    
    // Check generated reports
    const reportFiles = fs.readdirSync(REPORTS)
        .filter(f => f.includes(h) && (
            f.endsWith('.console.txt') ||
            f.endsWith('.marketing.txt') ||
            f.endsWith('.tech.txt') ||
            f.endsWith('.legal.txt')
        ));
    
    if(reportFiles.length > 0) {
        console.log(`[✓] Reports generated:`);
        const reportTypes = ['console', 'marketing', 'tech', 'legal'];
        reportTypes.forEach(type => {
            const found = reportFiles.find(f => f.endsWith(`.${type}.txt`));
            if(found) {
                const size = fs.statSync(path.join(REPORTS, found)).size;
                console.log(`    - ${type}.txt (${(size/1024).toFixed(1)} KB)`);
            }
        });
    }
    
    // 9) Optional ZIP (if forensicEnhanced didn't create it)
    if(zip && fs.existsSync("src/tools/forensicZip.mjs")){
        run("node", ["src/tools/forensicZip.mjs", "reports"], "ZIP BACKUP");
    }
    
    // Summary
    console.log("\n" + "=".repeat(60));
    console.log("PIPELINE COMPLETE");
    console.log("=".repeat(60));
    
    // Show what was generated
    const files = fs.readdirSync(REPORTS)
        .filter(f => f.includes(h) && f.includes(normNew.match(/\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}/)[0]))
        .sort();
    
    console.log("\nGenerated files:");
    files.forEach(f => {
        const size = fs.statSync(path.join(REPORTS, f)).size;
        const sizeKB = (size / 1024).toFixed(1);
        const fileType = 
            f.endsWith('.json') ? '📄' :
            f.endsWith('.txt') ? '📝' :
            f.endsWith('.png') ? '📸' :
            f.endsWith('.zip') ? '📦' : '📁';
        console.log(`  ${fileType} ${f} (${sizeKB} KB)`);
    });
    
    // Check for forensic folder
    const forensicFolders = fs.readdirSync(REPORTS)
        .filter(f => f.startsWith(`forensic-${h}`));
    
    if(forensicFolders.length > 0) {
        console.log("\nForensic packages:");
        forensicFolders.forEach(f => {
            console.log(`  📦 ${f}/`);
        });
    }
    
    // Show total time
    const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
    console.log(`\nTotal time: ${elapsed} seconds`);
    console.log("\n✓ Ready for web presentation");
}

main().catch(e=>fail(e?.stack||String(e)));