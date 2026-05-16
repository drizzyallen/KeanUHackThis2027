import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import gsap from 'gsap';
import './Dashboard.css';

const BACKEND_URL = "http://localhost:3001/api";

export default function Dashboard() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Form states
  const [teamStatus, setTeamStatus] = useState("Going solo");
  const [teamName, setTeamName] = useState("");
  const [teammate1, setTeammate1] = useState("");
  const [teammate2, setTeammate2] = useState("");
  const [teammate3, setTeammate3] = useState("");
  const [track, setTrack] = useState("");
  const [tshirt, setTshirt] = useState("M");
  const [dietary, setDietary] = useState<string[]>([]);
  const [dietaryOtherText, setDietaryOtherText] = useState("");

  const [saving, setSaving] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  // Save differences
  const [changes, setChanges] = useState<any[]>([]);
  const [showDiff, setShowDiff] = useState(false);
  
  const [snapshot, setSnapshot] = useState<any>({});

  // Toast
  const [toastMsg, setToastMsg] = useState("");
  const [toastType, setToastType] = useState("");
  const toastRef = useRef<HTMLDivElement>(null);
  const toastTimerRef = useRef<NodeJS.Timeout>();

  const navigate = useNavigate();

  useEffect(() => {
    let s;
    try {
      const raw = localStorage.getItem("kuh_session");
      if (raw) {
        s = JSON.parse(raw);
        if (s.expiresAt > Date.now()) {
          setSession(s);
          populateForm(s);
        } else {
          localStorage.removeItem("kuh_session");
        }
      }
    } catch(e) {}

    if (!s || s.expiresAt <= Date.now()) {
      navigate('/login');
      return;
    }

    // Server verification
    if (s.token) {
      const url = `${BACKEND_URL}/user?email=${encodeURIComponent(s.email)}&token=${s.token}`;
      fetch(url).then(r => r.json()).then(data => {
        if (data.success && data.user) {
          const newSession = { ...s, ...data.user };
          setSession(newSession);
          localStorage.setItem("kuh_session", JSON.stringify(newSession));
          populateForm(newSession);
        }
      }).catch(() => {});
    }

    setLoading(false);

    // Initial animations
    if (!window.matchMedia || !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      gsap.fromTo("#dash-hero", { opacity: 0 }, { opacity: 1, duration: 0.6, ease: "power2.out", delay: 0.1 });
      gsap.fromTo("#dash-body .dash-card",
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.5, stagger: 0.1, ease: "power2.out", delay: 0.25 }
      );
    }
  }, [navigate]);

  const populateForm = (u: any) => {
    setTeamStatus(u.teamStatus || "Going solo");
    setTeamName(u.teamName || "");
    setTeammate1(u.teammate1 || "");
    setTeammate2(u.teammate2 || "");
    setTeammate3(u.teammate3 || "");
    setTrack(u.track || "");
    setTshirt(u.tshirt || "M");
    
    // Parse dietary
    let dietArr = (u.dietary || "").split(",").map((s: string) => s.trim().replace(/^Other: /, "Other"));
    let dOther = "";
    if (dietArr.includes("Other")) {
      const raw = (u.dietary || "").split(",").find((v: string) => v.trim().startsWith("Other:"));
      if (raw) dOther = raw.replace("Other:", "").trim();
    }
    if (!dietArr.length || dietArr[0] === "") dietArr = ["None / No restrictions"];
    setDietary(dietArr);
    setDietaryOtherText(dOther);

    setSnapshot({
      teamStatus: u.teamStatus || "Going solo",
      teamName: u.teamName || "",
      teammate1: u.teammate1 || "",
      teammate2: u.teammate2 || "",
      teammate3: u.teammate3 || "",
      track: u.track || "",
      tshirt: u.tshirt || "M",
      dietary: u.dietary || "None / No restrictions"
    });
  };

  const getDietaryString = () => {
    let vals: string[] = [];
    dietary.forEach(d => {
      if (d === "Other") {
        vals.push(dietaryOtherText.trim() ? "Other: " + dietaryOtherText.trim() : "Other");
      } else {
        vals.push(d);
      }
    });
    return vals.length ? vals.join(", ") : "None / No restrictions";
  };

  const showToast = (msg: string, type: string) => {
    setToastMsg(msg);
    setToastType(type);
    if (toastRef.current) {
      clearTimeout(toastTimerRef.current);
      gsap.to(toastRef.current, { opacity: 1, y: 0, duration: 0.3, ease: "power2.out" });
      toastTimerRef.current = setTimeout(() => {
        if (toastRef.current) {
          gsap.to(toastRef.current, { opacity: 0, y: 20, duration: 0.3, ease: "power2.in" });
        }
      }, 3000);
    }
  };

  const handleDietaryChange = (val: string, checked: boolean) => {
    if (val === "None / No restrictions" && checked) {
      setDietary(["None / No restrictions"]);
    } else {
      let newDiet = dietary.filter(d => d !== "None / No restrictions");
      if (checked) {
        newDiet.push(val);
      } else {
        newDiet = newDiet.filter(d => d !== val);
      }
      setDietary(newDiet);
    }
  };

  const handleSave = () => {
    setSaving(true);
    
    const nowStr = getDietaryString();
    const now = {
      teamStatus, teamName, teammate1, teammate2, teammate3, track, tshirt, dietary: nowStr
    };

    const LABELS: Record<string, string> = {
      teamStatus: "Team Status", teamName: "Team Name",
      teammate1: "Teammate 1", teammate2: "Teammate 2", teammate3: "Teammate 3",
      track: "Track", tshirt: "T-Shirt", dietary: "Dietary",
    };
    
    const diffs: any[] = [];
    Object.keys(LABELS).forEach(k => {
      const snapVal = (snapshot as any)[k] || "—";
      const nowVal = (now as any)[k] || "—";
      if (snapVal !== nowVal) {
        diffs.push({ label: LABELS[k], from: snapVal, to: nowVal });
      }
    });

    setChanges(diffs);
    setShowDiff(true);
    setTimeout(() => setShowDiff(false), 7000);

    const payload = { action: "updateRegistration", email: session.email, confirmationCode: session.confirmationCode, ...now };

    const newSession = { ...session, ...now };
    setSession(newSession);
    localStorage.setItem("kuh_session", JSON.stringify(newSession));
    setSnapshot({ ...now });

    fetch(`${BACKEND_URL}/update`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).then(() => {
      setSaving(false);
      showToast(diffs.length ? `${diffs.length} change${diffs.length !== 1 ? 's' : ''} saved` : "Nothing changed", diffs.length ? "success" : "");
    }).catch(() => {
      setSaving(false);
      showToast("Saved locally — syncing soon", "success");
    });
  };

  const handleCancelRegistration = () => {
    setCancelling(true);
    const payload = {
      action: "cancelRegistration",
      email: session.email,
      confirmationCode: session.confirmationCode,
      firstName: session.firstName,
    };

    const newSession = { ...session, status: "Cancelled" };
    setSession(newSession);
    localStorage.setItem("kuh_session", JSON.stringify(newSession));

    fetch(`${BACKEND_URL}/cancel`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).then(() => {
      setShowCancelModal(false);
      setCancelling(false);
      showToast("Registration cancelled", "error");
    }).catch(() => {
      setShowCancelModal(false);
      setCancelling(false);
      showToast("Cancelled — confirmation email on the way", "error");
    });
  };

  const handleLogout = () => {
    localStorage.removeItem("kuh_session");
    navigate('/login');
  };

  if (loading || !session) return null;

  const isCancelled = (session.status || "").toLowerCase() === "cancelled";

  return (
    <div className="page-wrap" style={{ paddingTop: '64px', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <nav className="site-nav" id="site-nav">
        <Link to="/" className="nav-logo">
          <img src="/uploads/hackathon_logo2026.png" alt="KeanUHackThis logo" />
          <span className="nav-logo-text">KeanUHackThis</span>
        </Link>
        <div className="nav-right">
          <span className="nav-greeting" id="nav-greeting">Hi, {session.firstName}</span>
          <button className="nav-logout" id="logoutBtn" onClick={handleLogout}>Log Out</button>
        </div>
      </nav>

      <div className={`cancelled-banner ${isCancelled ? 'show' : ''}`} id="cancelled-banner">
        Your registration has been cancelled. Re-register any time at <Link to="/register" style={{ color: 'var(--error)', textDecoration: 'underline' }}>register here</Link>.
      </div>

      <div className="dash-hero" id="dash-hero">
        <div className="dash-hero-bg"></div>
        <div className="dash-hero-inner">
          <div>
            <p className="dash-eyebrow">KeanUHackThis 2027 — My Registration</p>
            <h1 className="dash-title" id="dash-title">Hi, {session.firstName}.</h1>
            <div className={`status-chip ${isCancelled ? 'cancelled' : 'registered'}`} id="status-chip">
              <div className="dot"></div>
              <span id="status-text">{isCancelled ? 'Cancelled' : 'Registered'}</span>
            </div>
          </div>
          <div className="conf-badge" id="conf-badge">
            Participant ID &nbsp;<strong id="conf-code-display">{session.confirmationCode || "—"}</strong>
          </div>
        </div>
      </div>

      <div className="dash-body" id="dash-body">
        
        <div className="dash-card" id="card-details">
          <div className="card-head"><span className="card-head-title">Registration Details</span></div>
          <div className="card-body">
            <div className="info-grid">
              <div className="info-item"><span className="info-label">Name</span><span className="info-val">{session.firstName} {session.lastName}</span></div>
              <div className="info-item"><span className="info-label">Email</span><span className="info-val">{session.email}</span></div>
              <div className="info-item"><span className="info-label">School</span><span className="info-val">{session.school || "—"}</span></div>
              <div className="info-item"><span className="info-label">Major</span><span className="info-val">{session.major || "—"}</span></div>
              <div className="info-item"><span className="info-label">Year</span><span className="info-val">{session.year || "—"}</span></div>
              <div className="info-item"><span className="info-label">Experience</span><span className="info-val">{session.level || "—"}</span></div>
              <div className="info-item"><span className="info-label">Age</span><span className="info-val">{session.age || "—"}</span></div>
              <div className="info-item"><span className="info-label">Phone</span><span className="info-val">{session.phone || "—"}</span></div>
            </div>
          </div>
        </div>

        {isCancelled ? (
          <div className="dash-card" id="card-cancelled" style={{ borderColor: 'rgba(224,92,92,0.2)' }}>
            <div className="cancelled-card-body">
              <div className="cancelled-card-icon">✗</div>
              <h2 className="cancelled-card-title">Registration Cancelled</h2>
              <p className="cancelled-card-sub">Your spot at KeanUHackThis 2027 has been released. If you'd like to attend, you can re-register while spots are still available.</p>
              <Link to="/register" className="btn-reregister">Re-register →</Link>
            </div>
          </div>
        ) : (
          <>
            <div className="dash-card" id="card-team">
              <div className="card-head">
                <span className="card-head-title">Team &amp; Preferences</span>
                <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '9px', color: 'var(--muted)', letterSpacing: '0.10em' }}>AUTO-SYNCS TO SHEET</span>
              </div>
              <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                
                <div className="edit-grid">
                  <div className="field-group">
                    <label className="field-label" htmlFor="d-teamStatus">Team Status</label>
                    <select id="d-teamStatus" value={teamStatus} onChange={e => setTeamStatus(e.target.value)}>
                      <option value="I have a team (1–4 people)">I have a team (1–4 people)</option>
                      <option value="Looking to join a team">Looking to join a team</option>
                      <option value="Going solo">Going solo</option>
                      <option value="Solo">Solo (No team yet)</option>
                      <option value="Find at event">I want to find a team at the event</option>
                      <option value="Create a Team">Create a Team</option>
                      <option value="Join a Team">Join an Existing Team</option>
                    </select>
                  </div>
                  
                  <div className="field-group">
                    <label className="field-label" htmlFor="d-track">Preferred Track</label>
                    <select id="d-track" value={track} onChange={e => setTrack(e.target.value)}>
                      <option value="">No preference</option>
                      <option value="Track 01">Track 01: AI &amp; Intelligence</option>
                      <option value="Track 02">Track 02: Civic &amp; Social Impact</option>
                      <option value="Track 03">Track 03: Hardware &amp; Embedded</option>
                      <option value="Track 04">Track 04: Open Innovation (Wildcard)</option>
                      <option value="Undecided">Undecided</option>
                      <option value="AI & Machine Learning">AI &amp; Machine Learning</option>
                      <option value="Cybersecurity">Cybersecurity</option>
                      <option value="Web & Mobile">Web &amp; Mobile</option>
                      <option value="Social Impact">Social Impact</option>
                    </select>
                  </div>

                  <div className="field-group">
                    <label className="field-label" htmlFor="d-tshirt">T-Shirt Size</label>
                    <select id="d-tshirt" value={tshirt} onChange={e => setTshirt(e.target.value)}>
                      <option value="XS">XS</option><option value="S">S</option><option value="M">M</option>
                      <option value="L">L</option><option value="XL">XL</option><option value="XXL">XXL</option>
                    </select>
                  </div>

                  <div className={`team-extra ${teamStatus.includes("team") && !teamStatus.includes("Looking") && !teamStatus.includes("Find") ? 'visible' : ''}`} id="d-team-extra">
                    <div className="field-group">
                      <label className="field-label" htmlFor="d-teamName">Team Name</label>
                      <input type="text" id="d-teamName" placeholder="e.g. ByteStorm" value={teamName} onChange={e => setTeamName(e.target.value)} />
                      <span className="field-hint">⚠ All teammates must use identical spelling</span>
                    </div>
                    <div className="field-group">
                      <label className="field-label">Teammate Names</label>
                      <div className="mates">
                        <input type="text" id="d-mate1" placeholder="Teammate 1 — Full Name" value={teammate1} onChange={e => setTeammate1(e.target.value)} />
                        <input type="text" id="d-mate2" placeholder="Teammate 2 — Full Name (optional)" value={teammate2} onChange={e => setTeammate2(e.target.value)} />
                        <input type="text" id="d-mate3" placeholder="Teammate 3 — Full Name (optional)" value={teammate3} onChange={e => setTeammate3(e.target.value)} />
                      </div>
                    </div>
                  </div>

                  <div className="field-group full">
                    <label className="field-label">Dietary Restrictions / Allergies</label>
                    <div className="dietary-grid">
                      {["None / No restrictions", "Vegetarian", "Vegan", "Halal", "Kosher", "Gluten-Free", "Nut Allergy", "Dairy-Free", "Shellfish Allergy", "Other"].map(d => (
                        <label className="diet-check" key={d}>
                          <input type="checkbox" checked={dietary.includes(d)} onChange={e => handleDietaryChange(d, e.target.checked)} /> {d}
                        </label>
                      ))}
                    </div>
                    <div className={`dietary-other-wrap ${dietary.includes("Other") ? 'visible' : ''}`}>
                      <input type="text" placeholder="Please specify…" value={dietaryOtherText} onChange={e => setDietaryOtherText(e.target.value)} />
                    </div>
                  </div>
                </div>

                <div className="card-actions">
                  <button className="btn-save" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</button>
                </div>

                <div className={`save-diff ${showDiff ? 'visible' : ''}`}>
                  {changes.length === 0 ? (
                    <div className="save-diff-title">✓ &nbsp;No changes detected</div>
                  ) : (
                    <>
                      <div className="save-diff-title">✓ &nbsp;{changes.length} change{changes.length !== 1 ? 's' : ''} updated</div>
                      {changes.map((c, i) => (
                        <div className="diff-row" key={i}>
                          <span className="diff-label">{c.label}</span>
                          <span className="diff-old">{c.from}</span>
                          <span className="diff-arrow">&nbsp;→&nbsp;</span>
                          <span className="diff-new">{c.to}</span>
                        </div>
                      ))}
                    </>
                  )}
                </div>

              </div>
            </div>

            <div className="dash-card" id="card-danger" style={{ borderColor: 'rgba(224,92,92,0.15)' }}>
              <div className="card-head" style={{ borderColor: 'rgba(224,92,92,0.15)' }}>
                <span className="card-head-title" style={{ color: 'rgba(224,92,92,0.6)' }}>Danger Zone</span>
              </div>
              <div className="card-body" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '20px', flexWrap: 'wrap' }}>
                <div>
                  <p style={{ fontSize: '14px', color: 'var(--text)', fontWeight: 600, marginBottom: '4px' }}>Cancel Registration</p>
                  <p style={{ fontSize: '13px', color: 'var(--dim)', lineHeight: 1.5 }}>Permanently cancel your spot. You can re-register if spots are still available.</p>
                </div>
                <button className="btn-danger" onClick={() => setShowCancelModal(true)}>Cancel Registration</button>
              </div>
            </div>
          </>
        )}
      </div>

      <div className={`modal-overlay ${showCancelModal ? 'open' : ''}`}>
        <div className="modal">
          <p className="modal-title">Cancel your registration?</p>
          <p className="modal-body">This will remove your spot at KeanUHackThis 2027. A confirmation email will be sent. You can re-register if spots are still available.</p>
          <div className="modal-actions">
            <button className="btn-danger" onClick={handleCancelRegistration} disabled={cancelling} style={{ flex: 1, justifyContent: 'center' }}>
              {cancelling ? 'Cancelling...' : 'Yes, cancel it'}
            </button>
            <button className="btn-outline" onClick={() => setShowCancelModal(false)} style={{ flex: 1, textAlign: 'center' }}>Keep my spot</button>
          </div>
        </div>
      </div>

      <div className={`toast ${toastType}`} ref={toastRef}>{toastMsg}</div>
    </div>
  );
}
