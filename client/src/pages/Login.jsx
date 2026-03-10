import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";
import p10 from "../assets/p10.jpeg";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) {
      setError("Please fill in all fields");
      return;
    }
    setLoading(true);
    try {
      const user = await login(form.email.trim(), form.password);
      toast.success(`Welcome back, ${user.name}!`);
      if (user.role === "admin") navigate("/admin");
      else if (user.role === "agency") navigate("/agency");
      else navigate("/dashboard");
    } catch (err) {
      setError(
        err.message ||
        err.response?.data?.message ||
        "Login failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        .login-root { font-family: 'Inter', sans-serif; }
        .login-left-panel {
          background-color: #F9F7F2;
          background-image:
            linear-gradient(rgba(0,0,0,0.055) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,0,0,0.055) 1px, transparent 1px);
          background-size: 72px 72px;
        }
        .login-input:focus {
          outline: none;
          border-color: #f59e0b !important;
          box-shadow: 0 0 0 3px rgba(245,158,11,0.18);
        }
        .login-google-btn:hover { box-shadow: 0 2px 8px rgba(0,0,0,0.12); }
        .login-sign-btn:hover:not(:disabled) { background: #222; }
        .login-sign-btn:disabled { opacity: 0.6; cursor: not-allowed; }
      `}</style>

      <div className="login-root" style={styles.page}>

        {/* ── LEFT PANEL ── */}
        <div className="login-left-panel" style={styles.left}>
          {/* Logo */}
          <div style={styles.logoRow}>
            <span style={styles.logoText}>MyProblem</span>
          </div>

          {/* Form area — inner content is max-width constrained and centered */}
          <div style={styles.formArea}>
            <div style={styles.formInner}>
              <p style={styles.portalBadge}>CITIZEN PORTAL</p>
              <h1 style={styles.heading}>Welcome back</h1>
              {/* <p style={styles.subheading}>Sign in to access your legal support dashboard.</p> */}

              {/* Google */}
              <button className="login-google-btn" style={styles.googleBtn} type="button">
                <svg width="18" height="18" viewBox="0 0 48 48">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                </svg>
                Continue with Google
              </button>

              {/* Divider */}
              <div style={styles.divider}>
                <span style={styles.dividerLine} />
                <span style={styles.dividerText}>OR SIGN IN WITH EMAIL</span>
                <span style={styles.dividerLine} />
              </div>

              {error && <div style={styles.errorBox}>{error}</div>}

              <form onSubmit={handleSubmit} noValidate style={{ width: "100%" }}>
                {/* Email */}
                <label style={styles.label} htmlFor="email">EMAIL ADDRESS</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={form.email}
                  onChange={handleChange}
                  placeholder="you@example.com"
                  className="login-input"
                  style={styles.input}
                />

                {/* Password row */}
                <div style={styles.passwordLabelRow}>
                  <label style={styles.label} htmlFor="password">PASSWORD</label>
                  <a href="#" style={styles.forgotLink}>Forgot password?</a>
                </div>
                <div style={styles.passwordWrapper}>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    required
                    value={form.password}
                    onChange={handleChange}
                    placeholder="••••••••"
                    className="login-input"
                    style={{ ...styles.input, paddingRight: 40 }}
                  />
                  <button
                    type="button"
                    style={styles.eyeBtn}
                    onClick={() => setShowPassword((v) => !v)}
                    tabIndex={-1}
                  >
                    {showPassword ? (
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
                    )}
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="login-sign-btn"
                  style={styles.signInBtn}
                >
                  {loading ? (
                    <span style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "center" }}>
                      <svg style={{ animation: "spin 1s linear infinite", width: 16, height: 16 }} fill="none" viewBox="0 0 24 24">
                        <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      Signing in…
                    </span>
                  ) : "Sign in"}
                </button>
              </form>

              <p style={styles.termsText}>
                By signing in, you agree to our{" "}
                <a href="#" style={styles.termsLink}>Terms &amp; Conditions</a>{" "}
                {/* and <a href="#" style={styles.termsLink}>Privacy Policy.</a> */}
              </p>

              <p style={styles.registerRow}>
                Don't have an account?{" "}
                <Link to="/register" style={styles.createLink}>Create one </Link>
              </p>
              {/* <p style={styles.advocateRow}>
                Are you an advocate?{" "}
                <Link to="/register?role=lawyer" style={styles.createLink}>Advocate portal →</Link>
              </p> */}
            </div>{/* end formInner */}
          </div>{/* end formArea */}

          {/* Footer */}
          <div style={styles.leftFooter}>
            {/* <span>© MyProblem 2025</span>
            <span>help@myproblem.in</span> */}
          </div>
        </div>

        {/* ── RIGHT PANEL ── */}
        <div style={styles.right}>
          <img src={p10} alt="Citizen" style={styles.bgImage} />
          <div style={styles.overlay} />

          <div style={styles.testimonial}>
            {/* <p style={styles.testimonialBadge}>VERIFIED USER REVIEW</p> */}
            <h3 style={styles.testimonialName}>Anita Mehra</h3>
            <p style={styles.testimonialRole}>Industrial Worker &amp; First-time Problem Reporter, Mumbai</p>
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
    padding: "24px 32px 16px",
    overflow: "hidden",
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
    marginBottom: 22,
  },
  googleBtn: {
    width: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    padding: "11px 20px",
    borderRadius: 10,
    border: "1.5px solid #ddd",
    backgroundColor: "#fff",
    fontSize: 14,
    fontWeight: 500,
    color: "#333",
    cursor: "pointer",
    transition: "box-shadow 0.2s",
    boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
    marginBottom: 16,
  },
  divider: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    width: "100%",
    marginBottom: 18,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#e5e5e5",
  },
  dividerText: {
    fontSize: 9,
    color: "#aaa",
    fontWeight: 700,
    letterSpacing: "0.08em",
    whiteSpace: "nowrap",
  },
  errorBox: {
    width: "100%",
    backgroundColor: "#fef2f2",
    border: "1px solid #fecaca",
    borderRadius: 8,
    padding: "9px 14px",
    fontSize: 13,
    color: "#dc2626",
    marginBottom: 12,
  },
  label: {
    display: "block",
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: "0.08em",
    color: "#555",
    marginBottom: 5,
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
  passwordLabelRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    marginBottom: 5,
  },
  forgotLink: {
    fontSize: 11,
    color: "#f59e0b",
    textDecoration: "none",
    fontWeight: 600,
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
  signInBtn: {
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
  termsText: {
    fontSize: 11,
    color: "#bbb",
    textAlign: "center",
    width: "100%",
    marginBottom: 14,
    lineHeight: 1.6,
  },
  termsLink: {
    color: "#f59e0b",
    textDecoration: "underline",
  },
  registerRow: {
    fontSize: 14,
    color: "#555",
    textAlign: "center",
    width: "100%",
    marginBottom: 4,
  },
  advocateRow: {
    fontSize: 12,
    color: "#aaa",
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
    marginBottom: 14,
    maxWidth: 360,
  },
  starsRow: {
    display: "flex",
    alignItems: "center",
    gap: 2,
  },
  star: {
    color: "#f59e0b",
    fontSize: 15,
  },
  ratingText: {
    fontSize: 11,
    color: "rgba(255,255,255,0.65)",
    marginLeft: 6,
    fontWeight: 500,
  },
};
