// violationEngine.js - GDPR Violation Detection and Classification Engine
// SPECTRAL MVP - Complete Flexible Report Generation System
// Business Impact: Handles all tracking scenarios with real evidence-based reporting

class GDPRViolationEngine {
    constructor() {
        this.violations = [];
        this.evidenceStages = [];
        this.bannerAnalysis = null;
        this.behaviorAnalysis = null;
        
        // Enhanced GDPR Violation Definitions with Professional Classification
        this.violationDefinitions = {
            'EU-C-001': {
                title: 'Pre-consent Tracking Violation',
                description: 'Tracking scripts, cookies, or storage detected before user consent',
                legalReference: 'Article 7(1) - Consent must be given prior to processing',
                severity: 'CRITICAL',
                businessRisk: 'Systematic GDPR violation - tracking users without any legal basis',
                recommendedAction: 'Remove all tracking technologies from initial page load',
                category: 'consent',
                priority: 1  // HIGHEST PRIORITY - affects ALL users
            },
            'EU-C-002': {
                title: 'Missing Consent Banner',
                description: 'No consent management platform detected on GDPR-applicable site',
                legalReference: 'Article 7 - Demonstrable consent required',
                severity: 'CRITICAL',
                businessRisk: 'Systematic GDPR violations across entire site',
                recommendedAction: 'Implement GDPR-compliant consent management system',
                category: 'banner',
                priority: 1
            },
            'EU-C-003': {
                title: 'US-Style Cookie Notice',
                description: 'Notice-only banner detected instead of consent request',
                legalReference: 'Article 7(1) - Active consent required, not passive notice',
                severity: 'CRITICAL',
                businessRisk: 'Invalid consent mechanism under GDPR',
                recommendedAction: 'Replace notice banner with consent request system',
                category: 'banner',
                priority: 1
            },
            'EU-C-004': {
                title: 'Missing Reject Option',
                description: 'No clear rejection mechanism provided to users',
                legalReference: 'Article 7(3) - Withdrawal must be as easy as giving consent',
                severity: 'CRITICAL',
                businessRisk: 'Invalid consent framework, potential class action liability',
                recommendedAction: 'Add prominent "Reject All" option to consent interface',
                category: 'banner',
                priority: 1
            },
            'EU-C-005': {
                title: 'Consent Wall Violation',
                description: 'Content access blocked without accepting non-essential cookies',
                legalReference: 'Recital 42 - Consent not freely given if content access conditional',
                severity: 'HIGH',
                businessRisk: 'Invalid consent, potential competition law issues',
                recommendedAction: 'Allow content access with essential cookies only',
                category: 'banner',
                priority: 2
            },
            'EU-C-006': {
                title: 'Dark Pattern in Consent Design',
                description: 'Accept button prominently displayed while reject option hidden',
                legalReference: 'Article 7(2) - Consent request must be clearly distinguishable',
                severity: 'HIGH',
                businessRisk: 'Consent validity challenges, regulatory scrutiny',
                recommendedAction: 'Balance visual prominence of accept/reject options',
                category: 'banner',
                priority: 2
            },
            'EU-C-007': {
                title: 'Pre-checked Consent Boxes',
                description: 'Consent options pre-selected without user action',
                legalReference: 'Recital 32 - Consent requires clear affirmative action',
                severity: 'HIGH',
                businessRisk: 'Invalid consent mechanism, requires re-consent',
                recommendedAction: 'Default all consent options to unchecked state',
                category: 'banner',
                priority: 2
            },
            'EU-C-008': {
                title: 'Bundled Consent Violation',
                description: 'Essential and non-essential purposes combined in single consent',
                legalReference: 'Article 7(4) - Consent for different purposes must be separate',
                severity: 'MEDIUM',
                businessRisk: 'Consent granularity issues, partial compliance failure',
                recommendedAction: 'Separate consent mechanisms for different processing purposes',
                category: 'banner',
                priority: 3
            },
            'EU-C-009': {
                title: 'Insufficient Consent Information',
                description: 'Consent request lacks clear information about data processing',
                legalReference: 'Article 7(1) - Consent must be informed',
                severity: 'MEDIUM',
                businessRisk: 'Consent validity challenges, transparency violations',
                recommendedAction: 'Provide clear information about data processing purposes',
                category: 'transparency',
                priority: 3
            },
            'EU-C-010': {
                title: 'Cookie Categorization Issues',
                description: 'Non-essential cookies or scripts misclassified as technically necessary',
                legalReference: 'Article 6(1)(f) vs Article 6(1)(a) - Legal basis confusion',
                severity: 'HIGH',
                businessRisk: 'Systematic consent bypass, audit failures',
                recommendedAction: 'Review and correct cookie categorization in CMP settings',
                category: 'categorization',
                priority: 2
            },
            'EU-C-011': {
                title: 'Consent Bypass Violation',
                description: 'Website continues tracking after user explicitly rejects all cookies',
                legalReference: 'Article 5(1)(a) - Processing must be lawful and fair. Article 7(3) - Consent withdrawal must be respected',
                severity: 'CRITICAL',
                businessRisk: 'Systematic GDPR violations - users can file complaints because their "No" is being ignored',
                recommendedAction: 'Immediately reconfigure consent management system to respect user rejection',
                category: 'enforcement',
                priority: 2  // Secondary to pre-consent violations but still critical
            },
            'EU-C-012': {
                title: 'Consent Refresh Violation',
                description: 'Valid consent not refreshed after significant changes',
                legalReference: 'Article 7(3) - Consent withdrawal must be possible',
                severity: 'MEDIUM',
                businessRisk: 'Processing without valid legal basis',
                recommendedAction: 'Implement consent refresh mechanisms for policy changes',
                category: 'maintenance',
                priority: 3
            },
            'EU-C-013': {
                title: 'Cross-Border Consent Issues',
                description: 'Different consent mechanisms for different jurisdictions',
                legalReference: 'Article 3 - Territorial scope of GDPR',
                severity: 'MEDIUM',
                businessRisk: 'Inconsistent privacy protection, compliance gaps',
                recommendedAction: 'Standardize consent mechanisms across all markets',
                category: 'territorial',
                priority: 3
            },
            'EU-C-014': {
                title: 'Third-Party Consent Violations',
                description: 'Third-party services processing data without proper consent flow',
                legalReference: 'Article 28 - Processor obligations',
                severity: 'HIGH',
                businessRisk: 'Liability for third-party violations, due diligence failures',
                recommendedAction: 'Audit and control third-party consent mechanisms',
                category: 'third-party',
                priority: 2
            },
            'EU-C-015': {
                title: 'Consent Record Keeping Issues',
                description: 'Inadequate records of consent for compliance demonstration',
                legalReference: 'Article 7(1) - Must be able to demonstrate consent',
                severity: 'MEDIUM',
                businessRisk: 'Cannot prove compliance during regulatory investigation',
                recommendedAction: 'Implement comprehensive consent logging and audit trails',
                category: 'documentation',
                priority: 3
            },
            'EU-C-016': {
                title: 'Accept Button Malfunction',
                description: 'Accept consent does not result in expected tracking activation',
                legalReference: 'Article 7(1) - Consent must be demonstrable and functional',
                severity: 'MEDIUM',
                businessRisk: 'Broken consent mechanism indicates systematic technical issues',
                recommendedAction: 'Fix consent management system to properly activate tracking when accepted',
                category: 'technical',
                priority: 3
            },
            'EU-C-017': {
                title: 'Identical Tracking Regardless of Choice',
                description: 'Same tracking behavior whether user accepts or rejects cookies',
                legalReference: 'Article 7 - Consent must result in different processing outcomes',
                severity: 'HIGH',
                businessRisk: 'Consent mechanism is non-functional, creating legal liability',
                recommendedAction: 'Implement functional difference between accept and reject choices',
                category: 'technical',
                priority: 2
            }
        };
    }

