// ============================================================================
// Interactive Mouse-Reactive Dot Grid / Particle Background
// Apple-inspired subtle canvas particle engine with spring physics & touch/reduced-motion fallback
// ============================================================================

import React, { useEffect, useRef } from 'react';

interface Dot {
  x: number;
  y: number;
  originX: number;
  originY: number;
  vx: number;
  vy: number;
  radius: number;
}

export const InteractiveBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let dots: Dot[] = [];
    const spacing = 30; // Grid distance between dots
    const mouse = { x: -9999, y: -9999, radius: 120 };

    // Check environment capabilities
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

    const resize = () => {
      if (!canvas) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = window.innerWidth;
      const height = window.innerHeight;

      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.scale(dpr, dpr);

      // Re-populate dots grid
      dots = [];
      for (let x = spacing / 2; x < width; x += spacing) {
        for (let y = spacing / 2; y < height; y += spacing) {
          dots.push({
            x,
            y,
            originX: x,
            originY: y,
            vx: 0,
            vy: 0,
            radius: 1.1,
          });
        }
      }

      if (prefersReducedMotion || isTouchDevice) {
        drawStatic();
      }
    };

    const drawStatic = () => {
      if (!ctx || !canvas) return;
      const width = window.innerWidth;
      const height = window.innerHeight;
      ctx.clearRect(0, 0, width, height);

      const isDark = document.documentElement.classList.contains('dark');
      ctx.fillStyle = isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(15, 23, 42, 0.14)';

      for (let i = 0; i < dots.length; i++) {
        const dot = dots[i];
        ctx.beginPath();
        ctx.arc(dot.originX, dot.originY, dot.radius, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    const onMouseMove = (e: MouseEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };

    const onMouseLeave = () => {
      mouse.x = -9999;
      mouse.y = -9999;
    };

    const animate = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      ctx.clearRect(0, 0, width, height);

      const isDark = document.documentElement.classList.contains('dark');
      const dotColor = isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(15, 23, 42, 0.14)';
      const activeDotColor = isDark ? 'rgba(52, 211, 153, 0.35)' : 'rgba(5, 150, 105, 0.35)';

      for (let i = 0; i < dots.length; i++) {
        const dot = dots[i];

        // Physics: distance to mouse
        const dx = mouse.x - dot.x;
        const dy = mouse.y - dot.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < mouse.radius && dist > 0) {
          // Repel force inversely proportional to distance
          const force = (1 - dist / mouse.radius) * 14;
          const angle = Math.atan2(dy, dx);
          const targetX = dot.originX - Math.cos(angle) * force;
          const targetY = dot.originY - Math.sin(angle) * force;

          dot.vx += (targetX - dot.x) * 0.2;
          dot.vy += (targetY - dot.y) * 0.2;
        }

        // Return to resting position (spring lerp + friction)
        dot.vx += (dot.originX - dot.x) * 0.08;
        dot.vy += (dot.originY - dot.y) * 0.08;
        dot.vx *= 0.82;
        dot.vy *= 0.82;

        dot.x += dot.vx;
        dot.y += dot.vy;

        // Draw dot
        const isDisplaced = Math.abs(dot.x - dot.originX) > 1 || Math.abs(dot.y - dot.originY) > 1;
        ctx.fillStyle = isDisplaced ? activeDotColor : dotColor;
        ctx.beginPath();
        ctx.arc(dot.x, dot.y, isDisplaced ? dot.radius * 1.3 : dot.radius, 0, Math.PI * 2);
        ctx.fill();
      }

      animationFrameId = requestAnimationFrame(animate);
    };

    window.addEventListener('resize', resize);
    resize();

    if (!prefersReducedMotion && !isTouchDevice) {
      window.addEventListener('mousemove', onMouseMove, { passive: true });
      window.addEventListener('mouseleave', onMouseLeave, { passive: true });
      animationFrameId = requestAnimationFrame(animate);
    } else {
      drawStatic();
    }

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseleave', onMouseLeave);
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0 select-none opacity-90 transition-opacity duration-300"
      aria-hidden="true"
    />
  );
};
