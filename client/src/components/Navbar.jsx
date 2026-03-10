import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";

const NAV_LINKS_CITIZEN = [
  { to: "/", label: "Home" },
  { to: "/dashboard", label: "Dashboard" },
  { to: "/report", label: "Report Problem" },
];

const NAV_LINKS_AGENCY = [
  { to: "/", label: "Home" },
  { to: "/agency", label: "Agency Dashboard" },
];

const NAV_LINKS_ADMIN = [
  { to: "/", label: "Home" },
  { to: "/admin", label: "Admin Panel" },
];

const NAV_LINKS_PUBLIC = [
  { to: "/", label: "Home" },
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  const handleLogout = () => {
    logout();
    toast.success("Logged out successfully");
    navigate("/");
    setOpen(false);
  };

  const isActive = (path) => location.pathname === path;

  const links = !user
    ? NAV_LINKS_PUBLIC
    : user.role === "admin"
      ? NAV_LINKS_ADMIN
      : user.role === "agency"
        ? NAV_LINKS_AGENCY
        : NAV_LINKS_CITIZEN;

  return (
    <nav className="bg-[#F9F7F2]/90 backdrop-blur-sm shadow-[0_1px_0_0_#e5e7eb] sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 lg:px-10">
        <div className="flex items-center justify-between h-[52px]">

          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 shrink-0">
            <span className="font-bold text-[17px] text-gray-900 tracking-tight">
              My<span className="text-black">Problem</span>
            </span>
          </Link>

          {/* Desktop nav links â€“ centre */}
          <div className="hidden md:flex items-center gap-1">
            {links.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${isActive(l.to)
                    ? "text-black"
                    : "text-gray-500 hover:text-black"
                  }`}
              >
                {l.label}
              </Link>
            ))}
          </div>

          {/* Desktop right side */}
          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <>
                {/* Avatar + name */}
                <div className="flex items-center gap-2.5 pr-1">
                  <div className="w-8 h-8 rounded-full bg-gray-900 flex items-center justify-center">
                    <span className="text-white font-semibold text-xs">
                      {user.name?.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex flex-col leading-none">
                    <span className="text-sm font-semibold text-gray-900 max-w-[110px] truncate">{user.name}</span>
                    {user.role === "agency" && <span className="text-[11px] text-green-600 font-medium mt-0.5">Agency</span>}
                    {user.role === "admin" && <span className="text-[11px] text-purple-600 font-medium mt-0.5">Admin</span>}
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="text-sm font-semibold text-white bg-black hover:bg-gray-800 px-5 py-2 rounded-md transition-colors"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link to="/login"
                  className="text-sm font-medium text-gray-600 hover:text-black transition-colors px-3 py-2">
                  Login
                </Link>
                <Link to="/register"
                  className="text-sm font-semibold text-white bg-black hover:bg-gray-800 px-5 py-2.5 rounded-md transition-colors inline-flex items-center gap-1.5">
                  Get Started &nbsp;→
                </Link>
              </>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2 rounded-md text-gray-600 hover:bg-gray-100"
            onClick={() => setOpen(!open)}
            aria-label="Toggle menu"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {open
                ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />}
            </svg>
          </button>
        </div>

        {/* Mobile menu */}
        {open && (
          <div className="md:hidden border-t border-gray-100 py-3 space-y-0.5">
            {links.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                onClick={() => setOpen(false)}
                className={`block px-4 py-2.5 text-sm rounded-md transition-colors ${isActive(l.to) ? "text-black font-semibold bg-gray-50" : "text-gray-600 hover:bg-gray-50 hover:text-black"
                  }`}
              >
                {l.label}
              </Link>
            ))}
            <div className="pt-2 border-t border-gray-100 mt-2">
              {user ? (
                <button onClick={handleLogout}
                  className="block w-full text-left px-4 py-2.5 text-sm font-semibold text-white bg-black rounded-md">
                  Logout
                </button>
              ) : (
                <>
                  <Link to="/login" onClick={() => setOpen(false)}
                    className="block px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 rounded-md">Login</Link>
                  <Link to="/register" onClick={() => setOpen(false)}
                    className="block px-4 py-2.5 text-sm font-semibold text-white bg-black rounded-md mt-1">Get Started →</Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
