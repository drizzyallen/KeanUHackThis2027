import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import gsap from 'gsap';
import ScrollTrigger from 'gsap/ScrollTrigger';
import ScrollToPlugin from 'gsap/ScrollToPlugin';
import NeuralNetworkCanvas from '../components/NeuralNetworkCanvas';
import { heroNetworkFlow } from '../components/heroNetworkFlow';

gsap.registerPlugin(ScrollTrigger, ScrollToPlugin);

// Eases 0-1 into a gentle S-curve instead of a linear ramp, so both the
// opaque "About" cover fading out and the neural network fading in feel
// like a smooth materialization rather than a linear wipe.
const smoothstep = (t: number) => t * t * (3 - 2 * t);

// Fraction of the hero's pin progress where the About cover / network
// crossfade begins (finishes at 1, when the pin fully releases). Kept well
// past the point where the hero can still be visible behind About (verified
// empirically), so widening this only makes the reveal more gradual — it
// can't reopen the sky-gap the cover exists to prevent.
const REVEAL_START = 0.72;

export default function Home() {
  const navRef = useRef<HTMLElement>(null);
  const burgerRef = useRef<HTMLButtonElement>(null);
  const mobNavRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const anchors = document.querySelectorAll('a[href^="#"]');
    const anchorCleanups: Array<() => void> = [];

    anchors.forEach(anchor => {
      const handleClick = (event: Event) => {
        const targetId = anchor.getAttribute("href");
        if (!targetId || targetId === "#") return;

        const target = document.querySelector(targetId);
        if (!target) return;

        event.preventDefault();
        gsap.to(window, {
          duration: 1.2,
          scrollTo: { y: target, autoKill: false },
          ease: "power2.inOut",
        });
        mobNavRef.current?.classList.remove("open");
        burgerRef.current?.classList.remove("open");
      };

      anchor.addEventListener("click", handleClick);
      anchorCleanups.push(() => anchor.removeEventListener("click", handleClick));
    });

    ScrollTrigger.create({
      start: "top -20",
      onUpdate: self => navRef.current?.classList.toggle("scrolled", self.progress > 0),
    });

    const progressBar = document.getElementById("progress-bar");
    if (progressBar) {
      ScrollTrigger.create({
        start: "top top",
        end: "bottom bottom",
        onUpdate: self => {
          progressBar.style.width = `${self.progress * 100}%`;
        },
      });
    }

    let removeResizeListener: (() => void) | undefined;

    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const sceneEl = document.querySelector(".glab-transition") as HTMLElement | null;
      const buildingWrap = document.querySelector(".glab-building-wrap") as HTMLElement | null;
      const aboutEl = document.getElementById("about");

      gsap.set(".glab-title-wrap", { xPercent: -50, left: "50%", y: 0, opacity: 1 });

      if (sceneEl && buildingWrap && aboutEl) {
        gsap.set(buildingWrap, { xPercent: -50, y: 0 });
        gsap.set(aboutEl, { y: 0 });

        // Building and About are kept in contact by measuring the building's
        // real, current edge every frame (not a cached value) and deriving
        // About's pull from it — they can never drift apart, in the pinned
        // phase or in the natural scroll that follows it.
        const OVERLAP = 3; // px — small overlap so no subpixel seam can appear
        let buildingRestBottom = 0; // building's resting bottom edge (viewport-relative)
        let buildingRestOffset = 0; // downward rest offset, so the building starts clear of the title
        let aboutRestTop = 0; // About's natural top in document coordinates (transform-independent)

        const measure = () => {
          gsap.set(buildingWrap, { y: 0 });
          gsap.set(aboutEl, { y: 0 });
          const rect = buildingWrap.getBoundingClientRect();
          buildingRestBottom = rect.bottom;
          // The building renders tall enough to spill above the viewport at rest;
          // resting it partway down (28% of its own height, tucked below the fold)
          // keeps the hero title clear until the reveal lifts it back into frame.
          buildingRestOffset = rect.height * 0.28;
          aboutRestTop = aboutEl.getBoundingClientRect().top + window.scrollY;
        };

        measure();

        // The scene's own height already reserves exactly the scroll distance
        // needed for About's natural top to reach the viewport top at progress 1
        // (the moment the pin releases). The building rises from its resting
        // offset, peaks with a prominent lift, and settles back to 0 across that
        // same span — so it never leaves a residual offset behind.
        const peakLiftFor = () => buildingRestBottom * 0.55;

        const applyForProgress = (p: number) => {
          const buildingY = buildingRestOffset * (1 - p) - Math.sin(Math.PI * p) * peakLiftFor();
          gsap.set(buildingWrap, { y: buildingY });

          const buildingBottomNow = buildingWrap.getBoundingClientRect().bottom;
          const aboutTopNatural = aboutRestTop - window.scrollY;
          const aboutY = Math.min(0, buildingBottomNow - OVERLAP - aboutTopNatural);
          gsap.set(aboutEl, { y: aboutY });

          // While the hero is still pinned (p < 1) About's box can still overlap
          // the opaque sky behind it, so its own translucent background isn't
          // dark enough to hide that sky — driving an opaque cover from the
          // real pin progress (rather than a guessed vh distance) keeps it
          // solid for exactly as long as the sky can still be underneath it,
          // then eases open right as the hero finishes releasing. The neural
          // network's own fade-in shares this exact window (just inverted),
          // so the cover dissolving and the network materializing read as one
          // continuous crossfade instead of a cover-drops-then-network-pops-in
          // sequence.
          const revealT = smoothstep(Math.min(1, Math.max(0, (p - REVEAL_START) / (1 - REVEAL_START))));
          aboutEl.style.setProperty("--about-solid", String(1 - revealT));
          heroNetworkFlow.reveal = revealT;
        };

        // Apply the resting (progress-0) frame immediately, since ScrollTrigger's
        // onUpdate only fires on an actual scroll/refresh tick — without this the
        // building would render flush (uncovering nothing) until the first scroll.
        applyForProgress(0);

        // A plain `let` guard (rather than referencing the const below) avoids a
        // TDZ crash in the unlikely case ScrollTrigger invokes onRefresh synchronously
        // from within create(), before that const binding has been assigned.
        // eslint-disable-next-line prefer-const
        let scrollSyncRef: ScrollTrigger | undefined;
        const scrollSync = ScrollTrigger.create({
          trigger: sceneEl,
          start: "top top",
          end: "bottom top",
          invalidateOnRefresh: true,
          onRefresh: () => {
            measure();
            applyForProgress(scrollSyncRef?.progress ?? 0);
          },
          onUpdate: self => applyForProgress(self.progress),
        });
        scrollSyncRef = scrollSync;

        // Sky, clouds, and title drift on the same scroll range, but as an
        // independent decorative timeline — none of them gate the building/About seam above.
        const skyTl = gsap.timeline({
          scrollTrigger: {
            trigger: sceneEl,
            start: "top top",
            end: "bottom top",
            scrub: 0.4,
            invalidateOnRefresh: true,
          },
        });
        skyTl
          .to(".glab-sky", { yPercent: 14, ease: "none" }, 0)
          .to(".cloud-1", { x: -140, y: -45, ease: "none" }, 0)
          .to(".cloud-2", { x: 170, y: -70, ease: "none" }, 0)
          .to(".cloud-3", { x: -95, y: -35, ease: "none" }, 0)
          .to(".cloud-4", { x: 60, y: -90, ease: "none" }, 0)
          .to(".glab-sparkles", { y: -60, opacity: 0, ease: "power1.in" }, 0)
          .to(".glab-title-wrap", { y: "-8vh", opacity: 0, ease: "power2.in", duration: 0.3 }, 0)
          .to(".home-hero-actions", { y: 24, opacity: 0, ease: "power2.in", duration: 0.22 }, 0);

        // Re-measure and re-sync to the current scroll position together, so a
        // resize (or orientation change) never leaves a stale frame on screen.
        const handleResize = () => scrollSync?.refresh();
        window.addEventListener("resize", handleResize);
        removeResizeListener = () => window.removeEventListener("resize", handleResize);
      }

      // Entrance fade-in for title and buttons on initial page load
      gsap.fromTo(
        ".glab-title-wrap",
        { opacity: 0, y: 0 },
        { opacity: 1, y: 0, duration: 0.8, ease: "power2.out" }
      );
      gsap.fromTo(
        ".home-hero-actions",
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.8, ease: "power2.out", delay: 0.15 }
      );
    }

    // Refresh ScrollTrigger when building image finishes loading
    const buildingImg = document.querySelector(".glab-building") as HTMLImageElement;
    if (buildingImg) {
      if (buildingImg.complete) {
        ScrollTrigger.refresh();
      } else {
        buildingImg.addEventListener("load", () => ScrollTrigger.refresh());
      }
    }

    // Interactive ambient mouse parallax for clouds.
    const handleMouseMove = (e: MouseEvent) => {
      if (window.innerWidth < 900) return;
      const xNorm = (e.clientX / window.innerWidth - 0.5) * 2;
      const yNorm = (e.clientY / window.innerHeight - 0.5) * 2;

      gsap.to(".glab-clouds", { x: xNorm * 30, y: yNorm * 15, duration: 1.5, ease: "power2.out", overwrite: "auto" });
    };

    window.addEventListener("mousemove", handleMouseMove);

    // Mouse-tracking spotlight border for glass cards — one delegated listener
    // updates CSS custom properties on whichever card is under the cursor;
    // the glow itself is pure CSS (see .spotlight-card), so this stays cheap.
    let spotlightFrame = 0;
    const handleSpotlight = (event: MouseEvent) => {
      if (spotlightFrame) return;
      spotlightFrame = requestAnimationFrame(() => {
        spotlightFrame = 0;
        const card = (event.target as HTMLElement)?.closest<HTMLElement>(".spotlight-card");
        if (!card) return;
        const rect = card.getBoundingClientRect();
        card.style.setProperty("--spot-x", `${event.clientX - rect.left}px`);
        card.style.setProperty("--spot-y", `${event.clientY - rect.top}px`);
      });
    };
    document.addEventListener("mousemove", handleSpotlight);

    // Content reveal animations
    const revealElements = gsap.utils.toArray<HTMLElement>(".reveal");
    revealElements.forEach((el, index) => {
      gsap.fromTo(
        el,
        { opacity: 0, y: 32 },
        {
          opacity: 1,
          y: 0,
          duration: 0.7,
          ease: "power2.out",
          delay: (index % 3) * 0.05,
          scrollTrigger: {
            trigger: el,
            start: "top 90%",
            toggleActions: "play none none none",
            once: true,
          },
        },
      );
    });

    const timer = setTimeout(() => {
      ScrollTrigger.refresh();
    }, 250);

    return () => {
      clearTimeout(timer);
      anchorCleanups.forEach(cleanup => cleanup());
      window.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mousemove", handleSpotlight);
      cancelAnimationFrame(spotlightFrame);
      removeResizeListener?.();
      ScrollTrigger.getAll().forEach(trigger => trigger.kill());
    };
  }, []);

  const toggleMenu = () => {
    burgerRef.current?.classList.toggle("open");
    mobNavRef.current?.classList.toggle("open");
  };

  const toggleFaq = (event: React.MouseEvent<HTMLButtonElement>) => {
    const item = event.currentTarget.closest(".faq-item");
    if (!item) return;

    const answer = item.querySelector(".faq-answer") as HTMLElement;
    const isOpen = item.classList.contains("open");

    document.querySelectorAll(".faq-item.open").forEach(openItem => {
      openItem.classList.remove("open");
      gsap.to(openItem.querySelector(".faq-answer"), {
        height: 0,
        duration: 0.3,
        ease: "power2.inOut",
      });
    });

    if (!isOpen) {
      item.classList.add("open");
      gsap.set(answer, { height: "auto" });
      const height = answer.offsetHeight;
      gsap.fromTo(answer, { height: 0 }, { height, duration: 0.35, ease: "power2.out" });
    }
  };

  return (
    <main className="home-page">
      <NeuralNetworkCanvas />
      <div id="progress-bar"></div>
      <nav className="site-nav home-nav" id="site-nav" ref={navRef}>
        <ul className="nav-links">
          <li><a href="#about">About</a></li>
          <li><a href="#sponsors">Sponsors</a></li>
          <li><a href="#tracks">Tracks</a></li>
          <li><a href="#schedule">Schedule</a></li>
          <li><a href="#faq">FAQ</a></li>
        </ul>
        <button className="nav-burger" id="nav-burger" aria-label="Menu" ref={burgerRef} onClick={toggleMenu}>
          <span></span>
          <span></span>
          <span></span>
        </button>
      </nav>

      <nav className="nav-mobile" id="nav-mobile" ref={mobNavRef}>
        <a href="#about" onClick={() => mobNavRef.current?.classList.remove("open")}>About</a>
        <a href="#sponsors" onClick={() => mobNavRef.current?.classList.remove("open")}>Sponsors</a>
        <a href="#tracks" onClick={() => mobNavRef.current?.classList.remove("open")}>Tracks</a>
        <a href="#schedule" onClick={() => mobNavRef.current?.classList.remove("open")}>Schedule</a>
        <a href="#faq" onClick={() => mobNavRef.current?.classList.remove("open")}>FAQ</a>
      </nav>

      <section id="glab-home" className="glab-transition" aria-label="KeanUHackThis 2027">
        <div className="glab-sticky">
          <div className="glab-sky" aria-hidden="true">
            <div className="glab-sun-aura"></div>
          </div>

          <div className="glab-clouds" aria-hidden="true">
            <div className="glab-cloud cloud-1"></div>
            <div className="glab-cloud cloud-2"></div>
            <div className="glab-cloud cloud-3"></div>
            <div className="glab-cloud cloud-4"></div>
          </div>

          <div className="glab-sparkles" aria-hidden="true">
            <span className="glab-sparkle"></span>
            <span className="glab-sparkle"></span>
            <span className="glab-sparkle"></span>
            <span className="glab-sparkle"></span>
            <span className="glab-sparkle"></span>
            <span className="glab-sparkle"></span>
          </div>

          <div className="glab-title-wrap">
            <div className="glab-eyebrow mono">// Kean University Hackathon</div>
            <h1 className="glab-title">KeanUHackThis 2027</h1>
          </div>

          <div className="home-hero-actions">
            <Link to="/register" className="btn-primary">Register Now</Link>
            <a
              href="https://plastic-samba-cc3.notion.site/366c3ff7cd3180f6bbf8d02cb99c4532"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-ghost"
            >
              Sponsor Us
            </a>
          </div>

          <div className="glab-building-wrap" aria-hidden="true">
            <img
              className="glab-building"
              src="/paralaxComponents/GLAB.png"
              alt=""
            />
          </div>
        </div>
      </section>

      <section id="about" className="section section-alt home-info-section about-underground">
        <h2 className="headline reveal">Build below the surface.</h2>
        <div className="about-grid">
          <div className="about-stats reveal">
            <div className="stat-block glass-panel spotlight-card">
              <div className="stat-num">48<sup>h</sup></div>
              <div className="stat-label">Weekend Sprint</div>
            </div>
            <div className="stat-block glass-panel spotlight-card">
              <div className="stat-num">4</div>
              <div className="stat-label">Tracks</div>
            </div>
            <div className="stat-block glass-panel spotlight-card">
              <div className="stat-num">$0</div>
              <div className="stat-label">To Attend</div>
            </div>
          </div>

          <div className="about-text reveal">
            <p>
              Kean University students, mentors, designers, engineers, and curious first-time builders
              come together for a weekend of projects, workshops, demos, and community.
            </p>
            <p>
              Bring a laptop, an idea, or just the willingness to learn. Teams form on site, mentors
              help throughout the weekend, and every project gets a chance to be shown.
            </p>
            <div>
              <Link to="/register" className="btn-primary">Register Now</Link>
            </div>
          </div>
        </div>
      </section>

      <main className="underworld lower-world">
        <div className="underworld-content">
        <section id="sponsors" className="section section-alt home-info-section">
          <div className="sponsors-intro">
            <h2 className="headline reveal">Sponsor the builders.</h2>
            <div className="sponsors-cta-block glass-panel spotlight-card reveal">
              <a
                href="https://plastic-samba-cc3.notion.site/366c3ff7cd3180f6bbf8d02cb99c4532"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary"
              >
                Sponsor Us
              </a>
            </div>
          </div>
        </section>

        <section id="tracks" className="section home-info-section">
        <h2 className="headline reveal">Choose a track.</h2>
        <div className="tracks-grid">
          <div className="track-card glass-panel spotlight-card reveal">
            <div className="track-num">Track 01</div>
            <div className="track-name">AI &amp; Intelligence</div>
            <p className="track-desc">Language models, computer vision, data tools, and useful automation.</p>
          </div>
          <div className="track-card glass-panel spotlight-card reveal">
            <div className="track-num">Track 02</div>
            <div className="track-name">Civic &amp; Social Impact</div>
            <p className="track-desc">Projects for accessibility, local communities, health, and public good.</p>
          </div>
          <div className="track-card glass-panel spotlight-card reveal">
            <div className="track-num">Track 03</div>
            <div className="track-name">Hardware &amp; Embedded</div>
            <p className="track-desc">Robotics, sensors, wearables, IoT, and physical prototypes.</p>
          </div>
          <div className="track-card glass-panel spotlight-card reveal">
            <div className="track-num">Track 04</div>
            <div className="track-name">Open Innovation</div>
            <p className="track-desc">The wildcard lane for original ideas that do not fit anywhere else.</p>
          </div>
        </div>
        </section>

        <section id="schedule" className="section section-alt home-info-section">
        <h2 className="headline reveal">Weekend flow.</h2>
        <div className="schedule-days">
          <div className="schedule-day glass-panel spotlight-card reveal">
            <div className="day-label mono">Day 01</div>
            <div className="day-name">Friday</div>
            <div className="schedule-events">
              <div className="schedule-event">
                <span className="event-time">5 PM</span>
                <span className="event-dot"></span>
                <div className="event-info">
                  <div className="event-title">Check-in</div>
                  <div className="event-note">Badges, team finding, opening ceremony</div>
                </div>
              </div>
              <div className="schedule-event">
                <span className="event-time">9 PM</span>
                <span className="event-dot"></span>
                <div className="event-info">
                  <div className="event-title">Build Time</div>
                  <div className="event-note">The project clock starts</div>
                </div>
              </div>
            </div>
          </div>
          <div className="schedule-day glass-panel spotlight-card reveal">
            <div className="day-label mono">Day 02</div>
            <div className="day-name">Saturday</div>
            <div className="schedule-events">
              <div className="schedule-event">
                <span className="event-time">All day</span>
                <span className="event-dot"></span>
                <div className="event-info">
                  <div className="event-title">Mentors &amp; Workshops</div>
                  <div className="event-note">Get help, learn fast, keep building</div>
                </div>
              </div>
            </div>
          </div>
          <div className="schedule-day glass-panel spotlight-card reveal">
            <div className="day-label mono">Day 03</div>
            <div className="day-name">Sunday</div>
            <div className="schedule-events">
              <div className="schedule-event">
                <span className="event-time">Morning</span>
                <span className="event-dot"></span>
                <div className="event-info">
                  <div className="event-title">Demos &amp; Awards</div>
                  <div className="event-note">Submit, present, celebrate the work</div>
                </div>
              </div>
            </div>
          </div>
        </div>
        </section>

        <section id="faq" className="section home-info-section">
        <h2 className="headline reveal">Questions?</h2>
        <div className="faq-list">
          <div className="faq-item glass-panel">
            <button className="faq-question" onClick={toggleFaq}>
              Who can participate?
              <span className="faq-icon">+</span>
            </button>
            <div className="faq-answer">
              <div className="faq-answer-inner">
                Any currently enrolled undergraduate or graduate student aged 18+ can participate.
              </div>
            </div>
          </div>
          <div className="faq-item glass-panel">
            <button className="faq-question" onClick={toggleFaq}>
              Do I need a team?
              <span className="faq-icon">+</span>
            </button>
            <div className="faq-answer">
              <div className="faq-answer-inner">
                No. You can arrive solo and form a team during the event.
              </div>
            </div>
          </div>
          <div className="faq-item glass-panel">
            <button className="faq-question" onClick={toggleFaq}>
              How much does it cost?
              <span className="faq-icon">+</span>
            </button>
            <div className="faq-answer">
              <div className="faq-answer-inner">
                It is free to attend, including food, workshops, and mentorship.
              </div>
            </div>
          </div>
          <div className="faq-item glass-panel">
            <button className="faq-question" onClick={toggleFaq}>
              Where is it held?
              <span className="faq-icon">+</span>
            </button>
            <div className="faq-answer">
              <div className="faq-answer-inner">
                The event is hosted at Kean University in Union, New Jersey.
              </div>
            </div>
          </div>
        </div>
        </section>

        <footer className="site-footer">
        <div className="footer-top">
          <div className="footer-brand">
            <div className="footer-address-title">Kean University</div>
            <p className="footer-tagline">
              1000 Morris Ave<br />
              Union, NJ 07083
            </p>
            <a className="footer-brand-link" href="https://www.kean.edu/" target="_blank" rel="noopener noreferrer">kean.edu</a>
          </div>

          <div className="footer-links-group">
            <div className="footer-link-col">
              <span className="footer-link-head">Navigate</span>
              <a href="#about">About</a>
              <a href="#sponsors">Sponsors</a>
              <a href="#tracks">Tracks</a>
              <a href="#schedule">Schedule</a>
              <a href="#faq">FAQ</a>
            </div>
            <div className="footer-link-col">
              <span className="footer-link-head">Contact</span>
              <a href="mailto:acmkeanchapter@kean.edu">acmkeanchapter@kean.edu</a>
              <Link to="/register">Register Now</Link>
              <a href="https://plastic-samba-cc3.notion.site/366c3ff7cd3180f6bbf8d02cb99c4532" target="_blank" rel="noopener noreferrer">Sponsor Packet</a>
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <span className="footer-copy">&copy; 2027 Kean University, Union NJ</span>
        </div>
        </footer>
        </div>
      </main>
    </main>
  );
}
