import { useEffect, useRef } from 'react';
import { heroNetworkFlow } from './heroNetworkFlow';

type Node = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  baseVx: number;
  baseVy: number;
  r: number;
  hue: 'light' | 'deep';
};

type Pulse = {
  from: number;
  to: number;
  t: number;
  speed: number;
};

// Two nuances of blue only — no cyan, no violet.
const BLUE_LIGHT = '150, 200, 255';
const BLUE_DEEP = '70, 120, 220';
const CONNECT_RADIUS = 120;
const MOUSE_RADIUS = 170;

// How strongly a scroll tick pushes the network downward, and how quickly
// that push settles back to the ambient drift once scrolling stops.
const FLOW_IMPULSE = 0.02;
const FLOW_MAX = 5.5;
const FLOW_DECAY = 0.94;

// A brief, self-tapering surge of downward flow layered on top of the
// scroll-driven one, timed to the reveal itself — the network reads as a
// storm actively pouring into view as it materializes, rather than static
// dots that only start reacting to the *next* scroll tick after appearing.
const REVEAL_FLOW_BOOST = 2.2;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export default function NeuralNetworkCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const vignetteRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const vignette = vignetteRef.current;
    if (!canvas || !vignette) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let width = window.innerWidth;
    let height = window.innerHeight;
    let dpr = 1;
    let nodes: Node[] = [];
    let pulses: Pulse[] = [];
    let running = true;
    let animationFrame = 0;
    let lastPulseAt = 0;

    // Waterfall flow state: a scroll tick adds an impulse here, every frame
    // decays it back toward 0, and the current value is added to each
    // node's downward velocity — so the whole network visibly streams down
    // while the page scrolls, and settles back to its ambient drift at rest.
    let flowVy = 0;
    let revealSurge = 0;
    let lastScrollY = window.scrollY;

    // Mirrors heroNetworkFlow.reveal every frame — deliberately with no lag
    // of its own. That value is already eased (smoothstepped) at the source
    // in Home.tsx, in the same tick that sets the About cover's opacity to
    // its exact complement; adding a second, independent easing here would
    // let the two drift apart from each other during a real scroll (the
    // cover updates instantly, this would lag behind chasing its target),
    // opening a brief gap where neither is covering the seam.
    let displayedReveal = heroNetworkFlow.reveal;

    const mouse = { x: -9999, y: -9999 };

    const nodeCountFor = (w: number) => {
      if (w < 560) return 90;
      if (w < 1000) return 130;
      return 180;
    };

    const makeNodes = () => {
      const count = nodeCountFor(width);
      nodes = Array.from({ length: count }, () => {
        const baseVx = (Math.random() - 0.5) * 0.22;
        const baseVy = (Math.random() - 0.5) * 0.22;
        return {
          x: Math.random() * width,
          y: Math.random() * height,
          vx: baseVx,
          vy: baseVy,
          baseVx,
          baseVy,
          r: Math.random() * 1.8 + 1.3,
          hue: Math.random() < 0.78 ? 'light' : 'deep',
        };
      });
      pulses = [];
    };

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      makeNodes();
    };

    // Used only for the prefers-reduced-motion path below, which never runs
    // the hero's pin-progress logic (there's nothing pinned to sync with),
    // so it falls back to estimating reveal from About's own position.
    const getRevealProgressStatic = () => {
      const about = document.getElementById('about');
      if (!about) return 0;
      const rect = about.getBoundingClientRect();
      return clamp(1 - rect.top / (height * 0.9), 0, 1);
    };

    const maybeSpawnPulse = (now: number, edges: Array<[number, number, number]>) => {
      if (reducedMotion || edges.length === 0) return;
      if (now - lastPulseAt < 260) return;
      if (pulses.length > 26) return;
      if (Math.random() > 0.55) return;
      const [a, b] = edges[(Math.random() * edges.length) | 0];
      pulses.push({ from: a, to: b, t: 0, speed: 0.012 + Math.random() * 0.016 });
      lastPulseAt = now;
    };

    const step = (reveal: number) => {
      const speedScale = reducedMotion ? 0 : 0.55 + reveal * 0.9;

      // A brief surge that peaks mid-reveal and tapers to 0 by the time the
      // network is fully visible, so it arrives already pouring downward
      // instead of switching on static and only reacting to the next
      // scroll tick — then settles back to purely scroll-driven flow.
      revealSurge = REVEAL_FLOW_BOOST * 4 * reveal * (1 - reveal);

      for (const node of nodes) {
        if (!reducedMotion) {
          const dx = node.x - mouse.x;
          const dy = node.y - mouse.y;
          const dist = Math.hypot(dx, dy);
          if (dist < MOUSE_RADIUS && dist > 0.01) {
            const pull = (1 - dist / MOUSE_RADIUS) * 0.012;
            node.vx -= (dx / dist) * pull;
            node.vy -= (dy / dist) * pull;
          }
          node.vx += (node.baseVx - node.vx) * 0.02;
          node.vy += (node.baseVy - node.vy) * 0.02;

          node.x += node.vx * speedScale;
          node.y += (node.vy + flowVy + revealSurge) * speedScale;
        }

        if (node.x < -20) node.x = width + 20;
        if (node.x > width + 20) node.x = -20;
        if (node.y < -20) node.y = height + 20;
        if (node.y > height + 20) node.y = -20;
      }

      flowVy *= FLOW_DECAY;
      if (Math.abs(flowVy) < 0.01) flowVy = 0;
    };

    const draw = (now: number) => {
      if (!running) return;

      // Reduced motion never runs Home.tsx's pin-progress logic (nothing is
      // pinned to sync with), so it keeps estimating reveal from About's own
      // position instead of the shared, hero-driven value.
      displayedReveal = reducedMotion ? getRevealProgressStatic() : heroNetworkFlow.reveal;
      const reveal = displayedReveal < 0.001 ? 0 : displayedReveal;

      vignette.style.opacity = String(reveal);
      canvas.style.opacity = String(reveal);

      if (reveal <= 0.001) {
        ctx.clearRect(0, 0, width, height);
        animationFrame = requestAnimationFrame(draw);
        return;
      }

      step(reveal);
      ctx.clearRect(0, 0, width, height);

      const edges: Array<[number, number, number]> = [];

      for (let i = 0; i < nodes.length; i += 1) {
        for (let j = i + 1; j < nodes.length; j += 1) {
          const a = nodes[i];
          const b = nodes[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dist = Math.hypot(dx, dy);
          if (dist < CONNECT_RADIUS) {
            edges.push([i, j, dist]);
          }
        }
      }

      ctx.lineWidth = 1;
      for (const [i, j, dist] of edges) {
        const a = nodes[i];
        const b = nodes[j];
        const alpha = (1 - dist / CONNECT_RADIUS) * 0.5 * reveal;
        if (alpha <= 0.004) continue;
        const color = a.hue === b.hue ? a.hue : 'light';
        ctx.strokeStyle = `rgba(${color === 'light' ? BLUE_LIGHT : BLUE_DEEP}, ${alpha})`;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }

      maybeSpawnPulse(now, edges);

      pulses = pulses.filter(pulse => pulse.t < 1);
      for (const pulse of pulses) {
        pulse.t = Math.min(1, pulse.t + pulse.speed);
        const a = nodes[pulse.from];
        const b = nodes[pulse.to];
        if (!a || !b) continue;
        const x = a.x + (b.x - a.x) * pulse.t;
        const y = a.y + (b.y - a.y) * pulse.t;
        const fade = Math.sin(pulse.t * Math.PI);
        const glowR = 8;
        const glow = ctx.createRadialGradient(x, y, 0, x, y, glowR);
        glow.addColorStop(0, `rgba(235, 245, 255, ${0.9 * fade * reveal})`);
        glow.addColorStop(0.4, `rgba(${BLUE_LIGHT}, ${0.55 * fade * reveal})`);
        glow.addColorStop(1, `rgba(${BLUE_LIGHT}, 0)`);
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(x, y, glowR, 0, Math.PI * 2);
        ctx.fill();
      }

      // Waterfall streak: while the network is flowing (scroll-driven),
      // stretch each node's halo into the direction of motion instead of a
      // perfect circle, so fast-moving nodes read as falling light instead
      // of just drifting dots.
      const flowStrength = clamp(Math.abs(flowVy + revealSurge) / FLOW_MAX, 0, 1);

      for (const node of nodes) {
        const color = node.hue === 'light' ? BLUE_LIGHT : BLUE_DEEP;
        const haloR = node.r * 7;
        const stretch = 1 + flowStrength * 2.4;

        ctx.save();
        ctx.translate(node.x, node.y);
        if (stretch > 1.02) ctx.scale(1, stretch);
        const halo = ctx.createRadialGradient(0, 0, 0, 0, 0, haloR);
        halo.addColorStop(0, `rgba(${color}, ${0.4 * reveal})`);
        halo.addColorStop(1, `rgba(${color}, 0)`);
        ctx.fillStyle = halo;
        ctx.beginPath();
        ctx.arc(0, 0, haloR, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        ctx.fillStyle = `rgba(${color}, ${reveal})`;
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.r, 0, Math.PI * 2);
        ctx.fill();
      }

      if (!reducedMotion) {
        animationFrame = requestAnimationFrame(draw);
      }
    };

    const handleMouseMove = (event: MouseEvent) => {
      mouse.x = event.clientX;
      mouse.y = event.clientY;
    };

    const handleScroll = () => {
      const y = window.scrollY;
      const delta = y - lastScrollY;
      lastScrollY = y;
      if (reducedMotion) return;
      flowVy = clamp(flowVy + delta * FLOW_IMPULSE, -FLOW_MAX, FLOW_MAX);
    };

    const handleVisibility = () => {
      running = document.visibilityState === 'visible';
      if (running) {
        animationFrame = requestAnimationFrame(draw);
      } else {
        cancelAnimationFrame(animationFrame);
      }
    };

    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('scroll', handleScroll, { passive: true });
    document.addEventListener('visibilitychange', handleVisibility);

    if (reducedMotion) {
      draw(0);
      const onScroll = () => draw(0);
      window.addEventListener('scroll', onScroll, { passive: true });
      return () => {
        window.removeEventListener('resize', resize);
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('scroll', handleScroll);
        document.removeEventListener('visibilitychange', handleVisibility);
        window.removeEventListener('scroll', onScroll);
      };
    }

    animationFrame = requestAnimationFrame(draw);

    return () => {
      running = false;
      cancelAnimationFrame(animationFrame);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('scroll', handleScroll);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  return (
    <>
      <div className="underworld-vignette" ref={vignetteRef} aria-hidden="true" />
      <canvas id="info-network-canvas" ref={canvasRef} aria-hidden="true" />
    </>
  );
}
