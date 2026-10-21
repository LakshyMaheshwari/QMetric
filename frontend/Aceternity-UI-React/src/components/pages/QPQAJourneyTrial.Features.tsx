/**
 * Features Section - Core Capabilities
 */

import React from 'react';
import { Sparkles } from 'lucide-react';
import styles from './QPQAJourneyTrial.module.css';

interface FeaturesProps {
  activeFeature: number;
  features: Array<{ icon: React.ReactNode; title: string; desc: string }>;
  onSelectFeature?: (index: number) => void;
}

export function Features({ activeFeature, features, onSelectFeature }: FeaturesProps) {
  return (
    <section id="features" className={styles.featuresSection} aria-labelledby="features-title">
      <div style={{ maxWidth: 1140, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 52 }}>
          <div style={{ display: 'inline-flex', marginBottom: 16 }}>
            <div className={styles.qpqaBadge}>
              <span className={styles.qpqaBadgeDot} aria-hidden="true" />
              Core Capabilities
            </div>
          </div>

          <h2 id="features-title" className={styles.qpqaSectionTitle} style={{ marginBottom: 12 }}>
            Comprehensive <span style={{ color: '#F97316' }}>Quality Analysis</span>
          </h2>

          <p className={styles.qpqaSectionSub}>
            Systematic evaluation ensuring your engineering examination papers satisfy strict Outcome-Based Education (OBE) criteria.
          </p>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: 22,
          }}
          role="list"
          aria-label="Core capabilities"
        >
          {features.map((feature, i) => {
            const isActive = activeFeature === i;
            return (
              <div
                key={i}
                onClick={() => onSelectFeature?.(i)}
                className={`${styles.featureCard} ${isActive ? styles.featureCardActive : ''}`}
                style={{ cursor: 'pointer' }}
                role="listitem"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    onSelectFeature?.(i);
                  }
                }}
              >
                <div
                  className={`${styles.featureAccent} ${isActive ? styles.featureAccentActive : ''}`}
                  aria-hidden="true"
                />

                <div
                  style={{
                    width: 50,
                    height: 50,
                    borderRadius: 14,
                    background: 'linear-gradient(135deg, #F97316 0%, #EA580C 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#FFFFFF',
                    marginBottom: 22,
                    boxShadow: '0 6px 18px rgba(249, 115, 22, 0.35)',
                  }}
                  aria-hidden="true"
                >
                  {feature.icon}
                </div>

                <h3 style={{ fontSize: 18, fontWeight: 800, color: '#0F172A', margin: '0 0 10px', lineHeight: 1.3 }}>
                  {feature.title}
                </h3>

                <p style={{ fontSize: 14, color: '#57534E', lineHeight: 1.6, margin: 0, flex: 1 }}>
                  {feature.desc}
                </p>

                {isActive && (
                  <div style={{ marginTop: 18, display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, color: '#EA580C' }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#F97316' }} />
                    Active Highlight
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}