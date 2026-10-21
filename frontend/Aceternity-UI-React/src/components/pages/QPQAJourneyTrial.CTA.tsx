/**
 * CTA Section - Call to Action
 */

import React from 'react';
import { InteractiveHoverButton } from '../ui/interactive-hover-button';
import { ArrowRight, FileCheck } from 'lucide-react';
import styles from './QPQAJourneyTrial.module.css';

interface CTAProps {
  isAuthenticated: boolean;
  user: unknown;
  onAnalyze: () => void;
  onViewSample: () => void;
}

export function CTA({ isAuthenticated, user, onAnalyze, onViewSample }: CTAProps) {
  return (
    <section className={styles.ctaSection} aria-labelledby="cta-title">
      <div style={{ maxWidth: 880, margin: '0 auto' }}>
        <div className={styles.ctaCard}>
          <div className={styles.ctaGlow} aria-hidden="true" />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'inline-flex', marginBottom: 18 }}>
              <span
                style={{
                  background: 'rgba(249, 115, 22, 0.15)',
                  border: '1px solid rgba(249, 115, 22, 0.3)',
                  color: '#F97316',
                  fontSize: 11,
                  fontWeight: 800,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  padding: '5px 14px',
                  borderRadius: 999,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <FileCheck size={13} /> Audit-Ready Accreditation
              </span>
            </div>

            <h2
              id="cta-title"
              style={{
                fontSize: 'clamp(28px, 4vw, 42px)',
                fontWeight: 900,
                color: '#FFFFFF',
                margin: '0 0 16px',
                letterSpacing: '-0.025em',
                lineHeight: 1.15,
              }}
            >
              Ready to Ensure Quality Excellence?
            </h2>

            <p
              style={{
                fontSize: 16,
                color: '#94A3B8',
                lineHeight: 1.6,
                maxWidth: 540,
                margin: '0 auto 36px',
              }}
            >
              Join engineering institutions that trust our automated, rule-based approach to examination quality analysis and accreditation reporting.
            </p>

            <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
              <InteractiveHoverButton
                onClick={onAnalyze}
                variant="orange"
                size="lg"
                rightIcon={<ArrowRight className="w-5 h-5" aria-hidden="true" />}
                aria-label="Upload Question Paper"
              >
                Upload Question Paper
              </InteractiveHoverButton>

              <InteractiveHoverButton
                onClick={onViewSample}
                variant="outline"
                size="lg"
                className="bg-white/10 text-white border-white/20 hover:bg-white/20"
              >
                Compare Classic Landing
              </InteractiveHoverButton>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}