    analyzeCompliance(evidencePackage) {
        console.log('🔍 GDPR Engine: Starting comprehensive compliance analysis...');
        
        this.violations = [];
        this.evidenceStages = evidencePackage.stages;
        
        // Extract banner analysis from pre-consent stage
        const preConsentStage = this.evidenceStages.find(stage => stage.stage === 'pre-consent');
        this.bannerAnalysis = preConsentStage?.bannerAnalysis;
        
        // Generate behavioral analysis first
        this.behaviorAnalysis = this.generateBehaviorAnalysis(evidencePackage.stages);
        
        // Run all violation checks
        this.analyzePreConsentViolations(evidencePackage);
        this.analyzeBannerViolations(evidencePackage);
        this.analyzeConsentMechanismViolations(evidencePackage);
        this.analyzeConsentEffectivenessViolations(evidencePackage);
        this.analyzeTransparencyViolations(evidencePackage);
        this.analyzeTechnicalViolations(evidencePackage);
        
        console.log(`🔍 GDPR Engine: Analysis complete - ${this.violations.length} violations detected`);
        
        // Generate professional compliance report
        const complianceScore = this.calculateComplianceScore();
        const riskLevel = this.getOverallRisk(this.violations);
        const report = this.generateFlexibleReport(evidencePackage, this.violations);
        
        console.log(`📊 Compliance report: ${complianceScore}% score, ${riskLevel} risk, ${this.violations.length} violations`);
        
        return {
            complianceScore,
            riskLevel,
            violations: this.violations,
            report,
            evidenceStages: this.evidenceStages,
            behaviorAnalysis: this.behaviorAnalysis
        };
    }

    generateBehaviorAnalysis(stages) {
        console.log('📊 Generating behavioral analysis...');
        
        const preConsent = stages.find(s => s.stage === 'pre-consent');
        const postReject = stages.find(s => s.stage === 'post-reject');
        const postAccept = stages.find(s => s.stage === 'post-accept');
        
        const analysis = {
            baseline: {
                scripts: preConsent?.scriptAnalysis?.tracking || 0,
                cookies: this.countTrackingItems(preConsent?.detailedCookieAnalysis?.trackingDetails) || 0,
                localStorage: this.countTrackingItems(preConsent?.detailedStorageAnalysis?.trackingDetails) || 0,
                pixels: preConsent?.detailedPixelAnalysis?.total || 0,
                details: {
                    scripts: preConsent?.scriptAnalysis?.trackingDetails || [],
                    cookies: preConsent?.detailedCookieAnalysis?.trackingDetails || [],
                    localStorage: preConsent?.detailedStorageAnalysis?.trackingDetails || [],
                }
            },
            afterReject: postReject ? {
                scripts: postReject.scriptAnalysis?.tracking || 0,
                cookies: this.countTrackingItems(postReject?.detailedCookieAnalysis?.trackingDetails) || 0,
                localStorage: this.countTrackingItems(postReject?.detailedStorageAnalysis?.trackingDetails) || 0,
                pixels: postReject.detailedPixelAnalysis?.total || 0,
                details: {
                    scripts: postReject.scriptAnalysis?.trackingDetails || [],
                    cookies: postReject.detailedCookieAnalysis?.trackingDetails || [],
                    localStorage: postReject.detailedStorageAnalysis?.trackingDetails || [],
                }
            } : null,
            afterAccept: postAccept ? {
                scripts: postAccept.scriptAnalysis?.tracking || 0,
                cookies: this.countTrackingItems(postAccept?.detailedCookieAnalysis?.trackingDetails) || 0,
                localStorage: this.countTrackingItems(postAccept?.detailedStorageAnalysis?.trackingDetails) || 0,
                pixels: postAccept.detailedPixelAnalysis?.total || 0,
                details: {
                    scripts: postAccept.scriptAnalysis?.trackingDetails || [],
                    cookies: postAccept.detailedCookieAnalysis?.trackingDetails || [],
                    localStorage: postAccept.detailedStorageAnalysis?.trackingDetails || [],
                }
            } : null
        };

        // Calculate deltas
        analysis.rejectDelta = analysis.afterReject ? {
            scripts: analysis.afterReject.scripts - analysis.baseline.scripts,
            cookies: analysis.afterReject.cookies - analysis.baseline.cookies,
            localStorage: analysis.afterReject.localStorage - analysis.baseline.localStorage,
            pixels: analysis.afterReject.pixels - analysis.baseline.pixels
        } : null;

        analysis.acceptDelta = analysis.afterAccept ? {
            scripts: analysis.afterAccept.scripts - analysis.baseline.scripts,
            cookies: analysis.afterAccept.cookies - analysis.baseline.cookies,
            localStorage: analysis.afterAccept.localStorage - analysis.baseline.localStorage,
            pixels: analysis.afterAccept.pixels - analysis.baseline.pixels
        } : null;

        // Determine scenario
        analysis.scenario = this.determineScenario(analysis);
        
        console.log(`📊 Behavioral analysis complete: ${analysis.scenario}`);
        console.log(`📊 Baseline tracking: ${analysis.baseline.scripts} scripts, ${analysis.baseline.cookies} cookies`);
        if (analysis.afterReject) {
            console.log(`📊 After reject: ${analysis.afterReject.scripts} scripts (${analysis.rejectDelta.scripts >= 0 ? '+' : ''}${analysis.rejectDelta.scripts})`);
        }
        if (analysis.afterAccept) {
            console.log(`📊 After accept: ${analysis.afterAccept.scripts} scripts (${analysis.acceptDelta.scripts >= 0 ? '+' : ''}${analysis.acceptDelta.scripts})`);
        }
        
        return analysis;
    }

    countTrackingItems(trackingDetails) {
        return Array.isArray(trackingDetails) ? trackingDetails.length : 0;
    }

