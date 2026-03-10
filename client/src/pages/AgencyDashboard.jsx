import React, { useEffect, useState, useCallback } from "react";
import api from "../services/api";
import { localGetAllProblems, localGetStats, localUpdateStatus } from "../services/localStore";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";

const STATUSES = ["All", "Pending", "In Progress", "Resolved", "Rejected"];
const STATUS_OPTIONS = ["Pending", "In Progress", "Resolved", "Rejected"];
const CATEGORY_ICON = {
  "Road Infrastructure": "🛣️", Crime: "🚨", Railway: "🚂", Transport: "🚌",
  Corruption: "⚠️", Education: "📚", Health: "🏥", Environment: "🌿",
  "Water Supply": "💧", Electricity: "⚡", Other: "📋",
};
const STATUS_DOT = {
  "Pending": "bg-yellow-400",
  "In Progress": "bg-blue-500",
  "Resolved": "bg-green-500",
  "Rejected": "bg-red-400",
};

export default function AgencyDashboard() {
  const { user, logout } = useAuth();

  const [problems, setProblems]     = useState([]);
  const [stats, setStats]           = useState(null);
  const [loading, setLoading]       = useState(true);
  const [status, setStatus]         = useState("All");
  const [search, setSearch]         = useState("");
  const [page, setPage]             = useState(1);
  const [pagination, setPagination] = useState({});
  const [updating, setUpdating]     = useState(null);
  const [modal, setModal]           = useState(null);
  const [reply, setReply]           = useState("");

  const fetchProblems = useCallback(() => {
    setLoading(true);
    const result = localGetAllProblems({ status, search, page, limit: 12 });
    setProblems(result.problems);
    setPagination(result.pagination);
    setLoading(false);
  }, [page, status, search]);

  const fetchStats = useCallback(() => {
    setStats(localGetStats());
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);
  useEffect(() => { fetchProblems(); }, [fetchProblems]);

  const openModal = (id, currentStatus) => {
    setModal({ id, status: currentStatus });
    setReply("");
  };

  const applyReply = () => {
    if (!modal) return;
    setUpdating(modal.id);
    localUpdateStatus(modal.id, modal.status, reply);
    toast.success("Response saved!");
    setModal(null);
    setUpdating(null);
    fetchProblems();
    fetchStats();
  };

  const date = (d) =>
    new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

  return (
    <div className="min-h-screen bg-[#ede8df] font-sans">

      {/* ── HERO ── */}
      <section className="px-8 lg:px-20 pt-14 pb-10">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-start justify-between gap-12">

          {/* Left */}
          <div className="flex-1 max-w-xl">
            {/* <div className="inline-flex items-center gap-2 border border-black/20 rounded-full px-4 py-1.5 mb-8">
              <span className="w-1.5 h-1.5 rounded-full bg-black/40 inline-block" />
              <span className="text-[11px] font-semibold tracking-widest uppercase text-black/50">
                Agency Dashboard
              </span>
            </div> */}

            <h1 className="text-5xl lg:text-[3.4rem] font-extrabold text-[#1a1a1a] leading-[1.1] mb-5">
              Manage Citizen{" "}
              {/* <em className="font-normal italic">Reports</em> */}
              <br />Reports
              <br />with Authority
            </h1>

            <p className="text-[#1a1a1a]/55 text-base leading-relaxed mb-8 max-w-[360px]">
              {user?.department
                ? <><span className="font-semibold text-[#1a1a1a]/80">{user.department}</span> — review, respond and resolve citizen complaints assigned to your agency.</>
                : <>Review, respond and resolve citizen complaints assigned to your agency.</>}
            </p>

            {/* <div className="flex items-center gap-5">
              <button
                onClick={logout}
                className="border border-[#1a1a1a]/25 text-[#1a1a1a] text-sm font-semibold px-6 py-2.5 rounded-full hover:bg-[#1a1a1a]/5 transition-colors"
              >
                Sign Out
              </button>
            </div> */}
          </div>

          {/* Right – stat cards */}
          {stats && (
            <div className="flex items-start gap-4 shrink-0 lg:mt-6">
              <div className="bg-[#ddd8cf] rounded-[2rem] px-8 pt-8 pb-10 flex flex-col items-center gap-3 w-[155px]">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[#1a1a1a]/40">
                  <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <p className="text-[3.2rem] font-extrabold text-[#1a1a1a] leading-none">{stats.pending + stats.inProgress}</p>
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#1a1a1a]/40 text-center leading-snug">Active Cases</p>
              </div>
              <div className="bg-[#ddd8cf] rounded-[1.5rem] px-6 py-7 flex flex-col items-center gap-3 w-[138px] mt-14">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[#1a1a1a]/40">
                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <p className="text-[2.8rem] font-extrabold text-[#1a1a1a] leading-none">{stats.resolved}</p>
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#1a1a1a]/40 text-center leading-snug">Resolved</p>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── OFFLINE NOTICE ── */}
      {/* <div className="px-8 lg:px-20 pb-4">
        <div className="max-w-7xl mx-auto">
          <div className="bg-[#ddd8cf] rounded-2xl px-5 py-3.5 flex items-start gap-3">
            <span className="text-[#1a1a1a]/40 text-lg shrink-0">ℹ</span>
            <p className="text-[#1a1a1a]/50 text-xs leading-relaxed">
              <strong className="text-[#1a1a1a]/70">Offline mode:</strong> Data is stored in browser localStorage. Citizens must report problems in the same browser window for them to appear here.
            </p>
          </div>
        </div>
      </div> */}

      {/* ── STATS ROW ── */}
      {stats && (
        <div className="px-8 lg:px-20 pb-6">
          <div className="max-w-7xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Total", value: stats.total, dot: "bg-[#1a1a1a]/40" },
              { label: "Pending", value: stats.pending, dot: "bg-yellow-400" },
              { label: "In Progress", value: stats.inProgress, dot: "bg-blue-500" },
              { label: "Resolved", value: stats.resolved, dot: "bg-green-500" },
            ].map((s) => (
              <div key={s.label} className="bg-[#ddd8cf] rounded-[1.2rem] px-5 py-4 flex items-center gap-3">
                <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${s.dot}`} />
                <div>
                  <p className="text-2xl font-extrabold text-[#1a1a1a] leading-none">{s.value}</p>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#1a1a1a]/35 mt-1">{s.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── PROBLEMS LIST ── */}
      <section className="px-8 lg:px-20 pb-20">
        <div className="max-w-7xl mx-auto">
          
          {/* Search + filters */}
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <input
              type="text"
              placeholder="Search complaints…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="flex-1 bg-[#ddd8cf] text-[#1a1a1a] placeholder-[#1a1a1a]/30 text-sm font-medium px-4 py-2.5 rounded-xl border-none outline-none focus:ring-2 focus:ring-[#1a1a1a]/20 transition"
            />
            <div className="flex gap-2 flex-wrap">
              {STATUSES.map((s) => (
                <button
                  key={s}
                  onClick={() => { setStatus(s); setPage(1); }}
                  className={`shrink-0 px-4 py-2 rounded-full text-xs font-semibold transition-colors ${
                    status === s
                      ? "bg-[#1a1a1a] text-white"
                      : "bg-[#ddd8cf] text-[#1a1a1a]/55 hover:bg-[#d3cec5]"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Results */}
          {loading ? (
            <div className="text-center py-20">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#1a1a1a] mx-auto" />
              <p className="text-[#1a1a1a]/40 mt-4 text-sm">Loading complaints…</p>
            </div>
          ) : problems.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-[#1a1a1a]/40 font-medium text-sm">No complaints found.</p>
              <p className="text-[#1a1a1a]/30 text-xs mt-2">
                {search || status !== "All" ? "Try clearing your filters." : "No citizens have reported any problems yet."}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {problems.map((p) => (
                <div key={p._id} className="bg-[#ddd8cf] rounded-[1.2rem] p-5 flex flex-col sm:flex-row sm:items-start gap-4">
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h3 className="font-bold text-[#1a1a1a] text-sm truncate">{p.title}</h3>
                      <div className="flex items-center gap-1.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[p.status] || "bg-gray-400"}`} />
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#1a1a1a]/45">{p.status}</span>
                      </div>
                    </div>
                    <p className="text-xs text-[#1a1a1a]/50 line-clamp-2 mb-2 leading-relaxed">{p.description}</p>
                    <div className="flex flex-wrap gap-4 text-[10px] font-medium text-[#1a1a1a]/35 uppercase tracking-wider">
                      <span>{p.location}</span>
                      <span>{p.category}</span>
                      <span>{p.user?.name || "Citizen"}</span>
                      <span>{date(p.createdAt)}</span>
                      {/* <span>{p.supportCount || 0} supports</span> */}
                    </div>
                    {p.adminComment && (
                      <div className="mt-3 bg-[#ede8df] rounded-xl px-4 py-2.5 flex items-start gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-1.5 shrink-0" />
                        <p className="text-xs text-[#1a1a1a]/60 leading-relaxed">
                          <span className="font-bold text-[#1a1a1a]/70">Your response: </span>{p.adminComment}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Action button */}
                  <button
                    onClick={() => openModal(p._id, p.status)}
                    disabled={updating === p._id}
                    className="shrink-0 bg-[#1a1a1a] text-white text-xs font-semibold px-5 py-2.5 rounded-full hover:opacity-80 transition-opacity disabled:opacity-40"
                  >
                    {updating === p._id ? "Saving…" : "Respond →"}
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="flex justify-center items-center gap-4 mt-8">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="bg-[#ddd8cf] text-[#1a1a1a] text-xs font-semibold px-5 py-2.5 rounded-full hover:bg-[#d3cec5] transition-colors disabled:opacity-40"
              >
                ← Prev
              </button>
              <span className="text-xs font-medium text-[#1a1a1a]/45">Page {page} of {pagination.pages}</span>
              <button
                onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
                disabled={page === pagination.pages}
                className="bg-[#ddd8cf] text-[#1a1a1a] text-xs font-semibold px-5 py-2.5 rounded-full hover:bg-[#d3cec5] transition-colors disabled:opacity-40"
              >
                Next →
              </button>
            </div>
          )}
        </div>
      </section>

      {/* ── RESPOND MODAL ── */}
      {modal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#ede8df] rounded-[1.6rem] shadow-2xl w-full max-w-md">
            <div className="p-8">
              <h3 className="text-2xl font-extrabold text-[#1a1a1a] mb-6">Respond to Complaint</h3>

              <div className="mb-5">
                <label className="block text-[11px] font-bold uppercase tracking-widest text-[#1a1a1a]/40 mb-2">Update Status</label>
                <select
                  value={modal.status}
                  onChange={(e) => setModal((m) => ({ ...m, status: e.target.value }))}
                  className="w-full bg-[#ddd8cf] text-[#1a1a1a] text-sm font-medium px-4 py-3 rounded-xl border-none outline-none focus:ring-2 focus:ring-[#1a1a1a]/20 transition appearance-none"
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div className="mb-6">
                <label className="block text-[11px] font-bold uppercase tracking-widest text-[#1a1a1a]/40 mb-2">
                  Your Reply <span className="normal-case font-normal text-xs tracking-normal text-[#1a1a1a]/25">(optional)</span>
                </label>
                <textarea
                  rows={4}
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  placeholder="E.g. We have noted your complaint and will take action within 7 working days…"
                  className="w-full bg-[#ddd8cf] text-[#1a1a1a] placeholder-[#1a1a1a]/30 text-sm font-medium px-4 py-3 rounded-xl border-none outline-none focus:ring-2 focus:ring-[#1a1a1a]/20 transition resize-none leading-relaxed"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={applyReply}
                  className="flex-1 bg-[#1a1a1a] text-white font-semibold py-3 rounded-full hover:opacity-80 transition-opacity"
                >
                  Send Response
                </button>
                <button
                  onClick={() => setModal(null)}
                  className="flex-1 border border-[#1a1a1a]/20 text-[#1a1a1a] font-semibold py-3 rounded-full hover:bg-[#1a1a1a]/5 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
