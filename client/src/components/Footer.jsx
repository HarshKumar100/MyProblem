import React from "react";
import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="bg-[#111111] mt-auto">
      <div className="max-w-7xl mx-auto px-8 lg:px-20 py-12">
        <div className="flex flex-col sm:flex-row items-start justify-between gap-8 mb-10">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-xs">MP</span>
              </div>
              <span className="font-bold text-white text-base tracking-tight">MyProblem</span>
            </div>
            <p className="text-white/35 text-sm leading-relaxed max-w-[240px]">
              AI-powered citizen grievance platform built for India.
            </p>
          </div>

          {/* Links */}
          <div className="flex gap-16">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/30 mb-4">Platform</p>
              <div className="flex flex-col gap-3">
                <Link to="/" className="text-white/50 text-sm hover:text-white transition-colors">Home</Link>
                <Link to="/register" className="text-white/50 text-sm hover:text-white transition-colors">Register</Link>
                <Link to="/login" className="text-white/50 text-sm hover:text-white transition-colors">Login</Link>
              </div>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/30 mb-4">Citizen</p>
              <div className="flex flex-col gap-3">
                <Link to="/report" className="text-white/50 text-sm hover:text-white transition-colors">Report Problem</Link>
                <Link to="/dashboard" className="text-white/50 text-sm hover:text-white transition-colors">Dashboard</Link>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-white/10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-white/25 text-xs">
            © {new Date().getFullYear()} MyProblem. Built for Indian Citizens.
          </p>
          <p className="text-white/25 text-xs">
            AI-powered NLP · 88% accuracy · 10 categories
          </p>
        </div>
      </div>
    </footer>
  );
}
