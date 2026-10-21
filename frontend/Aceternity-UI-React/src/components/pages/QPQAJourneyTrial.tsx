/**
 * QPQAJourneyTrial - Premium QPQA Railway Journey Landing Page
 * Warm Beige (#FAF7F2) + Crisp White (#FFFFFF) + Orange (#F97316) + Deep Charcoal (#111827)
 */

'use client';

import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { Target, BookOpen, Brain, BarChart3, Award, Zap, Shield } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

import styles from './QPQAJourneyTrial.module.css';
import { Hero } from './QPQAJourneyTrial.Hero';
import { JourneyLeadIn } from './QPQAJourneyTrial.JourneyLeadIn';
import { RailwayJourney } from './QPQAJourneyTrial.RailwayJourney';
import { Features } from './QPQAJourneyTrial.Features';
import { WhySection } from './QPQAJourneyTrial.WhySection';
import { CTA } from './QPQAJourneyTrial.CTA';
import {
  usePrefersReducedMotion,
  useFrameLoader,
  useFrameDrawer,
} from './QPQAJourneyTrial.hooks';
import {
  ALL_STATIONS,
  FRAME_CONFIG,
  getFramePaths,
} from './QPQAJourneyTrial.types';

export default function QPQAJourneyTrial() {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Refs
  const sectionRef = useRef<HTMLDivElement>(null);

  // State
  const [activeStationIndex, setActiveStationIndex] = useState(0);
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
  const [engineScrubProgress, setEngineScrubProgress] = useState(0);
  const [activeFeature, setActiveFeature] = useState(0);

  // Reduced motion
  const reducedMotion = usePrefersReducedMotion();

  // Feature auto-rotation
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveFeature((prev) => (prev + 1) % 4);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  // Handlers
  const handleAnalyze = useCallback(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    navigate('/upload');
  }, [isAuthenticated, navigate]);

  const scrollToJourney = useCallback(() => {
    document.getElementById('qpqa-railway')?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Frame loading
  const { cache: frameCache } = useFrameLoader(
    FRAME_CONFIG.TOTAL_FRAMES,
    getFramePaths,
    (frames) => {
      if (frames.length > 0) {
        requestAnimationFrame(() => drawFrame(0));
      }
    }
  );

  // Frame drawing
  const { canvasRef, drawFrame } = useFrameDrawer(FRAME_CONFIG.TOTAL_FRAMES, frameCache);

  // Handle station selection
  const handleSelectStation = useCallback(
    (index: number) => {
      setActiveStationIndex(index);
    },
    []
  );

  // Automatic continuous animation loop for Neural Engine frames
  useEffect(() => {
    if (!frameCache || frameCache.length === 0) return;

    const timer = setInterval(() => {
      setCurrentFrameIndex((prev) => {
        const next = (prev + 1) % FRAME_CONFIG.TOTAL_FRAMES;
        const progress = next / (FRAME_CONFIG.TOTAL_FRAMES - 1);
        setEngineScrubProgress(progress);
        drawFrame(next);
        return next;
      });
    }, 60);

    return () => clearInterval(timer);
  }, [frameCache, drawFrame]);

  // Initial draw whenever frameCache or activeStationIndex changes
  useEffect(() => {
    if (frameCache && frameCache.length > 0) {
      drawFrame(currentFrameIndex);
    }
  }, [frameCache, currentFrameIndex, drawFrame, activeStationIndex]);

  // Key stats for Hero
  const heroStats = [
    { value: '100%', label: 'CO Mapping Accuracy', badge: 'OBE Verified' },
    { value: 'L1–L6', label: "Bloom's Cognitive Levels", badge: 'Full Taxonomy' },
    { value: '0% Bias', label: 'Deterministic Evaluation', badge: 'Rule-Based Engine' },
  ];

  // Core Capabilities features
  const features = [
    {
      icon: <Brain className="w-6 h-6" aria-hidden="true" />,
      title: "Bloom's Taxonomy Mapping",
      desc: "Automated identification and mapping of question stems to appropriate cognitive taxonomy levels (L1–L6).",
    },
    {
      icon: <Target className="w-6 h-6" aria-hidden="true" />,
      title: 'Course Outcome Analysis',
      desc: 'Precise correlation between exam questions and defined Course Outcomes (CO1–CO5) for engineering curricula.',
    },
    {
      icon: <BookOpen className="w-6 h-6" aria-hidden="true" />,
      title: 'Module Weightage Coverage',
      desc: 'Systematic analysis of syllabus module distribution to prevent question clustering and curriculum gaps.',
    },
    {
      icon: <BarChart3 className="w-6 h-6" aria-hidden="true" />,
      title: 'Difficulty Assessment Index',
      desc: 'Comprehensive calculation of exam cognitive balance to ensure fair and rigorous academic assessment.',
    },
  ];

  // Why choose items
  const whyItems = [
    {
      icon: <Shield className="w-5 h-5" aria-hidden="true" />,
      title: 'Outcome-Based Education (OBE) Compliance',
      desc: 'Strict alignment with NBA & NAAC accreditation requirements, ensuring documented evidence for auditing.',
    },
    {
      icon: <Zap className="w-5 h-5" aria-hidden="true" />,
      title: 'Objective Rule-Based Evaluation',
      desc: 'Standalone algorithmic system eliminating subjective human bias in question paper difficulty scoring.',
    },
    {
      icon: <Award className="w-5 h-5" aria-hidden="true" />,
      title: 'Tailored for Engineering Institutions',
      desc: 'Designed ground-up for engineering university schemes with multi-section papers and numerical derivations.',
    },
  ];

  return (
    <div className={styles.qpqaPage}>
      {/* ── HERO SECTION ── */}
      <Hero
        isAuthenticated={isAuthenticated}
        user={user}
        onAnalyze={handleAnalyze}
        onScrollToJourney={scrollToJourney}
        heroStats={heroStats}
      />

      {/* ── USER JOURNEY LEAD-IN ── */}
      <JourneyLeadIn />

      {/* ── RAILWAY JOURNEY INTERACTIVE PIPELINE ── */}
      <RailwayJourney
        sectionRef={sectionRef}
        allStations={ALL_STATIONS}
        qpSrc={FRAME_CONFIG.QP_PRIMARY}
        resSrc={FRAME_CONFIG.RES_PRIMARY}
        engineScrubProgress={engineScrubProgress}
        currentFrameIndex={currentFrameIndex}
        TOTAL_FRAMES={FRAME_CONFIG.TOTAL_FRAMES}
        canvasRef={canvasRef}
        reducedMotion={reducedMotion}
        activeStationIndex={activeStationIndex}
        onSelectStation={handleSelectStation}
        drawFrame={drawFrame}
        frameCache={frameCache}
      />

      {/* ── FEATURES SECTION ── */}
      <Features
        activeFeature={activeFeature}
        features={features}
        onSelectFeature={(i) => setActiveFeature(i)}
      />

      {/* ── WHY SECTION ── */}
      <WhySection whyItems={whyItems} />

      {/* ── CTA SECTION ── */}
      <CTA
        isAuthenticated={isAuthenticated}
        user={user}
        onAnalyze={handleAnalyze}
        onViewSample={() => navigate('/landing-old')}
      />
    </div>
  );
}