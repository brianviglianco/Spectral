'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function HomePage() {
  const searchParams = useSearchParams();
  const analyzeUrl = searchParams?.get('analyze');
  const [analyses, setAnalyses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/analyses')
      .then(res => res.json())
      .then(data => {
        setAnalyses(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error loading analyses:', err);
        setLoading(false);
      });
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 to-slate-900">
      {analyzeUrl && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-cyan-500/90 backdrop-blur-xl text-white px-6 py-4 rounded-lg shadow-2xl max-w-2xl">
          <div className="font-bold mb-2">⚡ Run this command in your terminal:</div>
          <code className="block bg-slate-950/50 px-4 py-3 rounded text-sm font-mono">
            cd ~/Desktop/Spectral && node runConsoleSingle.mjs --host {analyzeUrl}
          </code>
          <div className="text-sm mt-2 opacity-90">Then refresh this page to see results</div>
        </div>
      )}

      <nav className="bg-slate-950/80 backdrop-blur-xl border-b border-slate-800/50 sticky top-0 z-40">
        <div className="max-w-[1400px] mx-auto px-8 py-4 flex justify-between items-center">
          <div className="text-2xl font-extrabold text-white tracking-tight">SPECTRAL.</div>
          <div className="flex gap-12 text-sm text-slate-400">
            <div>Total Analyses <span className="text-cyan-500 font-semibold ml-2">{analyses.length}</span></div>
            <div>Avg Score <span className="text-cyan-500 font-semibold ml-2">
              {analyses.length > 0 ? Math.round(analyses.reduce((sum, a) => sum + a.score, 0) / analyses.length) : 0}%
            </span></div>
            <div>Critical Sites <span className="text-cyan-500 font-semibold ml-2">
              {analyses.filter(a => a.risk === 'CRITICAL').length}
            </span></div>
          </div>
        </div>
      </nav>

      <div className="max-w-[1400px] mx-auto px-8 py-16">
        <h1 className="text-5xl font-extrabold text-white mb-2 tracking-tight">
          GDPR Compliance at Full Speed.
        </h1>
        <p className="text-xl text-slate-400 mb-10">
          Automated privacy compliance verification with forensic-grade evidence collection
        </p>

        <div className="bg-slate-900/60 border border-slate-800/50 rounded-xl p-10 mb-12 backdrop-blur-sm">
          <h2 className="text-2xl font-bold text-white mb-6">Analyze Website</h2>
          <form action="/api/analyze" method="POST" className="space-y-4">
            <div className="flex gap-4">
              <input
                type="url"
                name="url"
                placeholder="https://example.com"
                defaultValue="https://dell.com"
                required
                className="flex-1 px-5 py-4 bg-slate-800/80 border border-slate-700/50 rounded-lg text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10 transition"
              />
              <button
                type="submit"
                className="px-10 py-4 bg-gradient-to-r from-cyan-500 to-cyan-600 text-white font-semibold rounded-lg hover:-translate-y-0.5 hover:shadow-lg hover:shadow-cyan-500/30 transition"
              >
                Analyze Site
              </button>
            </div>
            <div className="flex gap-8 text-sm text-slate-400">
              <div className="flex items-center gap-2">
                <span className="text-cyan-500">✓</span>
                13 GDPR violations detected
              </div>
              <div className="flex items-center gap-2">
                <span className="text-cyan-500">✓</span>
                5-stage forensic crawl
              </div>
              <div className="flex items-center gap-2">
                <span className="text-cyan-500">✓</span>
                Legal-grade evidence
              </div>
              <div className="flex items-center gap-2">
                <span className="text-cyan-500">✓</span>
                ~40 seconds
              </div>
            </div>
          </form>
        </div>

        <div className="grid grid-cols-4 gap-6 mb-12">
          <div className="bg-slate-900/40 border border-slate-800/50 rounded-xl p-6 hover:border-cyan-500/30 hover:-translate-y-1 transition">
            <div className="text-sm text-slate-400 mb-2">Sites Analyzed Today</div>
            <div className="text-4xl font-bold text-white">
              {analyses.filter(a => {
                const today = new Date().toDateString();
                return new Date(a.timestamp).toDateString() === today;
              }).length}
            </div>
          </div>
          <div className="bg-slate-900/40 border border-slate-800/50 rounded-xl p-6 hover:border-cyan-500/30 hover:-translate-y-1 transition">
            <div className="text-sm text-slate-400 mb-2">Average Compliance</div>
            <div className="text-4xl font-bold text-white">
              {analyses.length > 0 ? Math.round(analyses.reduce((sum, a) => sum + a.score, 0) / analyses.length) : 0}
              <span className="text-base text-slate-600 ml-1">%</span>
            </div>
          </div>
          <div className="bg-slate-900/40 border border-slate-800/50 rounded-xl p-6 hover:border-cyan-500/30 hover:-translate-y-1 transition">
            <div className="text-sm text-slate-400 mb-2">Critical Violations</div>
            <div className="text-4xl font-bold text-white">
              {analyses.reduce((sum, a) => sum + (a.violationsBySeverity?.critical || 0), 0)}
            </div>
          </div>
          <div className="bg-slate-900/40 border border-slate-800/50 rounded-xl p-6 hover:border-cyan-500/30 hover:-translate-y-1 transition">
            <div className="text-sm text-slate-400 mb-2">Evidence Packages</div>
            <div className="text-4xl font-bold text-white">
              {analyses.length}
              <span className="text-base text-slate-600 ml-1">ZIPs</span>
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center mb-8">
          <h2 className="text-3xl font-bold text-white">Recent Analyses</h2>
          <div className="flex gap-3">
            <button className="px-4 py-2 bg-cyan-500/10 border border-cyan-500 text-cyan-500 rounded-full text-sm font-semibold">
              All
            </button>
            <button className="px-4 py-2 bg-slate-900/60 border border-slate-800/50 text-slate-400 rounded-full text-sm hover:bg-cyan-500/10 hover:border-cyan-500 hover:text-cyan-500 transition">
              Critical
            </button>
            <button className="px-4 py-2 bg-slate-900/60 border border-slate-800/50 text-slate-400 rounded-full text-sm hover:bg-cyan-500/10 hover:border-cyan-500 hover:text-cyan-500 transition">
              Full Analysis
            </button>
            <button className="px-4 py-2 bg-slate-900/60 border border-slate-800/50 text-slate-400 rounded-full text-sm hover:bg-cyan-500/10 hover:border-cyan-500 hover:text-cyan-500 transition">
              Today
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-20">
            <div className="text-4xl mb-4">⏳</div>
            <h3 className="text-2xl font-bold text-white mb-2">Loading analyses...</h3>
          </div>
        ) : analyses.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4 opacity-50">📊</div>
            <h3 className="text-2xl font-bold text-white mb-2">No analyses yet</h3>
            <p className="text-slate-400">Enter a URL above to run your first GDPR compliance analysis</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {analyses.map(analysis => (
              <Link
                key={analysis.id}
                href={`/analysis/${analysis.id}`}
                className="bg-slate-900/60 border border-slate-800/50 rounded-xl p-6 hover:border-cyan-500/40 hover:-translate-y-1 hover:shadow-lg hover:shadow-cyan-500/10 transition cursor-pointer"
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="text-lg font-semibold text-white mb-1">{analysis.domain}</div>
                    <div className="flex gap-3 text-xs text-slate-600">
                      <span>🌍 {new Date(analysis.timestamp).toLocaleDateString()}</span>
                      <span>🕐 {new Date(analysis.timestamp).toLocaleTimeString()}</span>
                    </div>
                  </div>
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold border-2 ${
                    analysis.risk === 'CRITICAL' ? 'bg-red-500/15 text-red-500 border-red-500/30' :
                    analysis.risk === 'HIGH' ? 'bg-orange-500/15 text-orange-500 border-orange-500/30' :
                    analysis.risk === 'MEDIUM' ? 'bg-yellow-500/15 text-yellow-500 border-yellow-500/30' :
                    'bg-green-500/15 text-green-500 border-green-500/30'
                  }`}>
                    {analysis.score}%
                  </div>
                </div>

                <div className="flex gap-2 mb-4 flex-wrap">
                  <span className={`px-3 py-1 rounded-md text-xs font-semibold uppercase tracking-wider ${
                    analysis.analysisMode === 'full' 
                      ? 'bg-cyan-500/15 text-cyan-500 border border-cyan-500/30'
                      : 'bg-purple-500/15 text-purple-500 border border-purple-500/30'
                  }`}>
                    {analysis.analysisMode}
                  </span>
                  <span className="px-3 py-1 bg-slate-800/50 text-slate-400 border border-slate-700/50 rounded-md text-xs font-semibold">
                    {analysis.cmp}
                  </span>
                </div>

                <div className="flex justify-between pt-4 border-t border-slate-800/50">
                  <div className="text-center">
                    <div className={`text-xl font-bold ${(analysis.violationsBySeverity?.critical || 0) > 0 ? 'text-red-500' : 'text-slate-600'}`}>
                      {analysis.violationsBySeverity?.critical || 0}
                    </div>
                    <div className="text-xs text-slate-600 uppercase tracking-wider">Critical</div>
                  </div>
                  <div className="text-center">
                    <div className={`text-xl font-bold ${(analysis.violationsBySeverity?.high || 0) > 0 ? 'text-orange-500' : 'text-slate-600'}`}>
                      {analysis.violationsBySeverity?.high || 0}
                    </div>
                    <div className="text-xs text-slate-600 uppercase tracking-wider">High</div>
                  </div>
                  <div className="text-center">
                    <div className={`text-xl font-bold ${(analysis.violationsBySeverity?.medium || 0) > 0 ? 'text-yellow-500' : 'text-slate-600'}`}>
                      {analysis.violationsBySeverity?.medium || 0}
                    </div>
                    <div className="text-xs text-slate-600 uppercase tracking-wider">Medium</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-bold text-slate-600">
                      {analysis.violationsBySeverity?.low || 0}
                    </div>
                    <div className="text-xs text-slate-600 uppercase tracking-wider">Low</div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
