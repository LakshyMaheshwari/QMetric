/**
 * Railway Journey - Interactive milestone pipeline with track visualization and rich stations
 */

import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, X, Sparkles } from 'lucide-react';
import { StationContent } from './QPQAJourneyTrial.StationContent';
import styles from './QPQAJourneyTrial.module.css';
import type { Station } from './QPQAJourneyTrial.types';

interface RailwayJourneyProps {
  sectionRef: React.RefObject<HTMLElement>;
  sliderRef?: React.RefObject<HTMLDivElement>;
  allStations: Station[];
  qpSrc: string;
  resSrc: string;
  engineScrubProgress: number;
  currentFrameIndex: number;
  TOTAL_FRAMES: number;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  reducedMotion: boolean;
  activeStationIndex: number;
  onSelectStation: (index: number) => void;
  drawFrame?: (index: number, cache: HTMLImageElement[]) => void;
  frameCache?: HTMLImageElement[];
}

export function RailwayJourney({
  sectionRef,
  allStations,
  qpSrc,
  resSrc,
  engineScrubProgress,
  currentFrameIndex,
  TOTAL_FRAMES,
  canvasRef,
  activeStationIndex,
  onSelectStation,
  drawFrame,
  frameCache,
}: RailwayJourneyProps) {
  // Lightbox modal state for viewing full question paper or full results
  const [lightboxData, setLightboxData] = useState<{ src: string; title: string } | null>(null);

  const currentStation = allStations[activeStationIndex] || allStations[0];
  const progressPercent = ((activeStationIndex) / (allStations.length - 1)) * 100;

  const handlePrev = () => {
    if (activeStationIndex > 0) {
      onSelectStation(activeStationIndex - 1);
    }
  };

  const handleNext = () => {
    if (activeStationIndex < allStations.length - 1) {
      onSelectStation(activeStationIndex + 1);
    }
  };

  return (
    <section
      ref={sectionRef}
      id="qpqa-railway"
      className={styles.railwaySection}
      role="region"
      aria-label="QPQA Railway Journey"
    >
      {/* ── RAILWAY CONTROL BAR ── */}
      <div className={styles.railwayControlBar}>
        <div className={styles.railwayControlCard}>
          {/* Station Tabs */}
          <div className={styles.railwayTabsRow}>
            {allStations.map((station, index) => {
              const isActive = activeStationIndex === index;
              return (
                <button
                  key={station.id}
                  onClick={() => onSelectStation(index)}
                  className={`${styles.stationJumpBtn} ${isActive ? styles.stationJumpBtnActive : ''}`}
                  type="button"
                  aria-pressed={isActive}
                >
                  <span className={styles.stationJumpBadge}>{station.num}</span>
                  <span>{station.title.split(' ')[0]} {station.title.split(' ')[1] || ''}</span>
                </button>
              );
            })}
          </div>

          {/* Progress Track & Navigation Arrows */}
          <div className={styles.railwayProgressHeader}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className={styles.qpqaPhaseTag}>
                {currentStation.phase}
              </span>
              <span style={{ fontSize: 13, fontWeight: 800, color: '#111827' }}>
                Station {currentStation.num} of 05
              </span>
            </div>

            <div className={styles.railwayProgressTrack}>
              <div
                className={styles.railwayProgressFill}
                style={{ width: `${Math.max(5, progressPercent)}%` }}
              />
            </div>

            <div className={styles.railwayNavBtns}>
              <button
                onClick={handlePrev}
                disabled={activeStationIndex === 0}
                className={styles.railwayNavBtn}
                title="Previous Station"
                aria-label="Previous Station"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                onClick={handleNext}
                disabled={activeStationIndex === allStations.length - 1}
                className={styles.railwayNavBtn}
                title="Next Station"
                aria-label="Next Station"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── STAGE & TRACK ── */}
      <div className={styles.railwayStage}>
        {/* Track Line with Nodes */}
        <div className={styles.stationTrackDisplay}>
          <div className={styles.stationTrackLine}>
            <div
              className={styles.stationTrackFill}
              style={{ width: `${progressPercent}%` }}
            />
            {allStations.map((station, idx) => {
              const isActive = activeStationIndex === idx;
              const isPassed = activeStationIndex > idx;
              return (
                <button
                  key={station.id}
                  onClick={() => onSelectStation(idx)}
                  className={`${styles.stationTrackNode} ${
                    isActive ? styles.stationTrackNodeActive : isPassed ? styles.stationTrackNodePassed : ''
                  }`}
                  title={`${station.num}: ${station.title}`}
                  type="button"
                >
                  {station.num}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── ACTIVE STATION HERO CARD ── */}
        <div className={styles.stationHeroCard}>
          <div className={styles.stationHeroCardHeader}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span className={styles.qpqaPhaseTag}>{currentStation.phase}</span>
                <span className={styles.qpqaStationNum}>STATION {currentStation.num} OF 05</span>
              </div>
              <h3 className={styles.stationHeroCardTitle}>
                {currentStation.title}
              </h3>
              <p className={styles.stationHeroCardDesc}>
                {currentStation.desc}
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className={styles.qpqaBadge}>
                <Sparkles size={12} /> Active Pipeline Step
              </span>
            </div>
          </div>

          {/* Station Rich View */}
          <StationContent
            station={currentStation}
            qpSrc={qpSrc}
            resSrc={resSrc}
            engineScrubProgress={engineScrubProgress}
            currentFrameIndex={currentFrameIndex}
            TOTAL_FRAMES={TOTAL_FRAMES}
            canvasRef={canvasRef}
            onOpenLightbox={(src, title) => setLightboxData({ src, title })}
            drawFrame={drawFrame}
            frameCache={frameCache}
          />
        </div>
      </div>

      {/* ── LIGHTBOX MODAL (FOR QUESTION PAPER & RESULTS) ── */}
      {lightboxData && (
        <div
          className={styles.lightboxOverlay}
          onClick={() => setLightboxData(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className={styles.lightboxCard}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.lightboxHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className={styles.qpqaPhaseTag}>PREVIEW</span>
                <h4 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#111827' }}>
                  {lightboxData.title}
                </h4>
              </div>
              <button
                onClick={() => setLightboxData(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#64748B',
                  cursor: 'pointer',
                  padding: 4,
                  display: 'flex',
                  alignItems: 'center',
                  borderRadius: 6,
                }}
                aria-label="Close Preview"
              >
                <X size={20} />
              </button>
            </div>
            <div className={styles.lightboxBody}>
              <img
                src={lightboxData.src}
                alt={lightboxData.title}
                className={styles.lightboxImage}
              />
            </div>
          </div>
        </div>
      )}
    </section>
  );
}