    determineScenario(analysis) {
        const { baseline, rejectDelta, acceptDelta } = analysis;
        
        // Check for pre-consent violations first
        if (baseline.scripts > 0 || baseline.cookies > 0 || baseline.localStorage > 0) {
            return "PRE_CONSENT_VIOLATION";
        }
        
        // Check for consent bypass
        if (rejectDelta && (rejectDelta.scripts > 0 || rejectDelta.cookies > 0 || rejectDelta.localStorage > 0)) {
            return "CONSENT_BYPASS_VIOLATION";
        }
        
        // Check for accept malfunction
        if (acceptDelta && acceptDelta.scripts <= 0) {
            return "ACCEPT_MALFUNCTION";
        }
        
        // Check for identical behavior (both reject and accept available)
        if (rejectDelta && acceptDelta && 
            rejectDelta.scripts === acceptDelta.scripts && 
            rejectDelta.cookies === acceptDelta.cookies) {
            return "IDENTICAL_BEHAVIOR";
        }
        
        // Check for perfect compliance
        if (baseline.scripts === 0 && 
            (!rejectDelta || rejectDelta.scripts === 0) && 
            (acceptDelta && acceptDelta.scripts > 0)) {
            return "PERFECT_COMPLIANCE";
        }
        
        // Check for partial analysis (missing stages)
        if (!rejectDelta && !acceptDelta) {
            return "ANALYSIS_INCOMPLETE";
        }
        
        return "COMPLEX_SCENARIO";
    }

    analyzePreConsentViolations(evidencePackage) {
        console.log('🔍 Analyzing pre-consent violations...');
        
        // FIXED: Analyze ALL pre-consent stages, not just baseline
        const preConsentStages = evidencePackage.stages.filter(stage => 
            ['pre-consent', 'reject_pre', 'accept_pre'].includes(stage.stage)
        );
        
        if (preConsentStages.length === 0) {
            console.log('❌ No pre-consent stages found');
            return;
        }

        console.log(`📊 Analyzing ${preConsentStages.length} pre-consent stages: ${preConsentStages.map(s => s.stage).join(', ')}`);

        // Check each pre-consent stage for violations
        let hasViolation = false;
        let totalTrackingScripts = 0;
        let totalTrackingCookies = 0;
        let totalTrackingStorage = 0;
        let totalTrackingPixels = 0;
        let allViolatingDetails = {
            scriptDetails: [],
            cookieDetails: [],
            storageDetails: [],
            stageBreakdown: []
        };

        preConsentStages.forEach(stage => {
            const trackingScripts = stage.scriptAnalysis?.tracking || 0;
            const trackingCookies = this.countTrackingItems(stage.detailedCookieAnalysis?.trackingDetails);
            const trackingStorage = this.countTrackingItems(stage.detailedStorageAnalysis?.trackingDetails);
            const trackingPixels = stage.detailedPixelAnalysis?.total || 0;

            console.log(`📊 ${stage.stage}: ${trackingScripts} tracking scripts, ${trackingCookies} cookies, ${trackingStorage} localStorage, ${trackingPixels} pixels`);

            if (trackingScripts > 0 || trackingCookies > 0 || trackingStorage > 0 || trackingPixels > 0) {
                hasViolation = true;
                totalTrackingScripts += trackingScripts;
                totalTrackingCookies += trackingCookies;
                totalTrackingStorage += trackingStorage;
                totalTrackingPixels += trackingPixels;

                // Collect violating details
                allViolatingDetails.scriptDetails.push(...(stage.scriptAnalysis?.trackingDetails || []));
                allViolatingDetails.cookieDetails.push(...(stage.detailedCookieAnalysis?.trackingDetails || []));
                allViolatingDetails.storageDetails.push(...(stage.detailedStorageAnalysis?.trackingDetails || []));
                
                allViolatingDetails.stageBreakdown.push({
                    stage: stage.stage,
                    scripts: trackingScripts,
                    cookies: trackingCookies,
                    storage: trackingStorage,
                    pixels: trackingPixels,
                    scriptDetails: stage.scriptAnalysis?.trackingDetails || []
                });
                
                console.log(`🚨 ${stage.stage} violation: ${trackingScripts} scripts, ${trackingCookies} cookies`);
                if (stage.scriptAnalysis?.trackingDetails?.length > 0) {
                    stage.scriptAnalysis.trackingDetails.slice(0, 3).forEach(script => {
                        console.log(`   - ${this.getCompanyFromScript(script)}: ${script.substring(0, 80)}...`);
                    });
                }
            }
        });

        // EU-C-001: Pre-consent tracking violation (multi-metric, multi-stage)
        if (hasViolation) {
            console.log(`🚨 TOTAL Pre-consent tracking: ${totalTrackingScripts} scripts, ${totalTrackingCookies} cookies, ${totalTrackingStorage} localStorage, ${totalTrackingPixels} pixels across ${preConsentStages.length} stages`);
            
            this.addViolation('EU-C-001', {
                trackingScripts: totalTrackingScripts,
                trackingCookies: totalTrackingCookies,
                trackingStorage: totalTrackingStorage,
                trackingPixels: totalTrackingPixels,
                stagesAffected: preConsentStages.length,
                stageBreakdown: allViolatingDetails.stageBreakdown,
                scriptDetails: allViolatingDetails.scriptDetails,
                cookieDetails: allViolatingDetails.cookieDetails,
                storageDetails: allViolatingDetails.storageDetails
            });
        } else {
            console.log('✅ No pre-consent tracking detected across all pre-consent stages');
        }
    }

    analyzeBannerViolations(evidencePackage) {
        console.log('🔍 Analyzing banner violations...');
        
        const preConsentStage = evidencePackage.stages.find(stage => stage.stage === 'pre-consent');
        const bannerAnalysis = preConsentStage?.bannerAnalysis;
        
        console.log('📊 Banner analysis:', bannerAnalysis ? 
            `Provider=${bannerAnalysis.provider}, HasReject=${bannerAnalysis.hasDirectReject}, Type=${bannerAnalysis.type}` : 
            'No banner analysis available'
        );
        
        if (!bannerAnalysis || !bannerAnalysis.detected) {
            this.addViolation('EU-C-002', { reason: 'No consent banner detected' });
            return;
        }

        // EU-C-003: US-style banner (notice-only)
        if (bannerAnalysis.type === 'US_style') {
            this.addViolation('EU-C-003', { bannerType: bannerAnalysis.type });
        }

        // EU-C-004: Missing reject option
        if (!bannerAnalysis.hasDirectReject) {
            this.addViolation('EU-C-004', { hasReject: bannerAnalysis.hasDirectReject });
        }
    }

