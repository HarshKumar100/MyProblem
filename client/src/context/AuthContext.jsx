import React, { createContext, useContext, useEffect, useState } from "react";
import api from "../services/api";

const AuthContext = createContext(null);

// ── localStorage helpers ──────────────────────────────────────────────────────
const LS_USERS = "mp_local_users";
const LS_TOKEN = "mp_token";
const LS_USER  = "mp_local_user";

const getLocalUsers = () => JSON.parse(localStorage.getItem(LS_USERS) || "[]");
const saveLocalUsers = (users) => localStorage.setItem(LS_USERS, JSON.stringify(users));

const makeFakeToken = (email) =>
  btoa(JSON.stringify({ email, exp: Date.now() + 86400000 }));

// ─────────────────────────────────────────────────────────────────────────────

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem(LS_TOKEN);
    if (token) {
      api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      // Try API first; fall back to cached local user
      api.get("/api/auth/me")
        .then(({ data }) => setUser(data.user))
        .catch(() => {
          const saved = localStorage.getItem(LS_USER);
          if (saved) setUser(JSON.parse(saved));
          else _clearSession();
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const _saveSession = (token, userData) => {
    localStorage.setItem(LS_TOKEN, token);
    localStorage.setItem(LS_USER, JSON.stringify(userData));
    api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    setUser(userData);
  };

  const _clearSession = () => {
    localStorage.removeItem(LS_TOKEN);
    localStorage.removeItem(LS_USER);
    delete api.defaults.headers.common["Authorization"];
    setUser(null);
  };

  const login = async (email, password) => {
    try {
      const { data } = await api.post("/api/auth/login", { email, password });
      _saveSession(data.token, data.user);
      return data.user;
    } catch {
      // ── Offline / backend down: use localStorage ──
      const users = getLocalUsers();
      const found = users.find(
        (u) => u.email === email && u.password === password
      );
      if (!found) throw new Error("Invalid email or password.");
      const { password: _p, ...userData } = found;
      _saveSession(makeFakeToken(email), userData);
      return userData;
    }
  };

  const register = async (name, email, password, phone, role = "user", department = null) => {
    try {
      const { data } = await api.post("/api/auth/register", { name, email, password, phone, role, department });
      _saveSession(data.token, data.user);
      return data.user;
    } catch {
      // ── Offline / backend down: use localStorage ──
      const users = getLocalUsers();
      if (users.find((u) => u.email === email))
        throw new Error("Email already registered.");
      const newUser = {
        _id: `local_${Date.now()}`,
        name,
        email,
        password,   // stored only in client localStorage (offline mode)
        phone,
        role,
        department,
      };
      saveLocalUsers([...users, newUser]);
      const { password: _p, ...userData } = newUser;
      _saveSession(makeFakeToken(email), userData);
      return userData;
    }
  };

  const logout = () => _clearSession();

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
};

export default AuthContext;
