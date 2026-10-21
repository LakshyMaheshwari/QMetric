/**
 * StationContent - Renders the rich, perfectly-sized content for each railway station
 */

import React, { useEffect } from 'react';
import { 
  CheckCircle2, 
  ZoomIn, 
  FileText, 
  Award, 
  BarChart3, 
  ShieldCheck, 
  ArrowRight,
  Layers,
  FileCheck2,
  CheckCircle
} from 'lucide-react';
import { Link } from 'react-router-dom';
import styles from './QPQAJourneyTrial.module.css';
import type { Station } from './QPQAJourneyTrial.types';

interface StationContentProps {
  station: Station;
  qpSrc: string;
  resSrc: string;
  engineScrubProgress: number;
  currentFrameIndex: number;
  TOTAL_FRAMES: number;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  onOpenLightbox?: (src: string, title: string) => void;
  drawFrame?: (index: number, cache: HTMLImageElement[]) => void;
  frameCache?: HTMLImageElement[];
}

export function StationContent({
  station,
  qpSrc,
  resSrc,
  engineScrubProgress,
  currentFrameIndex,
  TOTAL_FRAMES,
  canvasRef,
  onOpenLightbox,
  drawFrame,
  frameCache,
}: StationContentProps) {
  const { type } = station;

  // Ensure current frame is drawn when engine station is rendered
  useEffect(() => {
    if (type === 'engine' && frameCache && frameCache.length > 0 && drawFrame) {
      drawFrame(currentFrameIndex, frameCache);
    }
  }, [type, currentFrameIndex, drawFrame, frameCache]);

  // ── 01: QUESTION PAPER INGESTION ──
  if (type === 'paper') {
    return (
      <div className={styles.stationPaperLayout}>
        {/* Document Preview Box */}
        <div
          className={styles.paperDocPreviewBox}
          onClick={() => onOpenLightbox?.(qpSrc, 'Question Paper — High-Resolution View')}
          title="Click to view full Question Paper"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              onOpenLightbox?.(qpSrc, 'Question Paper — High-Resolution View');
            }
          }}
        >
          <img
            src={qpSrc}
            alt="Question Paper Document Preview"
            className={styles.paperDocImage}
          />
          <div className={styles.paperDocZoomBadge}>
            <ZoomIn size={14} /> Click to Enlarge Full Paper
          </div>
        </div>

        {/* Ingestion Analysis Details */}
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <span className={styles.qpqaBadge} style={{ fontSize: 10, padding: '4px 12px' }}>
                <CheckCircle2 size={12} color="#16A34A" /> OCR Parsing Complete
              </span>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#16A34A', display: 'flex', alignItems: 'center', gap: 4 }}>
                100% Extracted
              </span>
            </div>

            <h5 style={{ fontSize: 20, fontWeight: 800, color: '#0F172A', margin: '0 0 8px', letterSpacing: '-0.02em' }}>
              Document Structure &amp; Metadata
            </h5>
            <p style={{ fontSize: 14, color: '#57534E', lineHeight: 1.6, margin: '0 0 20px' }}>
              Examination paper ingested into structured format. Individual sections, question stems, marks distribution, and Course Outcomes have been classified with zero omissions.
            </p>

            <div className={styles.paperMetricsGrid}>
              <div className={styles.paperMetricTile}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Layers size={16} color="#EA580C" />
                  <div className={styles.paperMetricTileVal}>3</div>
                </div>
                <div className={styles.paperMetricTileLabel}>Sections (A, B, C)</div>
              </div>

              <div className={styles.paperMetricTile}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <FileCheck2 size={16} color="#EA580C" />
                  <div className={styles.paperMetricTileVal}>8 / 8</div>
                </div>
                <div className={styles.paperMetricTileLabel}>Questions Parsed</div>
              </div>

              <div className={styles.paperMetricTile}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <BarChart3 size={16} color="#EA580C" />
                  <div className={styles.paperMetricTileVal}>50</div>
                </div>
                <div className={styles.paperMetricTileLabel}>Total Marks</div>
              </div>

              <div className={styles.paperMetricTile}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Award size={16} color="#EA580C" />
                  <div className={styles.paperMetricTileVal}>CO1–CO4</div>
                </div>
                <div className={styles.paperMetricTileLabel}>Course Outcomes</div>
              </div>
            </div>
          </div>

          <div style={{ marginTop: 24, paddingTop: 18, borderTop: '1px solid #ECE5D8', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
            <span style={{ fontSize: 13, color: '#57534E', display: 'flex', alignItems: 'center', gap: 7 }}>
              <FileText size={15} color="#EA580C" /> Format: Engineering Examination Paper
            </span>
            <button
              onClick={() => onOpenLightbox?.(qpSrc, 'Question Paper — High-Resolution View')}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#EA580C',
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
              }}
            >
              Inspect Document <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── 02: ACTION VERB TOKENIZATION ──
  if (type === 'verbs') {
    const verbsList = [
      { q: 'Q1', word: 'Define', level: 'L1', desc: 'Remember (Core Definition)', isHigh: false },
      { q: 'Q2', word: 'List', level: 'L1', desc: 'Remember (Enumeration)', isHigh: false },
      { q: 'Q3', word: 'Explain', level: 'L2', desc: 'Understand (Concept Reasoning)', isHigh: false },
      { q: 'Q4', word: 'Compare', level: 'L4', desc: 'Analyze (Systematic Trade-offs)', isHigh: true },
      { q: 'Q5', word: 'Define', level: 'L1', desc: 'Remember (Term Definition)', isHigh: false },
      { q: 'Q6', word: 'Explain', level: 'L2', desc: 'Understand (Mechanism Logic)', isHigh: false },
      { q: 'Q7', word: 'Analyze', level: 'L4', desc: 'Analyze (Algorithmic Complexity)', isHigh: true },
      { q: 'Q8', word: 'Define', level: 'L1', desc: 'Remember (Structural Principles)', isHigh: false },
    ];

    return (
      <div className={styles.verbsContainerBox}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>
            Cognitive Verb Classification — Bloom&apos;s Taxonomy L1 to L6
          </div>
          <div className={styles.qpqaBadge} style={{ fontSize: 10, padding: '4px 12px' }}>
            <CheckCircle2 size={12} color="#16A34A" /> 8 Action Verbs Tokenized
          </div>
        </div>

        <div className={styles.verbsGrid}>
          {verbsList.map((v, i) => (
            <div key={i} className={styles.verbCard}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 12, fontWeight: 800, color: '#EA580C', fontFamily: 'JetBrains Mono, monospace' }}>
                  {v.q}
                </span>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: '#0F172A' }}>
                    {v.word}
                  </div>
                  <div style={{ fontSize: 11, color: '#78716C', marginTop: 2 }}>
                    {v.desc}
                  </div>
                </div>
              </div>
              <span className={v.isHigh ? styles.qpqaVerbLevelHigh : styles.qpqaVerbLevel}>
                {v.level}
              </span>
            </div>
          ))}
        </div>

        <div className={styles.qpqaInnerBox} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ fontSize: 13, color: '#57534E' }}>
            <strong>Taxonomy Split:</strong> Foundation (L1: 50%, L2: 25%) · Higher Order (L4: 25%)
          </div>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#16A34A', display: 'flex', alignItems: 'center', gap: 5 }}>
            <CheckCircle size={14} /> Zero Lexical Ambiguity
          </div>
        </div>
      </div>
    );
  }

  // ── 03: QPQA NEURAL ENGINE (107 FRAMES AUTOMATIC ANIMATION) ──
  if (type === 'engine') {
    return (
      <div className={styles.engineMonitorBox}>
        {/* Sleek Live Inference Bar */}
        <div className={styles.engineMonitorHeader}>
          <div className={styles.engineLiveBeacon}>
            <span className={styles.engineLiveBeaconDot} />
            LIVE COGNITIVE INFERENCE
          </div>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', fontFamily: 'JetBrains Mono, monospace' }}>
            107-Frame Automated Pipeline Active
          </span>
        </div>

        {/* Dynamic Canvas */}
        <div className={styles.engineCanvasWrapper}>
          <canvas
            ref={canvasRef}
            className={styles.engineCanvas}
            aria-label="QPQA Neural Engine continuous auto-play animation"
          />
        </div>
      </div>
    );
  }

  // ── 04: CO & BLOOM'S DISTRIBUTION AUDIT ──
  if (type === 'stats') {
    const bloomsData = [
      { level: 'L1: Remember', pct: 50, marks: '25 Marks' },
      { level: 'L2: Understand', pct: 25, marks: '12.5 Marks' },
      { level: 'L3: Apply', pct: 0, marks: '0 Marks' },
      { level: 'L4: Analyze', pct: 25, marks: '12.5 Marks' },
      { level: 'L5-L6: Evaluate & Create', pct: 0, marks: '0 Marks' },
    ];

    const coData = [
      { co: 'CO1: Fundamental Principles', pct: 25, marks: '12.5 Marks' },
      { co: 'CO2: Data Structures & Trees', pct: 25, marks: '12.5 Marks' },
      { co: 'CO3: Algorithmic Procedures', pct: 25, marks: '12.5 Marks' },
      { co: 'CO4: Complexity Evaluation', pct: 25, marks: '12.5 Marks' },
    ];

    return (
      <div className={styles.distributionGrid}>
        {/* Bloom's Distribution */}
        <div className={styles.distributionBox}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
            <span style={{ fontSize: 15, fontWeight: 800, color: '#0F172A' }}>
              Bloom&apos;s Taxonomy Weightage
            </span>
            <span className={styles.qpqaBadge} style={{ fontSize: 10, padding: '3px 10px' }}>
              OBE Standards
            </span>
          </div>

          {bloomsData.map((b, i) => (
            <div key={i} className={styles.distributionRow}>
              <div className={styles.distributionRowLabel}>
                <span>{b.level}</span>
                <span className={styles.distributionRowPct}>{b.pct}% ({b.marks})</span>
              </div>
              <div className={styles.qpqaProgressBar}>
                <div className={styles.qpqaProgressFill} style={{ width: `${b.pct}%` }} />
              </div>
            </div>
          ))}
        </div>

        {/* Course Outcomes Distribution */}
        <div className={styles.distributionBox}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
            <span style={{ fontSize: 15, fontWeight: 800, color: '#0F172A' }}>
              Course Outcome (CO) Coverage
            </span>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#16A34A', display: 'flex', alignItems: 'center', gap: 4 }}>
              <CheckCircle2 size={12} /> Balanced 25% Equal
            </span>
          </div>

          {coData.map((c, i) => (
            <div key={i} className={styles.distributionRow}>
              <div className={styles.distributionRowLabel}>
                <span>{c.co}</span>
                <span className={styles.distributionRowPct}>{c.pct}% ({c.marks})</span>
              </div>
              <div className={styles.qpqaProgressBar}>
                <div
                  className={styles.qpqaProgressFill}
                  style={{ width: `${c.pct}%`, background: 'linear-gradient(90deg, #10B981, #059669)' }}
                />
              </div>
            </div>
          ))}

          <div style={{ marginTop: 18, padding: '12px 16px', background: '#FFFFFF', border: '1px solid #ECE5D8', borderRadius: 12, fontSize: 12, color: '#57534E' }}>
            <strong style={{ color: '#0F172A' }}>Assessment Difficulty Index:</strong> 0.62 (Moderate &amp; Balanced Examination)
          </div>
        </div>
      </div>
    );
  }

  // ── 05: QUALITY ASSESSMENT & CERTIFICATE ──
  if (type === 'results') {
    return (
      <div className={styles.stationResultLayout}>
        {/* Full Wide Result Showcase */}
        <div
          className={styles.resultHeroBanner}
          onClick={() => onOpenLightbox?.(resSrc, 'Official Quality Certificate & Analysis Report')}
          title="Click to view full results report"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              onOpenLightbox?.(resSrc, 'Official Quality Certificate & Analysis Report');
            }
          }}
        >
          <img
            src={resSrc}
            alt="Quality Certificate, Analysis Report and Reasons Insights"
            className={styles.resultBannerImage}
          />
          <div className={styles.paperDocZoomBadge} style={{ bottom: 24 }}>
            <ZoomIn size={14} /> Click to Enlarge Full Report &amp; Insights
          </div>
        </div>

        {/* Audit Metrics Row */}
        <div className={styles.resultStatsSummaryRow}>
          <div className={styles.resultSummaryTile}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 4 }}>
              <Award size={18} color="#EA580C" />
              <span style={{ fontSize: 26, fontWeight: 900, color: '#0F172A', letterSpacing: '-0.02em' }}>96.8 / 100</span>
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#16A34A' }}>Grade A+ Quality Certificate</div>
            <div style={{ fontSize: 11, color: '#78716C', marginTop: 2 }}>Formal Accreditation Score</div>
          </div>

          <div className={styles.resultSummaryTile}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 4 }}>
              <ShieldCheck size={18} color="#EA580C" />
              <span style={{ fontSize: 26, fontWeight: 900, color: '#0F172A', letterSpacing: '-0.02em' }}>100%</span>
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#16A34A' }}>OBE Compliant</div>
            <div style={{ fontSize: 11, color: '#78716C', marginTop: 2 }}>NBA / NAAC Assessment Ready</div>
          </div>

          <div className={styles.resultSummaryTile}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 4 }}>
              <BarChart3 size={18} color="#EA580C" />
              <span style={{ fontSize: 26, fontWeight: 900, color: '#0F172A', letterSpacing: '-0.02em' }}>Zero Bias</span>
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#16A34A' }}>Rule-Based Verified</div>
            <div style={{ fontSize: 11, color: '#78716C', marginTop: 2 }}>Deterministic Automated Logic</div>
          </div>
        </div>

        {/* Actions Deck */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14, paddingTop: 12 }}>
          <div style={{ fontSize: 13, color: '#57534E' }}>
            Official certificate and Bloom&apos;s distribution report are ready for department archiving.
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <button
              onClick={() => onOpenLightbox?.(resSrc, 'Official Quality Certificate & Analysis Report')}
              style={{
                background: '#FFFFFF',
                border: '1px solid #E8E2D7',
                color: '#0F172A',
                padding: '11px 20px',
                borderRadius: 12,
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
              }}
            >
              <ZoomIn size={14} /> Full View
            </button>
            <Link
              to="/upload"
              style={{
                background: 'linear-gradient(135deg, #F97316 0%, #EA580C 100%)',
                color: '#FFFFFF',
                textDecoration: 'none',
                padding: '11px 24px',
                borderRadius: 12,
                fontSize: 13,
                fontWeight: 700,
                boxShadow: '0 4px 16px rgba(249, 115, 22, 0.35)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 7,
              }}
            >
              Analyze Your Question Paper <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return null;
}