    analyzeConsentMechanismViolations(evidencePackage) {
        console.log('🔍 Analyzing consent mechanism violations...');
        
        const postRejectStage = evidencePackage.stages.find(stage => stage.stage === 'post-reject');
        const preConsentStage = evidencePackage.stages.find(stage => stage.stage === 'pre-consent');
        
        if (!postRejectStage) {
            console.log('⚠️ No post-reject stage available for analysis');
            return;
        }

        // EU-C-011: Consent bypass - tracking continues/increases after rejection
        const baselineTracking = preConsentStage?.scriptAnalysis?.tracking || 0;
        const rejectTracking = postRejectStage.scriptAnalysis?.tracking || 0;
        const baselineCookies = this.countTrackingItems(preConsentStage?.detailedCookieAnalysis?.trackingDetails);
        const rejectCookies = this.countTrackingItems(postRejectStage.detailedCookieAnalysis?.trackingDetails);
        const baselineStorage = this.countTrackingItems(preConsentStage?.detailedStorageAnalysis?.trackingDetails);
        const rejectStorage = this.countTrackingItems(postRejectStage.detailedStorageAnalysis?.trackingDetails);

        if (rejectTracking > baselineTracking || rejectCookies > baselineCookies || rejectStorage > baselineStorage) {
            console.log(`🚨 Consent bypass detected: Scripts ${baselineTracking}→${rejectTracking}, Cookies ${baselineCookies}→${rejectCookies}, Storage ${baselineStorage}→${rejectStorage}`);
            
            this.addViolation('EU-C-011', {
                baselineTracking,
                rejectTracking,
                trackingIncrease: rejectTracking - baselineTracking,
                baselineCookies,
                rejectCookies,
                cookieIncrease: rejectCookies - baselineCookies,
                baselineStorage,
                rejectStorage,
                storageIncrease: rejectStorage - baselineStorage,
                violatingScripts: postRejectStage.scriptAnalysis?.trackingDetails || [],
                violatingCookies: postRejectStage.detailedCookieAnalysis?.trackingDetails || [],
                violatingStorage: postRejectStage.detailedStorageAnalysis?.trackingDetails || []
            });
        }
    }

    analyzeConsentEffectivenessViolations(evidencePackage) {
        console.log('🔍 Analyzing consent effectiveness violations...');
        
        const preConsentStage = evidencePackage.stages.find(stage => stage.stage === 'pre-consent');
        const postAcceptStage = evidencePackage.stages.find(stage => stage.stage === 'post-accept');
        const postRejectStage = evidencePackage.stages.find(stage => stage.stage === 'post-reject');

        // EU-C-016: Accept button malfunction
        if (preConsentStage && postAcceptStage) {
            const baselineTracking = preConsentStage.scriptAnalysis?.tracking || 0;
            const acceptTracking = postAcceptStage.scriptAnalysis?.tracking || 0;
            const trackingIncrease = acceptTracking - baselineTracking;
            
            console.log(`📊 Accept effectiveness: baseline ${baselineTracking} → accept ${acceptTracking} (${trackingIncrease >= 0 ? '+' : ''}${trackingIncrease})`);
            
            if (trackingIncrease <= 0) {
                this.addViolation('EU-C-016', {
                    baselineTracking,
                    acceptTracking,
                    expectedIncrease: 'Expected significant increase in tracking after accept',
                    actualResult: 'No increase in tracking detected'
                });
            }
        }

        // EU-C-017: Identical tracking regardless of choice
        if (postAcceptStage && postRejectStage) {
            const acceptTracking = postAcceptStage.scriptAnalysis?.tracking || 0;
            const rejectTracking = postRejectStage.scriptAnalysis?.tracking || 0;
            
            console.log(`📊 Choice differentiation: accept ${acceptTracking} vs reject ${rejectTracking}`);
            
            if (acceptTracking === rejectTracking && acceptTracking > 0) {
                this.addViolation('EU-C-017', {
                    acceptTracking,
                    rejectTracking,
                    issue: 'Identical tracking behavior regardless of user choice'
                });
            }
        }
    }

    analyzeTransparencyViolations(evidencePackage) {
        console.log('🔍 Analyzing transparency violations...');
        
        const preConsentStage = evidencePackage.stages.find(stage => stage.stage === 'pre-consent');
        const bannerAnalysis = preConsentStage?.bannerAnalysis;
        
        // EU-C-009: Insufficient consent information
        if (bannerAnalysis && bannerAnalysis.text) {
            if (bannerAnalysis.text.length < 50) {
                this.addViolation('EU-C-009', {
                    textLength: bannerAnalysis.text.length,
                    bannerText: bannerAnalysis.text,
                    issue: 'Consent banner text appears too brief for informed consent'
                });
            }
        }
    }

    analyzeTechnicalViolations(evidencePackage) {
        console.log('🔍 Analyzing technical violations...');
        
        // Check for analysis failures or incomplete stages
        const expectedStages = ['pre-consent', 'post-reject', 'post-accept'];
        const availableStages = evidencePackage.stages.map(s => s.stage);
        const missingStages = expectedStages.filter(stage => !availableStages.includes(stage));
        
        if (missingStages.length > 0) {
            console.log(`⚠️ Missing analysis stages: ${missingStages.join(', ')}`);
            // This might indicate technical issues but not necessarily GDPR violations
        }
    }

    addViolation(code, details = {}) {
        const definition = this.violationDefinitions[code];
        if (!definition) {
            console.warn(`Unknown violation code: ${code}`);
            return;
        }

        const violation = {
            code,
            title: definition.title,
            description: definition.description,
            legalReference: definition.legalReference,
            severity: definition.severity,
            businessRisk: definition.businessRisk,
            recommendedAction: definition.recommendedAction,
            category: definition.category,
            priority: definition.priority,
            details,
            timestamp: new Date().toISOString()
        };

        this.violations.push(violation);
        console.log(`📋 Added ${code}: ${definition.title}`);
    }

    calculateComplianceScore() {
        if (this.violations.length === 0) return 100;

        let totalPenalty = 0;
        this.violations.forEach(violation => {
            switch(violation.severity) {
                case 'CRITICAL': totalPenalty += 30; break;
                case 'HIGH': totalPenalty += 20; break;
                case 'MEDIUM': totalPenalty += 10; break;
                case 'LOW': totalPenalty += 5; break;
            }
        });

        return Math.max(0, 100 - totalPenalty);
    }

    getOverallRisk(violations) {
        if (violations.some(v => v.severity === 'CRITICAL')) return 'CRITICAL';
        if (violations.some(v => v.severity === 'HIGH')) return 'HIGH';
        if (violations.some(v => v.severity === 'MEDIUM')) return 'MEDIUM';
        return 'LOW';
    }

