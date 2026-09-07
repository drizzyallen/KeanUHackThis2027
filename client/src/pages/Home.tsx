import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Lenis from 'lenis';
import gsap from 'gsap';
import ScrollTrigger from 'gsap/ScrollTrigger';
import ScrollToPlugin from 'gsap/ScrollToPlugin';
import aboutPageImage from '../../uploads/aboutPageImage.jpeg';
import mongoDbLogo from '../../uploads/MongoDB_ForestGreen.png';
import tinComputerLogo from '../../uploads/TinComputer.png';

gsap.registerPlugin(ScrollTrigger, ScrollToPlugin);

const BACKEND_URL = "http://localhost:3001/api";
const smoothstep = (t: number) => t * t * (3 - 2 * t);
const SphereGallery = React.lazy(() => import('../components/SphereGallery'));

const WALL_PHRASES = [
  "FREE FOOD",
  "24 HOURS",
  "BUILD SOMETHING BOLD",
  "MEET NEW PEOPLE",
  "WIN PRIZES",
  "LEARN NEW SKILLS",
  "BEGINNERS WELCOME",
  "WORKSHOPS",
  "MINI EVENTS",
  "CREATE - CODE - COLLABORATE",
];

const marqueeItems = [...WALL_PHRASES, ...WALL_PHRASES];
const sponsorLogos = [
  { name: "MongoDB", src: mongoDbLogo },
  { name: "Tin Computer", src: tinComputerLogo, glow: true },
];
const sponsorLogoSlides = [...sponsorLogos, ...sponsorLogos, ...sponsorLogos, ...sponsorLogos];

