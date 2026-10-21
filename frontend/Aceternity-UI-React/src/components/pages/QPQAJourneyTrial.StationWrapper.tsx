/**
 * StationWrapper - Wrapper component for railway station cards
 */

import React from 'react';
import { StationContent } from './QPQAJourneyTrial.StationContent';
import styles from './QPQAJourneyTrial.module.css';
import type { Station } from './QPQAJourneyTrial.types';

interface StationWrapperProps {
  station: Station;
  isTop: boolean;
  allStations: Station[];
  qpqaSrc: string;
  resSrc: string;
  engineScrubProgress: number;
  currentFrameIndex: number;
  TOTAL_FRAMES: number;
  canvasRef: React.RefObject<HTMLCanvasElement>;
}

export function StationWrapper({
  station,
  isTop,
  allStations,
  qpqaSrc,
  resSrc,
  engineScrubProgress,
  currentFrameIndex,
  TOTAL_FRAMES,
  canvasRef,
}: StationWrapperProps) {
  const index = allStations.findIndex((s) => s.id === station.id);

  return (
    <div
      className={`${styles.stationWrapper} ${isTop ? styles.stationWrapperTop : styles.stationWrapperBottom}`}
      role="listitem"
    >
      {/* Stem */}
      <div
        className={`${styles.stationStem} ${isTop ? styles.stationStemTop : styles.stationStemBottom}`}
        aria-hidden="true"
      >
        <div className={`${styles.stationNode} ${isTop ? styles.stationNodeTop : styles.stationNodeBottom}`} id={`node-${station.id}`} />
        <div className={`${styles.stationStemLine} ${isTop ? styles.stationStemLineTop : styles.stationStemLineBottom}`} id={`stem-${station.id}`} />
      </div>

      {/* Card */}
      <div className={`${styles.qpqaCard} ${styles.stationCard}`} id={`card-${station.id}`}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <span className={styles.qpqaPhaseTag}>{station.phase}</span>
          <span className={styles.qpqaStationNum}>STATION {station.num}</span>
        </div>
        <h4 style={{ fontSize: 17, fontWeight: 800, margin: '0 0 5px', color: '#111', lineHeight: 1.25 }}>
          {station.title}
        </h4>
        <p style={{ fontSize: 13, color: '#666', lineHeight: 1.45, margin: '0 0 14px' }}>
          {station.desc}
        </p>
        <StationContent
          station={station}
          qpSrc={qpqaSrc}
          resSrc={resSrc}
          engineScrubProgress={engineScrubProgress}
          currentFrameIndex={currentFrameIndex}
          TOTAL_FRAMES={TOTAL_FRAMES}
          canvasRef={canvasRef}
        />
      </div>
    </div>
  );
}