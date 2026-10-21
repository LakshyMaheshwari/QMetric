/**
 * Hero Section for QPQAJourneyTrial
 */

import React from 'react';
import { ArrowRight, Eye, CheckCircle2 } from 'lucide-react';
import { InteractiveHoverButton } from '../ui/interactive-hover-button';
import styles from './QPQAJourneyTrial.module.css';

interface HeroProps {
  isAuthenticated: boolean;
  user: unknown;
  onAnalyze: () => void;
  onScrollToJourney: () => void;
  heroStats: Array<{ value: string; label: string; badge?: string }>;
}

export function Hero({
  isAuthenticated,
  user,
  onAnalyze,
  onScrollToJourney,
  heroStats,
}: HeroProps) {
  return (
    <section className={styles.heroSection} aria-labelledby="hero-title">
      <div className={styles.heroGlow} aria-hidden="true" />

      <div style={{ maxWidth: 1040, margin: '0 auto', padding: '0 24px', textAlign: 'center', position: 'relative' }}>
        {/* Top OBE Badge with live beacon */}
        <div style={{ display: 'inline-flex', marginBottom: 26 }}>
          <div className={styles.qpqaBadge}>
            <span className={styles.qpqaBadgeDot} aria-hidden="true" />
            OBE-Compliant Quality Analysis System
          </div>
        </div>

        {/* Main Hero Title */}
        <h1
          id="hero-title"
          style={{
            fontSize: 'clamp(38px, 5.4vw, 70px)',
            fontWeight: 900,
            letterSpacing: '-0.04em',
            lineHeight: 1.08,
            margin: '0 0 22px',
            color: '#0F172A',
          }}
        >
          Automated{' '}
          <span className={styles.heroTitleGradient}>Question Paper</span>
          <br />Quality Analysis
        </h1>

        {/* Subtitle */}
        <p
          style={{
            fontSize: 'clamp(16px, 1.8vw, 19px)',
            color: '#57534E',
            lineHeight: 1.65,
            maxWidth: 680,
            margin: '0 auto 38px',
          }}
        >
          Ensure academic excellence with our rule-based evaluation pipeline for engineering curricula —
          systematic evaluation of difficulty levels, Course Outcome (CO) mapping, and Bloom&apos;s taxonomy alignment.
        </p>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 52 }}>
          <InteractiveHoverButton
            onClick={onAnalyze}
            variant="orange"
            size="lg"
            rightIcon={<ArrowRight className="w-5 h-5" aria-hidden="true" />}
            aria-label="Analyze Question Paper"
            style={{
              boxShadow: '0 6px 20px -2px rgba(249, 115, 22, 0.4)',
            }}
          >
            Analyze Question Paper
          </InteractiveHoverButton>

          <InteractiveHoverButton
            onClick={onScrollToJourney}
            variant="outline"
            size="lg"
            className="bg-white text-[#0F172A] border-[#E8E2D7] hover:bg-[#FDFBF8] hover:border-[#F97316] shadow-sm"
            leftIcon={<Eye className="w-5 h-5 text-orange-500" aria-hidden="true" />}
            aria-label="Explore the QPQA Railway Journey"
          >
            Explore Railway Journey
          </InteractiveHoverButton>
        </div>

        {/* Stats Row (3 luxury stats cards) */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 18,
            maxWidth: 820,
            margin: '0 auto',
          }}
          role="list"
          aria-label="Key statistics"
        >
          {heroStats.map((s, i) => (
            <div key={i} className={styles.heroStatCard} role="listitem">
              <div className={styles.qpqaStatValue}>{s.value}</div>
              <div className={styles.qpqaStatLabel}>{s.label}</div>
              {s.badge && (
                <div style={{ display: 'flex', justifyContent: 'center', marginTop: 8 }}>
                  <span className={styles.qpqaStatBadge}>
                    <CheckCircle2 size={11} aria-hidden="true" />
                    {s.badge}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}