export default function Home() {
  const navigate = useNavigate();
  const navRef = useRef<HTMLElement>(null);
  const burgerRef = useRef<HTMLButtonElement>(null);
  const mobNavRef = useRef<HTMLElement>(null);
  const [loginMode, setLoginMode] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.location.pathname === "/login" || new URLSearchParams(window.location.search).get("login") === "1";
  });
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [emailError, setEmailError] = useState(false);
  const [passwordError, setPasswordError] = useState(false);

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let lenis: Lenis | undefined;
    const lenisTicker = (time: number) => {
      lenis?.raf(time * 1000);
    };

    if (!reducedMotion) {
      lenis = new Lenis({
        duration: 1.05,
        easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        smoothWheel: true,
        wheelMultiplier: 0.88,
        touchMultiplier: 1.08,
      });
      lenis.on("scroll", ScrollTrigger.update);
      gsap.ticker.add(lenisTicker);
      gsap.ticker.lagSmoothing(0);
    }

    const anchors = document.querySelectorAll('a[href^="#"]');
    const anchorCleanups: Array<() => void> = [];

    anchors.forEach(anchor => {
      const handleClick = (event: Event) => {
        const targetId = anchor.getAttribute("href");
        if (!targetId || targetId === "#") return;

        const target = document.querySelector(targetId);
        if (!target) return;

        event.preventDefault();
        if (lenis) {
          lenis.scrollTo(target as HTMLElement, { offset: -72, duration: 1.15 });
        } else {
          gsap.to(window, {
            duration: reducedMotion ? 0 : 0.85,
            scrollTo: { y: target, offsetY: 72, autoKill: false },
            ease: "power2.inOut",
          });
        }
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
    const aboutEl = document.getElementById("about");

    if (!reducedMotion) {
      const sceneEl = document.querySelector(".hero-scroll-stage") as HTMLElement | null;
      const stickyEl = document.querySelector(".hero-sticky") as HTMLElement | null;
      const foregroundLayer = document.querySelector(".foreground-layer") as HTMLElement | null;
      const wallEl = document.querySelector(".blue-wall") as HTMLElement | null;
      const buildingCrop = document.querySelector(".glab-building-crop") as HTMLElement | null;

      if (sceneEl && stickyEl && foregroundLayer && wallEl && buildingCrop && aboutEl) {
        gsap.set(foregroundLayer, { y: "112vh" });
        gsap.set(".hero-content", { y: 0, opacity: 1 });
        gsap.set(buildingCrop, { y: 0, scale: 1 });
        aboutEl.style.setProperty("--about-solid", "1");

        const heroTl = gsap.timeline({
          scrollTrigger: {
            trigger: sceneEl,
            start: "top top",
            end: "bottom bottom",
            scrub: 0.65,
            pin: stickyEl,
            anticipatePin: 1,
            invalidateOnRefresh: true,
            onUpdate: self => {
              const revealT = smoothstep(Math.min(1, Math.max(0, (self.progress - 0.58) / 0.42)));
              aboutEl.style.setProperty("--about-solid", String(1 - revealT));
            },
            onLeave: () => {
              aboutEl.style.setProperty("--about-solid", "0");
            },
            onEnterBack: self => {
              const revealT = smoothstep(Math.min(1, Math.max(0, (self.progress - 0.58) / 0.42)));
              aboutEl.style.setProperty("--about-solid", String(1 - revealT));
            },
          },
        });

        heroTl
          .to(".hero-sky", { yPercent: 8, ease: "none" }, 0)
          .to(".cloud-drift-a", { x: -90, y: -36, ease: "none" }, 0)
          .to(".cloud-drift-b", { x: 120, y: -54, ease: "none" }, 0)
          .to(".cloud-drift-c", { x: -70, y: -24, ease: "none" }, 0)
          .to(".cloud-drift-d", { x: 62, y: -42, ease: "none" }, 0)
          .to(buildingCrop, { y: "-5vh", scale: 1.03, ease: "none" }, 0)
          .to(foregroundLayer, { y: () => -(wallEl.offsetHeight + 2), ease: "none" }, 0);

        const handleResize = () => ScrollTrigger.refresh();
        window.addEventListener("resize", handleResize);
        removeResizeListener = () => window.removeEventListener("resize", handleResize);
      }

      gsap.fromTo(
        ".glab-building-crop",
        { opacity: 0, x: -48 },
        { opacity: 1, x: 0, duration: 0.95, ease: "power2.out" }
      );
    } else if (aboutEl) {
      aboutEl.style.setProperty("--about-solid", "0");
    }

    const buildingImg = document.querySelector(".glab-building") as HTMLImageElement;
    const refreshOnLoad = () => ScrollTrigger.refresh();
    if (buildingImg) {
      if (buildingImg.complete) {
        ScrollTrigger.refresh();
      } else {
        buildingImg.addEventListener("load", refreshOnLoad);
      }
    }

    const handleMouseMove = (e: MouseEvent) => {
      if (window.innerWidth < 900 || reducedMotion) return;
      const xNorm = (e.clientX / window.innerWidth - 0.5) * 2;
      const yNorm = (e.clientY / window.innerHeight - 0.5) * 2;

      gsap.to(".hero-clouds", { x: xNorm * 18, y: yNorm * 10, duration: 1.5, ease: "power2.out", overwrite: "auto" });
    };

    window.addEventListener("mousemove", handleMouseMove);

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

    const timer = setTimeout(() => {
      ScrollTrigger.refresh();
    }, 250);

    return () => {
      clearTimeout(timer);
      anchorCleanups.forEach(cleanup => cleanup());
      window.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mousemove", handleSpotlight);
      buildingImg?.removeEventListener("load", refreshOnLoad);
      cancelAnimationFrame(spotlightFrame);
      removeResizeListener?.();
      lenis?.destroy();
      gsap.ticker.remove(lenisTicker);
      ScrollTrigger.getAll().forEach(trigger => trigger.kill());
    };
  }, []);

  useEffect(() => {
    if (!loginMode) return;

    try {
      const session = JSON.parse(localStorage.getItem("kuh_session") || "null");
      if (session && session.expiresAt > Date.now()) {
        navigate('/dashboard');
      }
    } catch {
      localStorage.removeItem("kuh_session");
    }
  }, [loginMode, navigate]);

  const openHeroLogin = () => {
    setLoginMode(true);
    setErrorMsg('');
    setEmailError(false);
    setPasswordError(false);
    navigate('/?login=1', { replace: true });
  };

  const closeHeroLogin = () => {
    setLoginMode(false);
    setErrorMsg('');
    setEmailError(false);
    setPasswordError(false);
    navigate('/', { replace: true });
  };

  const handleHeroLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMsg('');
    setEmailError(false);
    setPasswordError(false);

    const emailVal = email.trim().toLowerCase();
    let ok = true;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal)) {
      setEmailError(true);
      ok = false;
    }
    if (!password) {
      setPasswordError(true);
      ok = false;
    }
    if (!ok) return;

    setLoading(true);
    if (typeof crypto === "undefined" || !crypto.subtle) {
      setErrorMsg("Open this page over https:// or localhost to log in.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`${BACKEND_URL}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailVal, password }),
      });
      const text = await res.text();
      let data: {
        success?: boolean;
        error?: string;
        user?: Record<string, unknown>;
        token?: string;
        expiresAt?: number;
      };

      try {
        data = JSON.parse(text);
      } catch {
        setErrorMsg(`Unexpected server response (${res.status}).`);
        setLoading(false);
        return;
      }

      if (data.success) {
        const ttl = remember ? 7 * 24 * 60 * 60 * 1000 : 8 * 60 * 60 * 1000;
        const expiresAt = remember ? Date.now() + ttl : data.expiresAt || Date.now() + ttl;
        const session = { ...(data.user || {}), token: data.token, expiresAt };
        localStorage.setItem("kuh_session", JSON.stringify(session));
        navigate('/dashboard');
      } else {
        setErrorMsg(data.error || "Login failed. Check your email and password.");
        setLoading(false);
      }
    } catch {
      setErrorMsg("Could not reach the server. Make sure the backend is running.");
      setLoading(false);
    }
  };

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
      <div id="progress-bar"></div>
      <nav className="site-nav home-nav" id="site-nav" ref={navRef}>
        <ul className="nav-links">
          <li><a href="#about">About</a></li>
          <li><a href="#sponsors">Sponsors</a></li>
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
        <a href="#schedule" onClick={() => mobNavRef.current?.classList.remove("open")}>Schedule</a>
        <a href="#faq" onClick={() => mobNavRef.current?.classList.remove("open")}>FAQ</a>
      </nav>

      <section id="glab-home" className="hero-scroll-stage" aria-label="KeanUHackThis 2027">
        <div className="hero-sticky">
          <div className="hero-sky" aria-hidden="true">
            <span className="sky-wash sky-wash-1"></span>
            <span className="sky-wash sky-wash-2"></span>
          </div>

          <div className="hero-clouds" aria-hidden="true">
            <span className="hero-cloud cloud-drift-a"></span>
            <span className="hero-cloud cloud-drift-b"></span>
            <span className="hero-cloud cloud-drift-c"></span>
            <span className="hero-cloud cloud-drift-d"></span>
            <span className="hero-cloud cloud-drift-e"></span>
          </div>

          <div className="glab-building-crop">
            <img
              className="glab-building"
              src="/paralaxComponents/trueGLAB.png"
              alt="Illustration of the Kean University GLAB building"
            />
          </div>

          <div className="hero-content">
            {loginMode ? (
              <div className="hero-login-panel" id="hero-login" aria-label="Log in to KeanUHackThis">
                <button
                  type="button"
                  className="hero-login-back"
                  onClick={closeHeroLogin}
                  aria-label="Back to KeanUHackThis2027 home"
                >
                  <span aria-hidden="true">&larr;</span>
                  <span>KeanUHackThis2027</span>
                </button>

                <form className="hero-login-form" onSubmit={handleHeroLogin} noValidate>
                  <div className="hero-kicker">Welcome back</div>
                  <h1 className="hero-login-title">Log in</h1>

                  <div className={`hero-login-error ${errorMsg ? "show" : ""}`} role="alert">
                    {errorMsg}
                  </div>

                  <label className={`hero-login-field ${emailError ? "hero-field-error" : ""}`}>
                    <span>Email</span>
                    <input
                      type="email"
                      value={email}
                      onChange={(event) => {
                        setEmail(event.target.value);
                        setEmailError(false);
                        setErrorMsg('');
                      }}
                      placeholder="you@kean.edu"
                      autoComplete="email"
                      aria-invalid={emailError}
                    />
                  </label>

                  <label className={`hero-login-field ${passwordError ? "hero-field-error" : ""}`}>
                    <span>Password</span>
                    <div className="hero-password-wrap">
                      <input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(event) => {
                          setPassword(event.target.value);
                          setPasswordError(false);
                          setErrorMsg('');
                        }}
                        placeholder="Password"
                        autoComplete="current-password"
                        aria-invalid={passwordError}
                      />
                      <button
                        type="button"
                        className="hero-password-toggle"
                        onClick={() => setShowPassword(current => !current)}
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? "Hide" : "Show"}
                      </button>
                    </div>
                  </label>

                  <div className="hero-login-row">
                    <label className="hero-login-remember">
                      <input
                        type="checkbox"
                        checked={remember}
                        onChange={(event) => setRemember(event.target.checked)}
                      />
                      <span>Remember me</span>
                    </label>
                    <a href="mailto:acmkeanchapter@kean.edu">Forgot password?</a>
                  </div>

                  <button type="submit" className="hero-btn hero-btn-primary hero-login-submit" disabled={loading}>
                    {loading ? "Logging in..." : "Log in"}
                  </button>
                </form>
              </div>
            ) : (
              <>
                <div className="hero-kicker">Kean University Hackathon</div>
                <h1 className="hero-title">
                  <span>KeanUHackThis</span>
                  <strong>2027</strong>
                </h1>
                <div className="home-hero-actions" aria-label="Primary actions">
                  <Link to="/register" className="hero-btn hero-btn-primary">
                    Register now <span aria-hidden="true">&rarr;</span>
                  </Link>
                  <a
                    href="https://keanuhackthis2027.vercel.app/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hero-btn hero-btn-secondary"
                  >
                    Sponsor us
                  </a>
                  <button type="button" className="hero-btn hero-btn-tertiary" onClick={openHeroLogin}>
                    Log in
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </section>

      <div className="foreground-layer">
        <div className="blue-wall" aria-label="Hackathon highlights">
          <div className="wall-shine" aria-hidden="true"></div>
          <div className="wall-marquee wall-marquee-primary">
            <div className="wall-marquee-track">
              {marqueeItems.map((item, index) => (
                <span className="wall-marquee-item" key={`primary-${item}-${index}`}>
                  {item}<span className="wall-separator" aria-hidden="true">*</span>
                </span>
              ))}
            </div>
          </div>
          <div className="wall-marquee wall-marquee-secondary" aria-hidden="true">
            <div className="wall-marquee-track">
              {marqueeItems.map((item, index) => (
                <span className="wall-marquee-item" key={`secondary-${item}-${index}`}>
                  {item}<span className="wall-separator">.</span>
                </span>
              ))}
            </div>
          </div>
        </div>

        <section id="about" className="section section-alt home-info-section about-underground">
          <div className="about-feature">
            <div className="about-copy reveal">
              <h2 className="headline">About <span>KeanUHackThis</span></h2>
              <p>
                <strong>KeanUHackThis</strong> brings students, mentors, designers, engineers, and
                curious first-time builders together at Kean University for a weekend of projects,
                workshops, teamwork, and community.
              </p>
              <p>
                Bring a laptop, an idea, or just the willingness to learn. Our beginner-friendly
                workshops and mentor support help teams turn early ideas into real demos by the end of
                the event.
              </p>
              <p>
                Expect food, prizes, mini events, sponsor challenges, and plenty of space to create,
                code, and collaborate.
              </p>
            </div>

            <figure className="about-photo-card reveal">
              <img src={aboutPageImage} alt="KeanUHackThis participants gathered during the event" />
              <figcaption>Closing ceremony at KeanUHackThis</figcaption>
            </figure>
          </div>

          <div className="about-bottom-row reveal">
            <div className="about-metric">
              <strong>24hr</strong>
              <span>Build</span>
            </div>
            <div className="about-metric">
              <strong>200+</strong>
              <span>Registrants</span>
            </div>
            <div className="about-metric">
              <strong>Free</strong>
              <span>To Attend</span>
            </div>
            <div className="about-register">
              <Link to="/register" className="hero-btn hero-btn-primary">
                Register now <span aria-hidden="true">&rarr;</span>
              </Link>
              <span>Kean University · Union, NJ</span>
            </div>
          </div>
          <div id="sponsors" className="about-sponsors reveal">
            <div className="sponsors-heading-row">
              <h2 className="headline">Sponsors</h2>
              <a
                href="https://keanuhackthis2027.vercel.app/"
                target="_blank"
                rel="noopener noreferrer"
                className="hero-btn hero-btn-secondary sponsors-heading-btn"
              >
                Sponsor us
              </a>
            </div>
            <div className="logo-carousel" aria-label="KeanUHackThis sponsors">
              <div className="logo-slider-viewport">
                <div className="logo-track scroll-right">
                  {sponsorLogoSlides.map((sponsor, index) => (
                    <a
                      className="slide sponsor-logo-slide"
                      data-glow={sponsor.glow ? "light" : undefined}
                      href="#sponsors"
                      aria-label={sponsor.name}
                      key={`${sponsor.name}-${index}`}
                    >
                      <img src={sponsor.src} alt={sponsor.name} />
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

      <main className="underworld lower-world">
        <div className="underworld-content">
          <section id="schedule" className="section section-alt home-info-section schedule-coming-soon">
            <h2 className="headline reveal">Schedule</h2>
            <div className="schedule-placeholder reveal">
              <p>Coming soon</p>
            </div>
          </section>

          <section id="faq" className="section home-info-section">
            <h2 className="headline reveal">FAQs</h2>
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
            <div className="faq-gallery-heading reveal">
              <h3 className="headline">Previous KeanUHackThis <span>Highlights</span></h3>
            </div>
            <div className="faq-gallery reveal">
              <React.Suspense fallback={null}>
                <SphereGallery />
              </React.Suspense>
              <p className="gallery-caveat">Click side images to view more.</p>
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
      </div>
    </main>
  );
}
