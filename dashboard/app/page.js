'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

// ===== COMPONENTE NUEVO: Progress Tracker =====
function AnalysisProgress({ url }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  const steps = [
    { label: 'Browser Initialization', detail: 'Launching Chromium with GDPR profile', duration: 3 },
    { label: 'Site Load', detail: `Loading ${url}`, duration: 5 },
    { label: 'CMP Detection', detail: 'Identifying consent management platform', duration: 4 },
    { label: 'Baseline Stage', detail: 'Capturing pre-consent cookies & tracking', duration: 8 },
    { label: 'Reject Pre-Stage', detail: 'Waiting before reject button click', duration: 6 },
    { label: 'Reject Click', detail: 'Testing reject button + capturing changes', duration: 7 },
    { label: 'Accept Pre-Stage', detail: 'Waiting before accept button click', duration: 6 },
    { label: 'Accept Click', detail: 'Testing accept button + capturing changes', duration: 8 },
    { label: 'Network Analysis', detail: 'Analyzing 200+ tracking requests & endpoints', duration: 5 },
    { label: 'GDPR Audit', detail: 'Detecting 17+ violation types', duration: 4 },
    { label: 'Report Generation', detail: 'Creating 4 specialized reports (legal, tech, marketing, console)', duration: 3 },
    { label: 'Evidence Package', detail: 'Generating forensic ZIP with SHA-256 verification', duration: 6 }
  ];

  const totalDuration = steps.reduce((sum, step) => sum + step.duration, 0);

  useEffect(() => {
    const startTime = Date.now();

    const interval = setInterval(() => {
      const now = Date.now();
      const elapsedSeconds = Math.floor((now - startTime) / 1000);
      setElapsed(elapsedSeconds);

      const progressPercent = Math.min(100, (elapsedSeconds / totalDuration) * 100);
      setProgress(Math.floor(progressPercent));

      let stepIndex = 0;
      let timeCounter = 0;
      for (let i = 0; i < steps.length; i++) {
        timeCounter += steps[i].duration;
        if (elapsedSeconds < timeCounter) {
          stepIndex = i;
          break;
        }
      }
      setCurrentStep(stepIndex);

      if (elapsedSeconds >= totalDuration) {
        clearInterval(interval);
      }
    }, 100);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="mt-6 p-6 rounded-xl border border-purple-500/30 bg-purple-500/5">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
          <h3 className="text-lg font-semibold text-white">Analysis In Progress</h3>
        </div>
        <div className="text-sm font-mono text-gray-400">
          {elapsed}s / {totalDuration}s
        </div>
      </div>

      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-gray-400">Overall Progress</span>
          <span className="text-xs font-bold text-purple-400">{progress}%</span>
        </div>
        <div className="h-2 bg-white/5 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-purple-600 to-purple-400 transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="space-y-3">
        {steps.map((step, index) => {
          const status = index < currentStep ? 'completed' : index === currentStep ? 'active' : 'pending';
          
          return (
            <div 
              key={index}
              className={`flex items-start gap-3 p-3 rounded-lg transition-all duration-300 ${
                status === 'active' ? 'bg-white/5 border border-purple-500/30' : 
                status === 'completed' ? 'bg-white/5 border border-white/10' : 
                'border border-transparent'
              }`}
            >
              <div className="flex-shrink-0 mt-0.5">
                {status === 'completed' && (
                  <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                )}
                {status === 'active' && (
                  <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                )}
                {status === 'pending' && (
                  <div className="w-5 h-5 rounded-full border-2 border-white/20"></div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className={`text-sm font-medium mb-1 ${
                  status === 'active' ? 'text-purple-400' : 
                  status === 'completed' ? 'text-gray-400' : 
                  'text-gray-600'
                }`}>
                  {step.label}
                </div>
                <div className={`text-xs ${
                  status === 'active' ? 'text-gray-300' : 'text-gray-600'
                }`}>
                  {step.detail}
                </div>
              </div>

              <div className="flex-shrink-0 text-xs font-mono text-gray-500">
                {step.duration}s
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 pt-4 border-t border-white/10">
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Results will appear in "Recent Analyses" below when complete</span>
        </div>
      </div>
    </div>
  );
}
// ===== FIN COMPONENTE NUEVO =====

export default function HomePage() {
  const [analyses, setAnalyses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzingUrl, setAnalyzingUrl] = useState(''); // NUEVO: para el progress tracker
  const [url, setUrl] = useState('');
  const [message, setMessage] = useState(null);

  useEffect(() => {
    loadAnalyses();
    const interval = setInterval(loadAnalyses, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadAnalyses = async () => {
    try {
      const res = await fetch('/api/analyses');
      const data = await res.json();
      setAnalyses(data);
      setLoading(false);
    } catch (err) {
      console.error('Error loading analyses:', err);
      setLoading(false);
    }
  };

  const startAnalysis = async (e) => {
    e.preventDefault();
    
    if (!url.trim()) {
      setMessage({ type: 'error', text: 'Please enter a URL' });
      return;
    }

    setAnalyzing(true);
    setAnalyzingUrl(url.trim()); // NUEVO: guardar URL para el progress tracker
    setMessage(null);

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() })
      });

      const data = await res.json();

      if (res.ok) {
        setUrl('');
        // MODIFICADO: mantener progress visible 65 segundos
        setTimeout(() => {
          setAnalyzing(false);
          setMessage({ 
            type: 'success', 
            text: `Analysis completed for ${data.url}. Check results below.` 
          });
          loadAnalyses();
        }, 65000);
      } else {
        setAnalyzing(false);
        setMessage({ type: 'error', text: data.error || 'Failed to start analysis' });
      }
    } catch (err) {
      setAnalyzing(false);
      setMessage({ type: 'error', text: 'Failed to start analysis' });
      console.error('Error:', err);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 75) return 'text-green-400';
    if (score >= 50) return 'text-yellow-400';
    if (score >= 25) return 'text-orange-400';
    return 'text-red-400';
  };

  const getRiskBadge = (risk) => {
    const styles = {
      LOW: 'bg-green-500/10 text-green-400 border-green-500/30',
      MEDIUM: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
      HIGH: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
      CRITICAL: 'bg-red-500/10 text-red-400 border-red-500/30'
    };
    return styles[risk] || styles.CRITICAL;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mb-4 mx-auto"></div>
          <div className="text-xl font-medium text-white">Loading SPECTRAL...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-black/80 backdrop-blur-xl border-b border-white/10 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-3xl font-black text-white tracking-tight">
              SP<span className="inline-block transform scale-x-[-1]">E</span>CTRAL
            </div>
            <div className="hidden sm:block h-6 w-px bg-white/20"></div>
            <div className="hidden sm:block text-sm text-gray-400 font-light">
              Continuous Privacy Compliance Verification
            </div>
          </div>
          <div className="flex items-center gap-4">
            <a 
              href="https://brianviglianco.github.io/Spectral/" 
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-gray-400 hover:text-white transition"
            >
              About
            </a>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="pt-32 pb-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h1 className="text-7xl md:text-8xl font-black text-white mb-6 leading-none">
              Stop <span className="text-purple-500">Hoping</span>.
              <br />
              Start <span className="text-purple-500">Proving</span>.
            </h1>
            <p className="text-2xl text-gray-400 max-w-3xl mx-auto font-light">
              Continuous verification that your privacy policies are actually enforced in production
            </p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-20">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center">
              <div className="text-5xl font-black text-purple-500 mb-2">190+</div>
              <div className="text-gray-400">Privacy Jurisdictions</div>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center">
              <div className="text-5xl font-black text-purple-500 mb-2">40hrs</div>
              <div className="text-gray-400">Manual QA Per Month</div>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center">
              <div className="text-5xl font-black text-purple-500 mb-2">73%</div>
              <div className="text-gray-400">Have Compliance Gaps</div>
            </div>
          </div>

          {/* How SPECTRAL Works - Detailed */}
          <div className="mb-20">
            <h2 className="text-5xl font-black text-white text-center mb-4">
              How SPECTRAL Works
            </h2>
            <p className="text-xl text-gray-400 text-center mb-12 max-w-3xl mx-auto">
              End-to-end continuous verification with forensic evidence collection
            </p>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Step 1 */}
              <div className="bg-gradient-to-br from-purple-900/20 to-purple-600/10 border border-purple-500/30 rounded-2xl p-8">
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-purple-500 text-black font-black flex items-center justify-center text-xl flex-shrink-0">
                    1
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-white mb-2">Site Selection & Configuration</h3>
                    <p className="text-gray-400">Define target domains, subdomains, and critical user journeys across multiple regions</p>
                  </div>
                </div>
                <ul className="space-y-2 text-sm text-gray-300 ml-16">
                  <li>• Configure domains and geographic regions</li>
                  <li>• Define user journeys (home → product → checkout)</li>
                  <li>• Set consent states to test (none, accept, reject, GPC)</li>
                  <li>• Specify CMP and tag management systems</li>
                </ul>
              </div>

              {/* Step 2 */}
              <div className="bg-gradient-to-br from-purple-900/20 to-purple-600/10 border border-purple-500/30 rounded-2xl p-8">
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-purple-500 text-black font-black flex items-center justify-center text-xl flex-shrink-0">
                    2
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-white mb-2">Automated Scan Execution</h3>
                    <p className="text-gray-400">Headless browser simulation with real user behavior patterns</p>
                  </div>
                </div>
                <ul className="space-y-2 text-sm text-gray-300 ml-16">
                  <li>• Launch Puppeteer with stealth mode</li>
                  <li>• Simulate real user interactions</li>
                  <li>• Test all consent state combinations</li>
                  <li>• Execute across multiple geographic locations</li>
                </ul>
              </div>

              {/* Step 3 */}
              <div className="bg-gradient-to-br from-purple-900/20 to-purple-600/10 border border-purple-500/30 rounded-2xl p-8">
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-purple-500 text-black font-black flex items-center justify-center text-xl flex-shrink-0">
                    3
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-white mb-2">Evidence Capture</h3>
                    <p className="text-gray-400">Comprehensive forensic data collection at every interaction point</p>
                  </div>
                </div>
                <ul className="space-y-2 text-sm text-gray-300 ml-16">
                  <li>• PRE-consent screenshots (before banner)</li>
                  <li>• POST-consent screenshots (after choice)</li>
                  <li>• Complete network traffic (HAR files)</li>
                  <li>• Cookie and localStorage analysis</li>
                  <li>• DOM structure and tag inspection</li>
                </ul>
              </div>

              {/* Step 4 */}
              <div className="bg-gradient-to-br from-purple-900/20 to-purple-600/10 border border-purple-500/30 rounded-2xl p-8">
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-purple-500 text-black font-black flex items-center justify-center text-xl flex-shrink-0">
                    4
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-white mb-2">17+ Violation Analysis</h3>
                    <p className="text-gray-400">ML-powered rule engine checks compliance across all touchpoints</p>
                  </div>
                </div>
                <ul className="space-y-2 text-sm text-gray-300 ml-16">
                  <li>• Pre-consent tracking detection</li>
                  <li>• Accept/reject parity verification</li>
                  <li>• Dark pattern identification</li>
                  <li>• Cookie consent validation</li>
                  <li>• Server-side tracking correlation</li>
                  <li>• GPC signal compliance</li>
                </ul>
              </div>

              {/* Step 5 */}
              <div className="bg-gradient-to-br from-purple-900/20 to-purple-600/10 border border-purple-500/30 rounded-2xl p-8">
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-purple-500 text-black font-black flex items-center justify-center text-xl flex-shrink-0">
                    5
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-white mb-2">Multi-Format Reporting</h3>
                    <p className="text-gray-400">Generate professional reports for legal, technical, and executive audiences</p>
                  </div>
                </div>
                <ul className="space-y-2 text-sm text-gray-300 ml-16">
                  <li>• Legal compliance report with GDPR articles</li>
                  <li>• Technical implementation guide</li>
                  <li>• Executive marketing summary</li>
                  <li>• Console output for developers</li>
                </ul>
              </div>

              {/* Step 6 */}
              <div className="bg-gradient-to-br from-purple-900/20 to-purple-600/10 border border-purple-500/30 rounded-2xl p-8">
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-purple-500 text-black font-black flex items-center justify-center text-xl flex-shrink-0">
                    6
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-white mb-2">Evidence Download</h3>
                    <p className="text-gray-400">Complete audit trail with reproducible proof for regulatory defense</p>
                  </div>
                </div>
                <ul className="space-y-2 text-sm text-gray-300 ml-16">
                  <li>• Timestamped screenshots (PRE/POST)</li>
                  <li>• Network traffic HAR files</li>
                  <li>• Violation details with remediation steps</li>
                  <li>• JSON data exports for automation</li>
                  <li>• Curl commands for reproduction</li>
                </ul>
              </div>
            </div>

            {/* Technical Capabilities */}
            <div className="mt-12 grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white/5 border border-white/10 rounded-xl p-6 text-center">
                <div className="text-3xl font-bold text-purple-500 mb-2">8</div>
                <div className="text-sm text-gray-400">Language Support</div>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-xl p-6 text-center">
                <div className="text-3xl font-bold text-purple-500 mb-2">6</div>
                <div className="text-sm text-gray-400">CMP Platforms</div>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-xl p-6 text-center">
                <div className="text-3xl font-bold text-purple-500 mb-2">17+</div>
                <div className="text-sm text-gray-400">Violation Types</div>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-xl p-6 text-center">
                <div className="text-3xl font-bold text-purple-500 mb-2">4</div>
                <div className="text-sm text-gray-400">Report Formats</div>
              </div>
            </div>
          </div>

          {/* Analysis Form */}
          <div className="bg-gradient-to-br from-purple-900/20 to-purple-600/10 border border-purple-500/30 rounded-3xl p-8 md:p-12 mb-20">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-4xl font-bold text-white mb-3 text-center">
                Verify Your Compliance Now
              </h2>
              <p className="text-gray-400 text-center mb-8">
                Enter any website URL to run a complete privacy compliance analysis
              </p>
              
              <form onSubmit={startAnalysis} className="flex flex-col sm:flex-row gap-4">
                <input
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://example.com"
                  disabled={analyzing}
                  className="flex-1 px-6 py-5 bg-black/50 border border-white/20 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition text-lg disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={analyzing}
                  className="px-10 py-5 bg-gradient-to-r from-purple-600 to-purple-700 text-white font-semibold rounded-xl hover:from-purple-500 hover:to-purple-600 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 text-lg whitespace-nowrap"
                >
                  {analyzing ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Analyzing
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      Analyze Site
                    </>
                  )}
                </button>
              </form>

              {/* ===== SECCIÓN MODIFICADA: Progress Tracker ===== */}
              {analyzing && <AnalysisProgress url={analyzingUrl} />}

              {!analyzing && message && (
                <div className={`mt-6 p-4 rounded-xl border ${
                  message.type === 'success' 
                    ? 'bg-green-500/10 border-green-500/30 text-green-400' 
                    : 'bg-red-500/10 border-red-500/30 text-red-400'
                }`}>
                  {message.text}
                </div>
              )}
              {/* ===== FIN SECCIÓN MODIFICADA ===== */}

              <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-sm text-gray-500">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>~60 seconds per scan</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Multi-region testing</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span>Forensic evidence included</span>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Analyses */}
          {analyses.length > 0 && (
            <div>
              <h2 className="text-4xl font-bold text-white mb-8">Recent Analyses</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {analyses.map((analysis) => (
                  <Link
                    key={analysis.id}
                    href={`/analysis/${analysis.id}`}
                    className="block bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/10 hover:border-purple-500/50 transition group"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-xl font-bold text-white group-hover:text-purple-400 transition truncate mb-1">
                          {analysis.host}
                        </h3>
                        <div className="text-sm text-gray-500">
                          {new Date(analysis.timestamp).toLocaleString()}
                        </div>
                      </div>
                      <div className="text-right ml-4">
                        <div className={`text-4xl font-black ${getScoreColor(analysis.score)}`}>
                          {analysis.score}%
                        </div>
                        <div className="text-xs text-gray-500 font-semibold">Grade {analysis.grade}</div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between mb-4">
                      <span className={`px-3 py-1 rounded-lg text-xs font-bold border ${getRiskBadge(analysis.risk)}`}>
                        {analysis.risk} RISK
                      </span>
                      <span className="text-sm text-gray-400">{analysis.cmp}</span>
                    </div>

                    <div className="grid grid-cols-3 gap-4 pt-4 border-t border-white/10">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-white">{analysis.violations}</div>
                        <div className="text-xs text-gray-500">Issues</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-red-400">{analysis.critical}</div>
                        <div className="text-xs text-gray-500">Critical</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-purple-400">→</div>
                        <div className="text-xs text-gray-500">Details</div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-white/10 py-8">
        <div className="max-w-7xl mx-auto px-6 text-center text-sm text-gray-500">
          <p>SPECTRAL © 2025 - Continuous Privacy Compliance Verification Platform</p>
          <p className="mt-2">GDPR · CCPA · LGPD · PIPEDA · Multi-Surface Monitoring</p>
        </div>
      </div>
    </div>
  );
}