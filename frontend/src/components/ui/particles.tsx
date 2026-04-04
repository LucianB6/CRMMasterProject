'use client';

import * as React from 'react';

import { cn } from '../../lib/utils';

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
};

type ParticlesProps = {
  className?: string;
  quantity?: number;
  ease?: number;
  color?: string;
  refresh?: boolean;
};

export function Particles({
  className,
  quantity = 80,
  ease = 80,
  color = '#67C6EE',
  refresh = false,
}: ParticlesProps) {
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const particlesRef = React.useRef<Particle[]>([]);
  const frameRef = React.useRef<number | null>(null);
  const visibleRef = React.useRef(true);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext('2d');
    if (!context) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion) {
      return;
    }

    const DPR = Math.max(1, Math.min(window.devicePixelRatio || 1, 1.5));
    const targetFps = 30;
    const frameInterval = 1000 / targetFps;
    let lastFrameTime = 0;

    const buildParticles = (width: number, height: number) => {
      const next: Particle[] = [];
      const clampedQuantity = Math.max(8, Math.min(quantity, 180));
      const speedFactor = Math.max(20, ease) / 1200;

      for (let i = 0; i < clampedQuantity; i += 1) {
        next.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * speedFactor,
          vy: (Math.random() - 0.5) * speedFactor,
          size: Math.random() * 1.8 + 0.7,
          alpha: Math.random() * 0.45 + 0.12,
        });
      }

      particlesRef.current = next;
    };

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const { width, height } = parent.getBoundingClientRect();

      canvas.width = Math.floor(width * DPR);
      canvas.height = Math.floor(height * DPR);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      context.setTransform(DPR, 0, 0, DPR, 0, 0);

      if (refresh || particlesRef.current.length === 0) {
        buildParticles(width, height);
      }
    };

    const draw = (time: number) => {
      if (document.hidden || !visibleRef.current) {
        frameRef.current = window.requestAnimationFrame(draw);
        return;
      }

      if (time - lastFrameTime < frameInterval) {
        frameRef.current = window.requestAnimationFrame(draw);
        return;
      }
      lastFrameTime = time;

      const width = canvas.clientWidth;
      const height = canvas.clientHeight;

      context.clearRect(0, 0, width, height);
      context.fillStyle = color;

      for (const particle of particlesRef.current) {
        particle.x += particle.vx;
        particle.y += particle.vy;

        if (particle.x < -5) particle.x = width + 5;
        if (particle.x > width + 5) particle.x = -5;
        if (particle.y < -5) particle.y = height + 5;
        if (particle.y > height + 5) particle.y = -5;

        context.globalAlpha = particle.alpha;
        context.beginPath();
        context.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        context.fill();
      }

      context.globalAlpha = 1;
      frameRef.current = window.requestAnimationFrame(draw);
    };

    resize();
    frameRef.current = window.requestAnimationFrame(draw);

    const observer = new ResizeObserver(resize);
    if (canvas.parentElement) observer.observe(canvas.parentElement);
    window.addEventListener('resize', resize);
    const visibilityObserver = new IntersectionObserver(
      ([entry]) => {
        visibleRef.current = Boolean(entry?.isIntersecting);
      },
      { threshold: 0.01 }
    );
    visibilityObserver.observe(canvas);

    return () => {
      if (frameRef.current) window.cancelAnimationFrame(frameRef.current);
      observer.disconnect();
      visibilityObserver.disconnect();
      window.removeEventListener('resize', resize);
    };
  }, [color, ease, quantity, refresh]);

  return <canvas ref={canvasRef} className={cn('pointer-events-none', className)} aria-hidden="true" />;
}
