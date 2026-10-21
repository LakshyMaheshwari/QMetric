/**
 * Why Section - Reasons to choose QMetric
 */

import React from 'react';
import { Target, Award } from 'lucide-react';
import styles from './QPQAJourneyTrial.module.css';

interface WhySectionProps {
  whyItems: Array<{ icon: React.ReactNode; title: string; desc: string }>;
}

export function WhySection({ whyItems }: WhySectionProps) {
  return (
    <section id="about" className={styles.whySection} aria-labelledby="why-title">
      <div style={{ maxWidth: 1140, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 48, alignItems: 'center' }}>
          {/* Left Column: Heading & Value Prop */}
          <div>
            <div style={{ display: 'inline-flex', marginBottom: 18 }}>
              <div className={styles.qpqaBadge}>
                <span className={styles.qpqaBadgeDot} aria-hidden="true" />
                Why Choose QMetric
              </div>
            </div>

            <h2 id="why-title" className={styles.qpqaSectionTitle} style={{ textAlign: 'left', marginBottom: 16 }}>
              Engineered for <span style={{ color: '#F97316' }}>Accreditation</span> Excellence
            </h2>

            <p style={{ fontSize: 16, color: '#57534E', lineHeight: 1.65, margin: '0 0 24px' }}>
              Designed specifically for engineering institutions seeking audit-ready, unbiased question paper assessment aligned with NBA and NAAC criteria.
            </p>

            <div className={styles.qpqaInnerBox} style={{ background: '#FFFFFF', border: '1px solid #E8E2D7' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <Award size={18} color="#EA580C" />
                <div style={{ fontSize: 14, fontWeight: 800, color: '#0F172A' }}>
                  Formal Accreditation Impact
                </div>
              </div>
              <p style={{ fontSize: 13, color: '#57534E', lineHeight: 1.6, margin: 0 }}>
                Every analysis run outputs a formal Quality Certificate detailing Course Outcome coverage, taxonomy weightage, and specific quality gaps with remediation advice.
              </p>
            </div>
          </div>

          {/* Right Column: Why Items Cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {whyItems.map((item, i) => (
              <div
                key={i}
                className={styles.qpqaCard}
                style={{
                  padding: '24px 26px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 18,
                  borderRadius: 20,
                }}
              >
                <div
                  style={{
                    width: 46,
                    height: 46,
                    borderRadius: 14,
                    background: 'linear-gradient(135deg, #F97316 0%, #EA580C 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#FFFFFF',
                    flexShrink: 0,
                    boxShadow: '0 6px 16px rgba(249, 115, 22, 0.35)',
                  }}
                  aria-hidden="true"
                >
                  {item.icon}
                </div>

                <div>
                  <h3 style={{ fontSize: 17, fontWeight: 800, color: '#0F172A', margin: '0 0 6px' }}>
                    {item.title}
                  </h3>
                  <p style={{ fontSize: 13, color: '#57534E', lineHeight: 1.6, margin: 0 }}>
                    {item.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}