    generateFlexibleReport(evidencePackage, violations) {
        const domain = evidencePackage.domain || 'Unknown Domain';
        const timestamp = new Date().toISOString();
        const behavior = this.behaviorAnalysis;
        
        // Sort violations by priority (1=highest) then by severity
        const sortedViolations = violations.sort((a, b) => {
            if (a.priority !== b.priority) return a.priority - b.priority;
            const severityOrder = { 'CRITICAL': 4, 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1 };
            return severityOrder[b.severity] - severityOrder[a.severity];
        });
        
        let report = '';
        
        // ===== 1. EXECUTIVE SUMMARY =====
        report += `📋 EXECUTIVE SUMMARY\n`;
        report += `══════════════════════════════════════════════════\n`;
        report += `Privacy Compliance Status: ${this.getComplianceStatusDescription(violations, behavior)}\n`;
        report += `Overall Score: ${this.calculateComplianceScore()}%\n`;
        report += `Risk Level: ${this.getOverallRisk(violations)}\n`;
        
        // FIXED: Dynamic problem description based on actual violations with proper prioritization
        if (violations.length > 0) {
            const preConsentViolation = violations.find(v => v.code === 'EU-C-001');
            const consentBypassViolation = violations.find(v => v.code === 'EU-C-011');
            
            if (preConsentViolation && consentBypassViolation) {
                // Both violations - show pre-consent as primary - FIXED: Added trackingPixels
                const totalPreConsent = preConsentViolation.details.trackingScripts + 
                                       preConsentViolation.details.trackingCookies + 
                                       preConsentViolation.details.trackingStorage +
                                       preConsentViolation.details.trackingPixels;
                const totalBypass = consentBypassViolation.details.trackingIncrease + 
                                   consentBypassViolation.details.cookieIncrease + 
                                   consentBypassViolation.details.storageIncrease;
                
                report += `Root Problem: ${totalPreConsent} tracking violations BEFORE user sees banner + ${totalBypass} more after rejection\n`;
            } else if (preConsentViolation) {
                // FIXED: Added trackingPixels
                const totalPreConsent = preConsentViolation.details.trackingScripts + 
                                       preConsentViolation.details.trackingCookies + 
                                       preConsentViolation.details.trackingStorage +
                                       preConsentViolation.details.trackingPixels;
                report += `Root Problem: ${totalPreConsent} tracking violations loaded before user consent\n`;
            } else if (consentBypassViolation) {
                const totalBypass = consentBypassViolation.details.trackingIncrease + 
                                   consentBypassViolation.details.cookieIncrease + 
                                   consentBypassViolation.details.storageIncrease;
                report += `Root Problem: User clicked "Reject All" but ${totalBypass} additional tracking violations loaded anyway\n`;
            } else if (behavior.scenario === 'PERFECT_COMPLIANCE') {
                report += `Status: Perfect GDPR compliance - all user choices respected\n`;
            } else if (behavior.scenario === 'ANALYSIS_INCOMPLETE') {
                report += `Status: Analysis incomplete - technical issues prevented full testing\n`;
            } else if (behavior.scenario === 'ACCEPT_MALFUNCTION') {
                report += `Issue: Accept button not working properly - expected tracking increase not observed\n`;
            } else {
                report += `Root Problem: Multiple GDPR compliance violations detected\n`;
            }
        } else {
            report += `Status: No GDPR violations detected - site appears compliant\n`;
        }
        
        report += `CMP Implementation: ${this.bannerAnalysis?.provider || 'Not detected'} (${this.bannerAnalysis?.type || 'Unknown'})\n`;
        
        if (violations.length > 0) {
            const criticalCount = violations.filter(v => v.severity === 'CRITICAL').length;
            const highCount = violations.filter(v => v.severity === 'HIGH').length;
            report += `GDPR Violations: ${violations.length} total (${criticalCount} critical, ${highCount} high priority)\n`;
            
            // Identify main violators for pre-consent violations
            if (violations.some(v => v.code === 'EU-C-001')) {
                const preConsentViolation = violations.find(v => v.code === 'EU-C-001');
                if (preConsentViolation.details.stageBreakdown) {
                    const companies = new Set();
                    preConsentViolation.details.stageBreakdown.forEach(stage => {
                        stage.scriptDetails?.forEach(script => {
                            companies.add(this.getCompanyFromScript(script));
                        });
                    });
                    const topViolators = Array.from(companies).slice(0, 4);
                    if (topViolators.length > 0) {
                        report += `Pre-consent Violators: ${topViolators.join(', ')}\n`;
                    }
                }
            }
            
            // Identify main violators for consent bypass
            if (behavior.scenario === 'CONSENT_BYPASS_VIOLATION') {
                const violatingScripts = behavior.afterReject.details.scripts || [];
                const violatorsByCompany = this.groupScriptsByCompany(violatingScripts);
                const topViolators = Object.entries(violatorsByCompany)
                    .sort(([,a], [,b]) => b.length - a.length)
                    .slice(0, 3)
                    .map(([company, scripts]) => `${company} (${scripts.length})`);
                
                if (topViolators.length > 0) {
                    report += `Consent Bypass Violators: ${topViolators.join(', ')}\n`;
                }
            }
        } else {
            report += `GDPR Violations: None detected - site appears compliant\n`;
        }
        
        report += `\n💼 Business Impact: ${this.getBusinessImpactDescription(violations, behavior)}\n`;
        report += `⏰ Action Required: ${this.getActionRequiredDescription(violations, behavior)}\n`;
        report += `\n`;
        
        // ===== 2. DETAILED BEHAVIOR ANALYSIS =====
        report += `🔍 PRIVACY BEHAVIOR ANALYSIS\n`;
        report += `══════════════════════════════════════════════════\n`;
        report += `\n`;
        
        report += `📊 USER INTERACTION TEST:\n`;
        report += `┌─ User visits ${domain}: ${behavior.baseline.scripts} tracking scripts`;
        report += `, ${behavior.baseline.cookies} tracking cookies (${this.evaluateBaseline(behavior.baseline)})\n`;
        
        if (behavior.afterReject !== null) {
            report += `├─ User clicks "Reject All": ${behavior.afterReject.scripts} tracking scripts`;
            report += `, ${behavior.afterReject.cookies} tracking cookies`;
            report += ` (${this.evaluateReject(behavior.baseline, behavior.afterReject, behavior.rejectDelta)})\n`;
        } else {
            report += `├─ User clicks "Reject All": [Analysis incomplete - technical error]\n`;
        }
        
        if (behavior.afterAccept !== null) {
            report += `└─ User clicks "Accept All": ${behavior.afterAccept.scripts} tracking scripts`;
            report += `, ${behavior.afterAccept.cookies} tracking cookies`;
            report += ` (${this.evaluateAccept(behavior.baseline, behavior.afterAccept, behavior.acceptDelta)})\n`;
        } else {
            report += `└─ User clicks "Accept All": [Analysis incomplete - technical error]\n`;
        }
        
        report += `\n`;
        
        // FIXED: Multi-metric tracking analysis with proper nullish coalescing
        report += `🔍 MULTI-METRIC TRACKING ANALYSIS:\n`;
        report += `┌─ JavaScript Scripts: ${behavior.baseline.scripts} → ${behavior.afterReject?.scripts ?? '?'} (reject) / ${behavior.afterAccept?.scripts ?? '?'} (accept)\n`;
        report += `├─ HTTP Cookies: ${behavior.baseline.cookies} → ${behavior.afterReject?.cookies ?? '?'} (reject) / ${behavior.afterAccept?.cookies ?? '?'} (accept)\n`;
        report += `├─ LocalStorage Items: ${behavior.baseline.localStorage} → ${behavior.afterReject?.localStorage ?? '?'} (reject) / ${behavior.afterAccept?.localStorage ?? '?'} (accept)\n`;
        report += `└─ Tracking Pixels: ${behavior.baseline.pixels} → ${behavior.afterReject?.pixels ?? '?'} (reject) / ${behavior.afterAccept?.pixels ?? '?'} (accept)\n`;
        report += `\n`;
        
        report += `🎯 BEHAVIORAL INTERPRETATION:\n`;
        report += `Result: ${this.getBehavioralInterpretation(behavior)}\n`;
        report += `\n`;
        
        // ===== 3. SPECIFIC VIOLATIONS SECTION =====
        if (sortedViolations.length > 0) {
            report += `⚖️ SPECIFIC VIOLATIONS DETECTED\n`;
            report += `══════════════════════════════════════════════════\n`;
            report += `\n`;
            
            sortedViolations.forEach((violation, index) => {
                report += this.generateViolationDetail(violation, evidencePackage, behavior);
                if (index < sortedViolations.length - 1) report += `\n`;
            });
        } else {
            report += `✅ NO GDPR VIOLATIONS DETECTED\n`;
            report += `══════════════════════════════════════════════════\n`;
            report += `Site appears to be implementing GDPR compliance correctly.\n`;
            report += `User privacy choices are being respected as required by law.\n`;
            report += `\n`;
        }
        
        // ===== 4. BUSINESS IMPACT & RECOMMENDATIONS =====
        if (sortedViolations.length > 0) {
            report += `💰 BUSINESS IMPACT ASSESSMENT\n`;
            report += `══════════════════════════════════════════════════\n`;
            report += this.generateBusinessImpactSection(sortedViolations, behavior);
            report += `\n`;
            
            report += `🎯 IMMEDIATE ACTION PLAN\n`;
            report += `══════════════════════════════════════════════════\n`;
            report += this.generateActionPlan(sortedViolations, behavior, evidencePackage);
            report += `\n`;
        } else {
            report += `🎯 COMPLIANCE MAINTENANCE RECOMMENDATIONS\n`;
            report += `══════════════════════════════════════════════════\n`;
            report += `✅ Continue current privacy implementation practices\n`;
            report += `📊 Schedule regular compliance monitoring (monthly recommended)\n`;
            report += `🔍 Monitor for changes to consent management platform configuration\n`;
            report += `📋 Document current implementation for audit purposes\n`;
            report += `\n`;
        }
        
        // ===== 5. TECHNICAL EVIDENCE APPENDIX =====
        report += `📊 COMPLETE TECHNICAL EVIDENCE\n`;
        report += `══════════════════════════════════════════════════\n`;
        report += this.generateTechnicalEvidenceSection(evidencePackage, behavior);
        
        // ===== 6. ENVIRONMENT & METADATA =====
        report += `📱 ANALYSIS ENVIRONMENT\n`;
        report += `══════════════════════════════════════════════════\n`;
        report += `Domain: ${domain}\n`;
        report += `Analysis Date: ${timestamp}\n`;
        report += `Browser: Chromium (GDPR compliance testing configuration)\n`;
        report += `Location: Frankfurt, Germany (EU jurisdiction)\n`;
        report += `Language: ${this.bannerAnalysis?.detectedLanguage || 'Auto-detected'}\n`;
        report += `CMP Provider: ${this.bannerAnalysis?.provider || 'Not detected'}\n`;
        report += `CMP Type: ${this.bannerAnalysis?.type || 'Unknown'}\n`;
        report += `Analysis Scenario: ${behavior.scenario}\n`;
        
        return report;
    }

