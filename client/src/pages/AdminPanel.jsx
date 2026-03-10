import React, { useEffect, useState, useCallback } from "react";
import api from "../services/api";
import { localGetAllProblems, localGetStats, localUpdateStatus } from "../services/localStore";
import toast from "react-hot-toast";
import { StatusBadge, SeverityBadge } from "../components/StatusBadge";

const CATEGORIES = ["All", "Road Infrastructure", "Crime", "Railway", "Transport", "Corruption", "Education", "Health", "Environment", "Water Supply", "Electricity", "Other"];
const STATUSES   = ["All", "Pending", "In Progress", "Resolved", "Rejected"];

const StatCard = ({ label, value, color, icon }) => (
  <div className="card">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-gray-500">{label}</p>
        <p className={`text-3xl font-bold mt-1 ${color}`}>{value}</p>
      </div>
      <span className="text-3xl opacity-60">{icon}</span>
    </div>
  </div>
);

export default function AdminPanel() {
  const [problems, setProblems]     = useState([]);
  const [stats, setStats]           = useState(null);
  const [loading, setLoading]       = useState(true);
  const [category, setCategory]     = useState("All");
  const [status, setStatus]         = useState("All");
  const [search, setSearch]         = useState("");
  const [page, setPage]             = useState(1);
  const [pagination, setPagination] = useState({});
  const [updating, setUpdating]     = useState(null);
  const [commentModal, setModal]    = useState(null); // {id, status}
  const [adminComment, setComment]  = useState("");

  const fetchProblems = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 15 });
      if (category !== "All") params.append("category", category);
      if (status   !== "All") params.append("status",   status);
      if (search)              params.append("search",   search);
      const { data } = await api.get(`/api/problems?${params}`);
      setProblems(data.problems || []);
      setPagination(data.pagination || {});
    } catch {
      // Backend down — use localStorage
      const result = localGetAllProblems({ category, status, search, page, limit: 15 });
      setProblems(result.problems);
      setPagination(result.pagination);
    }
    finally  { setLoading(false); }
  }, [page, category, status, search]);

  const fetchStats = useCallback(async () => {
    try {
      const { data } = await api.get("/api/problems/stats");
      setStats(data.stats);
    } catch {
      // Backend down — compute from localStorage
      setStats(localGetStats());
    }
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);
  useEffect(() => { fetchProblems(); }, [fetchProblems]);

  const openModal = (id, currentStatus) => {
    setModal({ id, status: currentStatus });
    setComment("");
  };

  const applyStatusChange = async () => {
    if (!commentModal) return;
    setUpdating(commentModal.id);
    try {
      await api.put(`/api/problems/${commentModal.id}/status`, {
        status: commentModal.status,
        adminComment: adminComment || undefined,
      });
      toast.success("Status updated");
      setModal(null);
      fetchProblems();
      fetchStats();
    } catch {
      // Backend down — update localStorage
      try {
        localUpdateStatus(commentModal.id, commentModal.status, adminComment);
        toast.success("Status updated (offline mode)");
        setModal(null);
        fetchProblems();
        fetchStats();
      } catch (localErr) {
        toast.error(localErr.message || "Update failed");
      }
    } finally { setUpdating(null); }
  };

  const date = (d) => new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 animate-fade-in">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Admin Panel</h1>
        <p className="text-gray-500 text-sm mt-1">Manage all citizen-reported problems across India.</p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <StatCard label="Total Problems" value={stats.total}      color="text-gray-800"   icon="📋" />
          <StatCard label="Pending"         value={stats.pending}    color="text-yellow-600" icon="⏳" />
          <StatCard label="In Progress"     value={stats.inProgress} color="text-blue-600"   icon="🔄" />
          <StatCard label="Resolved"        value={stats.resolved}   color="text-green-600"  icon="✅" />
        </div>
      )}

      {/* Category Stats */}
      {stats?.categoryStats?.length > 0 && (
        <div className="card mb-8">
          <h2 className="font-semibold text-gray-800 mb-4">Problems by Category</h2>
          <div className="flex flex-wrap gap-2">
            {stats.categoryStats.map((c) => (
              <button
                key={c._id}
                onClick={() => { setCategory(c._id); setPage(1); }}
                className="flex items-center gap-1.5 bg-blue-50 border border-blue-100 text-blue-700 text-xs font-medium px-3 py-1.5 rounded-full hover:bg-blue-100 transition-colors"
              >
                {c._id}
                <span className="bg-blue-600 text-white rounded-full px-1.5 py-0.5 text-[10px]">{c.count}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="card mb-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search problems…"
            className="input-field max-w-xs"
          />
          <select
            value={category}
            onChange={(e) => { setCategory(e.target.value); setPage(1); }}
            className="input-field max-w-xs"
          >
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            className="input-field max-w-[180px]"
          >
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <button onClick={fetchProblems} className="btn-secondary shrink-0">Refresh</button>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center py-16">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto" />
          <p className="text-gray-400 mt-4">Loading…</p>
        </div>
      ) : problems.length === 0 ? (
        <div className="text-center py-16 text-gray-400">No problems match the selected filters.</div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {["Title", "Category", "Agency", "Severity", "Location", "Reporter", "Date", "Status", "Action"].map((h) => (
                    <th key={h} className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3 whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {problems.map((p) => (
                  <tr key={p._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 max-w-[200px]">
                      <a href={`/problems/${p._id}`} className="font-medium text-gray-900 hover:text-blue-600 line-clamp-1 block">
                        {p.title}
                      </a>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-gray-600">{p.category}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-gray-600 text-xs">{p.assignedAgency}</td>
                    <td className="px-4 py-3"><SeverityBadge severity={p.severity} /></td>
                    <td className="px-4 py-3 text-gray-500 text-xs max-w-[120px] truncate">{p.location}</td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{p.createdBy?.name || "—"}</td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{date(p.createdAt)}</td>
                    <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => openModal(p._id, p.status)}
                        disabled={updating === p._id}
                        className="text-xs font-medium text-blue-600 hover:text-blue-800 underline underline-offset-2 whitespace-nowrap"
                      >
                        {updating === p._id ? "Updating…" : "Change Status"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="flex items-center justify-center gap-3 mt-6">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="btn-secondary !py-1.5 !px-3 disabled:opacity-40"
              >
                ← Prev
              </button>
              <span className="text-sm text-gray-600">
                Page {page} of {pagination.pages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
                disabled={page === pagination.pages}
                className="btn-secondary !py-1.5 !px-3 disabled:opacity-40"
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}

      {/* Status Change Modal */}
      {commentModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 animate-fade-in">
            <h3 className="font-bold text-gray-900 text-lg mb-4">Update Problem Status</h3>
            <div className="mb-4">
              <label className="label">New Status</label>
              <select
                value={commentModal.status}
                onChange={(e) => setModal((m) => ({ ...m, status: e.target.value }))}
                className="input-field"
              >
                {["Pending", "In Progress", "Resolved", "Rejected"].map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div className="mb-6">
              <label className="label">Admin Comment <span className="text-gray-400 text-xs">(optional)</span></label>
              <textarea
                value={adminComment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
                placeholder="Add a note visible to the reporter…"
                className="input-field resize-none"
              />
            </div>
            <div className="flex gap-3">
              <button onClick={applyStatusChange} disabled={updating} className="btn-primary flex-1">
                {updating ? "Saving…" : "Update Status"}
              </button>
              <button onClick={() => setModal(null)} className="btn-secondary flex-1">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
