/**
 * Custom hooks for QPQAJourneyTrial component
 */

import { useState, useEffect, useLayoutEffect, useRef, useCallback, useSyncExternalStore } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import type { Station, FrameCacheItem } from './QPQAJourneyTrial.types';

/** Register GSAP plugins */
if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

/**
 * Hook for managing GSAP animations with proper cleanup
 */
export function useGSAPAnimation(
  callback: (context: gsap.Context) => (() => void) | void,
  dependencies: unknown[] = [],
  scope?: React.RefObject<HTMLElement>
) {
  const ctxRef = useRef<gsap.Context | null>(null);
  const cleanupRef = useRef<(() => void) | undefined>(undefined);

  // Create context
  useLayoutEffect(() => {
    const element = scope?.current;
    ctxRef.current = gsap.context(() => {}, element);
    return () => {
      cleanupRef.current?.();
      cleanupRef.current = undefined;
      ctxRef.current?.revert();
      ctxRef.current = null;
    };
  }, [scope]);

  // Run animation
  useLayoutEffect(() => {
    if (!ctxRef.current) return;
    cleanupRef.current?.();
    const result = ctxRef.current.add(callback);
    cleanupRef.current = typeof result === 'function' ? result : undefined;
  }, dependencies);
}

/**
 * Hook for detecting reduced motion preference
 */
export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    (callback) => {
      if (typeof window === 'undefined') return () => {};
      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      mediaQuery.addEventListener('change', callback);
      return () => mediaQuery.removeEventListener('change', callback);
    },
    () => typeof window !== 'undefined' ? window.matchMedia('(prefers-reduced-motion: reduce)').matches : false,
    () => false
  );
}

/**
 * Hook for preloading animation frames
 */
export function useFrameLoader(
  totalFrames: number,
  getFramePaths: (frameNumber: number) => string[],
  onFramesReady: (frames: HTMLImageElement[]) => void
) {
  const [isReady, setIsReady] = useState(false);
  const cacheRef = useRef<HTMLImageElement[]>([]);

  useEffect(() => {
    let alive = true;
    const loaded: { i: number; img: HTMLImageElement }[] = [];
    let done = 0;

    for (let i = 1; i <= totalFrames; i++) {
      const candidates = getFramePaths(i);
      let candidateIndex = 0;
      const img = new Image();

      const finish = () => {
        done++;
        if (done >= totalFrames && alive) {
          loaded.sort((a, b) => a.i - b.i);
          const images = loaded.map((x) => x.img);
          cacheRef.current = images;
          setIsReady(true);
          if (images.length > 0) {
            requestAnimationFrame(() => onFramesReady(images));
          }
        }
      };

      img.onload = () => {
        loaded.push({ i, img });
        finish();
      };

      img.onerror = () => {
        candidateIndex++;
        if (candidateIndex < candidates.length) {
          img.src = candidates[candidateIndex];
        } else {
          finish();
        }
      };

      img.src = candidates[0];
    }

    return () => {
      alive = false;
    };
  }, [totalFrames, getFramePaths, onFramesReady]);

  return { isReady, cache: cacheRef.current };
}

/**
 * Hook for drawing frames to canvas
 */
export function useFrameDrawer(
  totalFrames: number,
  frameCache: HTMLImageElement[]
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const drawFrame = useCallback((index: number) => {
    const frames = frameCache;
    if (!frames.length) return;

    const ratio = Math.max(0, Math.min(index / (totalFrames - 1), 1));
    const frameIndex = Math.min(Math.floor(ratio * frames.length), frames.length - 1);
    const img = frames[frameIndex];
    const canvas = canvasRef.current;

    if (!img?.complete || !img.naturalWidth || !canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (canvas.width !== img.naturalWidth || canvas.height !== img.naturalHeight) {
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  }, [totalFrames, frameCache]);

  return { canvasRef, drawFrame };
}

/**
 * Hook for managing station scroll animations
 */
export function useStationAnimations(
  sectionRef: React.RefObject<HTMLElement>,
  stations: Station[],
  topStations: Station[],
  reducedMotion: boolean
) {
  useGSAPAnimation(
    (ctx) => {
      const section = sectionRef.current;
      if (!section) return;

      const isMobile = window.innerWidth < 768;

      // Horizontal scroll animation
      ctx.add(() => {
        gsap.to('.qpqaRailwayLine', {
          width: isMobile ? '80%' : '98%',
          ease: 'none',
          scrollTrigger: {
            trigger: section,
            start: 'top 20%',
            end: '85% bottom',
            scrub: true,
          },
        });
      });

      // Station reveal animations
      stations.forEach((station, index) => {
        const isTop = topStations.some((t) => t.id === station.id);
        const { start, end } = getStationScrollPositions(index);

        ctx.add(() => {
          gsap.timeline({
            scrollTrigger: {
              trigger: section,
              start: `${start}% 30%`,
              end: `${end}% 50%`,
              scrub: true,
            },
          })
            .to(`.stem-${station.id}`, { scaleY: 1, duration: 0.4 })
            .to(`.node-${station.id}`, { scale: 1, opacity: 1, duration: 0.3 }, '<')
            .fromTo(
              `.card-${station.id}`,
              { opacity: 0.8, y: isTop ? 12 : -12 },
              { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' },
              '-=0.2'
            );
        });
      });
    },
    [reducedMotion],
    sectionRef
  );
}

/** Helper function for station scroll positions */
function getStationScrollPositions(index: number): { start: number; end: number } {
  const start = 10 + index * 14;
  const end = start + 18;
  return { start, end };
}