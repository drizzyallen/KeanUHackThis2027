import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import gsap from 'gsap';
import './Dashboard.css';
import { SCHOOLS, MAJORS } from '../utils/data';

const BACKEND_URL = "http://localhost:3001/api";

const DIETARY_VALUE_MAP: Record<string, string> = {
  none: "None / No restrictions",
  vegetarian: "Vegetarian",
  vegan: "Vegan",
  halal: "Halal",
  kosher: "Kosher",
  glutenFree: "Gluten-Free",
  "gluten-free": "Gluten-Free",
  nutAllergy: "Nut Allergy",
  "nut allergy": "Nut Allergy",
  other: "Other",
};

const DIETARY_OPTIONS = [
  "None / No restrictions",
  "Vegetarian",
  "Vegan",
  "Halal",
  "Kosher",
  "Gluten-Free",
  "Nut Allergy",
  "Other",
];

export default function Dashboard() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [registration, setRegistration] = useState<any>(null);
  const [teamInfo, setTeamInfo] = useState<any>(null);
  const [teams, setTeams] = useState<any[]>([]);

  // Form states
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [age, setAge] = useState("");
  const [school, setSchool] = useState("");
  const [major, setMajor] = useState("");
  const [year, setYear] = useState("Freshman");
  const [level, setLevel] = useState("Undergraduate");
  const [teamStatus, setTeamStatus] = useState("Solo");
  const [teamName, setTeamName] = useState("");
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [track, setTrack] = useState("");
  const [tshirt, setTshirt] = useState("M");
  const [dietary, setDietary] = useState<string[]>([]);
  const [dietaryOtherText, setDietaryOtherText] = useState("");
  const [gender, setGender] = useState("");
  const [hearAbout, setHearAbout] = useState("");
  const [notes, setNotes] = useState("");

  const [schoolMatches, setSchoolMatches] = useState<any[]>([]);
  const [showSchoolMatches, setShowSchoolMatches] = useState(false);
  const [majorMatches, setMajorMatches] = useState<any[]>([]);
  const [showMajorMatches, setShowMajorMatches] = useState(false);
  const schoolWrapRef = useRef<HTMLDivElement>(null);
  const majorWrapRef = useRef<HTMLDivElement>(null);

  const [saving, setSaving] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showDeleteTeamModal, setShowDeleteTeamModal] = useState(false);
  const [showTeamStatusWarning, setShowTeamStatusWarning] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [deletingTeam, setDeletingTeam] = useState(false);
  const [pendingTeamStatus, setPendingTeamStatus] = useState("");

  // Save differences
  const [changes, setChanges] = useState<any[]>([]);
  const [showDiff, setShowDiff] = useState(false);
  
  const [snapshot, setSnapshot] = useState<any>({});

  // Toast
  const [toastMsg, setToastMsg] = useState("");
  const [toastType, setToastType] = useState("");
  const toastRef = useRef<HTMLDivElement>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const navigate = useNavigate();

  useEffect(() => {
    let s;
    try {
      const raw = localStorage.getItem("kuh_session");
        if (raw) {
          s = JSON.parse(raw);
          if (s.expiresAt > Date.now()) {
            setSession(s);
          } else {
            localStorage.removeItem("kuh_session");
          }
      }
    } catch(e) {}

    if (!s || s.expiresAt <= Date.now()) {
      navigate('/?login=1');
      return;
    }

    if (s.token) {
      fetch(`${BACKEND_URL}/me`, {
        headers: { Authorization: `Bearer ${s.token}` },
      }).then(r => r.json()).then(data => {
        if (!data.success) {
          if (data.error?.toLowerCase().includes("token")) {
            localStorage.removeItem("kuh_session");
            navigate('/?login=1');
          } else {
            populateForm(s);
          }
          return;
        }
        const newSession = { ...mapServerUser(data.user, data.registration, s), team: data.team || null };
        setRegistration(data.registration || null);
        setTeamInfo(data.team || null);
        setSession(newSession);
        localStorage.setItem("kuh_session", JSON.stringify(newSession));
        populateForm(newSession);
      }).catch(() => {});
    } else {
      populateForm(s);
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

  useEffect(() => {
    if (teamStatus !== 'Join a Team') return;

    fetch(`${BACKEND_URL}/teams`)
      .then(response => response.json())
      .then(data => {
        if (data.success) setTeams(data.teams || []);
      })
      .catch(() => setTeams([]));
  }, [teamStatus]);

  useEffect(() => {
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

  const getMatchList = (val: string, items: any[]) => {
    if (!val || val.length < 2) return [];
    const q = val.toLowerCase().trim();
    return items.filter(item => {
      if (item.n.toLowerCase().includes(q)) return true;
      return item.a.some((alias: string) => alias.toLowerCase().includes(q));
    }).slice(0, 5);
  };

  const handleSchoolChange = (value: string) => {
    setSchool(value);
    const matches = getMatchList(value, SCHOOLS);
    setSchoolMatches(matches);
    setShowSchoolMatches(matches.length > 0);
  };

  const handleMajorChange = (value: string) => {
    setMajor(value);
    const matches = getMatchList(value, MAJORS);
    setMajorMatches(matches);
    setShowMajorMatches(matches.length > 0);
  };

  const mapServerUser = (user: any, reg: any, existingSession: any) => ({
    ...existingSession,
    userId: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    registrationId: reg?.id || existingSession.registrationId,
    phone: reg?.phone || "",
    age: reg?.age || "",
    gender: reg?.gender || "",
    school: reg?.college_university || "",
    major: reg?.major || "",
    year: reg?.year_of_study || "",
    level: reg?.level_of_study || "",
    teamStatus: reg?.team_status || "",
    track: reg?.intended_track || "",
    tshirt: reg?.tshirt_size || "M",
    dietary: reg?.dietary_restrictions || "",
    hearAbout: reg?.referral_source || "",
    notes: reg?.additional_info || "",
    status: reg ? "Registered" : "No Registration",
  });

  const normalizeDietaryValue = (value: string) => {
    const trimmed = value.trim();
    return DIETARY_VALUE_MAP[trimmed] || DIETARY_VALUE_MAP[trimmed.toLowerCase()] || trimmed;
  };

  const parseDietary = (rawDietary: string) => {
    const rawParts = (rawDietary || "")
      .split(",")
      .map(part => part.trim())
      .filter(Boolean);

    let otherText = "";
    const values = rawParts.map(part => {
      if (part.toLowerCase().startsWith("other:")) {
        otherText = part.slice(part.indexOf(":") + 1).trim();
        return "Other";
      }
      if (part.toLowerCase().includes("(other:")) {
        const match = part.match(/\(Other:\s*(.*?)\)$/i);
        if (match) otherText = match[1].trim();
        return "Other";
      }
      return normalizeDietaryValue(part);
    });

    const uniqueValues = Array.from(new Set(values));
    return {
      values: uniqueValues.length ? uniqueValues : ["None / No restrictions"],
      otherText,
    };
  };

  const populateForm = (u: any) => {
    setFirstName(u.firstName || "");
    setLastName(u.lastName || "");
    setPhone(u.phone || "");
    setAge(u.age || "");
    setSchool(u.school || "");
    setMajor(u.major || "");
    setYear(u.year || "Freshman");
    setLevel(u.level || "Undergraduate");
    setTeamStatus(u.teamStatus || "Solo");
    setTeamName(u.team?.isCreator ? u.team.teamName : (u.teamName || ""));
    setSelectedTeamId(u.team?.id ? String(u.team.id) : "");
    setTrack(u.track || "");
    setTshirt(u.tshirt || "M");
    setGender(u.gender || "");
    setHearAbout(u.hearAbout || "");
    setNotes(u.notes || "");
    
    const parsedDietary = parseDietary(u.dietary || "");
    setDietary(parsedDietary.values);
    setDietaryOtherText(parsedDietary.otherText);

    setSnapshot({
      firstName: u.firstName || "",
      lastName: u.lastName || "",
      phone: u.phone || "",
      age: u.age || "",
      school: u.school || "",
      major: u.major || "",
      year: u.year || "Freshman",
      level: u.level || "Undergraduate",
      teamStatus: u.teamStatus || "Solo",
      teamName: u.teamName || "",
      selectedTeamId: u.team?.id ? String(u.team.id) : "",
      track: u.track || "",
      tshirt: u.tshirt || "M",
      dietary: u.dietary || "None / No restrictions",
      gender: u.gender || "",
      hearAbout: u.hearAbout || "",
      notes: u.notes || "",
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
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
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

  const handleTeamStatusChange = (nextStatus: string) => {
    if (teamInfo?.isCreator && teamStatus === 'Create a Team' && nextStatus !== 'Create a Team') {
      setPendingTeamStatus(nextStatus);
      setShowTeamStatusWarning(true);
      return;
    }

    if (nextStatus === 'Join a Team' && teamInfo?.isCreator) {
      setSelectedTeamId("");
    }
    setTeamStatus(nextStatus);
  };

  const confirmTeamStatusChange = () => {
    setTeamStatus(pendingTeamStatus);
    if (pendingTeamStatus === 'Join a Team') {
      setSelectedTeamId("");
    }
    setPendingTeamStatus("");
    setShowTeamStatusWarning(false);
  };

  const handleSave = async () => {
    setSaving(true);

    if (!firstName.trim() || !lastName.trim() || !phone.trim() || !age || !school.trim() || !major.trim()) {
      setSaving(false);
      showToast("Name, phone, age, school, and major are required", "error");
      return;
    }
    if (teamStatus === 'Create a Team' && !teamName.trim()) {
      setSaving(false);
      showToast("Team name is required", "error");
      return;
    }
    if (teamStatus === 'Join a Team' && !selectedTeamId) {
      setSaving(false);
      showToast("Select a team to join", "error");
      return;
    }
    
    const nowStr = getDietaryString();
    const now = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phone: phone.trim(),
      age,
      school: school.trim(),
      major: major.trim(),
      year,
      level,
      teamStatus, teamName, selectedTeamId, track, tshirt, dietary: nowStr, gender, hearAbout, notes
    };

    const LABELS: Record<string, string> = {
      firstName: "First Name", lastName: "Last Name",
      phone: "Phone", age: "Age", school: "School", major: "Major",
      year: "Year of Study", level: "Level of Study",
      teamStatus: "Team Status", teamName: "Team Name",
      selectedTeamId: "Selected Team",
      track: "Track", tshirt: "T-Shirt", dietary: "Dietary",
      gender: "Gender", hearAbout: "Referral Source", notes: "Additional Info",
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

    const payload = {
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      phone: phone.trim(),
      age,
      gender,
      college_university: school.trim(),
      major: major.trim(),
      year_of_study: year,
      level_of_study: level,
      team_status: teamStatus,
      team_name: teamStatus === 'Create a Team' ? teamName : undefined,
      team_id: teamStatus === 'Join a Team' ? selectedTeamId : undefined,
      intended_track: track,
      tshirt_size: tshirt,
      dietary_restrictions: nowStr,
      referral_source: hearAbout,
      additional_info: notes,
    };

    fetch(`${BACKEND_URL}/register`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.token}`,
      },
      body: JSON.stringify(payload),
    }).then(async response => {
      const data = await response.json();
      if (!data.success) {
        setSaving(false);
        showToast(data.error || "Update failed", "error");
        return;
      }

      if ((teamStatus === 'Create a Team' || teamStatus === 'Join a Team') && !data.team) {
        setSaving(false);
        showToast("Team was not created. Restart the server and try again.", "error");
        return;
      }

      if (!data.profile || !data.registration) {
        const meResponse = await fetch(`${BACKEND_URL}/me`, {
          headers: { Authorization: `Bearer ${session.token}` },
        });
        const meData = await meResponse.json();

        if (meData.success && meData.user && meData.registration) {
          const refreshedSession = { ...mapServerUser(meData.user, meData.registration, session), team: meData.team || null };
          setRegistration(meData.registration);
          setTeamInfo(meData.team || null);
          setSession(refreshedSession);
          localStorage.setItem("kuh_session", JSON.stringify(refreshedSession));
          populateForm(refreshedSession);
          setSnapshot({
            firstName: refreshedSession.firstName || "",
            lastName: refreshedSession.lastName || "",
            phone: refreshedSession.phone || "",
            age: refreshedSession.age || "",
            school: refreshedSession.school || "",
            major: refreshedSession.major || "",
            year: refreshedSession.year || "Freshman",
            level: refreshedSession.level || "Undergraduate",
            teamStatus: refreshedSession.teamStatus || "Solo",
            teamName: refreshedSession.team?.isCreator ? refreshedSession.team.teamName : "",
            selectedTeamId: refreshedSession.team?.id ? String(refreshedSession.team.id) : "",
            track: refreshedSession.track || "",
            tshirt: refreshedSession.tshirt || "M",
            dietary: refreshedSession.dietary || "None / No restrictions",
            gender: refreshedSession.gender || "",
            hearAbout: refreshedSession.hearAbout || "",
            notes: refreshedSession.notes || "",
          });
          setSaving(false);
          showToast(diffs.length ? `${diffs.length} change${diffs.length !== 1 ? 's' : ''} saved` : "Nothing changed", diffs.length ? "success" : "");
          return;
        }

        setSaving(false);
        showToast("Could not confirm saved changes from Supabase.", "error");
        return;
      }

      setRegistration(data.registration);
      setTeamInfo(data.team || null);
      const saved = {
        firstName: data.profile.first_name,
        lastName: data.profile.last_name,
        phone: data.registration.phone || "",
        age: data.registration.age || "",
        gender: data.registration.gender || "",
        school: data.registration.college_university || "",
        major: data.registration.major || "",
        year: data.registration.year_of_study || "",
        level: data.registration.level_of_study || "",
        teamStatus: data.registration.team_status || "",
        teamName: data.team?.isCreator ? data.team.teamName : "",
        selectedTeamId: data.team?.id ? String(data.team.id) : "",
        track: data.registration.intended_track || "",
        tshirt: data.registration.tshirt_size || "M",
        dietary: data.registration.dietary_restrictions || "",
        hearAbout: data.registration.referral_source || "",
        notes: data.registration.additional_info || "",
      };
      const newSession = { ...session, ...saved };
      setSession(newSession);
      localStorage.setItem("kuh_session", JSON.stringify(newSession));
      setSnapshot({ ...saved });
      populateForm(newSession);
      setSaving(false);
      showToast(diffs.length ? `${diffs.length} change${diffs.length !== 1 ? 's' : ''} saved` : "Nothing changed", diffs.length ? "success" : "");
    }).catch(() => {
      setSaving(false);
    });
  };

  const handleRemoveTeamMember = async (memberUserId: string) => {
    if (!teamInfo) return;

    fetch(`${BACKEND_URL}/teams/${teamInfo.id}/members/${memberUserId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${session.token}`,
      },
    }).then(async response => {
      const data = await response.json();
      if (!data.success) {
        showToast(data.error || "Could not remove team member", "error");
        return;
      }

      setTeamInfo(data.team);
      showToast("Team member removed", "success");
    }).catch(() => {
      showToast("Could not remove team member", "error");
    });
  };

  const handleDeleteTeam = async () => {
    if (!teamInfo?.isCreator) return;

    setDeletingTeam(true);
    fetch(`${BACKEND_URL}/teams/${teamInfo.id}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${session.token}`,
      },
    }).then(async response => {
      const data = await response.json();
      if (!data.success) {
        setDeletingTeam(false);
        showToast(data.error || "Team could not be deleted", "error");
        return;
      }

      const newSession = { ...session, teamStatus: "Solo", team: null };
      setTeamInfo(null);
      setTeamStatus("Solo");
      setTeamName("");
      setSelectedTeamId("");
      setSession(newSession);
      localStorage.setItem("kuh_session", JSON.stringify(newSession));
      setShowDeleteTeamModal(false);
      setDeletingTeam(false);
      showToast("Team deleted", "success");
    }).catch(() => {
      setDeletingTeam(false);
      showToast("Team could not be deleted", "error");
    });
  };

  const handleCancelRegistration = () => {
    setCancelling(true);
    const payload = {
      action: "cancelRegistration",
      email: session.email,
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
    navigate('/?login=1');
  };

  if (loading || !session) return null;

  const isCancelled = (session.status || "").toLowerCase() === "cancelled";
  const hasRegistration = Boolean(registration || session.registrationId);
  const creatorLeavingTeam = Boolean(teamInfo?.isCreator && teamStatus !== 'Create a Team');
  const isCreatorOwnTeam = (team: any) => Boolean(teamInfo?.isCreator && team.id === teamInfo.id);

  return (
    <div className="page-wrap" style={{ paddingTop: '78px', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
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
              <span id="status-text">{isCancelled ? 'Cancelled' : hasRegistration ? 'Registered' : 'No Registration'}</span>
            </div>
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
              <div className="info-item"><span className="info-label">Gender</span><span className="info-val">{session.gender || "N/A"}</span></div>
              <div className="info-item"><span className="info-label">Heard From</span><span className="info-val">{session.hearAbout || "N/A"}</span></div>
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
            {teamInfo && (
              <div className="dash-card" id="card-team-roster">
                <div className="card-head">
                  <span className="card-head-title">Team</span>
                  <span className="card-head-note">{teamInfo.memberCount} / {teamInfo.maxMembers} Members</span>
                </div>
                <div className="card-body">
                  <div className="team-roster-head">
                    <div>
                      <div className="team-roster-name">{teamInfo.teamName}</div>
                      <div className="team-roster-meta">Team #{teamInfo.id} · Creator: {teamInfo.creatorName}</div>
                    </div>
                    {teamInfo.isCreator && (
                      <button className="btn-danger" onClick={() => setShowDeleteTeamModal(true)}>Delete Team</button>
                    )}
                  </div>
                  <div className="team-member-list">
                    {teamInfo.members.map((member: any) => (
                      <div className="team-member-row" key={member.userId}>
                        <div>
                          <div className="team-member-name">{member.name}{member.isCreator ? ' · Creator' : ''}</div>
                          <div className="team-member-email">{member.email || 'Email unavailable'}</div>
                        </div>
                        {teamInfo.isCreator && !member.isCreator && (
                          <button className="btn-outline" onClick={() => handleRemoveTeamMember(member.userId)}>Remove</button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className="dash-card" id="card-team">
              <div className="card-head">
                <span className="card-head-title">Edit Registration</span>
                <span className="card-head-note">Email locked</span>
              </div>
              <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                
                <div className="edit-grid">
                  <div className="field-group">
                    <label className="field-label" htmlFor="d-firstName">First Name</label>
                    <input type="text" id="d-firstName" value={firstName} onChange={e => setFirstName(e.target.value)} />
                  </div>

                  <div className="field-group">
                    <label className="field-label" htmlFor="d-lastName">Last Name</label>
                    <input type="text" id="d-lastName" value={lastName} onChange={e => setLastName(e.target.value)} />
                  </div>

                  <div className="field-group full">
                    <label className="field-label" htmlFor="d-email">Email</label>
                    <input type="email" id="d-email" value={session.email} disabled readOnly />
                  </div>

                  <div className="field-group">
                    <label className="field-label" htmlFor="d-phone">Phone</label>
                    <input type="tel" id="d-phone" value={phone} onChange={e => setPhone(e.target.value)} placeholder="(555) 123-4567" />
                  </div>

                  <div className="field-group">
                    <label className="field-label" htmlFor="d-age">Age</label>
                    <input type="number" id="d-age" value={age} onChange={e => setAge(e.target.value)} min="18" max="99" />
                  </div>

                  <div className="field-group field-autocomplete" ref={schoolWrapRef}>
                    <label className="field-label" htmlFor="d-school">University / School</label>
                    <input type="text" id="d-school" value={school} onChange={e => handleSchoolChange(e.target.value)} placeholder="Search university..." autoComplete="off" />
                    <div className={`autocomplete-list ${showSchoolMatches ? 'open' : ''}`}>
                      {schoolMatches.map((m, idx) => (
                        <div key={idx} className="autocomplete-item" onClick={() => {
                          setSchool(m.n);
                          setShowSchoolMatches(false);
                        }}>
                          {m.n}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="field-group field-autocomplete" ref={majorWrapRef}>
                    <label className="field-label" htmlFor="d-major">Major</label>
                    <input type="text" id="d-major" value={major} onChange={e => handleMajorChange(e.target.value)} placeholder="Search major..." autoComplete="off" />
                    <div className={`autocomplete-list ${showMajorMatches ? 'open' : ''}`}>
                      {majorMatches.map((m, idx) => (
                        <div key={idx} className="autocomplete-item" onClick={() => {
                          setMajor(m.n);
                          setShowMajorMatches(false);
                        }}>
                          {m.n}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="field-group">
                    <label className="field-label" htmlFor="d-year">Year of Study</label>
                    <select id="d-year" value={year} onChange={e => setYear(e.target.value)}>
                      <option value="Freshman">Freshman</option>
                      <option value="Sophomore">Sophomore</option>
                      <option value="Junior">Junior</option>
                      <option value="Senior">Senior</option>
                      <option value="Graduate">Graduate</option>
                    </select>
                  </div>

                  <div className="field-group">
                    <label className="field-label" htmlFor="d-level">Level of Study</label>
                    <select id="d-level" value={level} onChange={e => setLevel(e.target.value)}>
                      <option value="Undergraduate">Undergraduate</option>
                      <option value="Graduate">Graduate</option>
                      <option value="Bootcamp/Other">Bootcamp / Other</option>
                    </select>
                  </div>

                  <div className="field-group">
                    <label className="field-label" htmlFor="d-teamStatus">Team Status</label>
                    <select id="d-teamStatus" value={teamStatus} onChange={e => handleTeamStatusChange(e.target.value)}>
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
                      <option value="S">S</option><option value="M">M</option>
                      <option value="L">L</option><option value="XL">XL</option><option value="XXL">XXL</option>
                    </select>
                  </div>

                  <div className="field-group">
                    <label className="field-label" htmlFor="d-gender">Gender</label>
                    <select id="d-gender" value={gender} onChange={e => setGender(e.target.value)}>
                      <option value="">Prefer not to say</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Non-binary">Non-binary</option>
                      <option value="Prefer not to say">Prefer not to say</option>
                    </select>
                  </div>

                  <div className="field-group">
                    <label className="field-label" htmlFor="d-hearAbout">How did you hear about us?</label>
                    <select id="d-hearAbout" value={hearAbout} onChange={e => setHearAbout(e.target.value)}>
                      <option value="">Select one...</option>
                      <option value="Friend/Teammate">Friend / Teammate</option>
                      <option value="Professor/Class">Professor / Class</option>
                      <option value="Social Media">Social Media</option>
                      <option value="Campus Flyer">Campus Flyer</option>
                      <option value="Club/Organization">Club / Organization</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div className={`team-extra ${teamStatus === 'Create a Team' ? 'visible' : ''}`} id="d-team-extra">
                    <div className="field-group">
                      <label className="field-label" htmlFor="d-teamName">Team Name</label>
                      <input type="text" id="d-teamName" placeholder="e.g. ByteStorm" value={teamName} onChange={e => setTeamName(e.target.value)} />
                      <span className="field-hint">You will be listed as the creator and first member</span>
                    </div>
                  </div>

                  <div className={`team-extra ${teamStatus === 'Join a Team' ? 'visible' : ''}`}>
                    <div className="field-group">
                      <label className="field-label" htmlFor="d-selectedTeamId">Existing Team</label>
                      <select id="d-selectedTeamId" value={selectedTeamId} onChange={e => setSelectedTeamId(e.target.value)}>
                        <option value="">Select a team...</option>
                        {teams.map(team => (
                          <option key={team.id} value={team.id} disabled={team.isFull || isCreatorOwnTeam(team)}>
                            {team.teamName} - {team.creatorName} - Team #{team.id}{isCreatorOwnTeam(team) ? ' - Your team' : team.isFull ? ' - Full' : ` - ${team.memberCount}/${team.maxMembers}`}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="field-group full">
                    <label className="field-label">Dietary Restrictions / Allergies</label>
                    <div className="dietary-grid">
                      {DIETARY_OPTIONS.map(d => (
                        <label className="diet-check" key={d}>
                          <input type="checkbox" checked={dietary.includes(d)} onChange={e => handleDietaryChange(d, e.target.checked)} /> {d}
                        </label>
                      ))}
                    </div>
                    <div className={`dietary-other-wrap ${dietary.includes("Other") ? 'visible' : ''}`}>
                      <input type="text" placeholder="Please specify…" value={dietaryOtherText} onChange={e => setDietaryOtherText(e.target.value)} />
                    </div>
                  </div>

                  <div className="field-group full">
                    <label className="field-label" htmlFor="d-notes">Anything else we should know?</label>
                    <textarea id="d-notes" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Accommodations, special hardware requests, etc."></textarea>
                  </div>
                </div>

                <div className="card-actions">
                  <button className="btn-save" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</button>
                  {creatorLeavingTeam && (
                    <div className="team-change-warning">
                      Saving this will delete your current team and remove every teammate from it.
                    </div>
                  )}
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

      <div className={`modal-overlay ${showTeamStatusWarning ? 'open' : ''}`}>
        <div className="modal">
          <p className="modal-title">Leave Create a Team?</p>
          <p className="modal-body">
            Your team will be deleted and teammates will not be in it if you go {pendingTeamStatus || "with this option"}. This will only happen after you save changes.
          </p>
          <div className="modal-actions">
            <button className="btn-danger" onClick={confirmTeamStatusChange} style={{ flex: 1, justifyContent: 'center' }}>
              Continue anyway
            </button>
            <button className="btn-outline" onClick={() => setShowTeamStatusWarning(false)} style={{ flex: 1, textAlign: 'center' }}>Cancel</button>
          </div>
        </div>
      </div>

      <div className={`modal-overlay ${showDeleteTeamModal ? 'open' : ''}`}>
        <div className="modal">
          <p className="modal-title">Delete this team?</p>
          <p className="modal-body">This will permanently delete the team and remove every teammate from it. This cannot be undone.</p>
          <div className="modal-actions">
            <button className="btn-danger" onClick={handleDeleteTeam} disabled={deletingTeam} style={{ flex: 1, justifyContent: 'center' }}>
              {deletingTeam ? 'Deleting...' : 'Delete team'}
            </button>
            <button className="btn-outline" onClick={() => setShowDeleteTeamModal(false)} style={{ flex: 1, textAlign: 'center' }}>Cancel</button>
          </div>
        </div>
      </div>

      <div className={`toast ${toastType}`} ref={toastRef}>{toastMsg}</div>
    </div>
  );
}