    // Helper methods for report generation
    getComplianceStatusDescription(violations, behavior) {
        if (violations.length === 0) return '✅ COMPLIANT';
        if (violations.some(v => v.severity === 'CRITICAL')) return '🚨 CRITICAL VIOLATIONS DETECTED';
        if (violations.some(v => v.severity === 'HIGH')) return '⚠️ SIGNIFICANT ISSUES DETECTED';
        return '⚠️ MINOR ISSUES DETECTED';
    }

    getBusinessImpactDescription(violations, behavior) {
        if (violations.length === 0) return 'LOW - Site respects user privacy choices correctly';
        if (behavior.scenario === 'PRE_CONSENT_VIOLATION' || violations.some(v => v.code === 'EU-C-001')) return 'CRITICAL - Tracking users without legal basis';
        if (behavior.scenario === 'CONSENT_BYPASS_VIOLATION') return 'CRITICAL - Website completely ignores user privacy choices';
        if (violations.some(v => v.severity === 'CRITICAL')) return 'HIGH - Immediate legal compliance risk';
        return 'MEDIUM - Privacy compliance improvements needed';
    }

    getActionRequiredDescription(violations, behavior) {
        if (violations.length === 0) return 'MONITOR - Continue current practices, schedule regular checks';
        if (behavior.scenario === 'PRE_CONSENT_VIOLATION' || violations.some(v => v.code === 'EU-C-001')) return 'IMMEDIATE - Stop all tracking before consent';
        if (behavior.scenario === 'CONSENT_BYPASS_VIOLATION') return 'IMMEDIATE - Fix consent mechanism within 1-2 weeks';
        if (violations.some(v => v.severity === 'CRITICAL')) return 'HIGH - Address within 1-2 weeks';
        return 'MEDIUM - Address within 4 weeks';
    }

    evaluateBaseline(baseline) {
        if (baseline.scripts === 0 && baseline.cookies === 0) return '✅ clean';
        if (baseline.scripts > 0 || baseline.cookies > 0) return '❌ GDPR violation';
        return '⚠️ check required';
    }

    evaluateReject(baseline, afterReject, delta) {
        if (delta.scripts === 0 && delta.cookies === 0) return '✅ user choice respected';
        if (delta.scripts > 0 || delta.cookies > 0) return '❌ GDPR violation - user choice ignored';
        return '⚠️ unexpected behavior';
    }

    evaluateAccept(baseline, afterAccept, delta) {
        if (delta.scripts > 0) return '✅ consent mechanism working';
        if (delta.scripts === 0) return '⚠️ accept button may not be working';
        return '❌ unexpected decrease in tracking';
    }

    getBehavioralInterpretation(behavior) {
        switch (behavior.scenario) {
            case 'PERFECT_COMPLIANCE':
                return 'Perfect GDPR implementation - clean baseline, reject respected, accept functional';
            case 'PRE_CONSENT_VIOLATION':
                return 'Site tracks users before consent - systematic GDPR violation';
            case 'CONSENT_BYPASS_VIOLATION':
                return 'User rejection is completely ignored - consent mechanism fundamentally broken';
            case 'ACCEPT_MALFUNCTION':
                return 'Accept button does not activate expected tracking - technical malfunction';
            case 'IDENTICAL_BEHAVIOR':
                return 'User choice makes no difference - same tracking regardless of consent';
            case 'ANALYSIS_INCOMPLETE':
                return 'Technical issues prevented complete analysis - partial results only';
            default:
                return 'Complex scenario requiring detailed analysis of specific behaviors';
        }
    }

