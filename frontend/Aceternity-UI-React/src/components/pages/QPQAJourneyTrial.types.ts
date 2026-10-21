/**
 * Type definitions for QPQAJourneyTrial component
 */

export interface Station {
  id: string;
  num: string;
  phase: string;
  title: string;
  desc: string;
  type: StationType;
  verbs?: Verb[];
  stats?: Stat[];
}

export type StationType = 'paper' | 'verbs' | 'engine' | 'stats' | 'results';

export interface Verb {
  t: string;
  l: string;
}

export interface Stat {
  label: string;
  val: string;
  pct: number;
}

export interface Feature {
  icon: React.ReactNode;
  title: string;
  desc: string;
}

export interface WhyItem {
  icon: React.ReactNode;
  title: string;
  desc: string;
}

export interface HeroStat {
  value: string;
  label: string;
}

export interface FrameCacheItem {
  i: number;
  img: HTMLImageElement;
}

export interface QPQAJourneyTrialProps {
  // No props currently, but keeping for future extensibility
}

/** Frame loading configuration */
export const FRAME_CONFIG = {
  TOTAL_FRAMES: 107,
  QP_PRIMARY: '/qpqa-journey/question-paper.jpg',
  QP_FALLBACK: '/qpqa-engine/question-paper.jpg',
  RES_PRIMARY: '/qpqa-journey/results.png',
  RES_FALLBACK: '/qpqa-engine/results.png',
} as const;

/** Station data */
export const TOP_STATIONS: Station[] = [
  {
    id: 's1',
    num: '01',
    phase: 'PHASE 1',
    title: 'Question Paper Ingestion',
    desc: 'Academic examination document is parsed — sections, marks, and Course Outcomes extracted.',
    type: 'paper',
  },
  {
    id: 's3',
    num: '03',
    phase: 'PHASE 3',
    title: 'QPQA Neural Engine',
    desc: '107-frame cognitive scrub validates question stems against Bloom\'s Taxonomy levels (L1–L6).',
    type: 'engine',
  },
  {
    id: 's5',
    num: '05',
    phase: 'PHASE 5',
    title: 'Quality Assessment & Audit',
    desc: 'Comprehensive evaluation produces official Quality Certificate, CO coverage & audit report.',
    type: 'results',
  },
];

export const BOTTOM_STATIONS: Station[] = [
  {
    id: 's2',
    num: '02',
    phase: 'PHASE 2',
    title: 'Action Verb Tokenization',
    desc: 'Lexical & semantic parsing isolates cognitive verbs mapped against Bloom\'s taxonomy.',
    type: 'verbs',
    verbs: [
      { t: 'Define', l: 'L1' },
      { t: 'Explain', l: 'L2' },
      { t: 'Apply', l: 'L3' },
      { t: 'Analyze', l: 'L4' },
      { t: 'Evaluate', l: 'L5' },
    ],
  },
  {
    id: 's4',
    num: '04',
    phase: 'PHASE 4',
    title: 'CO & Bloom\'s Distribution',
    desc: 'Algorithmic alignment matrices cross-check syllabus coverage and difficulty balance.',
    type: 'stats',
    stats: [
      { label: 'L1-L2 Foundation', val: '35%', pct: 35 },
      { label: 'L3-L4 Application', val: '45%', pct: 45 },
      { label: 'L5-L6 Higher Order', val: '20%', pct: 20 },
    ],
  },
];

export const ALL_STATIONS: Station[] = [...TOP_STATIONS, ...BOTTOM_STATIONS].sort(
  (a, b) => parseInt(a.num, 10) - parseInt(b.num, 10)
);

/** Feature data */
export const FEATURES: Feature[] = [
  {
    icon: null, // Will be set in component
    title: "Bloom's Taxonomy Mapping",
    desc: 'Automated identification and mapping of questions to appropriate cognitive levels (L1–L6).',
  },
  {
    icon: null,
    title: 'Course Outcome Analysis',
    desc: 'Precise correlation between questions and Course Outcomes for engineering curricula.',
  },
  {
    icon: null,
    title: 'Module Coverage',
    desc: 'Comprehensive analysis of curriculum module weightage and balanced content distribution.',
  },
  {
    icon: null,
    title: 'Difficulty Assessment',
    desc: 'Systematic evaluation of question difficulty levels to ensure balanced assessment.',
  },
];

/** Why items data */
export const WHY_ITEMS: WhyItem[] = [
  {
    icon: null,
    title: 'OBE Compliance',
    desc: 'Perfect alignment with Outcome-Based Education principles.',
  },
  {
    icon: null,
    title: 'Rule-Based Evaluation',
    desc: 'Customizable criteria eliminating human bias in assessment.',
  },
  {
    icon: null,
    title: 'Engineering Focus',
    desc: 'Designed specifically for engineering curricula coverage.',
  },
];

/** Hero stats data */
export const HERO_STATS: HeroStat[] = [
  { value: '100%', label: 'CO Mapping' },
  { value: '107', label: 'Engine Frames' },
  { value: 'L1-L6', label: "Bloom's Levels" },
];

/** Overview stations for the overview card */
export const OVERVIEW_STATIONS = [
  'Paper Ingestion',
  'Verb Tokenization',
  'Neural Engine (107 Frames)',
  "CO & Bloom's Audit",
  'Quality Certificate',
] as const;

/** Frame path candidates */
export function getFramePaths(frameNumber: number): string[] {
  const p = String(frameNumber).padStart(3, '0');
  return [
    `/qpqa-journey/QPQA_Engine_frames/frame_${p}.jpg`,
    `/qpqa-engine/QPQA_Engine_frames/frame_${p}.jpg`,
    `/qpqa-journey/QPQA_Engine_frames/QPQA_Engine_frames/frame_${p}.jpg`,
    `/qpqa-engine/QPQA_Engine_frames/QPQA_Engine_frames/frame_${p}.jpg`,
  ];
}

/** Scroll trigger positions for stations */
export function getStationScrollPositions(index: number): { start: number; end: number } {
  const startPercent = 10 + index * 14;
  const endPercent = startPercent + 18;
  return { start: startPercent, end: endPercent };
}

/** Engine scrub progress calculation */
export function calculateEngineScrubProgress(scrollProgress: number): number {
  if (scrollProgress >= 0.22 && scrollProgress <= 0.62) {
    return (scrollProgress - 0.22) / 0.4;
  }
  if (scrollProgress > 0.62) {
    return 1;
  }
  return 0;
}