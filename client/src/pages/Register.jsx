import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";
import p10 from "../assets/p10.jpeg";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "", phone: "", department: "" });
  const [role, setRole] = useState("user");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError("");
  };

  const validate = () => {
    if (!form.name.trim() || !form.email.trim() || !form.password) return "All required fields must be filled.";
    if (form.name.trim().length < 2) return "Name must be at least 2 characters.";
    if (form.password.length < 6) return "Password must be at least 6 characters.";
    if (form.password !== form.confirm) return "Passwords do not match.";
    if (role === "agency" && !form.department.trim()) return "Department / Ministry name is required for agencies.";
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const err = validate();
    if (err) { setError(err); return; }
    setLoading(true);
    try {
      await register(form.name.trim(), form.email.trim(), form.password, form.phone || null, role, form.department.trim() || null);
      toast.success("Account created! Welcome to MyProblem 🎉");
      navigate(role === "agency" ? "/agency" : "/dashboard");
    } catch (err) {
      setError(err.message || err.response?.data?.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const EyeIcon = ({ open }) => open ? (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  ) : (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        .reg-root { font-family: 'Inter', sans-serif; }
        .reg-left-panel {
          background-color: #F9F7F2;
          background-image:
            linear-gradient(rgba(0,0,0,0.055) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,0,0,0.055) 1px, transparent 1px);
          background-size: 72px 72px;
        }
        .reg-input:focus {
          outline: none;
          border-color: #f59e0b !important;
          box-shadow: 0 0 0 3px rgba(245,158,11,0.18);
        }
        .reg-submit-btn:hover:not(:disabled) { background: #222; }
        .reg-submit-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .reg-form-scroll::-webkit-scrollbar { width: 0px; }
      `}</style>

      <div className="reg-root" style={styles.page}>

        {/* ── LEFT PANEL ── */}
        <div className="reg-left-panel" style={styles.left}>

          {/* Logo */}
          <div style={styles.logoRow}>
            <div style={styles.logoBox}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
            </div>
            <span style={styles.logoText}>MyProblem</span>
          </div>

          {/* Scrollable form area */}
          <div style={styles.formArea}>
            <div className="reg-form-scroll" style={styles.formScroll}>
              <div style={styles.formInner}>

                <p style={styles.portalBadge}>CITIZEN PORTAL</p>
                <h1 style={styles.heading}>Create account</h1>
                <p style={styles.subheading}>Join MyProblem and start reporting issues today.</p>

                {error && <div style={styles.errorBox}>{error}</div>}

                <form onSubmit={handleSubmit} noValidate style={{ width: "100%" }}>

                  {/* Role selector */}
                  <label style={styles.label}>I AM A…</label>
                  <div style={styles.roleGrid}>
                    {[
                      { value: "user", title: "Citizen", desc: "Report public problems" },
                      { value: "agency", title: "Government Agency", desc: "Manage & resolve reports" },
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => { setRole(opt.value); setError(""); }}
                        style={{
                          ...styles.roleBtn,
                          ...(role === opt.value ? styles.roleBtnActive : styles.roleBtnInactive),
                        }}
                      >
                        <span style={styles.roleBtnTitle}>{opt.title}</span>
                        <span style={styles.roleBtnDesc}>{opt.desc}</span>
                      </button>
                    ))}
                  </div>

                  {/* Full name */}
                  <label style={styles.label} htmlFor="name">FULL NAME <span style={styles.req}>*</span></label>
                  <input
                    id="name" name="name" type="text" required
                    value={form.name} onChange={handleChange}
                    placeholder="Ramesh Kumar"
                    className="reg-input" style={styles.input}
                  />

                  {/* Email */}
                  <label style={styles.label} htmlFor="email">EMAIL ADDRESS <span style={styles.req}>*</span></label>
                  <input
                    id="email" name="email" type="email" autoComplete="email" required
                    value={form.email} onChange={handleChange}
                    placeholder="you@example.com"
                    className="reg-input" style={styles.input}
                  />

                  {/* Phone */}
                  <label style={styles.label} htmlFor="phone">PHONE NUMBER <span style={styles.optional}>(optional)</span></label>
                  <input
                    id="phone" name="phone" type="tel"
                    value={form.phone} onChange={handleChange}
                    placeholder="+91 9876543210"
                    className="reg-input" style={styles.input}
                  />

                  {/* Agency department (conditional) */}
                  {role === "agency" && (
                    <>
                      <label style={styles.label} htmlFor="department">DEPARTMENT / MINISTRY <span style={styles.req}>*</span></label>
                      <input
                        id="department" name="department" type="text" required
                        value={form.department} onChange={handleChange}
                        placeholder="e.g. Public Works Department"
                        className="reg-input" style={styles.input}
                      />
                    </>
                  )}

                  {/* Password */}
                  <label style={styles.label} htmlFor="password">PASSWORD <span style={styles.req}>*</span></label>
                  <div style={styles.passwordWrapper}>
                    <input
                      id="password" name="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password" required
                      value={form.password} onChange={handleChange}
                      placeholder="Min. 6 characters"
                      className="reg-input" style={{ ...styles.input, paddingRight: 40 }}
                    />
                    <button type="button" style={styles.eyeBtn} onClick={() => setShowPassword(v => !v)} tabIndex={-1}>
                      <EyeIcon open={showPassword} />
                    </button>
                  </div>

                  {/* Confirm password */}
                  <label style={styles.label} htmlFor="confirm">CONFIRM PASSWORD <span style={styles.req}>*</span></label>
                  <div style={styles.passwordWrapper}>
                    <input
                      id="confirm" name="confirm"
                      type={showConfirm ? "text" : "password"}
                      autoComplete="new-password" required
                      value={form.confirm} onChange={handleChange}
                      placeholder="Repeat password"
                      className="reg-input" style={{ ...styles.input, paddingRight: 40 }}
                    />
                    <button type="button" style={styles.eyeBtn} onClick={() => setShowConfirm(v => !v)} tabIndex={-1}>
                      <EyeIcon open={showConfirm} />
                    </button>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="reg-submit-btn"
                    style={styles.submitBtn}
                  >
                    {loading ? (
                      <span style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "center" }}>
                        <svg style={{ animation: "spin 1s linear infinite", width: 16, height: 16 }} fill="none" viewBox="0 0 24 24">
                          <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                        </svg>
                        Creating account…
                      </span>
                    ) : "Create Account"}
                  </button>
                </form>

                <p style={styles.signinRow}>
                  Already have an account?{" "}
                  <Link to="/login" style={styles.createLink}>Sign in</Link>
                </p>

              </div>
            </div>
          </div>

          {/* Footer */}
          <div style={styles.leftFooter}>
            <span>© MyProblem 2025</span>
            <span>help@myproblem.in</span>
          </div>
        </div>

        {/* ── RIGHT PANEL ── */}
        <div style={styles.right}>
          <img src={p10} alt="Citizen" style={styles.bgImage} />
          <div style={styles.overlay} />

          <div style={styles.testimonial}>
            <p style={styles.testimonialBadge}>VERIFIED USER REVIEW</p>
            <h3 style={styles.testimonialName}>Anita Mehra</h3>
            <p style={styles.testimonialRole}>Industrial Worker & First-time Problem Reporter, Mumbai</p>
            <p style={styles.testimonialQuote}>
              "MyProblem helped me report a workplace safety issue and escalate it to the right agency in minutes. My grievance was resolved within a week — something I struggled with for months alone."
            </p>
          </div>
        </div>

      </div>
    </>
  );
}

const styles = {
  page: {
    display: "flex",
    width: "100vw",
    height: "100vh",
    overflow: "hidden",
  },

  /* ── LEFT ── */
  left: {
    width: "50%",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
  logoRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "22px 44px 0",
    flexShrink: 0,
  },
  logoBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#111",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  logoText: {
    fontSize: 15,
    fontWeight: 700,
    color: "#111",
    letterSpacing: "-0.3px",
  },
  formArea: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "20px 32px 12px",
    overflow: "hidden",
  },
  formScroll: {
    width: "100%",
    height: "100%",
    overflowY: "auto",
    display: "flex",
    justifyContent: "center",
    paddingRight: 4,
  },
  formInner: {
    width: "100%",
    maxWidth: 360,
  },
  portalBadge: {
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: "0.1em",
    color: "#f59e0b",
    marginBottom: 6,
  },
  heading: {
    fontSize: 28,
    fontWeight: 800,
    color: "#111",
    marginBottom: 6,
    letterSpacing: "-0.5px",
  },
  subheading: {
    fontSize: 13,
    color: "#777",
    marginBottom: 20,
  },
  errorBox: {
    width: "100%",
    backgroundColor: "#fef2f2",
    border: "1px solid #fecaca",
    borderRadius: 8,
    padding: "9px 14px",
    fontSize: 13,
    color: "#dc2626",
    marginBottom: 14,
  },
  label: {
    display: "block",
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: "0.08em",
    color: "#555",
    marginBottom: 5,
    marginTop: 0,
  },
  req: {
    color: "#ef4444",
  },
  optional: {
    color: "#aaa",
    fontSize: 9,
    fontWeight: 400,
    letterSpacing: "0.04em",
  },
  roleGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 10,
    marginBottom: 16,
  },
  roleBtn: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 4,
    padding: "12px 8px",
    borderRadius: 10,
    border: "1.5px solid",
    cursor: "pointer",
    transition: "all 0.15s",
    textAlign: "center",
    backgroundColor: "#fff",
    fontFamily: "inherit",
  },
  roleBtnActive: {
    borderColor: "#f59e0b",
    backgroundColor: "#fffbeb",
    boxShadow: "0 0 0 3px rgba(245,158,11,0.15)",
  },
  roleBtnInactive: {
    borderColor: "#e0e0e0",
  },
  roleBtnTitle: {
    fontSize: 12,
    fontWeight: 700,
    color: "#111",
  },
  roleBtnDesc: {
    fontSize: 10,
    color: "#888",
    lineHeight: 1.3,
  },
  input: {
    width: "100%",
    padding: "10px 13px",
    borderRadius: 8,
    border: "1.5px solid #e0e0e0",
    fontSize: 13,
    color: "#111",
    backgroundColor: "#fff",
    marginBottom: 14,
    transition: "border-color 0.2s, box-shadow 0.2s",
    fontFamily: "inherit",
  },
  passwordWrapper: {
    position: "relative",
    width: "100%",
  },
  eyeBtn: {
    position: "absolute",
    right: 12,
    top: "50%",
    transform: "translateY(-65%)",
    background: "none",
    border: "none",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    padding: 0,
  },
  submitBtn: {
    width: "100%",
    padding: "13px",
    borderRadius: 10,
    border: "none",
    backgroundColor: "#111",
    color: "#fff",
    fontSize: 15,
    fontWeight: 700,
    cursor: "pointer",
    marginTop: 2,
    marginBottom: 14,
    transition: "background 0.2s",
    fontFamily: "inherit",
  },
  signinRow: {
    fontSize: 14,
    color: "#555",
    textAlign: "center",
    width: "100%",
  },
  createLink: {
    color: "#111",
    fontWeight: 700,
    textDecoration: "none",
  },
  leftFooter: {
    display: "flex",
    justifyContent: "space-between",
    padding: "12px 44px",
    fontSize: 11,
    color: "#ccc",
    flexShrink: 0,
  },

  /* ── RIGHT ── */
  right: {
    width: "50%",
    position: "relative",
    overflow: "hidden",
  },
  bgImage: {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    objectFit: "cover",
    objectPosition: "center top",
  },
  overlay: {
    position: "absolute",
    inset: 0,
    background:
      "linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.2) 50%, rgba(0,0,0,0.05) 100%)",
  },
  testimonial: {
    position: "absolute",
    bottom: 40,
    left: 36,
    right: 36,
    zIndex: 10,
  },
  testimonialBadge: {
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: "0.12em",
    color: "#f59e0b",
    marginBottom: 8,
  },
  testimonialName: {
    fontSize: 24,
    fontWeight: 800,
    color: "#fff",
    marginBottom: 4,
    letterSpacing: "-0.3px",
  },
  testimonialRole: {
    fontSize: 12,
    color: "#f59e0b",
    marginBottom: 12,
    fontWeight: 500,
  },
  testimonialQuote: {
    fontSize: 13,
    color: "rgba(255,255,255,0.82)",
    lineHeight: 1.7,
    maxWidth: 360,
  },
};
