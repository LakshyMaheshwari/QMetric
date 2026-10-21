/**
 * Journey Lead-In Section - Clean User Journey Header
 */

import React from 'react';
import styles from './QPQAJourneyTrial.module.css';

export function JourneyLeadIn() {
  return (
    <section className={styles.journeyLeadIn} aria-labelledby="journey-title">
      <div style={{ maxWidth: 800, margin: '0 auto', textAlign: 'center' }}>
        <div style={{ display: 'inline-flex', marginBottom: 12 }}>
          <span className={styles.qpqaBadge} style={{ fontSize: 10, padding: '4px 12px' }}>
            Interactive Workflow
          </span>
        </div>
        <h2 id="journey-title" className={styles.qpqaSectionTitle} style={{ margin: '0 0 8px' }}>
          User <span style={{ color: '#F97316' }}>Journey</span>
        </h2>
        <p className={styles.qpqaSectionSub} style={{ fontSize: 15, maxWidth: 540, margin: '0 auto' }}>
          Explore the 5 continuous milestones from examination paper ingestion to formal accreditation quality certification.
        </p>
      </div>
    </section>
  );
}