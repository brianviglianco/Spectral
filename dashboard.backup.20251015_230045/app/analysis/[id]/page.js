'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

export default function AnalysisDetailPage() {
  const params = useParams();
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [activeReport, setActiveReport] = useState('console');
  const [expandedViolation, setExpandedViolation] = useState(null);
  const [expandedStage, setExpandedStage] = useState(null);

  useEffect(() => {
    fetch(`/api/analysis/${params.id}`)
      .then(res => res.json())
      .then(data => {
        setAnalysis(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error loading analysis:', err);
        setLoading(false);
      });
  }, [params.id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">⏳</div>
          <div className="text-2xl font-bold text-white">Loading analysis...</div>
        </div>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">❌</div>
          <div className="text-2xl font-bold text-white mb-4">Analysis not found</div>
          <Link href="/" className="text-cyan-500 hover:underline">Back to home</Link>
        </div>
      </div>
    );
  }

  const report = analysis.report;
  const stages = analysis.stages;
  const screenshots = analysis.screenshots;
  const reportFiles = analysis.reportFiles;
  const dimensions = report.compliance?.dimensions || {};
  const violations = report.violations || [];
  const violationsBySeverity = report.compliance?.violationsBySeverity || { critical: 0, high: 0, medium: 0, low: 0 };

  // Map violations to stages based on their code
  const getViolationsForStage = (stageName) => {
    const stageViolationMap = {
      'baseline': ['EU-C-001', 'EU-C-002', 'EU-C-003', 'EU-C-004', 'EU-C-005'],
      'reject_pre': [],
      'reject': ['EU-C-013'],
      'accept_pre': [],
      'accept': []
    };
    
    const relevantCodes = stageViolationMap[stageName] || [];
    return violations.filter(v => relevantCodes.includes(v.code));
  };

  // Determine compliance status for a stage
  const getStageStatus = (stage) => {
    const stageViolations = getViolationsForStage(stage.stage);
    const cookieBreakdown = stage.networkEvidence?.cookieBreakdown || stage.cookieBreakdown || {};
    const trackingCookies = cookieBreakdown.tracking || 0;
    
    // If has mapped violations, show those
    if (stageViolations.length > 0) {
      return {
        label: `${stageViolations.length} VIOLATIONS`,
        color: 'text-red-400',
        bgColor: 'bg-red-500/10 border-red-500/30',
        type: 'violations'
      };
    }
    
    // If not accept stage and has tracking cookies, it's non-compliant
    if (stage.stage !== 'accept' && trackingCookies > 0) {
      return {
        label: 'NON-COMPLIANT',
        color: 'text-orange-400',
        bgColor: 'bg-orange-500/10 border-orange-500/30',
        type: 'non-compliant'
      };
    }
    
    // Accept stage or no tracking = compliant
    return {
      label: 'COMPLIANT',
      color: 'text-green-400',
      bgColor: 'bg-slate-800/30 border-slate-700/30',
      type: 'compliant'
    };
  };

  const totalCookies = stages ? stages.reduce((sum, s) => sum + (s.cookies || 0), 0) : 0;
  const totalTrackingHits = stages ? stages.reduce((sum, s) => sum + (s.trackingHits || 0), 0) : 0;
  const preConsentViolations = violations.filter(v => v.code && (v.code.includes('C-001') || v.code.includes('C-002'))).length;

  const getViolationDetails = (violation) => {
    const details = {
      'EU-C-001': {
        gdprArticle: 'Article 5(3) ePrivacy Directive',
        penalty: 'Up to €20M or 4% of global revenue',
        howToFix: 'Implement consent wall that blocks all tracking before user accepts cookies',
        impact: 'CRITICAL - Users being tracked without consent is the #1 GDPR violation',
      },
      'EU-C-002': {
        gdprArticle: 'Article 7 GDPR - Consent Requirements',
        penalty: 'Up to €20M or 4% of global revenue', 
        howToFix: 'Ensure all non-essential cookies are set only AFTER user explicitly accepts',
        impact: 'CRITICAL - Setting cookies before consent violates core GDPR principle',
      },
      'EU-C-003': {
        gdprArticle: 'Article 5(3) ePrivacy Directive',
        penalty: 'Up to €10M or 2% of global revenue',
        howToFix: 'Reduce third-party scripts or lazy-load them after consent',
        impact: 'HIGH - Excessive tracking increases data breach risk',
      },
      'EU-C-004': {
        gdprArticle: 'Article 7 GDPR',
        penalty: 'Up to €10M or 2% of global revenue',
        howToFix: 'Clear localStorage/sessionStorage on page load, set only after consent',
        impact: 'HIGH - Persistent storage enables cross-session tracking',
      },
      'EU-C-013': {
        gdprArticle: 'Article 21 GDPR - Right to object',
        penalty: 'Up to €10M or 2% of global revenue',
        howToFix: 'Remove tracking cookies when user rejects, verify with DevTools',
        impact: 'CRITICAL - Ignoring user choice is core GDPR violation',
      },
      'EU-C-018': {
        gdprArticle: 'Article 32 GDPR - Security requirements',
        penalty: 'Up to €10M or 2% of global revenue',
        howToFix: 'Set Secure and SameSite=Strict flags on all tracking cookies',
        impact: 'MEDIUM - Insecure cookies vulnerable to interception',
      },
    };
    return details[violation.code] || {
      gdprArticle: 'GDPR compliance issue',
      penalty: 'Potential regulatory penalties',
      howToFix: 'Review and remediate this violation',
      impact: 'Varies by severity',
    };
  };

  const renderValue = (value) => {
    if (value === null || value === undefined) return 'N/A';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-950 to-slate-900">
      <nav className="bg-slate-950/80 backdrop-blur-xl border-b border-slate-800/50">
        <div className="max-w-[1600px] mx-auto px-8 py-4 flex justify-between items-center">
          <div className="text-2xl font-extrabold text-white tracking-tight">SPECTRAL.</div>
          <Link href="/" className="px-5 py-2.5 bg-slate-800/50 text-slate-400 border border-slate-700/50 rounded-lg text-sm font-semibold hover:bg-slate-800/70 transition">
            Back to List
          </Link>
        </div>
      </nav>

      <div className="flex flex-1 max-w-[1600px] mx-auto w-full">
        <aside className="w-72 bg-slate-900/40 border-r border-slate-800/50 p-8">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">Navigation</div>
          <nav className="space-y-1">
            <button onClick={() => setActiveTab('overview')} className={`w-full flex items-center gap-3 px-4 py-3 text-sm rounded-lg transition ${activeTab === 'overview' ? 'text-cyan-500 bg-cyan-500/10' : 'text-slate-400 hover:bg-slate-800/30'}`}>
              <span>📊</span> Overview
            </button>
            <button onClick={() => setActiveTab('violations')} className={`w-full flex items-center gap-3 px-4 py-3 text-sm rounded-lg transition ${activeTab === 'violations' ? 'text-cyan-500 bg-cyan-500/10' : 'text-slate-400 hover:bg-slate-800/30'}`}>
              <span>⚠️</span> Violations
            </button>
            {stages && (
              <button onClick={() => setActiveTab('stages')} className={`w-full flex items-center gap-3 px-4 py-3 text-sm rounded-lg transition ${activeTab === 'stages' ? 'text-cyan-500 bg-cyan-500/10' : 'text-slate-400 hover:bg-slate-800/30'}`}>
                <span>📈</span> Stages
              </button>
            )}
            <button onClick={() => setActiveTab('reports')} className={`w-full flex items-center gap-3 px-4 py-3 text-sm rounded-lg transition ${activeTab === 'reports' ? 'text-cyan-500 bg-cyan-500/10' : 'text-slate-400 hover:bg-slate-800/30'}`}>
              <span>📄</span> Reports
            </button>
            <button onClick={() => setActiveTab('download')} className={`w-full flex items-center gap-3 px-4 py-3 text-sm rounded-lg transition ${activeTab === 'download' ? 'text-cyan-500 bg-cyan-500/10' : 'text-slate-400 hover:bg-slate-800/30'}`}>
              <span>📦</span> Download
            </button>
          </nav>
        </aside>

        <main className="flex-1 p-8 overflow-y-auto">
          <div className="mb-8">
            <h1 className="text-4xl font-extrabold text-white mb-2 tracking-tight">{report.host}</h1>
            <div className="flex gap-6 text-sm text-slate-400 mb-4">
              <div>🌍 {new Date(report.timestamp).toLocaleDateString()}</div>
              <div>🕐 {new Date(report.timestamp).toLocaleTimeString()}</div>
              <div>🔍 {report.analysisMode} analysis</div>
            </div>
            <div className="flex gap-3">
              <span className={`px-4 py-2 rounded-lg text-sm font-semibold ${report.analysisMode === 'full' ? 'bg-cyan-500/15 text-cyan-500 border border-cyan-500/30' : 'bg-purple-500/15 text-purple-500 border border-purple-500/30'}`}>
                {report.analysisMode?.toUpperCase()}
              </span>
              <span className="px-4 py-2 bg-slate-800/50 text-slate-400 border border-slate-700/50 rounded-lg text-sm font-semibold">
                {report.cmp?.provider || 'Unknown CMP'}
              </span>
            </div>
          </div>

          {activeTab === 'overview' && (
            <div className="space-y-6">
              <section className="bg-slate-900/40 border border-slate-800/50 rounded-xl p-8">
                <div className="grid grid-cols-[auto_1fr] gap-12 items-center">
                  <div className="text-center">
                    <div className={`w-48 h-48 rounded-full flex items-center justify-center mx-auto mb-4 border-4 ${report.compliance?.risk === 'CRITICAL' ? 'bg-red-500/15 border-red-500/30' : report.compliance?.risk === 'HIGH' ? 'bg-orange-500/15 border-orange-500/30' : 'bg-yellow-500/15 border-yellow-500/30'}`}>
                      <span className={`text-6xl font-extrabold ${report.compliance?.risk === 'CRITICAL' ? 'text-red-500' : report.compliance?.risk === 'HIGH' ? 'text-orange-500' : 'text-yellow-500'}`}>
                        {report.compliance?.score || 0}%
                      </span>
                    </div>
                    <div className={`text-3xl font-extrabold mb-2 ${report.compliance?.risk === 'CRITICAL' ? 'text-red-500' : report.compliance?.risk === 'HIGH' ? 'text-orange-500' : 'text-yellow-500'}`}>
                      Grade: {report.compliance?.grade || 'F'}
                    </div>
                    <span className={`inline-block px-4 py-2 rounded-lg text-sm font-semibold border ${report.compliance?.risk === 'CRITICAL' ? 'bg-red-500/15 text-red-500 border-red-500/30' : report.compliance?.risk === 'HIGH' ? 'bg-orange-500/15 text-orange-500 border-orange-500/30' : 'bg-yellow-500/15 text-yellow-500 border-yellow-500/30'}`}>
                      {report.compliance?.risk} RISK
                    </span>
                  </div>

                  <div>
                    <h3 className="text-2xl font-bold text-white mb-6">Compliance Score Breakdown</h3>
                    {Object.keys(dimensions).length > 0 ? (
                      Object.entries(dimensions).map(([key, score]) => (
                        <div key={key} className="mb-6">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-sm text-slate-400 capitalize font-medium">{key.replace(/_/g, ' ')}</span>
                            <span className="text-sm font-bold text-white">{score}%</span>
                          </div>
                          <div className="h-3 bg-slate-800/50 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-cyan-500 to-cyan-600 transition-all" style={{ width: `${score}%` }} />
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-slate-400">No dimension data available</p>
                    )}
                  </div>
                </div>
              </section>

              <section className="grid grid-cols-4 gap-4">
                <div className="bg-slate-900/40 border border-slate-800/50 rounded-xl p-6">
                  <div className="text-slate-400 text-sm mb-2">Total Violations</div>
                  <div className="text-4xl font-bold text-white">{violations.length}</div>
                </div>
                <div className="bg-slate-900/40 border border-slate-800/50 rounded-xl p-6">
                  <div className="text-slate-400 text-sm mb-2">Critical Issues</div>
                  <div className="text-4xl font-bold text-red-500">{violationsBySeverity.critical}</div>
                </div>
                <div className="bg-slate-900/40 border border-slate-800/50 rounded-xl p-6">
                  <div className="text-slate-400 text-sm mb-2">Total Cookies</div>
                  <div className="text-4xl font-bold text-white">{totalCookies}</div>
                </div>
                <div className="bg-slate-900/40 border border-slate-800/50 rounded-xl p-6">
                  <div className="text-slate-400 text-sm mb-2">Tracking Hits</div>
                  <div className="text-4xl font-bold text-orange-500">{totalTrackingHits}</div>
                </div>
              </section>

              <section className="bg-slate-900/40 border border-slate-800/50 rounded-xl p-8">
                <h3 className="text-xl font-bold text-white mb-6">Violations by Severity</h3>
                <div className="grid grid-cols-4 gap-4">
                  <div className="text-center p-6 bg-red-500/10 border border-red-500/30 rounded-lg">
                    <div className="text-5xl font-extrabold text-red-500 mb-2">{violationsBySeverity.critical}</div>
                    <div className="text-sm font-semibold text-red-400 uppercase tracking-wider">Critical</div>
                    <div className="text-xs text-slate-500 mt-1">Immediate action required</div>
                  </div>
                  <div className="text-center p-6 bg-orange-500/10 border border-orange-500/30 rounded-lg">
                    <div className="text-5xl font-extrabold text-orange-500 mb-2">{violationsBySeverity.high}</div>
                    <div className="text-sm font-semibold text-orange-400 uppercase tracking-wider">High</div>
                    <div className="text-xs text-slate-500 mt-1">Priority fixes needed</div>
                  </div>
                  <div className="text-center p-6 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                    <div className="text-5xl font-extrabold text-yellow-500 mb-2">{violationsBySeverity.medium}</div>
                    <div className="text-sm font-semibold text-yellow-400 uppercase tracking-wider">Medium</div>
                    <div className="text-xs text-slate-500 mt-1">Should be addressed</div>
                  </div>
                  <div className="text-center p-6 bg-slate-700/10 border border-slate-700/30 rounded-lg">
                    <div className="text-5xl font-extrabold text-slate-400 mb-2">{violationsBySeverity.low}</div>
                    <div className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Low</div>
                    <div className="text-xs text-slate-500 mt-1">Minor improvements</div>
                  </div>
                </div>
              </section>

              <section className="bg-slate-900/40 border border-slate-800/50 rounded-xl p-8">
                <h3 className="text-xl font-bold text-white mb-6">Consent Management Platform</h3>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <div className="text-sm text-slate-400 mb-2">Provider</div>
                    <div className="text-2xl font-bold text-white">{report.cmp?.provider || 'Not detected'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-slate-400 mb-2">Implementation</div>
                    <div className={`text-2xl font-bold ${report.cmp?.detected ? 'text-green-500' : 'text-red-500'}`}>
                      {report.cmp?.detected ? 'Active' : 'Not detected'}
                    </div>
                  </div>
                  {report.cmp?.version && (
                    <div>
                      <div className="text-sm text-slate-400 mb-2">Version</div>
                      <div className="text-xl font-mono text-cyan-400">{report.cmp.version}</div>
                    </div>
                  )}
                  {preConsentViolations > 0 && (
                    <div>
                      <div className="text-sm text-slate-400 mb-2">Pre-consent Issues</div>
                      <div className="text-2xl font-bold text-red-500">{preConsentViolations}</div>
                    </div>
                  )}
                </div>
              </section>

              <section className="bg-slate-900/40 border border-slate-800/50 rounded-xl p-8">
                <h3 className="text-xl font-bold text-white mb-6">⚡ Key Findings</h3>
                <div className="space-y-4">
                  {violationsBySeverity.critical > 0 && (
                    <div className="flex items-start gap-4 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                      <span className="text-3xl">🚨</span>
                      <div>
                        <div className="font-semibold text-red-400 mb-1">Critical Compliance Failures</div>
                        <div className="text-sm text-slate-300">
                          {violationsBySeverity.critical} critical violations detected that require immediate remediation to avoid legal penalties.
                        </div>
                      </div>
                    </div>
                  )}
                  {preConsentViolations > 0 && (
                    <div className="flex items-start gap-4 p-4 bg-orange-500/10 border border-orange-500/30 rounded-lg">
                      <span className="text-3xl">⚠️</span>
                      <div>
                        <div className="font-semibold text-orange-400 mb-1">Pre-consent Tracking Detected</div>
                        <div className="text-sm text-slate-300">
                          Website is tracking users before obtaining consent, violating GDPR Article 5(3).
                        </div>
                      </div>
                    </div>
                  )}
                  {totalTrackingHits > 20 && (
                    <div className="flex items-start gap-4 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                      <span className="text-3xl">📊</span>
                      <div>
                        <div className="font-semibold text-yellow-400 mb-1">Excessive Third-party Tracking</div>
                        <div className="text-sm text-slate-300">
                          {totalTrackingHits} tracking requests detected across all stages. Consider reducing third-party dependencies.
                        </div>
                      </div>
                    </div>
                  )}
                  {violations.length === 0 && (
                    <div className="flex items-start gap-4 p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                      <span className="text-3xl">✅</span>
                      <div>
                        <div className="font-semibold text-green-400 mb-1">GDPR Compliant</div>
                        <div className="text-sm text-slate-300">
                          No violations detected. Website follows GDPR best practices.
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </section>

              {stages && (
                <section className="bg-slate-900/40 border border-slate-800/50 rounded-xl p-8">
                  <h3 className="text-xl font-bold text-white mb-6">Stage Summary</h3>
                  <div className="grid grid-cols-5 gap-3">
                    {stages.map((stage, idx) => {
                      const status = getStageStatus(stage);
                      
                      return (
                        <div key={idx} className={`p-4 rounded-lg text-center border ${status.bgColor}`}>
                          <div className="text-xs text-slate-400 uppercase mb-2">{stage.stage}</div>
                          <div className={`text-2xl font-bold ${status.color}`}>
                            {stage.trackingHits}
                          </div>
                          <div className="text-xs text-slate-500 mt-1">hits</div>
                          <div className={`text-[10px] font-semibold mt-1 ${status.color}`}>{status.label}</div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}
            </div>
          )}

          {activeTab === 'violations' && (
            <section className="space-y-6">
              <div className="bg-slate-900/40 border border-slate-800/50 rounded-xl p-8">
                <h2 className="text-2xl font-bold text-white mb-2">GDPR Violations Deep Dive</h2>
                <p className="text-slate-400 mb-6">
                  Detailed analysis of each violation including legal basis, business impact, and remediation steps.
                </p>
                <div className="space-y-4">
                  {violations.map((v, i) => {
                    const details = getViolationDetails(v);
                    const isExpanded = expandedViolation === i;
                    
                    return (
                      <div key={i} className={`bg-slate-800/40 border rounded-lg overflow-hidden transition-all ${v.severity === 'CRITICAL' ? 'border-red-500/50' : v.severity === 'HIGH' ? 'border-orange-500/50' : v.severity === 'MEDIUM' ? 'border-yellow-500/50' : 'border-slate-500/50'}`}>
                        <div 
                          className="p-6 cursor-pointer hover:bg-slate-800/60 transition"
                          onClick={() => setExpandedViolation(isExpanded ? null : i)}
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <span className="font-mono text-sm font-bold text-cyan-400">{v.code}</span>
                                <span className={`px-3 py-1 rounded text-xs font-semibold ${v.severity === 'CRITICAL' ? 'bg-red-500/15 text-red-400' : v.severity === 'HIGH' ? 'bg-orange-500/15 text-orange-400' : v.severity === 'MEDIUM' ? 'bg-yellow-500/15 text-yellow-400' : 'bg-slate-500/15 text-slate-400'}`}>
                                  {v.severity}
                                </span>
                              </div>
                              <div className="text-lg font-semibold text-white mb-1">{v.title || v.description}</div>
                              <div className="text-sm text-slate-400">{v.description}</div>
                            </div>
                            <button className="text-slate-400 hover:text-cyan-500 transition ml-4">
                              {isExpanded ? '▼' : '▶'}
                            </button>
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="border-t border-slate-700/50 bg-slate-900/60">
                            <div className="p-6 space-y-6">
                              <div className="grid grid-cols-2 gap-6">
                                <div>
                                  <div className="flex items-center gap-2 mb-2">
                                    <span className="text-lg">⚖️</span>
                                    <h4 className="font-semibold text-white">Legal Basis</h4>
                                  </div>
                                  <p className="text-sm text-slate-300 bg-slate-800/50 rounded-lg p-3">
                                    {v.gdprArticle || details.gdprArticle}
                                  </p>
                                </div>
                                <div>
                                  <div className="flex items-center gap-2 mb-2">
                                    <span className="text-lg">💰</span>
                                    <h4 className="font-semibold text-white">Potential Penalty</h4>
                                  </div>
                                  <p className="text-sm text-red-400 bg-red-500/10 rounded-lg p-3 font-semibold">
                                    {details.penalty}
                                  </p>
                                </div>
                              </div>

                              <div>
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="text-lg">🎯</span>
                                  <h4 className="font-semibold text-white">Business Impact</h4>
                                </div>
                                <p className="text-sm text-slate-300 bg-slate-800/50 rounded-lg p-3">
                                  {details.impact}
                                </p>
                              </div>

                              <div>
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="text-lg">🔧</span>
                                  <h4 className="font-semibold text-white">How to Fix</h4>
                                </div>
                                <p className="text-sm text-green-400 bg-green-500/10 rounded-lg p-3">
                                  {details.howToFix}
                                </p>
                              </div>

                              {v.evidence && (
                                <div>
                                  <div className="flex items-center gap-2 mb-2">
                                    <span className="text-lg">🔍</span>
                                    <h4 className="font-semibold text-white">Evidence</h4>
                                  </div>
                                  <div className="bg-slate-950/50 rounded-lg p-4 font-mono text-xs text-slate-400 overflow-x-auto">
                                    {typeof v.evidence === 'string' ? v.evidence : JSON.stringify(v.evidence, null, 2)}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>
          )}

          {activeTab === 'stages' && stages && (
            <section className="space-y-6">
              <div className="bg-slate-900/40 border border-slate-800/50 rounded-xl p-8">
                <h2 className="text-2xl font-bold text-white mb-2">Forensic Stage Analysis</h2>
                <p className="text-slate-400 mb-6">
                  Complete breakdown of cookies, scripts, storage, and network activity at each consent stage.
                </p>

                <div className="space-y-4">
                  {stages.map((stage, idx) => {
                    const isExpanded = expandedStage === idx;
                    const status = getStageStatus(stage);
                    const stageViolations = getViolationsForStage(stage.stage);
                    
                    // Real structure from JSON
                    const cookieBreakdown = stage.networkEvidence?.cookieBreakdown || stage.cookieBreakdown || {};
                    const scriptsList = stage.scriptAnalysis?.scripts || [];
                    const thirdPartyScriptsOnly = scriptsList.filter(s => s.thirdParty);
                    const thirdPartyScriptsCount = stage.thirdPartyScripts || 0;
                    const networkRequests = stage.networkEvidence?.requests || [];
                    const localStorageKeys = stage.localStorageKeys || stage.storage?.localStorageKeys || [];
                    const sessionStorageKeys = stage.sessionStorageKeys || stage.storage?.sessionStorageKeys || [];
                    const bannerState = stage.bannerState || 'unknown';
                    const cmpState = stage.cmpState;
                    const trackingCookies = cookieBreakdown.tracking || 0;
                    
                    return (
                      <div key={idx} className={`border rounded-lg overflow-hidden ${status.bgColor}`}>
                        <div 
                          className="p-6 cursor-pointer hover:bg-slate-800/60 transition"
                          onClick={() => setExpandedStage(isExpanded ? null : idx)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-6">
                              <div className="text-center">
                                <div className="text-3xl font-bold text-white mb-1">{idx + 1}</div>
                                <div className="text-xs text-slate-500 uppercase">{stage.stage}</div>
                              </div>
                              
                              <div className="flex gap-8">
                                <div>
                                  <div className="text-sm text-slate-400">Cookies</div>
                                  <div className="text-2xl font-bold text-white">{stage.cookies || 0}</div>
                                </div>
                                <div>
                                  <div className="text-sm text-slate-400">Scripts</div>
                                  <div className="text-2xl font-bold text-cyan-400">{thirdPartyScriptsCount}</div>
                                </div>
                                <div>
                                  <div className="text-sm text-slate-400">Requests</div>
                                  <div className="text-2xl font-bold text-purple-400">{networkRequests.length}</div>
                                </div>
                                <div>
                                  <div className="text-sm text-slate-400">Tracking Hits</div>
                                  <div className={`text-2xl font-bold ${stage.trackingHits > 0 ? 'text-red-400' : 'text-green-400'}`}>
                                    {stage.trackingHits}
                                  </div>
                                </div>
                                <div>
                                  <div className="text-sm text-slate-400">Status</div>
                                  <div className={`text-lg font-semibold ${status.color}`}>
                                    {status.label}
                                  </div>
                                </div>
                              </div>
                            </div>

                            <button className="text-slate-400 hover:text-cyan-500 transition">
                              {isExpanded ? '▼' : '▶'}
                            </button>
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="border-t border-slate-700/50 bg-slate-900/60 p-6 space-y-6">
                            
                            {/* Status Explanation */}
                            {status.type === 'violations' && (
                              <div>
                                <h4 className="font-semibold text-white mb-3 flex items-center gap-2">
                                  <span>🚨</span> Detected GDPR Violations
                                </h4>
                                <div className="space-y-2">
                                  {stageViolations.map((v, i) => (
                                    <div key={i} className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                                      <div className="flex items-center gap-2 mb-1">
                                        <span className="font-mono text-xs font-bold text-red-400">{v.code}</span>
                                        <span className="text-xs text-red-300">{v.severity}</span>
                                      </div>
                                      <div className="text-sm text-white font-semibold">{v.title}</div>
                                      <div className="text-xs text-slate-300 mt-1">{v.description}</div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {status.type === 'non-compliant' && (
                              <div>
                                <h4 className="font-semibold text-white mb-3 flex items-center gap-2">
                                  <span>⚠️</span> Non-Compliant State
                                </h4>
                                <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-4">
                                  <div className="text-sm text-orange-300">
                                    <p className="font-semibold mb-2">This stage remains in violation:</p>
                                    <p>• {trackingCookies} tracking cookies present without user consent</p>
                                    <p>• User has not yet accepted or rejected cookies</p>
                                    <p>• Continues violation state from baseline (EU-C-001/EU-C-002)</p>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Cookie Breakdown */}
                            <div>
                              <h4 className="font-semibold text-white mb-3 flex items-center gap-2">
                                <span>🍪</span> Cookie Breakdown by Category
                              </h4>
                              <div className="grid grid-cols-3 gap-3">
                                <div className="bg-slate-800/50 rounded-lg p-4 text-center">
                                  <div className="text-2xl font-bold text-red-400">{cookieBreakdown.tracking || 0}</div>
                                  <div className="text-xs text-slate-400 mt-1">Tracking</div>
                                </div>
                                <div className="bg-slate-800/50 rounded-lg p-4 text-center">
                                  <div className="text-2xl font-bold text-green-400">{cookieBreakdown.consent || 0}</div>
                                  <div className="text-xs text-slate-400 mt-1">Consent</div>
                                </div>
                                <div className="bg-slate-800/50 rounded-lg p-4 text-center">
                                  <div className="text-2xl font-bold text-yellow-400">{cookieBreakdown.unknown || 0}</div>
                                  <div className="text-xs text-slate-400 mt-1">Unknown</div>
                                </div>
                              </div>
                            </div>

                            {/* Third-party Scripts */}
                            {thirdPartyScriptsOnly.length > 0 && (
                              <div>
                                <h4 className="font-semibold text-white mb-3 flex items-center gap-2">
                                  <span>🔌</span> Third-party Scripts ({thirdPartyScriptsOnly.length})
                                </h4>
                                <div className="bg-slate-800/50 rounded-lg p-4 max-h-40 overflow-y-auto">
                                  <div className="space-y-2">
                                    {thirdPartyScriptsOnly.slice(0, 10).map((script, i) => (
                                      <div key={i} className="flex items-center gap-2 text-xs">
                                        <span className="text-red-400">3P</span>
                                        <span className="text-slate-300 font-mono truncate text-[10px]">
                                          {script.src || 'inline script'}
                                        </span>
                                      </div>
                                    ))}
                                    {thirdPartyScriptsOnly.length > 10 && (
                                      <div className="text-xs text-slate-500 italic">+ {thirdPartyScriptsOnly.length - 10} more scripts...</div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Network Requests */}
                            {networkRequests.length > 0 && (
                              <div>
                                <h4 className="font-semibold text-white mb-3 flex items-center gap-2">
                                  <span>🌐</span> Network Requests ({networkRequests.length})
                                </h4>
                                <div className="bg-slate-800/50 rounded-lg p-4 max-h-40 overflow-y-auto">
                                  <div className="space-y-2">
                                    {networkRequests.slice(0, 8).map((req, i) => (
                                      <div key={i} className="flex items-start gap-2 text-xs">
                                        <span className={`${req.resourceType === 'xhr' ? 'text-purple-400' : req.resourceType === 'script' ? 'text-cyan-400' : 'text-slate-500'}`}>
                                          {req.method || 'GET'}
                                        </span>
                                        <span className="text-slate-400 font-mono text-[10px] truncate flex-1">{req.url}</span>
                                      </div>
                                    ))}
                                    {networkRequests.length > 8 && (
                                      <div className="text-xs text-slate-500 italic">+ {networkRequests.length - 8} more requests...</div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Storage Usage */}
                            {(localStorageKeys.length > 0 || sessionStorageKeys.length > 0) && (
                              <div>
                                <h4 className="font-semibold text-white mb-3 flex items-center gap-2">
                                  <span>💾</span> Browser Storage Usage
                                </h4>
                                <div className="grid grid-cols-2 gap-4">
                                  <div className="bg-slate-800/50 rounded-lg p-4">
                                    <div className="text-sm text-slate-400 mb-2">LocalStorage: {localStorageKeys.length} keys</div>
                                    {localStorageKeys.length > 0 && (
                                      <div className="space-y-1 max-h-24 overflow-y-auto">
                                        {localStorageKeys.slice(0, 5).map((key, i) => (
                                          <div key={i} className="text-xs text-slate-500 font-mono truncate">{key}</div>
                                        ))}
                                        {localStorageKeys.length > 5 && (
                                          <div className="text-xs text-slate-600 italic">+{localStorageKeys.length - 5} more...</div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                  <div className="bg-slate-800/50 rounded-lg p-4">
                                    <div className="text-sm text-slate-400 mb-2">SessionStorage: {sessionStorageKeys.length} keys</div>
                                    {sessionStorageKeys.length > 0 && (
                                      <div className="space-y-1 max-h-24 overflow-y-auto">
                                        {sessionStorageKeys.slice(0, 5).map((key, i) => (
                                          <div key={i} className="text-xs text-slate-500 font-mono truncate">{key}</div>
                                        ))}
                                        {sessionStorageKeys.length > 5 && (
                                          <div className="text-xs text-slate-600 italic">+{sessionStorageKeys.length - 5} more...</div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Banner & CMP State */}
                            <div>
                              <h4 className="font-semibold text-white mb-3 flex items-center gap-2">
                                <span>🎯</span> Consent Banner State
                              </h4>
                              <div className="grid grid-cols-2 gap-4">
                                <div className="bg-slate-800/50 rounded-lg p-4">
                                  <div className="text-sm text-slate-400 mb-1">Banner Visibility</div>
                                  <div className={`text-lg font-semibold ${bannerState === 'visible' ? 'text-cyan-400' : bannerState === 'hidden' ? 'text-slate-500' : 'text-slate-600'}`}>
                                    {bannerState === 'visible' ? '👁️ Visible' : bannerState === 'hidden' ? '🚫 Hidden' : '❓ Unknown'}
                                  </div>
                                </div>
                                {cmpState && (
                                  <div className="bg-slate-800/50 rounded-lg p-4">
                                    <div className="text-sm text-slate-400 mb-1">CMP Data</div>
                                    <div className="text-xs font-mono text-cyan-400 truncate max-w-full overflow-hidden">
                                      {typeof cmpState === 'object' ? `${Object.keys(cmpState).length} properties` : renderValue(cmpState)}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* What Should vs Did Happen */}
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <h4 className="font-semibold text-white mb-3 flex items-center gap-2">
                                  <span>✅</span> Expected Behavior
                                </h4>
                                <div className="bg-slate-800/50 rounded-lg p-4 text-sm text-slate-300 space-y-2">
                                  {stage.stage === 'baseline' && (
                                    <>
                                      <p>• Only essential cookies</p>
                                      <p>• No analytics/marketing</p>
                                      <p>• No tracking scripts</p>
                                      <p>• No storage usage</p>
                                    </>
                                  )}
                                  {(stage.stage === 'reject_pre' || stage.stage === 'accept_pre') && (
                                    <>
                                      <p>• Banner visible to user</p>
                                      <p>• No consent given yet</p>
                                      <p>• Still no tracking allowed</p>
                                      <p>• Waiting for user choice</p>
                                    </>
                                  )}
                                  {stage.stage === 'reject' && (
                                    <>
                                      <p>• User rejected cookies</p>
                                      <p>• Remove non-essential cookies</p>
                                      <p>• Stop all tracking</p>
                                      <p>• Respect user choice</p>
                                    </>
                                  )}
                                  {stage.stage === 'accept' && (
                                    <>
                                      <p>• User gave consent</p>
                                      <p>• Analytics allowed now</p>
                                      <p>• Marketing cookies OK</p>
                                      <p>• Tracking can activate</p>
                                    </>
                                  )}
                                </div>
                              </div>

                              <div>
                                <h4 className="font-semibold text-white mb-3 flex items-center gap-2">
                                  <span>{status.type === 'compliant' ? '✅' : '❌'}</span> Actual Behavior
                                </h4>
                                <div className={`rounded-lg p-4 text-sm space-y-2 ${status.type === 'compliant' ? 'bg-green-500/10 text-green-300' : 'bg-red-500/10 text-red-300'}`}>
                                  <p className="font-semibold">{status.label}</p>
                                  <p>• {stage.cookies || 0} cookies present</p>
                                  <p>• {trackingCookies} tracking cookies</p>
                                  <p>• {thirdPartyScriptsCount} scripts loaded</p>
                                  <p>• {networkRequests.length} network requests</p>
                                  <p>• {stage.trackingHits} tracking hits</p>
                                  <p>• {localStorageKeys.length} localStorage keys</p>
                                  <p>• {sessionStorageKeys.length} sessionStorage keys</p>
                                  {status.type !== 'compliant' && trackingCookies > 0 && (
                                    <p className="mt-3 pt-3 border-t border-red-500/30 text-red-400 font-semibold">
                                      🚨 {trackingCookies} tracking cookies without consent
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-xl p-6">
                <h3 className="font-semibold text-cyan-400 mb-3 flex items-center gap-2">
                  <span>💡</span> Understanding Stage Analysis
                </h3>
                <div className="text-sm text-slate-300 space-y-2">
                  <p><strong>VIOLATIONS:</strong> New violations detected by auditdeep.mjs (EU-C-001, EU-C-002 at baseline, EU-C-013 at reject)</p>
                  <p><strong>NON-COMPLIANT:</strong> No new violations, but tracking cookies still present without consent (continues violation state)</p>
                  <p><strong>COMPLIANT:</strong> Either user gave consent (accept stage) OR no tracking present</p>
                  <p><strong>Key principle:</strong> Tracking cookies before or during consent = violation. After reject = new violation.</p>
                </div>
              </div>
            </section>
          )}

          {activeTab === 'reports' && (
            <section className="bg-slate-900/40 border border-slate-800/50 rounded-xl p-8">
              <h2 className="text-xl font-bold text-white mb-6">Generated Reports</h2>
              <div className="flex gap-2 mb-6">
                <button onClick={() => setActiveReport('console')} className={`px-4 py-2 text-sm font-semibold rounded-lg transition ${activeReport === 'console' ? 'bg-cyan-500/10 text-cyan-500 border border-cyan-500' : 'bg-slate-800/50 text-slate-400 hover:bg-slate-800/70'}`}>💻 Console</button>
                <button onClick={() => setActiveReport('marketing')} className={`px-4 py-2 text-sm font-semibold rounded-lg transition ${activeReport === 'marketing' ? 'bg-cyan-500/10 text-cyan-500 border border-cyan-500' : 'bg-slate-800/50 text-slate-400 hover:bg-slate-800/70'}`}>📈 Marketing</button>
                <button onClick={() => setActiveReport('technical')} className={`px-4 py-2 text-sm font-semibold rounded-lg transition ${activeReport === 'technical' ? 'bg-cyan-500/10 text-cyan-500 border border-cyan-500' : 'bg-slate-800/50 text-slate-400 hover:bg-slate-800/70'}`}>🔧 Technical</button>
                <button onClick={() => setActiveReport('legal')} className={`px-4 py-2 text-sm font-semibold rounded-lg transition ${activeReport === 'legal' ? 'bg-cyan-500/10 text-cyan-500 border border-cyan-500' : 'bg-slate-800/50 text-slate-400 hover:bg-slate-800/70'}`}>⚖️ Legal</button>
              </div>
              <div className="bg-slate-950/50 rounded-lg p-6 max-h-[600px] overflow-y-auto">
                <pre className="text-sm text-slate-300 whitespace-pre-wrap font-mono leading-relaxed">{reportFiles[activeReport] || 'Report not available'}</pre>
              </div>
            </section>
          )}

          {activeTab === 'download' && (
            <section className="bg-slate-900/40 border border-slate-800/50 rounded-xl p-8">
              <h2 className="text-2xl font-bold text-white mb-4">Forensic Evidence Package</h2>
              <p className="text-slate-400 mb-8 text-lg leading-relaxed">
                Download the complete forensic evidence package containing all analysis data, screenshots, and reports required for legal compliance verification and audit trails.
              </p>

              <a href={`/api/download?id=${params.id}`} className="block">
                <div className="bg-gradient-to-br from-cyan-500/15 to-cyan-600/15 border-2 border-cyan-500 rounded-xl p-8 hover:from-cyan-500/25 hover:to-cyan-600/25 transition-all hover:shadow-2xl hover:shadow-cyan-500/20">
                  <div className="flex items-start gap-6">
                    <div className="text-7xl">📦</div>
                    <div className="flex-1">
                      <h3 className="text-2xl font-bold text-white mb-3">Complete Evidence Package (.zip)</h3>
                      <p className="text-slate-300 mb-4 leading-relaxed">
                        Legally-admissible forensic package containing timestamped evidence of all privacy compliance violations and tracking behaviors detected during the analysis.
                      </p>
                      
                      <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700/50">
                          <div className="text-cyan-400 font-semibold mb-2">📄 Reports Included</div>
                          <ul className="text-sm text-slate-400 space-y-1">
                            <li>• Technical Implementation Report</li>
                            <li>• Legal Compliance Analysis</li>
                            <li>• Marketing Impact Report</li>
                            <li>• Executive Console Summary</li>
                          </ul>
                        </div>
                        <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700/50">
                          <div className="text-cyan-400 font-semibold mb-2">🔍 Evidence Files</div>
                          <ul className="text-sm text-slate-400 space-y-1">
                            <li>• Complete JSON analysis data</li>
                            <li>• Stage-by-stage screenshots</li>
                            <li>• Cookie & tracking logs</li>
                            <li>• Normalized evidence records</li>
                          </ul>
                        </div>
                      </div>

                      <div className="flex items-center gap-6 text-sm text-slate-400">
                        <div className="flex items-center gap-2">
                          <span className="text-green-400">✓</span>
                          <span>Timestamped & signed</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-green-400">✓</span>
                          <span>Legally admissible</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-green-400">✓</span>
                          <span>Audit-ready format</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-green-400">✓</span>
                          <span>~5MB compressed</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-5xl text-cyan-500">↓</div>
                  </div>
                </div>
              </a>

              <div className="mt-6 bg-slate-800/30 border border-slate-700/50 rounded-lg p-6">
                <h4 className="font-semibold text-white mb-3">💡 Use Cases for Forensic Package</h4>
                <ul className="space-y-2 text-slate-300 text-sm">
                  <li className="flex items-start gap-2">
                    <span className="text-cyan-500 mt-1">→</span>
                    <span><strong>Legal Defense:</strong> Provide timestamped evidence to regulatory bodies during GDPR audits or investigations</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-cyan-500 mt-1">→</span>
                    <span><strong>Compliance Documentation:</strong> Archive as proof of due diligence for privacy impact assessments (PIAs)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-cyan-500 mt-1">→</span>
                    <span><strong>Vendor Audits:</strong> Share with third-party CMP providers or web development teams for remediation</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-cyan-500 mt-1">→</span>
                    <span><strong>Board Reporting:</strong> Present comprehensive compliance status to executives and board members</span>
                  </li>
                </ul>
              </div>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}
