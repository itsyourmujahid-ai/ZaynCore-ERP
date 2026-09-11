// ============================================================================
// Apple-Style Fluid Page Transition Wrapper for ZaynCore Enterprise ERP
// Delivers smooth, direction-aware horizontal slide, micro-scale, and opacity
// transitions with native spring-like cubic-bezier easing and zero layout shifts.
// ============================================================================

import React, { useEffect, useState, useRef } from 'react';

export interface PageTransitionProps {
  viewKey: string;
  children: React.ReactNode;
  className?: string;
}

// Canonical hierarchy index for directional awareness (Forward vs Backward)
const VIEW_HIERARCHY: Record<string, number> = {
  superadmin: 0,
  dashboard: 1,
  sales: 2,
  purchases: 3,
  inventory: 4,
  accounting: 5,
  tax: 6,
  banking: 7,
  payroll: 8,
  assets: 9,
  projects: 10,
  reports: 11,
  settings: 12,
  coa: 5.1,
  journals: 5.2,
  'accounting-engine': 5.3,
  companies: 12.1,
  'fiscal-periods': 12.2,
  roles: 12.3,
  audit: 12.4,
  registry: 12.5,
};

export const PageTransition: React.FC<PageTransitionProps> = ({
  viewKey,
  children,
  className = '',
}) => {
  const [displayedKey, setDisplayedKey] = useState(viewKey);
  const [animationClass, setAnimationClass] = useState<'enter-forward' | 'enter-backward' | 'enter-neutral'>('enter-neutral');
  const prevKeyRef = useRef(viewKey);
  const containerRef = useRef<HTMLDivElement>(null);

  // Check system preference for reduced motion
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      setPrefersReducedMotion(mediaQuery.matches);

      const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
      mediaQuery.addEventListener('change', handler);
      return () => mediaQuery.removeEventListener('change', handler);
    }
  }, []);

  useEffect(() => {
    if (viewKey !== prevKeyRef.current) {
      const prevIndex = VIEW_HIERARCHY[prevKeyRef.current] ?? 1;
      const nextIndex = VIEW_HIERARCHY[viewKey] ?? 1;

      let directionClass: 'enter-forward' | 'enter-backward' | 'enter-neutral' = 'enter-neutral';
      if (nextIndex > prevIndex) {
        directionClass = 'enter-forward';
      } else if (nextIndex < prevIndex) {
        directionClass = 'enter-backward';
      }

      setAnimationClass(directionClass);
      setDisplayedKey(viewKey);
      prevKeyRef.current = viewKey;

      // Scroll viewport back to top cleanly without jump
      if (containerRef.current) {
        const scrollParent = containerRef.current.closest('main');
        if (scrollParent) {
          scrollParent.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
        }
      }
    }
  }, [viewKey]);

  const motionClass = prefersReducedMotion ? 'zayn-reduced-motion' : `zayn-${animationClass}`;

  return (
    <div
      ref={containerRef}
      key={displayedKey}
      className={`zayn-page-transition ${motionClass} ${className}`}
      style={{
        width: '100%',
        minWidth: 0,
      }}
    >
      {children}
    </div>
  );
};
