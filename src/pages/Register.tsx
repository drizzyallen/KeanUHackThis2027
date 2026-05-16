import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import gsap from 'gsap';
import { SCHOOLS, MAJORS } from '../utils/data';

const BACKEND_URL = "http://localhost:3001/api";

export default function Register() {
  const [step, setStep] = useState(1);
  const totalSteps = 4;
  
  const [formData, setFormData] = useState({
    email: '', firstName: '', lastName: '', password: '', confirmPassword: '',
    phone: '', age: '', gender: 'Male', school: '', major: '', year: 'Freshman', level: 'Undergraduate',
    teamStatus: 'Solo', teamName: '', teammate1: '', teammate2: '', teammate3: '',
    track: 'Track 01', tshirt: 'M',
    dietary: { none: true, vegetarian: false, vegan: false, halal: false, kosher: false, glutenFree: false, nutAllergy: false, other: false },
    dietaryOtherText: '',
    hearAbout: '', notes: '', photoConsent: false
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [submitError, setSubmitError] = useState(false);
  const [confirmationCode, setConfirmationCode] = useState('');

  // Autocomplete states
  const [schoolMatches, setSchoolMatches] = useState<any[]>([]);
  const [showSchoolMatches, setShowSchoolMatches] = useState(false);
  const [schoolActiveIdx, setSchoolActiveIdx] = useState(-1);
  
  const [majorMatches, setMajorMatches] = useState<any[]>([]);
  const [showMajorMatches, setShowMajorMatches] = useState(false);
  const [majorActiveIdx, setMajorActiveIdx] = useState(-1);

  // Refs for animations and clicks outside
  const schoolWrapRef = useRef<HTMLDivElement>(null);
  const majorWrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Page load animation
    if (!window.matchMedia || !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      gsap.fromTo(".reg-hero-inner", { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.9, ease: "power3.out", delay: 0.1 });
      gsap.fromTo(".reg-form-card", { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.8, ease: "power3.out", delay: 0.25 });
      gsap.fromTo(".reg-sidebar", { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.8, ease: "power3.out", delay: 0.4 });
    }

    const handleClickOutside = (e: MouseEvent) => {
      if (schoolWrapRef.current && !schoolWrapRef.current.contains(e.target as Node)) {
        setShowSchoolMatches(false);
      }
      if (majorWrapRef.current && !majorWrapRef.current.contains(e.target as Node)) {
        setShowMajorMatches(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { id, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [id]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [id]: value }));
    }
    // clear error for this field
    if (errors[id]) {
      setErrors(prev => ({ ...prev, [id]: '' }));
    }
  };

  const handleDietaryChange = (key: keyof typeof formData.dietary) => {
    setFormData(prev => {
      const diet = { ...prev.dietary };
      if (key === 'none') {
        Object.keys(diet).forEach(k => diet[k as keyof typeof diet] = false);
        diet.none = true;
      } else {
        diet.none = false;
        diet[key] = !diet[key];
      }
      return { ...prev, dietary: diet };
    });
  };

  const getMatchList = (val: string, items: any[]) => {
    if (!val || val.length < 2) return [];
    const q = val.toLowerCase().trim();
    return items.filter(item => {
      if (item.n.toLowerCase().includes(q)) return true;
      return item.a.some((alias: string) => alias.toLowerCase().includes(q));
    }).slice(0, 5);
  };

  const handleSchoolChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    handleChange(e);
    const matches = getMatchList(val, SCHOOLS);
    setSchoolMatches(matches);
    setShowSchoolMatches(matches.length > 0);
    setSchoolActiveIdx(-1);
  };

  const handleMajorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    handleChange(e);
    const matches = getMatchList(val, MAJORS);
    setMajorMatches(matches);
    setShowMajorMatches(matches.length > 0);
    setMajorActiveIdx(-1);
  };

  const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const validateStep = (s: number) => {
    const errs: Record<string, string> = {};
    let isValid = true;
    
    if (s === 1) {
      if (!formData.email) errs.email = "Required";
      else if (!validateEmail(formData.email)) errs.email = "Invalid email format";
      if (!formData.firstName.trim()) errs.firstName = "Required";
      if (!formData.lastName.trim()) errs.lastName = "Required";
      if (!formData.password) errs.password = "Required";
      else if (formData.password.length < 8) errs.password = "Must be at least 8 characters";
      if (formData.password !== formData.confirmPassword) errs.confirmPassword = "Passwords do not match";
    } else if (s === 2) {
      if (!formData.phone.trim()) errs.phone = "Required";
      if (!formData.age.trim()) errs.age = "Required";
      if (!formData.school.trim()) errs.school = "Required";
      if (!formData.major.trim()) errs.major = "Required";
    } else if (s === 3) {
      if (formData.teamStatus === 'Create a Team' || formData.teamStatus === 'Join a Team') {
        if (!formData.teamName.trim()) errs.teamName = "Required";
      }
    } else if (s === 4) {
      if (!formData.photoConsent) errs.photoConsent = "Required";
    }

    if (Object.keys(errs).length > 0) {
      isValid = false;
      setErrors(errs);
      
      // Add error flash animation to invalid fields
      Object.keys(errs).forEach(id => {
        const el = document.getElementById(id);
        if (el) {
          gsap.fromTo(el, { x: -4 }, { x: 4, duration: 0.08, yoyo: true, repeat: 3, onComplete: () => gsap.set(el, { x: 0 }) });
        }
      });
    }
    return isValid;
  };

  const nextStep = () => {
    if (validateStep(step)) {
      setStep(step + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const prevStep = () => {
    if (step > 1) {
      setStep(step - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };



  const generateLocalCode = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "KUH-";
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const handleSubmit = async () => {
    if (!validateStep(4)) return;
    
    setLoading(true);
    setSubmitError(false);

    try {

      const dietKeys = Object.keys(formData.dietary).filter(k => formData.dietary[k as keyof typeof formData.dietary]);
      let dietaryStr = dietKeys.join(', ');
      if (formData.dietary.other && formData.dietaryOtherText) {
        dietaryStr += ` (Other: ${formData.dietaryOtherText})`;
      }

      const hasTeam = formData.teamStatus === 'Create a Team' || formData.teamStatus === 'Join a Team';
      const code = generateLocalCode();

      const payload = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        age: formData.age,
        gender: formData.gender,
        school: formData.school,
        major: formData.major,
        year: formData.year,
        level: formData.level,
        teamStatus: formData.teamStatus,
        teamName: hasTeam ? formData.teamName : '',
        teammate1: hasTeam ? formData.teammate1 : '',
        teammate2: hasTeam ? formData.teammate2 : '',
        teammate3: hasTeam ? formData.teammate3 : '',
        track: formData.track,
        tshirt: formData.tshirt,
        dietary: dietaryStr,
        hearAbout: formData.hearAbout,
        notes: formData.notes,
        photoConsent: formData.photoConsent ? "Yes" : "No",
        password: formData.password,
        submittedAt: new Date().toISOString(),
        confirmationCode: code
      };

      const response = await fetch(`${BACKEND_URL}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || "Registration failed");
      }
      handleSuccess(payload, code);
    } catch (e) {
      setLoading(false);
      setSubmitError(true);
    }
  };

  const handleSuccess = (payload: any, code: string) => {
    const session = {
      email: payload.email,
      firstName: payload.firstName,
      lastName: payload.lastName,
      confirmationCode: code,
      teamStatus: payload.teamStatus,
      status: "Registered",
      token: "",
      expiresAt: Date.now() + (7 * 24 * 60 * 60 * 1000)
    };
    localStorage.setItem("kuh_session", JSON.stringify(session));
    
    setConfirmationCode(code);
    setLoading(false);
    setSuccess(true);
    
    setTimeout(() => {
      gsap.fromTo("#submit-success", { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.5, ease: "power3.out" });
    }, 50);
  };

  return (
    <div className="page-wrap">
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

      <section className="reg-hero">
        <div className="reg-hero-bg"></div>
        <div className="reg-hero-bg-grid"></div>
        <div className="reg-hero-inner">
          <p className="reg-eyebrow">Spring 2027 Application</p>
          <h1 className="reg-title">Secure<br/>your spot.</h1>
          <p className="reg-sub">
            Join 400+ builders for 48 hours of uninterrupted shipping at Kean University.
            Spots are limited. No application fee. No prior experience required.
          </p>
          <div className="reg-badges">
            <span className="reg-badge">Registration Open</span>
            <span className="reg-badge">Closes in 14 days</span>
          </div>
        </div>
      </section>

      <div className="reg-body">
        <div className="reg-layout">
          <div className="reg-main-col">
            <div className="reg-form-card">
              {!success && !loading && (
                <div className="reg-steps">
                  {[1, 2, 3, 4].map(s => (
                    <div key={s} className={`reg-step ${step === s ? 'active' : ''} ${step > s ? 'done' : ''}`} onClick={() => {
                      if (s < step || (s === step + 1 && validateStep(step))) setStep(s);
                    }} style={{ cursor: s <= step || s === step + 1 ? 'pointer' : 'default' }}>
                      <div className="reg-step-num">{step > s ? '✓' : s}</div>
                      <span className="reg-step-label">
                        {s === 1 && 'Account'}
                        {s === 2 && 'Profile'}
                        {s === 3 && 'Team'}
                        {s === 4 && 'Details'}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {!success && !loading && (
                <div style={{ marginBottom: '24px', padding: '12px 16px', background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                  <div style={{ fontSize: '13px', color: 'var(--warn)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                    <span>Already have an account?</span>
                  </div>
                  <Link to="/login" style={{ fontSize: '12px', fontWeight: 700, padding: '6px 12px', background: 'var(--warn)', color: '#000', borderRadius: '6px', textDecoration: 'none' }}>Or log in &rarr;</Link>
                </div>
              )}

              {loading && (
                <div id="submit-loading" style={{ display: 'flex' }}>
                  <div className="spinner"></div>
                  <div>
                    <h3>Securing your spot...</h3>
                    <p style={{ color: 'var(--dim)', fontSize: '14px', marginTop: '4px' }}>Encrypting credentials &amp; registering</p>
                  </div>
                </div>
              )}

              {success && (
                <div id="submit-success" style={{ display: 'flex' }}>
                  <div className="success-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  </div>
                  <div>
                    <h3 className="success-title">You're in.</h3>
                    <p className="success-sub">
                      Your application has been received. Save your confirmation code below — you'll need it to check in at the event.
                    </p>
                  </div>
                  <div className="conf-code-box">
                    <div className="conf-code-label">Confirmation Code</div>
                    <div className="conf-code" id="conf-code-display">{confirmationCode}</div>
                  </div>
                  <div style={{ marginTop: '12px', display: 'flex', gap: '12px' }}>
                    <Link to="/" className="btn-back">Back to Home</Link>
                    <Link to="/dashboard" className="btn-submit" id="go-dashboard-btn" style={{ display: 'inline-flex' }}>Go to Dashboard &rarr;</Link>
                  </div>
                </div>
              )}

              {submitError && !loading && !success && (
                <div id="submit-error" style={{ display: 'block' }}>
                  <strong>Error saving registration.</strong> Please try again or contact support if the issue persists.
                </div>
              )}

              {!loading && !success && (
                <>
                  <div className={`reg-panel ${step === 1 ? 'active' : ''}`} id="panel-1">
                    <div>
                      <div className="panel-section-title">01 &mdash; Account Setup</div>
                      <p style={{ fontSize: '13px', color: 'var(--dim)', marginTop: '8px' }}>
                        This will be used to log into the hacker dashboard and claim your prizes. Use an email you check frequently.
                      </p>
                    </div>
                    
                    <div className="field-group full">
                      <label htmlFor="email">Email Address <span className="req">*</span></label>
                      <input type="email" id="email" value={formData.email} onChange={handleChange} className={errors.email ? 'error' : ''} placeholder="you@university.edu" />
                      {errors.email && <div className="field-error show">{errors.email}</div>}
                    </div>

                    <div className="field-row">
                      <div className="field-group">
                        <label htmlFor="firstName">First Name <span className="req">*</span></label>
                        <input type="text" id="firstName" value={formData.firstName} onChange={handleChange} className={errors.firstName ? 'error' : ''} placeholder="Grace" />
                        {errors.firstName && <div className="field-error show">{errors.firstName}</div>}
                      </div>
                      <div className="field-group">
                        <label htmlFor="lastName">Last Name <span className="req">*</span></label>
                        <input type="text" id="lastName" value={formData.lastName} onChange={handleChange} className={errors.lastName ? 'error' : ''} placeholder="Hopper" />
                        {errors.lastName && <div className="field-error show">{errors.lastName}</div>}
                      </div>
                    </div>

                    <div className="field-row">
                      <div className="field-group">
                        <label htmlFor="password">Password <span className="req">*</span></label>
                        <input type="password" id="password" value={formData.password} onChange={handleChange} className={errors.password ? 'error' : ''} placeholder="&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;" />
                        {errors.password && <div className="field-error show">{errors.password}</div>}
                      </div>
                      <div className="field-group">
                        <label htmlFor="confirmPassword">Confirm Password <span className="req">*</span></label>
                        <input type="password" id="confirmPassword" value={formData.confirmPassword} onChange={handleChange} className={errors.confirmPassword ? 'error' : ''} placeholder="&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;" />
                        {errors.confirmPassword && <div className="field-error show">{errors.confirmPassword}</div>}
                      </div>
                    </div>
                  </div>

                  <div className={`reg-panel ${step === 2 ? 'active' : ''}`} id="panel-2">
                    <div>
                      <div className="panel-section-title">02 &mdash; Hacker Profile</div>
                      <p style={{ fontSize: '13px', color: 'var(--dim)', marginTop: '8px' }}>
                        Tell us a bit about who you are. This helps us tailor the workshops and mentorship.
                      </p>
                    </div>

                    <div className="field-row">
                      <div className="field-group">
                        <label htmlFor="phone">Phone Number <span className="req">*</span></label>
                        <input type="tel" id="phone" value={formData.phone} onChange={handleChange} className={errors.phone ? 'error' : ''} placeholder="(555) 123-4567" />
                        {errors.phone && <div className="field-error show">{errors.phone}</div>}
                      </div>
                      <div className="field-group">
                        <label htmlFor="age">Age <span className="req">*</span></label>
                        <input type="number" id="age" value={formData.age} onChange={handleChange} className={errors.age ? 'error' : ''} placeholder="18" min="18" max="99" />
                        {errors.age && <div className="field-error show">{errors.age}</div>}
                      </div>
                    </div>

                    <div className="field-row">
                      <div className="field-group full">
                        <label htmlFor="gender">Gender</label>
                        <select id="gender" value={formData.gender} onChange={handleChange}>
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Non-binary">Non-binary</option>
                          <option value="Prefer not to say">Prefer not to say</option>
                        </select>
                      </div>
                    </div>

                    <div className="field-row">
                      <div className="field-group field-autocomplete" ref={schoolWrapRef}>
                        <label htmlFor="school">University / School <span className="req">*</span></label>
                        <input type="text" id="school" value={formData.school} onChange={handleSchoolChange} className={errors.school ? 'error' : ''} placeholder="Search university..." autoComplete="off" />
                        {errors.school && <div className="field-error show">{errors.school}</div>}
                        <div className={`autocomplete-list ${showSchoolMatches ? 'open' : ''}`}>
                          {schoolMatches.map((m, idx) => (
                            <div key={idx} className={`autocomplete-item ${schoolActiveIdx === idx ? 'hi' : ''}`} onClick={() => {
                              setFormData(prev => ({ ...prev, school: m.n }));
                              setShowSchoolMatches(false);
                            }}>
                              {m.n}
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="field-group field-autocomplete" ref={majorWrapRef}>
                        <label htmlFor="major">Major <span className="req">*</span></label>
                        <input type="text" id="major" value={formData.major} onChange={handleMajorChange} className={errors.major ? 'error' : ''} placeholder="Search major..." autoComplete="off" />
                        {errors.major && <div className="field-error show">{errors.major}</div>}
                        <div className={`autocomplete-list ${showMajorMatches ? 'open' : ''}`}>
                          {majorMatches.map((m, idx) => (
                            <div key={idx} className={`autocomplete-item ${majorActiveIdx === idx ? 'hi' : ''}`} onClick={() => {
                              setFormData(prev => ({ ...prev, major: m.n }));
                              setShowMajorMatches(false);
                            }}>
                              {m.n}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="field-row">
                      <div className="field-group">
                        <label htmlFor="year">Graduation Year</label>
                        <select id="year" value={formData.year} onChange={handleChange}>
                          <option value="Freshman">Freshman</option>
                          <option value="Sophomore">Sophomore</option>
                          <option value="Junior">Junior</option>
                          <option value="Senior">Senior</option>
                          <option value="Graduate">Graduate</option>
                        </select>
                      </div>
                      <div className="field-group">
                        <label htmlFor="level">Level of Study</label>
                        <select id="level" value={formData.level} onChange={handleChange}>
                          <option value="Undergraduate">Undergraduate</option>
                          <option value="Graduate">Graduate</option>
                          <option value="Bootcamp/Other">Bootcamp / Other</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className={`reg-panel ${step === 3 ? 'active' : ''}`} id="panel-3">
                    <div>
                      <div className="panel-section-title">03 &mdash; Team &amp; Track</div>
                      <p style={{ fontSize: '13px', color: 'var(--dim)', marginTop: '8px' }}>
                        Teams can have up to 4 members. You can fly solo, bring friends, or find a team at the event.
                      </p>
                    </div>

                    <div className="field-group full">
                      <label htmlFor="teamStatus">Team Status <span className="req">*</span></label>
                      <select id="teamStatus" value={formData.teamStatus} onChange={handleChange}>
                        <option value="Solo">Solo (No team yet)</option>
                        <option value="Find at event">I want to find a team at the event</option>
                        <option value="Create a Team">Create a Team</option>
                        <option value="Join a Team">Join an Existing Team</option>
                      </select>
                    </div>

                    {(formData.teamStatus === 'Create a Team' || formData.teamStatus === 'Join a Team') && (
                      <div className="team-fields visible">
                        <div className="field-group">
                          <label htmlFor="teamName">Team Name <span className="req">*</span></label>
                          <input type="text" id="teamName" value={formData.teamName} onChange={handleChange} className={errors.teamName ? 'error' : ''} placeholder="e.g. The Debuggers" />
                          {errors.teamName && <div className="field-error show">{errors.teamName}</div>}
                          <div className="field-hint">Must match your teammates exactly</div>
                        </div>
                        {formData.teamStatus === 'Create a Team' && (
                          <div className="team-mates">
                            <div className="field-group">
                              <label htmlFor="teammate1">Teammate 1 Email</label>
                              <input type="email" id="teammate1" value={formData.teammate1} onChange={handleChange} placeholder="Optional" />
                            </div>
                            <div className="field-group">
                              <label htmlFor="teammate2">Teammate 2 Email</label>
                              <input type="email" id="teammate2" value={formData.teammate2} onChange={handleChange} placeholder="Optional" />
                            </div>
                            <div className="field-group">
                              <label htmlFor="teammate3">Teammate 3 Email</label>
                              <input type="email" id="teammate3" value={formData.teammate3} onChange={handleChange} placeholder="Optional" />
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="field-group full" style={{ marginTop: '16px' }}>
                      <label htmlFor="track">Intended Track</label>
                      <select id="track" value={formData.track} onChange={handleChange}>
                        <option value="Track 01">Track 01: AI &amp; Intelligence</option>
                        <option value="Track 02">Track 02: Civic &amp; Social Impact</option>
                        <option value="Track 03">Track 03: Hardware &amp; Embedded</option>
                        <option value="Track 04">Track 04: Open Innovation (Wildcard)</option>
                        <option value="Undecided">Undecided</option>
                      </select>
                    </div>
                  </div>

                  <div className={`reg-panel ${step === 4 ? 'active' : ''}`} id="panel-4">
                    <div>
                      <div className="panel-section-title">04 &mdash; Final Details</div>
                    </div>

                    <div className="field-group full">
                      <label htmlFor="tshirt">T-Shirt Size</label>
                      <select id="tshirt" value={formData.tshirt} onChange={handleChange}>
                        <option value="S">Small (S)</option>
                        <option value="M">Medium (M)</option>
                        <option value="L">Large (L)</option>
                        <option value="XL">X-Large (XL)</option>
                        <option value="XXL">XX-Large (XXL)</option>
                      </select>
                    </div>

                    <div className="field-group full">
                      <label>Dietary Restrictions</label>
                      <div className="dietary-grid">
                        <label className="diet-check">
                          <input type="checkbox" checked={formData.dietary.none} onChange={() => handleDietaryChange('none')} />
                          None
                        </label>
                        <label className="diet-check">
                          <input type="checkbox" checked={formData.dietary.vegetarian} onChange={() => handleDietaryChange('vegetarian')} />
                          Vegetarian
                        </label>
                        <label className="diet-check">
                          <input type="checkbox" checked={formData.dietary.vegan} onChange={() => handleDietaryChange('vegan')} />
                          Vegan
                        </label>
                        <label className="diet-check">
                          <input type="checkbox" checked={formData.dietary.halal} onChange={() => handleDietaryChange('halal')} />
                          Halal
                        </label>
                        <label className="diet-check">
                          <input type="checkbox" checked={formData.dietary.kosher} onChange={() => handleDietaryChange('kosher')} />
                          Kosher
                        </label>
                        <label className="diet-check">
                          <input type="checkbox" checked={formData.dietary.glutenFree} onChange={() => handleDietaryChange('glutenFree')} />
                          Gluten-Free
                        </label>
                        <label className="diet-check">
                          <input type="checkbox" checked={formData.dietary.nutAllergy} onChange={() => handleDietaryChange('nutAllergy')} />
                          Nut Allergy
                        </label>
                        <label className="diet-check">
                          <input type="checkbox" checked={formData.dietary.other} onChange={() => handleDietaryChange('other')} />
                          Other
                        </label>
                      </div>
                      {formData.dietary.other && (
                        <div className="dietary-other-wrap visible">
                          <input type="text" id="dietaryOtherText" value={formData.dietaryOtherText} onChange={handleChange} placeholder="Please specify..." />
                        </div>
                      )}
                    </div>

                    <div className="field-group full">
                      <label htmlFor="hearAbout">How did you hear about us?</label>
                      <select id="hearAbout" value={formData.hearAbout} onChange={handleChange}>
                        <option value="">Select one...</option>
                        <option value="Friend/Teammate">Friend / Teammate</option>
                        <option value="Professor/Class">Professor / Class</option>
                        <option value="Social Media">Social Media</option>
                        <option value="Campus Flyer">Campus Flyer</option>
                        <option value="Club/Organization">Club / Organization</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    <div className="field-group full">
                      <label htmlFor="notes">Anything else we should know?</label>
                      <textarea id="notes" value={formData.notes} onChange={handleChange} placeholder="Accommodations, special hardware requests, etc."></textarea>
                    </div>

                    <div className="checkbox-group" style={errors.photoConsent ? { borderColor: 'var(--error)' } : {}} onClick={() => setFormData(prev => ({ ...prev, photoConsent: !prev.photoConsent }))}>
                      <input type="checkbox" id="photoConsent" checked={formData.photoConsent} readOnly />
                      <div className="checkbox-label">
                        I agree to the <a href="#">Terms &amp; Conditions</a> and understand that photos/videos may be taken during the event for promotional purposes. <span className="req">*</span>
                      </div>
                    </div>
                  </div>

                  <div className="reg-nav">
                    {step > 1 ? (
                      <button className="btn-back" onClick={prevStep}>&larr; Back</button>
                    ) : (
                      <Link to="/" className="btn-back">&larr; Cancel</Link>
                    )}
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <span className="step-hint">Step {step} of {totalSteps}</span>
                      {step < totalSteps ? (
                        <button className="btn-next" onClick={nextStep}>Next &rarr;</button>
                      ) : (
                        <button className="btn-submit" onClick={handleSubmit}>Complete Registration</button>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="reg-sidebar">
            <div className="sidebar-card">
              <div className="sidebar-head">Quick Info</div>
              <div className="sidebar-item">
                <span className="sidebar-item-icon">&#128197;</span>
                <div><strong>When is it?</strong><br/>Spring 2027 (Date TBD)<br/>Check-in starts Friday @ 5 PM</div>
              </div>
              <div className="sidebar-item">
                <span className="sidebar-item-icon">&#128205;</span>
                <div><strong>Where is it?</strong><br/>STEM Building<br/>Kean University, NJ</div>
              </div>
              <div className="sidebar-item">
                <span className="sidebar-item-icon">&#128176;</span>
                <div><strong>Cost?</strong><br/>100% Free.<br/>Food and swag included.</div>
              </div>
            </div>
            <div className="sidebar-card">
              <div className="sidebar-head">Need Help?</div>
              <p style={{ fontSize: '13px', lineHeight: 1.5, color: 'var(--dim)' }}>
                Having trouble registering or have questions about the event? Shoot us an email and we'll get back to you ASAP.
              </p>
              <a href="mailto:acmkeanchapter@kean.edu" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--badge-lt)' }}>acmkeanchapter@kean.edu &rarr;</a>
            </div>
          </div>
        </div>
      </div>

      <footer className="reg-footer">
        <span className="reg-footer-copy">&copy; 2027 KeanUHackThis</span>
        <div style={{ display: 'flex', gap: '24px' }}>
          <a href="#">Privacy Policy</a>
          <a href="#">Code of Conduct</a>
        </div>
      </footer>
    </div>
  );
}
