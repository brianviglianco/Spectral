#!/usr/bin/env node
/**
 * Runs professionalAnalysis.js sequentially for a list of sites.
 * Writes raw logs per site and a JSON summary per region.
 * Assumes Bitdefender VPN or equivalent is active on the runner.
 */

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

function parseArgs() {
  const args = process.argv.slice(2);
  const out = {};
  for (let i = 0; i < args.length; i += 2) {
    const k = args[i], v = args[i + 1];
    if (!v) continue;
    if (k === "--region") out.region = v;
    if (k === "--sites") out.sites = v;
  }
  if (!out.region || !out.sites) {
    console.log("Usage: node scripts/run-matrix.js --region <code> --sites <path.json>");
    process.exit(2);
  }
  return out;
}

function loadSites(file) {
  const raw = fs.readFileSync(file, "utf8");
  const data = JSON.parse(raw);
  if (!Array.isArray(data)) throw new Error("Sites JSON must be an array of URLs");
  return data;
}

function latestReportForDomain(domain) {
  const reportsDir = path.join(process.cwd(), "reports");
  if (!fs.existsSync(reportsDir)) return null;
  const files = fs.readdirSync(reportsDir)
    .filter(f => f.startsWith("spectral-analysis-") && f.includes(domain) && f.endsWith(".json"))
    .map(f => ({ f, t: fs.statSync(path.join(reportsDir, f)).mtimeMs }))
    .sort((a, b) => b.t - a.t);
  return files.length ? path.join(reportsDir, files[0].f) : null;
}

function runOne(url, region, outDir) {
  console.log("==================================================");
  console.log(`REGION=${region} URL=${url}`);
  console.log("Starting professionalAnalysis...");
  const env = { ...process.env, SPECTRAL_REGION: region };
  const proc = spawnSync("node", ["professionalAnalysis.js", url], {
    cwd: process.cwd(),
    env,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });

  const domain = url.replace(/^https?:\/\//, "").replace(/\/.*/, "");
  const safeDomain = domain.replace(/[^a-zA-Z0-9.-]/g, "_");
  const logBase = path.join(outDir, `${safeDomain}.${Date.now()}`);
  fs.writeFileSync(`${logBase}.out.log`, proc.stdout || "", "utf8");
  fs.writeFileSync(`${logBase}.err.log`, proc.stderr || "", "utf8");

  const reportPath = latestReportForDomain(domain);
  let summary = {
    url,
    region,
    exitCode: proc.status,
    report: reportPath ? path.relative(process.cwd(), reportPath) : null,
  };

  // Try to read minimal fields for quick comparison if present
  try {
    if (reportPath && fs.existsSync(reportPath)) {
      const rpt = JSON.parse(fs.readFileSync(reportPath, "utf8"));
      summary.analysisDate = rpt?.analysisDate || rpt?.AnalysisDate || null;
      summary.cmp = rpt?.bannerAnalysis?.provider || rpt?.cmpProvider || null;
      summary.score = rpt?.compliance?.score || rpt?.complianceScore || null;
      summary.violations = rpt?.violations?.length || rpt?.violationCount || null;
    }
  } catch (e) {
    console.log(`[WARN] Could not parse report for ${url}: ${e.message}`);
  }
  console.log(`Completed ${url} with code=${proc.status} report=${summary.report || "n/a"}`);
  return summary;
}

(function main() {
  const { region, sites } = parseArgs();
  const outDir = path.join(process.cwd(), "reports", "matrix", region);
  fs.mkdirSync(outDir, { recursive: true });

  const urls = loadSites(sites);
  const results = [];
  for (const url of urls) {
    const res = runOne(url, region, outDir);
    results.push(res);
  }

  const summaryPath = path.join(outDir, `summary.${region}.json`);
  fs.writeFileSync(summaryPath, JSON.stringify({ region, count: results.length, results }, null, 2), "utf8");
  console.log(`[SUMMARY] ${summaryPath}`);
})();
