import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import ScrollTrigger from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/**
 * Shared backdrop for the Sponsors + Schedule region: one keanClock.png
 * layer, full original color, drifts behind whatever sections are passed
 * as children. Desktop-only, scroll-scrubbed via GSAP ScrollTrigger (so it
 * only updates near/in the viewport); mobile and prefers-reduced-motion
 * get a static image.
 */
export default function KeanClockParallax({ children }: { children: React.ReactNode }) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const bgRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    const bg = bgRef.current;
    if (!wrapper || !bg) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isDesktop = window.matchMedia('(min-width: 901px)').matches;

    if (reducedMotion || !isDesktop) return;

    const tween = gsap.fromTo(
      bg,
      { yPercent: -2 },
      {
        yPercent: 2,
        ease: 'none',
        scrollTrigger: {
          trigger: wrapper,
          start: 'top bottom',
          end: 'bottom top',
          scrub: 0.4,
        },
      }
    );

    return () => {
      tween.scrollTrigger?.kill();
      tween.kill();
    };
  }, []);

  return (
    <div className="kean-clock-parallax" ref={wrapperRef}>
      <div className="kean-clock-parallax-bg" ref={bgRef} aria-hidden="true"></div>
      <div className="kean-clock-parallax-content">{children}</div>
    </div>
  );
}