    generateViolationDetail(violation, evidencePackage, behavior) {
        let detail = `🔴 [${violation.code}] ${violation.title}`;
        if (violation.priority === 1) {
            detail += ` ⭐ PRIMARY VIOLATION`;
        } else if (violation.priority === 2) {
            detail += ` 🔸 SECONDARY VIOLATION`;
        }
        detail += `\n\n`;
        
        // Specific explanation based on violation type and actual evidence
        if (violation.code === 'EU-C-001') {
            detail += `   OBSERVED BEHAVIOR:\n`;
            detail += `   • User visits ${evidencePackage.domain}\n`;
            detail += `   • Expected: Website shows consent banner first, then loads tracking only after consent\n`;
            
            if (violation.details.stageBreakdown) {
                detail += `   • Reality: Tracking detected across ${violation.details.stagesAffected} pre-consent stages:\n`;
                violation.details.stageBreakdown.forEach(stage => {
                    if (stage.scripts > 0) {
                        detail += `     - ${stage.stage}: ${stage.scripts} tracking scripts loaded\n`;
                        if (stage.scriptDetails && stage.scriptDetails.length > 0) {
                            const topCompanies = stage.scriptDetails.slice(0, 3).map(script => this.getCompanyFromScript(script));
                            detail += `       Companies: ${topCompanies.join(', ')}\n`;
                        }
                    }
                    if (stage.cookies > 0) {
                        detail += `     - ${stage.stage}: ${stage.cookies} tracking cookies set\n`;
                    }
                    if (stage.storage > 0) {
                        detail += `     - ${stage.stage}: ${stage.storage} tracking localStorage items\n`;
                    }
                });
            } else {
                detail += `   • Reality: ${violation.details.trackingScripts} tracking scripts loaded immediately\n`;
            }
            
            if (violation.details.trackingCookies > 0) {
                detail += `   • Additional: ${violation.details.trackingCookies} tracking cookies set before consent\n`;
            }
            if (violation.details.trackingStorage > 0) {
                detail += `   • Additional: ${violation.details.trackingStorage} tracking localStorage items created\n`;
            }
            
            detail += `\n`;
            detail += `   WHY THIS IS A PROBLEM:\n`;
            detail += `   • User hasn't given consent yet, but tracking already started\n`;
            detail += `   • This violates GDPR Article 7(1) - consent must come BEFORE processing\n`;
            if (violation.details.stageBreakdown && violation.details.stageBreakdown.length > 1) {
                detail += `   • Problem occurs across multiple stages, indicating systematic misconfiguration\n`;
            }
            
            detail += `\n`;
            detail += `   TECHNICAL ROOT CAUSE:\n`;
            detail += `   • ${this.bannerAnalysis?.provider || 'CMP'} allows scripts to load before user interaction\n`;
            if (violation.details.stageBreakdown) {
                const companiesInvolved = new Set();
                violation.details.stageBreakdown.forEach(stage => {
                    stage.scriptDetails?.forEach(script => {
                        companiesInvolved.add(this.getCompanyFromScript(script));
                    });
                });
                if (companiesInvolved.size > 0) {
                    detail += `   • Companies tracking without consent: ${Array.from(companiesInvolved).slice(0, 5).join(', ')}\n`;
                }
            }
            
            detail += `\n`;
            detail += `   HOW TO FIX:\n`;
            detail += `   • Reconfigure ${this.bannerAnalysis?.provider || 'CMP'} to block ALL tracking until after user consent\n`;
            detail += `   • Move all tracking scripts to load only AFTER consent is given\n`;
            detail += `   • Test: User visits site → 0 tracking scripts should load until consent\n`;
            
        } else if (violation.code === 'EU-C-011') {
            detail += `   OBSERVED BEHAVIOR:\n`;
            detail += `   • User clicked "Reject All" button on ${evidencePackage.domain}\n`;
            detail += `   • Expected: All tracking should stop, existing tracking should remain unchanged\n`;
            detail += `   • Reality: ${violation.details.trackingIncrease} additional tracking scripts loaded\n`;
            if (violation.details.cookieIncrease > 0) {
                detail += `   • Additional: ${violation.details.cookieIncrease} more tracking cookies set\n`;
            }
            if (violation.details.storageIncrease > 0) {
                detail += `   • Additional: ${violation.details.storageIncrease} more tracking localStorage items\n`;
            }
            
            if (violation.details.violatingScripts.length > 0) {
                detail += `   • Scripts that ignored user rejection:\n`;
                const violatorsByCompany = this.groupScriptsByCompany(violation.details.violatingScripts);
                Object.entries(violatorsByCompany).slice(0, 4).forEach(([company, scripts]) => {
                    detail += `     - ${company} continues tracking (${scripts.length} scripts)\n`;
                });
            }
            
            detail += `\n`;
            detail += `   TECHNICAL ROOT CAUSE:\n`;
            detail += `   • ${this.bannerAnalysis?.provider || 'CMP'} is misconfigured - treats tracking scripts as "necessary"\n`;
            if (violation.details.violatingScripts.some(s => s.includes('linkedin'))) {
                detail += `   • LinkedIn scripts bypass consent checks entirely\n`;
            }
            if (violation.details.violatingScripts.some(s => s.includes('bing') || s.includes('bat.bing'))) {
                detail += `   • Microsoft Bing tracking runs regardless of user preference\n`;
            }
            if (violation.details.violatingScripts.some(s => s.includes('facebook') || s.includes('fbevents'))) {
                detail += `   • Facebook tracking continues despite user rejection\n`;
            }
            
        } else {
            // Generic violation format
            detail += `   Legal Reference: ${violation.legalReference}\n`;
            detail += `   Business Risk: ${violation.businessRisk}\n`;
        }
        
        detail += `\n`;
        detail += `   WHY THIS MATTERS:\n`;
        detail += `   • ${violation.businessRisk}\n`;
        if (violation.code === 'EU-C-011') {
            detail += `   • This violates the core GDPR principle that "No means No"\n`;
            detail += `   • Creates legal liability because consent mechanism is fundamentally broken\n`;
        }
        detail += `\n`;
        detail += `   HOW TO FIX:\n`;
        detail += `   • ${violation.recommendedAction}\n`;
        if (violation.code === 'EU-C-011') {
            detail += `   • Reconfigure ${this.bannerAnalysis?.provider}: Move tracking scripts from "Strictly Necessary" to appropriate categories\n`;
            detail += `   • Test fix: Click "Reject All" → verify 0 tracking scripts load\n`;
        }
        detail += `   • Priority: ${violation.severity}\n`;
        detail += `   • Timeline: ${this.getTimelineRecommendation(violation.severity)}\n`;
        
        return detail;
    }

    generateBusinessImpactSection(violations, behavior) {
        let section = '';
        
        const criticalViolations = violations.filter(v => v.severity === 'CRITICAL');
        const highViolations = violations.filter(v => v.severity === 'HIGH');
        
        if (criticalViolations.length > 0) {
            section += `Current Status: HIGH RISK - Critical GDPR violations detected\n`;
            if (behavior.scenario === 'PRE_CONSENT_VIOLATION' || violations.some(v => v.code === 'EU-C-001')) {
                section += `Immediate Issue: Site tracks users without any legal basis\n`;
                section += `Regulatory Risk: Users can file complaints immediately\n`;
            }
            if (behavior.scenario === 'CONSENT_BYPASS_VIOLATION') {
                section += `Immediate Issue: Site ignores user privacy choices completely\n`;
                section += `Regulatory Risk: Clear evidence of systematic consent violations\n`;
                section += `Why It's Serious: If users notice their choice doesn't work, they can report to regulators\n`;
            }
            section += `Fine Exposure: Up to €20M or 4% annual turnover for systematic violations\n`;
        } else if (highViolations.length > 0) {
            section += `Current Status: MEDIUM RISK - Significant compliance gaps\n`;
            section += `Fine Exposure: Up to €10M or 2% annual turnover\n`;
        } else {
            section += `Current Status: LOW RISK - Minor compliance improvements needed\n`;
        }
        
        return section;
    }

