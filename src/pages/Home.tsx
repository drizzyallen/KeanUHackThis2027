import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import gsap from 'gsap';
import ScrollTrigger from 'gsap/ScrollTrigger';
import ScrollToPlugin from 'gsap/ScrollToPlugin';

gsap.registerPlugin(ScrollTrigger, ScrollToPlugin);

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const heroRef = useRef<HTMLElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const burgerRef = useRef<HTMLButtonElement>(null);
  const mobNavRef = useRef<HTMLElement>(null);

  useEffect(() => {
    /* ── Smooth nav anchor links ── */
    const anchors = document.querySelectorAll('a[href^="#"]');
    anchors.forEach(function(a) {
      a.addEventListener("click", function(e) {
        const targetId = a.getAttribute("href");
        if (!targetId || targetId === '#') return;
        const target = document.querySelector(targetId);
        if (!target) return;
        e.preventDefault();
        gsap.to(window, { duration: 1, scrollTo: { y: target, offsetY: 64 }, ease: "power3.inOut" });
        if (mobNavRef.current?.classList.contains("open")) {
          mobNavRef.current.classList.remove("open");
          burgerRef.current?.classList.remove("open");
        }
      });
    });

    /* ── Nav scroll state + auto-hide on scroll down ── */
    if (navRef.current) {
      ScrollTrigger.create({
        start: "top -60",
        onUpdate: function(self) { navRef.current?.classList.toggle("scrolled", self.progress > 0); }
      });
    }

    let lastY = 0;
    const heroH = window.innerHeight;
    const handleScroll = () => {
      const y = window.scrollY;
      if (y > heroH * 0.6) {
        navRef.current?.classList.toggle("nav-hidden", y > lastY);
      } else {
        navRef.current?.classList.remove("nav-hidden");
      }
      lastY = y;
    };
    window.addEventListener("scroll", handleScroll, { passive: true });

    /* ── Scroll progress bar ── */
    const bar = document.getElementById("progress-bar");
    if (bar) {
      ScrollTrigger.create({
        start: "top top",
        end: "bottom bottom",
        onUpdate: function(self) { bar.style.width = (self.progress * 100) + "%"; }
      });
    }

    /* ── Hero load-in ── */
    if (!window.matchMedia || !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const tl = gsap.timeline({ defaults: { ease: "power3.out" }, delay: 0.1 });
      tl.fromTo("#hero-logo-wrap", { opacity: 0, y: 40, scale: 0.96 }, { opacity: 1, y: 0, scale: 1, duration: 1.1 })
        .fromTo("#hero-eyebrow", { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.6 }, "-=0.7")
        .fromTo(["#hline1", "#hline2", "#hline3"], { opacity: 0, y: 32 }, { opacity: 1, y: 0, duration: 0.7, stagger: 0.1 }, "-=0.5")
        .fromTo("#hero-stats", { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.55 }, "-=0.35")
        .fromTo("#hero-cta", { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.55 }, "-=0.4")
        .fromTo(["#hero-scroll-hint", "#hero-status", ".hero-corner"], { opacity: 0 }, { opacity: 1, duration: 0.5, stagger: 0.06 }, "-=0.3");
    }

    /* ── Hero mouse parallax ── */
    let removeMouseListener = () => {};
    if (!window.matchMedia || !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const qLogoX = gsap.quickTo("#hero-logo-wrap", "x", { duration: 1.4, ease: "power2.out" });
      const qLogoY = gsap.quickTo("#hero-logo-wrap", "y", { duration: 1.4, ease: "power2.out" });
      const qCopyX = gsap.quickTo("#hero-copy-panel", "x", { duration: 1.8, ease: "power2.out" });
      const qCopyY = gsap.quickTo("#hero-copy-panel", "y", { duration: 1.8, ease: "power2.out" });
      
      const handleMouseMove = (e: MouseEvent) => {
        if (window.scrollY > window.innerHeight * 0.3) return;
        const rx = e.clientX / window.innerWidth - 0.5;
        const ry = e.clientY / window.innerHeight - 0.5;
        qLogoX(rx * 18); qLogoY(ry * 11);
        qCopyX(rx * -9); qCopyY(ry * -5);
      };
      const handleMouseLeave = () => {
        qLogoX(0); qLogoY(0); qCopyX(0); qCopyY(0);
      };
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseleave", handleMouseLeave);
      removeMouseListener = () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseleave", handleMouseLeave);
      };
    }

    /* ── Hero scroll parallax exit ── */
    gsap.to(".hero-inner", {
      y: -60, opacity: 0,
      ease: "none",
      scrollTrigger: { trigger: "#hero", start: "top top", end: "bottom top", scrub: 1.2 }
    });
    gsap.to("#hero-aurora", {
      yPercent: 30, opacity: 0,
      ease: "none",
      scrollTrigger: { trigger: "#hero", start: "top top", end: "bottom top", scrub: 1.8 }
    });

    /* ── Section headline parallax ── */
    gsap.utils.toArray(".parallax-headline").forEach(function(el: any) {
      gsap.to(el, {
        yPercent: -12, ease: "none",
        scrollTrigger: { trigger: el.closest("section"), start: "top bottom", end: "bottom top", scrub: 1.8 }
      });
    });

    /* ── Stagger reveal for .reveal elements ── */
    gsap.utils.toArray(".reveal").forEach(function(el: any, i: number) {
      gsap.fromTo(el, { opacity: 0, y: 48 }, {
        opacity: 1, y: 0, duration: 0.85, ease: "power3.out",
        scrollTrigger: { trigger: el, start: "top 88%", once: true },
        delay: (i % 4) * 0.08
      });
    });

    /* ── Tracks card stagger ── */
    gsap.utils.toArray(".track-card").forEach(function(card: any, i: number) {
      gsap.fromTo(card, { opacity: 0, y: 60 }, {
        opacity: 1, y: 0, duration: 0.9, ease: "power3.out", delay: i * 0.12,
        scrollTrigger: { trigger: ".tracks-grid", start: "top 80%", once: true }
      });
    });

    /* ── Schedule day stagger ── */
    gsap.utils.toArray(".schedule-day").forEach(function(day: any, i: number) {
      gsap.fromTo(day, { opacity: 0, y: 40 }, {
        opacity: 1, y: 0, duration: 0.85, ease: "power3.out", delay: i * 0.15,
        scrollTrigger: { trigger: ".schedule-days", start: "top 82%", once: true }
      });
    });

    /* ── About logo watermark parallax ── */
    gsap.to(".about-logo-watermark", {
      yPercent: 20, ease: "none",
      scrollTrigger: { trigger: "#about", start: "top bottom", end: "bottom top", scrub: 2 }
    });

    /* ── Particle field ── */
    let animationFrameId: number;
    let removeCanvasListeners = () => {};
    if (!window.matchMedia || !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext("2d");
        if (ctx) {
          let W = 0, H = 0, dpr = 1, pts: any[] = [], mx = -9999, my = -9999, t = 0;
          
          const seed = () => {
            const n = Math.max(80, Math.min(180, Math.floor(W * H / 9000)));
            pts = [];
            for (let i = 0; i < n; i++) {
              pts.push({
                x: Math.random() * W, y: Math.random() * H,
                vx: (Math.random() - 0.5) * 0.16, vy: (Math.random() - 0.5) * 0.16,
                r: Math.random() * 1.2 + 0.25, l: Math.random() * 0.6 + 0.3,
                ph: Math.random() * Math.PI * 2, type: Math.random() > 0.5 ? 0 : 1
              });
            }
          };

          const resize = () => {
            dpr = Math.min(2, window.devicePixelRatio || 1);
            W = window.innerWidth; H = window.innerHeight;
            canvas.width = Math.floor(W * dpr); canvas.height = Math.floor(H * dpr);
            canvas.style.width = W + "px"; canvas.style.height = H + "px";
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            seed();
          };

          const frame = () => {
            t += 0.006;
            ctx.clearRect(0, 0, W, H);
            const D = Math.min(160, Math.max(100, W * 0.09)), D2 = D * D;
            for (let i = 0; i < pts.length; i++) {
              const p = pts[i];
              const fx = mx - p.x, fy = my - p.y, fd = fx * fx + fy * fy;
              if (fd < 20000) { const f = (1 - fd / 20000) * 0.0005; p.vx += fx * f; p.vy += fy * f; }
              p.vx *= 0.993; p.vy *= 0.993;
              p.x += p.vx + Math.sin(t + p.ph) * 0.05;
              p.y += p.vy + Math.cos(t * 0.65 + p.ph) * 0.05;
              if (p.x < -10) p.x = W + 10; if (p.x > W + 10) p.x = -10;
              if (p.y < -10) p.y = H + 10; if (p.y > H + 10) p.y = -10;
              for (let j = i + 1; j < pts.length; j++) {
                const q = pts[j], dx = p.x - q.x, dy = p.y - q.y, d2 = dx * dx + dy * dy;
                if (d2 < D2) {
                  const k = 1 - Math.sqrt(d2) / D, a = k * k * 0.38 * Math.min(p.l, q.l);
                  ctx.strokeStyle = (p.type === q.type)
                    ? (p.type === 0 ? "rgba(48,96,200," + a + ")" : "rgba(217,194,122," + (a * 0.7) + ")")
                    : "rgba(140,165,220," + (a * 0.40) + ")";
                  ctx.lineWidth = 0.5;
                  ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke();
                }
              }
              const pulse = 0.5 + 0.5 * (0.5 + 0.5 * Math.sin(t * 1.2 + p.ph));
              ctx.fillStyle = p.type === 0
                ? "rgba(48,96,200," + (p.l * 0.90 * pulse) + ")"
                : "rgba(217,194,122," + (p.l * 0.75 * pulse) + ")";
              ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
            }
            animationFrameId = requestAnimationFrame(frame);
          };

          const mm = (e: MouseEvent) => { mx = e.clientX; my = e.clientY; };
          const ml = () => { mx = -9999; my = -9999; };
          
          window.addEventListener("resize", resize);
          window.addEventListener("mousemove", mm);
          window.addEventListener("mouseleave", ml);
          resize(); frame();
          
          removeCanvasListeners = () => {
            window.removeEventListener("resize", resize);
            window.removeEventListener("mousemove", mm);
            window.removeEventListener("mouseleave", ml);
            cancelAnimationFrame(animationFrameId);
          };
        }
      }
    }

    return () => {
      window.removeEventListener("scroll", handleScroll);
      removeMouseListener();
      removeCanvasListeners();
      ScrollTrigger.getAll().forEach(t => t.kill());
    };
  }, []);

  const toggleMenu = () => {
    burgerRef.current?.classList.toggle("open");
    mobNavRef.current?.classList.toggle("open");
  };

  const toggleFaq = (e: React.MouseEvent<HTMLButtonElement>) => {
    const btn = e.currentTarget;
    const item = btn.closest(".faq-item");
    if (!item) return;
    const answer = item.querySelector(".faq-answer") as HTMLElement;
    const isOpen = item.classList.contains("open");

    // Close all
    document.querySelectorAll(".faq-item.open").forEach(function(openItem) {
      openItem.classList.remove("open");
      gsap.to(openItem.querySelector(".faq-answer"), { height: 0, duration: 0.35, ease: "power2.inOut" });
    });

    // Open clicked if it was closed
    if (!isOpen) {
      item.classList.add("open");
      gsap.set(answer, { height: "auto" });
      const h = answer.offsetHeight;
      gsap.fromTo(answer, { height: 0 }, { height: h, duration: 0.4, ease: "power2.out" });
    }
  };

  return (
    <>
      <div id="progress-bar"></div>

      <nav className="site-nav" id="site-nav" ref={navRef}>
        <a className="nav-logo" href="#hero">
          <img src="/uploads/hackathon_logo2026.png" alt="KeanUHackThis logo" />
          <span className="nav-logo-text">KeanUHackThis</span>
        </a>
        <ul className="nav-links">
          <li><a href="#about">About</a></li>
          <li><a href="#tracks">Tracks</a></li>
          <li><a href="#schedule">Schedule</a></li>
          <li><a href="#prizes">Prizes</a></li>
          <li><a href="#sponsors">Sponsors</a></li>
          <li><a href="#faq">FAQ</a></li>
        </ul>
        <Link to="/register" className="nav-cta" id="nav-cta">Register Now</Link>
        <button className="nav-burger" id="nav-burger" aria-label="Menu" ref={burgerRef} onClick={toggleMenu}>
          <span></span><span></span><span></span>
        </button>
      </nav>

      <nav className="nav-mobile" id="nav-mobile" ref={mobNavRef}>
        <a href="#about" onClick={toggleMenu}>About</a>
        <a href="#tracks" onClick={toggleMenu}>Tracks</a>
        <a href="#schedule" onClick={toggleMenu}>Schedule</a>
        <a href="#prizes" onClick={toggleMenu}>Prizes</a>
        <a href="#sponsors" onClick={toggleMenu}>Sponsors</a>
        <a href="#faq" onClick={toggleMenu}>FAQ</a>
        <Link to="/register" className="btn-primary" id="mobile-nav-cta" style={{ textAlign: 'center', justifyContent: 'center' }} onClick={toggleMenu}>Register Now</Link>
      </nav>

      <div className="marquee-strip">
        <div className="marquee-inner">
          <span className="marquee-item">BUILD IRL <span className="sep">&#10022;</span></span>
          <span className="marquee-item">24 HRS <span className="sep">&#10022;</span></span>
          <span className="marquee-item">TBD IN PRIZES <span className="sep">&#10022;</span></span>
          <span className="marquee-item">TBD BUILDERS <span className="sep">&#10022;</span></span>
          <span className="marquee-item">FREE FOOD <span className="sep">&#10022;</span></span>
          <span className="marquee-item">KEAN UNIVERSITY, NJ <span className="sep">&#10022;</span></span>
          <span className="marquee-item">SPRING 2027 <span className="sep">&#10022;</span></span>
          <span className="marquee-item">ALL MAJORS WELCOME <span className="sep">&#10022;</span></span>
          <span className="marquee-item">BUILD IRL <span className="sep">&#10022;</span></span>
          <span className="marquee-item">24 HRS <span className="sep">&#10022;</span></span>
          <span className="marquee-item">TBD IN PRIZES <span className="sep">&#10022;</span></span>
          <span className="marquee-item">TBD BUILDERS <span className="sep">&#10022;</span></span>
          <span className="marquee-item">FREE FOOD <span className="sep">&#10022;</span></span>
          <span className="marquee-item">KEAN UNIVERSITY, NJ <span className="sep">&#10022;</span></span>
          <span className="marquee-item">SPRING 2027 <span className="sep">&#10022;</span></span>
          <span className="marquee-item">ALL MAJORS WELCOME <span className="sep">&#10022;</span></span>
        </div>
      </div>

      <section id="hero" ref={heroRef}>
        <div className="hero-bg-grid"></div>
        <div className="hero-bg-aurora" id="hero-aurora"></div>
        <canvas id="hero-canvas" ref={canvasRef}></canvas>

        <div className="hero-corner tl"></div>
        <div className="hero-corner tr"></div>
        <div className="hero-corner bl"></div>
        <div className="hero-corner br"></div>

        <div className="hero-status" id="hero-status">Kean University &mdash; NJ &mdash; Spring&nbsp;2027</div>

        <div className="hero-inner">
          <div className="hero-logo-panel" id="hero-logo-panel">
            <div className="hero-logo-wrap" id="hero-logo-wrap">
              <img src="/uploads/hackathon_logo2026.png" alt="KeanUHackThis Cougar" />
            </div>
          </div>

          <div className="hero-copy-panel" id="hero-copy-panel">
            <p className="hero-eyebrow" id="hero-eyebrow">KeanUHackThis &mdash; Spring 2027</p>

            <h1 className="hero-display">
              <span className="h-line h-line-1" id="hline1">HACK</span>
              <span className="h-line h-line-2" id="hline2">THE</span>
              <span className="h-line h-line-3" id="hline3">FUTURE.</span>
            </h1>

            <div className="hero-stats" id="hero-stats">
              <span className="stat-chip"><span className="stat-chip-val">TBD</span>&nbsp;in prizes</span>
              <span className="stat-chip"><span className="stat-chip-val">24</span>&nbsp;hours</span>
              <span className="stat-chip"><span className="stat-chip-val">TBD</span>&nbsp;builders</span>
              <span className="stat-chip"><span className="stat-chip-val">FREE</span>&nbsp;to enter</span>
            </div>

            <div className="hero-cta" id="hero-cta">
              <Link to="/register" className="btn-primary">Register Now &rarr;</Link>
              <a href="mailto:acmkeanchapter@kean.edu" className="btn-ghost">Sponsor Us</a>
            </div>
          </div>
        </div>

        <div className="hero-scroll-hint" id="hero-scroll-hint">Scroll to explore</div>
      </section>

      <section id="about" className="section section-alt">
        <img className="about-logo-watermark" src="/uploads/hackathon_logo2026.png" alt="" aria-hidden="true" />

        <div className="section-label mono">
          <span>01 / About</span>
        </div>

        <h2 className="headline parallax-headline">
          Where builders<br/>ship <em>real things.</em>
        </h2>

        <div className="about-grid">
          <div className="about-stats">
            <div className="stat-block reveal">
              <div className="stat-num"><sup>$</sup><span className="counter" data-target="0">TBD</span></div>
              <div className="stat-label">Entry cost &mdash; completely free</div>
            </div>
            <div className="stat-block reveal">
              <div className="stat-num"><span className="counter-plain">48</span></div>
              <div className="stat-label">Hours straight &mdash; no breaks required</div>
            </div>
            <div className="stat-block reveal">
              <div className="stat-num"><span className="counter-plain">400</span><sup>+</sup></div>
              <div className="stat-label">Builders expected &mdash; every major welcome</div>
            </div>
          </div>

          <div className="about-text">
            <p className="reveal">
              <strong>KeanUHackThis</strong> is Kean University&rsquo;s flagship hackathon &mdash;
              a 48-hour overnight sprint where students from every major and skill level come
              together to build something real. No prior experience required.
            </p>
            <p className="reveal">
              You&rsquo;ll have access to <strong>mentors from industry</strong>, dedicated
              workshop sessions, free food around the clock, and a community of builders
              who are here to make something that matters.
            </p>
            <p className="reveal">
              Whether you&rsquo;re writing your first line of code or shipping your tenth
              side project, KeanUHackThis is where you prove what you can build
              in <strong>48 hours</strong>.
            </p>
            <div className="reveal" style={{ marginTop: '8px' }}>
              <Link to="/register" className="btn-primary" style={{ display: 'inline-flex' }}>
                Register Now &rarr;
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section id="tracks" className="section">
        <div className="section-label mono"><span>02 / Tracks</span></div>
        <h2 className="headline parallax-headline">Pick your<br/><em>battleground.</em></h2>

        <div className="tracks-grid">
          <div className="track-card reveal">
            <div className="track-icon">&#129302;</div>
            <div className="track-num">Track 01</div>
            <div className="track-name">AI &amp; Intelligence</div>
            <p className="track-desc">
              Build with language models, computer vision, data pipelines,
              or inference engines. Make machines understand the world better.
            </p>
            <div className="track-tags">
              <span className="track-tag">LLMs</span>
              <span className="track-tag">Computer Vision</span>
              <span className="track-tag">Data</span>
              <span className="track-tag">ML</span>
            </div>
          </div>

          <div className="track-card reveal">
            <div className="track-icon">&#127961;</div>
            <div className="track-num">Track 02</div>
            <div className="track-name">Civic &amp; Social Impact</div>
            <p className="track-desc">
              Technology for the community. Accessibility, equity, local
              government, public health &mdash; ship something that helps people.
            </p>
            <div className="track-tags">
              <span className="track-tag">Accessibility</span>
              <span className="track-tag">Community</span>
              <span className="track-tag">Equity</span>
            </div>
          </div>

          <div className="track-card reveal">
            <div className="track-icon">&#9889;</div>
            <div className="track-num">Track 03</div>
            <div className="track-name">Hardware &amp; Embedded</div>
            <p className="track-desc">
              Robots, IoT sensors, wearables, physical installations.
              If it has wires and ambition, it belongs here.
            </p>
            <div className="track-tags">
              <span className="track-tag">Robotics</span>
              <span className="track-tag">IoT</span>
              <span className="track-tag">Arduino</span>
              <span className="track-tag">Pi</span>
            </div>
          </div>

          <div className="track-card reveal">
            <div className="track-icon">&#127775;</div>
            <div className="track-num">Track 04</div>
            <div className="track-name">Open Innovation</div>
            <p className="track-desc">
              No constraints. Your idea, your rules, your execution.
              The wildcard track rewards originality above all else.
            </p>
            <div className="track-tags">
              <span className="track-tag">Wildcard</span>
              <span className="track-tag">Creative</span>
              <span className="track-tag">Anything</span>
            </div>
          </div>
        </div>
      </section>

      <section id="schedule" className="section section-alt">
        <div className="section-label mono"><span>03 / Schedule</span></div>
        <h2 className="headline parallax-headline">The 48-hour<br/><em>playbook.</em></h2>

        <div className="schedule-days">
          <div className="schedule-day reveal">
            <div className="day-label mono">Day 01</div>
            <div className="day-name">Friday</div>
            <div className="schedule-events">
              <div className="schedule-event">
                <span className="event-time">5 PM</span>
                <span className="event-dot"></span>
                <div className="event-info">
                  <div className="event-title">Check-in &amp; Registration</div>
                  <div className="event-note">Pick up your badge, find your team</div>
                </div>
              </div>
              <div className="schedule-event">
                <span className="event-time">7 PM</span>
                <span className="event-dot"></span>
                <div className="event-info">
                  <div className="event-title">Opening Ceremony</div>
                  <div className="event-note">Sponsors, prizes, track briefings</div>
                  <span className="event-badge">All hands</span>
                </div>
              </div>
              <div className="schedule-event">
                <span className="event-time">9 PM</span>
                <span className="event-dot"></span>
                <div className="event-info">
                  <div className="event-title">Hacking Begins</div>
                  <div className="event-note">Clock starts. Build something real.</div>
                  <span className="event-badge">T&ndash;0</span>
                </div>
              </div>
              <div className="schedule-event">
                <span className="event-time">12 AM</span>
                <span className="event-dot"></span>
                <div className="event-info">
                  <div className="event-title">Midnight Fuel</div>
                  <div className="event-note">Food, coffee, and a second wind</div>
                </div>
              </div>
            </div>
          </div>

          <div className="schedule-day reveal">
            <div className="day-label mono">Day 02</div>
            <div className="day-name">Saturday</div>
            <div className="schedule-events">
              <div className="schedule-event">
                <span className="event-time">9 AM</span>
                <span className="event-dot"></span>
                <div className="event-info">
                  <div className="event-title">Morning Check-in</div>
                  <div className="event-note">Breakfast + mentor office hours open</div>
                </div>
              </div>
              <div className="schedule-event">
                <span className="event-time">1 PM</span>
                <span className="event-dot"></span>
                <div className="event-info">
                  <div className="event-title">Midpoint Checkpoint</div>
                  <div className="event-note">Optional progress share with mentors</div>
                </div>
              </div>
              <div className="schedule-event">
                <span className="event-time">All day</span>
                <span className="event-dot"></span>
                <div className="event-info">
                  <div className="event-title">Workshop Sessions</div>
                  <div className="event-note">API deep-dives, design sprints, pitching</div>
                  <span className="event-badge">Optional</span>
                </div>
              </div>
              <div className="schedule-event">
                <span className="event-time">11 PM</span>
                <span className="event-dot"></span>
                <div className="event-info">
                  <div className="event-title">Night Fuel Round 2</div>
                  <div className="event-note">Keep going. You&rsquo;ve got this.</div>
                </div>
              </div>
            </div>
          </div>

          <div className="schedule-day reveal">
            <div className="day-label mono">Day 03</div>
            <div className="day-name">Sunday</div>
            <div className="schedule-events">
              <div className="schedule-event">
                <span className="event-time">9 AM</span>
                <span className="event-dot"></span>
                <div className="event-info">
                  <div className="event-title">Code Freeze</div>
                  <div className="event-note">Submit your project on Devpost</div>
                  <span className="event-badge">Deadline</span>
                </div>
              </div>
              <div className="schedule-event">
                <span className="event-time">10 AM</span>
                <span className="event-dot"></span>
                <div className="event-info">
                  <div className="event-title">Demo Setup</div>
                  <div className="event-note">Set up your table and presentation</div>
                </div>
              </div>
              <div className="schedule-event">
                <span className="event-time">11 AM</span>
                <span className="event-dot"></span>
                <div className="event-info">
                  <div className="event-title">Judging</div>
                  <div className="event-note">Judges circulate &mdash; demo your build</div>
                  <span className="event-badge">All tracks</span>
                </div>
              </div>
              <div className="schedule-event">
                <span className="event-time">2 PM</span>
                <span className="event-dot"></span>
                <div className="event-info">
                  <div className="event-title">Awards Ceremony</div>
                  <div className="event-note">Winners, prizes, and what comes next</div>
                  <span className="event-badge">Finale</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        <p className="schedule-note mono">// All times in Eastern. Schedule subject to change.</p>
      </section>

      <section id="prizes" className="section">
        <div className="prizes-header">
          <div>
            <div className="section-label mono"><span>04 / Prizes</span></div>
            <h2 className="headline parallax-headline">
              Cash, hardware,<br/>and <em>bragging rights.</em>
            </h2>
          </div>
          <div className="prizes-note mono">
            Prize pool<br/>TBD &mdash; 2027
          </div>
        </div>

        <div className="prizes-grid reveal">
          <div className="prize-grand">
            <div className="prize-grand-left">
              <div className="prize-label-tag">Grand Prize</div>
              <div className="prize-amount"><sup>$</sup>TBD</div>
              <div className="prize-title">Best in Show</div>
            </div>
            <div className="prize-grand-right">
              <ul className="prize-perks">
                <li>Cash split across the team</li>
                <li>Fast-track sponsor interviews</li>
                <li>Featured in Kean University press</li>
                <li>The Trophy (it is heavy)</li>
              </ul>
            </div>
          </div>

          <div className="prize-card reveal">
            <div className="prize-label-tag" style={{ color: 'var(--muted)' }}>Runner-Up</div>
            <div className="prize-card-amount"><sup>$</sup>TBD</div>
            <div className="prize-card-title">Second Place</div>
            <ul className="prize-card-perks">
              <li>Cash split per teammate</li>
              <li>Hardware bundle</li>
              <li>Sponsor swag stack</li>
            </ul>
          </div>

          <div className="prize-card reveal">
            <div className="prize-label-tag" style={{ color: 'var(--muted)' }}>Third Place</div>
            <div className="prize-card-amount"><sup>$</sup>TBD</div>
            <div className="prize-card-title">Third Place</div>
            <ul className="prize-card-perks">
              <li>Cash split per teammate</li>
              <li>Mechanical keyboards</li>
            </ul>
          </div>

          <div className="prize-card reveal">
            <div className="prize-label-tag" style={{ color: 'var(--muted)' }}>Track Winners &middot; 4&times;</div>
            <div className="prize-card-amount"><sup>$</sup>TBD <span style={{ fontSize: '0.45em', fontStyle: 'normal', color: 'var(--dim)' }}>each</span></div>
            <div className="prize-card-title">Best in Track</div>
            <ul className="prize-card-perks">
              <li>One winner per track</li>
              <li>Sponsor mentorship slot</li>
              <li>Track trophy</li>
            </ul>
          </div>
        </div>

        <div className="prize-side-grid reveal">
          <div className="prize-side-card">
            <div className="prize-side-label">First-Time Hackers</div>
            <div className="prize-side-title">Beginner Pool</div>
            <ul className="prize-side-perks">
              <li>Prize for top first-timer team</li>
              <li>Dedicated mentor track</li>
              <li>You can do this. Promise.</li>
            </ul>
          </div>

          <div className="prize-side-card">
            <div className="prize-side-label">&#9733; Side Quests</div>
            <div className="prize-side-title">Mini-Prizes</div>
            <ul className="prize-side-perks">
              <li>Best use of an LLM</li>
              <li>Most stubbornly analog</li>
              <li>Best 1-hour speedrun</li>
              <li>&ldquo;Why did you make this&rdquo; award</li>
            </ul>
          </div>
        </div>
      </section>

      <section id="sponsors" className="section section-alt">
        <div className="sponsors-intro">
          <div>
            <div className="section-label mono"><span>05 / Sponsors</span></div>
            <h2 className="headline parallax-headline">
              Powered by people<br/>who <em>believe in builders.</em>
            </h2>
          </div>
          <div className="sponsors-cta-block">
            <a href="mailto:acmkeanchapter@kean.edu" className="btn-primary reveal">
              Become a Sponsor &rarr;
            </a>
          </div>
        </div>

        <div className="sponsors-grid reveal">
          <div className="sponsor-slot"><span className="sponsor-slot-inner">Your logo</span></div>
          <div className="sponsor-slot"><span className="sponsor-slot-inner">Your logo</span></div>
          <div className="sponsor-slot"><span className="sponsor-slot-inner">Your logo</span></div>
          <div className="sponsor-slot"><span className="sponsor-slot-inner">Your logo</span></div>
          <div className="sponsor-slot"><span className="sponsor-slot-inner">Your logo</span></div>
          <div className="sponsor-slot"><span className="sponsor-slot-inner">Your logo</span></div>
        </div>

        <div className="sponsor-cta-bar reveal">
          <div className="sponsor-cta-text">
            <h3>Want your logo here?</h3>
            <p>We&rsquo;d love to introduce you to 400+ of NJ&rsquo;s most driven builders.</p>
          </div>
          <a href="mailto:acmkeanchapter@kean.edu" className="btn-primary">Sponsor packet &rarr;</a>
        </div>
      </section>

      <section id="faq" className="section">
        <div className="section-label mono"><span>06 / FAQ</span></div>
        <h2 className="headline parallax-headline">Got <em>questions?</em></h2>

        <div className="faq-list">
          <div className="faq-item">
            <button className="faq-question" onClick={toggleFaq}>
              Who can participate?
              <span className="faq-icon">+</span>
            </button>
            <div className="faq-answer">
              <div className="faq-answer-inner">
                Any currently enrolled undergraduate or graduate student aged 18+ can participate. All majors, all skill levels &mdash; from first-time coders to seasoned engineers. Everyone who attends must register individually.
              </div>
            </div>
          </div>

          <div className="faq-item">
            <button className="faq-question" onClick={toggleFaq}>
              Do I need to have a team?
              <span className="faq-icon">+</span>
            </button>
            <div className="faq-answer">
              <div className="faq-answer-inner">
                No &mdash; you can come solo and form a team at the event during the team-building session. Teams can have up to 4 members. Solo submissions are also accepted.
              </div>
            </div>
          </div>

          <div className="faq-item">
            <button className="faq-question" onClick={toggleFaq}>
              How much does it cost to participate?
              <span className="faq-icon">+</span>
            </button>
            <div className="faq-answer">
              <div className="faq-answer-inner">
                Absolutely nothing. KeanUHackThis is completely free to attend. That includes food, snacks, coffee, and access to all workshops and mentorship sessions throughout the 48 hours.
              </div>
            </div>
          </div>

          <div className="faq-item">
            <button className="faq-question" onClick={toggleFaq}>
              What should I bring?
              <span className="faq-icon">+</span>
            </button>
            <div className="faq-answer">
              <div className="faq-answer-inner">
                Your laptop and chargers, a valid student ID, any hardware or components you want to work with, a sleeping bag or blanket if you plan to stay overnight, and your best ideas. We&rsquo;ll handle the rest.
              </div>
            </div>
          </div>

          <div className="faq-item">
            <button className="faq-question" onClick={toggleFaq}>
              Do I need to be a CS or engineering major?
              <span className="faq-icon">+</span>
            </button>
            <div className="faq-answer">
              <div className="faq-answer-inner">
                Not at all. Some of the best projects come from designers, business majors, artists, and social science students who bring a fresh perspective. Diversity of thought is what makes hackathons great.
              </div>
            </div>
          </div>

          <div className="faq-item">
            <button className="faq-question" onClick={toggleFaq}>
              Where is it held?
              <span className="faq-icon">+</span>
            </button>
            <div className="faq-answer">
              <div className="faq-answer-inner">
                KeanUHackThis 2027 will be held in the STEM Building at Kean University in Union, New Jersey. Exact room details will be shared with registered participants closer to the event.
              </div>
            </div>
          </div>

          <div className="faq-item">
            <button className="faq-question" onClick={toggleFaq}>
              What can I build?
              <span className="faq-icon">+</span>
            </button>
            <div className="faq-answer">
              <div className="faq-answer-inner">
                Any software, hardware, or hybrid project that fits one of the four tracks (or the Open Innovation wildcard). Projects must be started at the event &mdash; no prior work. You can use open source libraries, APIs, and existing frameworks.
              </div>
            </div>
          </div>

          <div className="faq-item">
            <button className="faq-question" onClick={toggleFaq}>
              Will there be mentors and workshops?
              <span className="faq-icon">+</span>
            </button>
            <div className="faq-answer">
              <div className="faq-answer-inner">
                Yes. Industry mentors will be on-site throughout the weekend for office hours and drop-in help. Optional workshop sessions on topics like API integration, ML basics, hardware prototyping, and pitching will also run during the event.
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="site-footer">
        <div className="footer-top">
          <div className="footer-brand">
            <div className="footer-logo">
              <img src="/uploads/hackathon_logo2026.png" alt="KeanUHackThis" />
              <span className="footer-logo-text">KeanUHackThis</span>
            </div>
            <p className="footer-tagline">
              Kean University&rsquo;s flagship hackathon.<br/>
              48 hours. Every major. Build something real.
            </p>
          </div>

          <div className="footer-links-group">
            <div className="footer-link-col">
              <span className="footer-link-head">Navigate</span>
              <a href="#about">About</a>
              <a href="#tracks">Tracks</a>
              <a href="#schedule">Schedule</a>
              <a href="#prizes">Prizes</a>
              <a href="#sponsors">Sponsors</a>
              <a href="#faq">FAQ</a>
            </div>
            <div className="footer-link-col">
              <span className="footer-link-head">Contact</span>
              <a href="mailto:acmkeanchapter@kean.edu">acmkeanchapter@kean.edu</a>
              <a href="https://www.kean.edu/" target="_blank" rel="noopener noreferrer">Kean University</a>
              <Link to="/register">Register Now</Link>
              <a href="mailto:acmkeanchapter@kean.edu">Sponsor Packet</a>
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <span className="footer-copy mono">&copy; 2027 KeanUHackThis &middot; Kean University, Union NJ</span>
          <div className="footer-socials">
            <a href="https://www.instagram.com/keanuniversity/" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/>
                <circle cx="17.5" cy="6.5" r="0.8" fill="currentColor" stroke="none"/>
              </svg>
            </a>
            <a href="https://x.com/KeanUniversity" target="_blank" rel="noopener noreferrer" aria-label="X">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg>
            </a>
            <a href="https://www.linkedin.com/school/kean-university/" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                <path d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6zM2 9h4v12H2z"/>
                <circle cx="4" cy="4" r="2"/>
              </svg>
            </a>
          </div>
        </div>
      </footer>
    </>
  );
}
