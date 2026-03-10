import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import { localGetMyProblems } from "../services/localStore";
import ProblemCard from "../components/ProblemCard";

const FILTERS = ["All", "Pending", "In Progress", "Resolved", "Rejected"];

export default function Dashboard() {
  const { user } = useAuth();
  const [problems, setProblems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("All");
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      let loaded = false;
      try {
        const { data } = await api.get("/api/problems/my");
        const apiProblems = data.problems || [];
        if (apiProblems.length > 0) { setProblems(apiProblems); loaded = true; }
      } catch { /* fall through */ }
      if (!loaded) {
        const local = localGetMyProblems(user?._id || "guest");
        setProblems(local);
        if (local.length === 0) setError("No locally saved problems found.");
      }
      setLoading(false);
    };
    load();
  }, []);

  const filtered = filter === "All" ? problems : problems.filter((p) => p.status === filter);
  const stats = {
    total:      problems.length,
    pending:    problems.filter((p) => p.status === "Pending").length,
    inProgress: problems.filter((p) => p.status === "In Progress").length,
    resolved:   problems.filter((p) => p.status === "Resolved").length,
  };

  return (
    <div className="min-h-screen bg-[#ede8df] font-sans">

      {/* ── HERO ── */}
      <section className="px-8 lg:px-20 pt-14 pb-10">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-start justify-between gap-12">

          {/* Left */}
          <div className="flex-1 max-w-xl">
            {/* Badge */}
            {/* <div className="inline-flex items-center gap-2 border border-black/20 rounded-full px-4 py-1.5 mb-8">
              <span className="w-1.5 h-1.5 rounded-full bg-black/40 inline-block" />
              <span className="text-[11px] font-semibold tracking-widest uppercase text-black/50">
                Citizen Dashboard
              </span>
            </div> */}

            {/* Heading */}
            <h1 className="text-5xl lg:text-[3.4rem] font-extrabold text-[#1a1a1a] leading-[1.1] mb-5">
              Manage Your Reports{" "}
              <em className="font-normal italic">with</em>
              <br />Confidence
            </h1>

            {/* Subtitle */}
            <p className="text-[#1a1a1a]/55 text-base leading-relaxed mb-8 max-w-[340px]">
              Track every complaint you've raised, monitor agency responses,
              and report new problems — all in one place.
            </p>

            {/* Buttons */}
            <div className="flex items-center gap-7">
              <Link
                to="/report"
                className="bg-[#1a1a1a] text-white text-sm font-semibold px-7 py-3 rounded-full hover:bg-black transition-colors"
              >
                Report a Problem
              </Link>
              <a
                href="#reports"
                className="text-[#1a1a1a] text-sm font-semibold flex items-center gap-1 hover:opacity-60 transition-opacity"
              >
                Active Matters <span className="ml-0.5">→</span>
              </a>
            </div>
          </div>

          {/* Right – stat cards */}
          <div className="flex items-start gap-4 shrink-0 lg:mt-6">
            {/* Tall oval card */}
            <div className="bg-[#ddd8cf] rounded-[2rem] px-8 pt-8 pb-10 flex flex-col items-center gap-3 w-[155px]">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[#1a1a1a]/40">
                <path d="M2 7l4 4 6-8 6 8 4-4" /><path d="M2 17h20" />
              </svg>
              <p className="text-[3.2rem] font-extrabold text-[#1a1a1a] leading-none">
                {stats.pending + stats.inProgress}
              </p>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#1a1a1a]/40 text-center leading-snug">
                Active Matters
              </p>
            </div>

            {/* Shorter card, offset down */}
            <div className="bg-[#ddd8cf] rounded-[1.5rem] px-6 py-7 flex flex-col items-center gap-3 w-[138px] mt-14">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[#1a1a1a]/40">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              <p className="text-[2.8rem] font-extrabold text-[#1a1a1a] leading-none">{stats.total}</p>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#1a1a1a]/40 text-center leading-snug">
                Total Clients
              </p>
            </div>
          </div>

        </div>
      </section>

      {/* ── MANAGEMENT CARDS ── */}
      {/* <section className="px-8 lg:px-20 pb-10">
        <div className="max-w-7xl mx-auto">
          <p className="text-[11px] font-bold uppercase tracking-widest text-[#1a1a1a]/35 mb-5">
            / / Management
          </p>
          <div className="grid md:grid-cols-3 gap-4">

            {[
              {
                to: "#reports",
                title: "My Cases",
                desc: "Follow up on pending complaints, in-progress grievances, and active resolutions today.",
              },
              {
                to: "/report",
                title: "New Requests",
                desc: "Describe your problem and AI will instantly route it to the right government agency.",
              },
              {
                to: "#reports",
                title: "Resolved Cases",
                desc: "Access all closed complaints, review agency responses, and verify resolution details.",
              },
            ].map((card) => (
              <Link
                key={card.title}
                to={card.to}
                className="group bg-[#ddd8cf] rounded-[1.4rem] p-8 flex flex-col justify-between min-h-[210px] hover:bg-[#d3cec5] transition-colors"
              >
                <div>
                  <h3 className="text-2xl font-bold text-[#1a1a1a] mb-3">{card.title}</h3>
                  <p className="text-[#1a1a1a]/45 text-sm leading-relaxed">{card.desc}</p>
                </div>
                <div className="flex justify-end mt-6">
                  <div className="w-10 h-10 rounded-full bg-[#1a1a1a] flex items-center justify-center group-hover:scale-110 transition-transform">
                    <span className="text-white text-base leading-none">→</span>
                  </div>
                </div>
              </Link>
            ))}

          </div>
        </div>
      </section> */}

      {/* ── COMPLAINTS LIST ── */}
      <section id="reports" className="px-8 lg:px-20 pb-20">
        <div className="max-w-7xl mx-auto">

          {/* Sub-header + filters */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            
            <div className="flex gap-2 overflow-x-auto pb-1">
              {FILTERS.map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                    filter === f
                      ? "bg-[#1a1a1a] text-white"
                      : "bg-[#ddd8cf] text-[#1a1a1a]/55 hover:bg-[#d3cec5]"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {/* Results */}
          {loading ? (
            <div className="text-center py-16">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#1a1a1a] mx-auto" />
              <p className="text-[#1a1a1a]/40 mt-4 text-sm">Loading your reports…</p>
            </div>
          ) : error ? (
            <div className="text-center py-16 text-[#1a1a1a]/40 text-sm">{error}</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-[#1a1a1a]/40 text-sm font-medium">
                {filter === "All"
                  ? "You haven't reported any problems yet."
                  : `No ${filter} problems found.`}
              </p>
              {filter === "All" && (
                <Link
                  to="/report"
                  className="mt-5 inline-flex items-center gap-2 bg-[#1a1a1a] text-white font-semibold px-6 py-2.5 rounded-full text-sm hover:opacity-80 transition-opacity"
                >
                  Report Your First Problem →
                </Link>
              )}
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              {filtered.map((p) => (
                <ProblemCard key={p._id} problem={p} />
              ))}
            </div>
          )}

        </div>
      </section>

    </div>
  );
}
