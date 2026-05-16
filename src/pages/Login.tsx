import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import gsap from 'gsap';
import './Login.css';

const BACKEND_URL = "http://localhost:3001/api";

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  const [emailError, setEmailError] = useState(false);
  const [passwordError, setPasswordError] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    // Redirect if already logged in
    try {
      const s = JSON.parse(localStorage.getItem("kuh_session") || "null");
      if (s && s.expiresAt > Date.now()) {
        navigate('/dashboard');
      }
    } catch(e) {}

    // Page enter animation
    if (!window.matchMedia || !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      gsap.fromTo("#login-wrap", { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.7, ease: "power3.out", delay: 0.1 });
    }
  }, [navigate]);



  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg('');
    setEmailError(false);
    setPasswordError(false);
    
    let ok = true;
    const emailVal = email.trim().toLowerCase();
    
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
      setErrorMsg("Browser security error: open this page over https:// or localhost.");
      setLoading(false);
      return;
    }

    try {
      const url = `${BACKEND_URL}/login`;
      
      const res = await fetch(url, { 
        method: "POST", 
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailVal, password: password })
      });
      const text = await res.text();
      
      let data;
      try {
        data = JSON.parse(text);
      } catch (pe) {
        console.error("[Login] Non-JSON response:", text.slice(0, 300));
        setErrorMsg("Server returned an unexpected response. Make sure the Apps Script is deployed correctly.");
        setLoading(false);
        return;
      }

      if (data.success) {
        const ttl = remember ? 7 * 24 * 60 * 60 * 1000 : 8 * 60 * 60 * 1000;
        const session = Object.assign({}, data.user, { token: data.token, expiresAt: Date.now() + ttl });
        localStorage.setItem("kuh_session", JSON.stringify(session));
        navigate('/dashboard');
      } else {
        console.error("[Login] Server error:", data.error);
        setErrorMsg(data.error || "Login failed. Check your email and password.");
        setLoading(false);
      }
    } catch (err) {
      console.error("[Login] Fetch error:", err);
      setErrorMsg("Could not reach the server. Check your connection and try again.");
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleLogin();
  };

  return (
    <div className="page-wrap" style={{ paddingTop: '64px', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <nav className="site-nav-reg" id="site-nav">
        <Link to="/" className="nav-logo">
          <img src="/uploads/hackathon_logo2026.png" alt="KeanUHackThis logo" />
          <span className="nav-logo-text">KeanUHackThis</span>
        </Link>
        <Link to="/" className="nav-back">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
          Back to site
        </Link>
      </nav>

      <div className="login-bg"></div>
      <div className="login-wrap" id="login-wrap">
        <div className="login-card">
          <div className="login-card-header">
            <p className="login-eyebrow">KeanUHackThis 2027</p>
            <h1 className="login-title">Welcome back.</h1>
            <p className="login-sub">Log in to view or update your registration.</p>
          </div>
          <div className="login-body">
            
            <div className={`login-error ${errorMsg ? 'show' : ''}`} id="login-error">
              {errorMsg}
            </div>

            <div className="field-group">
              <label htmlFor="loginEmail">Email Address</label>
              <input 
                type="email" 
                id="loginEmail" 
                placeholder="jane@kean.edu" 
                autoComplete="email" 
                value={email}
                onChange={(e) => { setEmail(e.target.value); setEmailError(false); setErrorMsg(''); }}
                onKeyDown={handleKeyDown}
                className={emailError ? 'error' : ''}
              />
              <span className={`field-error ${emailError ? 'show' : ''}`} id="err-loginEmail">Enter a valid email</span>
            </div>

            <div className="field-group">
              <label htmlFor="loginPassword">Password</label>
              <div className="pw-wrap">
                <input 
                  type={showPassword ? "text" : "password"} 
                  id="loginPassword" 
                  placeholder="Your password" 
                  autoComplete="current-password" 
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setPasswordError(false); setErrorMsg(''); }}
                  onKeyDown={handleKeyDown}
                  className={passwordError ? 'error' : ''}
                />
                <button type="button" className="pw-toggle" aria-label="Show password" onClick={() => setShowPassword(!showPassword)}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    {showPassword ? (
                      <>
                        <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/>
                        <line x1="1" y1="1" x2="23" y2="23"/>
                      </>
                    ) : (
                      <>
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                        <circle cx="12" cy="12" r="3"/>
                      </>
                    )}
                  </svg>
                </button>
              </div>
              <span className={`field-error ${passwordError ? 'show' : ''}`} id="err-loginPassword">Required</span>
            </div>

            <label className="remember-row">
              <input 
                type="checkbox" 
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)} 
              />
              Stay logged in for 7 days
            </label>

            <button className="btn-login" id="loginBtn" onClick={handleLogin} disabled={loading}>
              <div className="btn-spinner" style={{ display: loading ? 'block' : 'none' }}></div>
              <span>{loading ? 'Logging in…' : 'Log In →'}</span>
            </button>

            <div className="divider">or</div>

            <div className="login-footer-links">
              Not registered yet? <Link to="/register">Create your account →</Link><br />
              <span style={{ fontSize: '12px', color: 'var(--very-muted)' }}>
                Forgot your password? Email <a href="mailto:acmkeanchapter@kean.edu">acmkeanchapter@kean.edu</a>
              </span>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
