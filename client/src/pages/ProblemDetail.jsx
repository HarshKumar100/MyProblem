import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import api from "../services/api";
import { localGetProblemById, localAddSupport } from "../services/localStore";
import toast from "react-hot-toast";
import { StatusBadge, SeverityBadge } from "../components/StatusBadge";
import { useAuth } from "../context/AuthContext";

const CATEGORY_ICON = {
  "Road Infrastructure": "🛣️", Crime: "🚨", Railway: "🚂", Transport: "🚌",
  Corruption: "⚠️", Education: "📚", Health: "🏥", Environment: "🌿",
  "Water Supply": "💧", Electricity: "⚡", Other: "📋",
};

export default function ProblemDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [problem, setProblem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [supporting, setSupporting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetch = async () => {
      try {
        const { data } = await api.get(`/api/problems/${id}`);
        setProblem(data.problem);
      } catch {
        // Backend down — try localStorage
        const local = localGetProblemById(id);
        if (local) setProblem(local);
        else setError("Problem not found.");
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [id]);

  const handleSupport = async () => {
    setSupporting(true);
    try {
      const { data } = await api.post(`/api/problems/${id}/support`);
      toast.success(`Thank you for supporting! Total: ${data.supportCount} reports`);
      setProblem((p) => ({ ...p, supportCount: data.supportCount }));
    } catch {
      // Backend down — update localStorage
      try {
        const { supportCount } = localAddSupport(id, user?._id || "guest");
        toast.success(`Thank you for supporting! Total: ${supportCount} reports`);
        setProblem((p) => ({ ...p, supportCount }));
      } catch (localErr) {
        toast.error(localErr.message || "Could not add support");
      }
    } finally {
      setSupporting(false);
    }
  };

  const hasSupported = problem?.supporters?.includes(user?.id);
  const date = (d) => new Date(d).toLocaleDateString("en-IN", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
    </div>
  );

  if (error) return (
    <div className="max-w-2xl mx-auto px-4 py-16 text-center">
      <div className="text-5xl mb-4">😕</div>
      <p className="text-gray-600 text-lg font-medium">{error}</p>
      <Link to="/dashboard" className="btn-primary mt-6 inline-block">← Back to Dashboard</Link>
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 animate-fade-in">
      {/* Back */}
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 mb-6 transition-colors">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back
      </button>

      {/* Header card */}
      <div className="card mb-5">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{CATEGORY_ICON[problem.category] || "📋"}</span>
            <div>
              <h1 className="text-xl font-bold text-gray-900 leading-snug">{problem.title}</h1>
              <p className="text-sm text-gray-500 mt-0.5">{problem.category} → {problem.assignedAgency}</p>
            </div>
          </div>
          <StatusBadge status={problem.status} />
        </div>

        {/* Image */}
        {problem.image && (
          <img
            src={problem.image}
            alt="Problem evidence"
            className="w-full max-h-72 object-cover rounded-lg mb-4 border border-gray-200"
          />
        )}

        {/* Description */}
        <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{problem.description}</p>

        {/* Meta grid */}
        <div className="grid sm:grid-cols-2 gap-3 mt-5 pt-5 border-t border-gray-100 text-sm">
          <div className="flex items-center gap-2 text-gray-600">
            <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a2 2 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {problem.location}
          </div>
          <div className="flex items-center gap-2 text-gray-600">
            <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {date(problem.createdAt)}
          </div>
          <div className="flex items-center gap-2 text-gray-600">
            <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            Reported by {problem.createdBy?.name || "Unknown"}
          </div>
          <div className="flex items-center gap-2 text-gray-600">
            <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {problem.supportCount} {problem.supportCount === 1 ? "person" : "people"} reported
          </div>
        </div>
      </div>

      {/* AI Analysis */}
      <div className="card mb-5">
        <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <span>🤖</span> AI Analysis
        </h2>
        <div className="grid sm:grid-cols-3 gap-4">
          <div className="bg-blue-50 rounded-lg p-3 text-center">
            <p className="text-xs text-gray-500 mb-1">Category</p>
            <p className="font-semibold text-blue-700 text-sm">{problem.category}</p>
          </div>
          <div className="bg-green-50 rounded-lg p-3 text-center">
            <p className="text-xs text-gray-500 mb-1">Assigned Agency</p>
            <p className="font-semibold text-green-700 text-sm">{problem.assignedAgency}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <p className="text-xs text-gray-500 mb-1">Severity</p>
            <SeverityBadge severity={problem.severity} />
          </div>
        </div>
        {problem.keywords?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-4">
            {problem.keywords.map((k) => (
              <span key={k} className="bg-blue-50 text-blue-600 text-xs px-2.5 py-1 rounded-full border border-blue-100">
                #{k}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Admin comment */}
      {problem.adminComment && (
        <div className="card mb-5 bg-blue-50 border-blue-100">
          <h3 className="font-semibold text-blue-900 text-sm mb-2">🏛️ Agency Response</h3>
          <p className="text-blue-800 text-sm">{problem.adminComment}</p>
          {problem.resolvedAt && (
            <p className="text-xs text-blue-500 mt-2">Resolved on {date(problem.resolvedAt)}</p>
          )}
        </div>
      )}

      {/* Support button */}
      {problem.createdBy?._id !== user?.id && (
        <div className="card text-center">
          <p className="font-semibold text-gray-900 mb-1">Has this problem affected you too?</p>
          <p className="text-sm text-gray-500 mb-4">
            {problem.supportCount} {problem.supportCount === 1 ? "citizen has" : "citizens have"} reported this. Support to increase priority.
          </p>
          <button
            onClick={handleSupport}
            disabled={supporting || hasSupported}
            className={`btn-primary ${hasSupported ? "opacity-50 cursor-default" : ""}`}
          >
            {hasSupported ? "✅ You supported this" : supporting ? "Adding support…" : "👍 Support This Complaint"}
          </button>
        </div>
      )}
    </div>
  );
}