    generateActionPlan(violations, behavior, evidencePackage) {
        let plan = '';
        
        // Sort violations by priority for action plan
        const sortedViolations = violations.sort((a, b) => a.priority - b.priority);
        const criticalViolations = sortedViolations.filter(v => v.severity === 'CRITICAL');
        const highViolations = sortedViolations.filter(v => v.severity === 'HIGH');
        
        if (violations.some(v => v.code === 'EU-C-001')) {
            plan += `🔴 1. Stop All Pre-Consent Tracking (IMMEDIATE - PRIMARY ISSUE)\n`;
            plan += `   What to do: Reconfigure ${this.bannerAnalysis?.provider} to block ALL tracking before consent\n`;
            plan += `   Who: Web development team + ${this.bannerAnalysis?.provider} admin\n`;
            plan += `   Test: User visits site → verify 0 tracking scripts load before consent\n`;
            plan += `   Result: GDPR Article 7(1) compliance achieved\n`;
            plan += `\n`;
        }
        
        if (behavior.scenario === 'CONSENT_BYPASS_VIOLATION') {
            plan += `🔴 2. Fix the Broken Consent System (THIS WEEK - SECONDARY ISSUE)\n`;
            plan += `   What to do: Reconfigure ${this.bannerAnalysis?.provider} so "Reject All" actually works\n`;
            plan += `   Who: Web development team + ${this.bannerAnalysis?.provider} admin\n`;
            plan += `   Test: Verify 0 tracking after rejection\n`;
            plan += `   Result: User choices will finally be respected\n`;
            plan += `\n`;
        }
        
        if (violations.some(v => v.code === 'EU-C-001') || behavior.scenario === 'CONSENT_BYPASS_VIOLATION') {
            plan += `🟡 3. Audit All Script Categories (NEXT WEEK)\n`;
            plan += `   What to do: Review why tracking scripts were marked "necessary"\n`;
            plan += `   Who: Privacy team + web development\n`;
            plan += `   Result: Proper script categorization across entire site\n`;
            plan += `\n`;
        } else {
            criticalViolations.forEach((violation, index) => {
                plan += `🔴 ${index + 1}. ${violation.title} (URGENT)\n`;
                plan += `   What to do: ${violation.recommendedAction}\n`;
                plan += `   Timeline: ${this.getTimelineRecommendation(violation.severity)}\n`;
                plan += `   Owner: Technical team + Privacy officer\n`;
                plan += `\n`;
            });
            
            highViolations.forEach((violation, index) => {
                plan += `🟠 ${criticalViolations.length + index + 1}. ${violation.title} (HIGH PRIORITY)\n`;
                plan += `   What to do: ${violation.recommendedAction}\n`;
                plan += `   Timeline: ${this.getTimelineRecommendation(violation.severity)}\n`;
                plan += `\n`;
            });
        }
        
        if (criticalViolations.length === 0 && highViolations.length === 0) {
            plan += `🟡 Address remaining compliance gaps\n`;
            plan += `   Focus on medium and low priority improvements\n`;
            plan += `   Timeline: 4-8 weeks\n`;
        }
        
        return plan;
    }

    generateTechnicalEvidenceSection(evidencePackage, behavior) {
        let section = '';
        
        // Evidence by stage
        evidencePackage.stages.forEach(stage => {
            section += `\n📊 ${stage.stage.toUpperCase()} STAGE:\n`;
            section += `Total Scripts: ${stage.scriptsCount || 0} (${stage.scriptAnalysis?.tracking || 0} tracking, ${stage.scriptAnalysis?.necessary || 0} necessary, ${stage.scriptAnalysis?.unknown || 0} unknown)\n`;
            section += `Total Cookies: ${stage.cookiesCount || 0} (${this.countTrackingItems(stage.detailedCookieAnalysis?.trackingDetails)} tracking)\n`;
            section += `LocalStorage: ${stage.localStorageCount || 0} (${this.countTrackingItems(stage.detailedStorageAnalysis?.trackingDetails)} tracking)\n`;
            section += `Tracking Pixels: ${stage.detailedPixelAnalysis?.total || 0}\n`;
            
            // Show tracking details if available
            if (stage.scriptAnalysis?.trackingDetails && stage.scriptAnalysis.trackingDetails.length > 0) {
                section += `🎯 Tracking Scripts:\n`;
                stage.scriptAnalysis.trackingDetails.slice(0, 5).forEach((script, index) => {
                    section += `  ${index + 1}. ${this.getCompanyFromScript(script)} - ${script.substring(0, 60)}${script.length > 60 ? '...' : ''}\n`;
                });
                if (stage.scriptAnalysis.trackingDetails.length > 5) {
                    section += `  ... and ${stage.scriptAnalysis.trackingDetails.length - 5} more tracking scripts\n`;
                }
            }
        });
        
        section += `\n`;
        return section;
    }

    groupScriptsByCompany(scripts) {
        const companies = {};
        
        scripts.forEach(script => {
            const company = this.getCompanyFromScript(script);
            if (!companies[company]) companies[company] = [];
            companies[company].push(script);
        });
        
        return companies;
    }

    getCompanyFromScript(script) {
        const scriptLower = script.toLowerCase();
        
        // FIXED: LinkedIn detection - highest priority first
        if (scriptLower.includes('linkedin') || scriptLower.includes('li.lms-analytics') || scriptLower.includes('snap.licdn.com')) {
            return 'LinkedIn';
        }
        if (scriptLower.includes('google') || scriptLower.includes('gtag') || scriptLower.includes('googletagmanager') || scriptLower.includes('doubleclick')) {
            return 'Google';
        }
        if (scriptLower.includes('facebook') || scriptLower.includes('fbevents') || scriptLower.includes('connect.facebook.net')) {
            return 'Facebook/Meta';
        }
        if (scriptLower.includes('microsoft') || scriptLower.includes('bing') || scriptLower.includes('bat.bing')) {
            return 'Microsoft';
        }
        if (scriptLower.includes('adobe') || scriptLower.includes('omniture') || scriptLower.includes('omtrdc')) {
            return 'Adobe';
        }
        if (scriptLower.includes('segment')) {
            return 'Segment';
        }
        if (scriptLower.includes('salesforce') || scriptLower.includes('evergage')) {
            return 'Salesforce';
        }
        if (scriptLower.includes('6sc.co')) {
            return '6sense';
        }
        if (scriptLower.includes('quantserve') || scriptLower.includes('quantcast')) {
            return 'Quantcast';
        }
        if (scriptLower.includes('tiktok') || scriptLower.includes('analytics.tiktok.com')) {
            return 'TikTok';
        }
        
        return 'Unknown';
    }

    getTimelineRecommendation(severity) {
        switch (severity) {
            case 'CRITICAL': return '1-2 weeks';
            case 'HIGH': return '2-4 weeks';
            case 'MEDIUM': return '1-2 months';
            case 'LOW': return '2-3 months';
            default: return '4 weeks';
        }
    }
}

module.exports = GDPRViolationEngine;