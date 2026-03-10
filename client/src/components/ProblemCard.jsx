import React from "react";
import { Link } from "react-router-dom";
import { StatusBadge, SeverityBadge } from "./StatusBadge";

const CATEGORY_COLORS = {
  "Road Infrastructure": "bg-blue-50 text-blue-700",
  Crime:                 "bg-red-50 text-red-700",
  Railway:               "bg-yellow-50 text-yellow-700",
  Transport:             "bg-purple-50 text-purple-700",
  Corruption:            "bg-orange-50 text-orange-700",
  Education:             "bg-green-50 text-green-700",
  Health:                "bg-pink-50 text-pink-700",
  Environment:           "bg-teal-50 text-teal-700",
  "Water Supply":        "bg-cyan-50 text-cyan-700",
  Electricity:           "bg-amber-50 text-amber-700",
  Other:                 "bg-gray-50 text-gray-700",
};

const CATEGORY_ICONS = {
  "Road Infrastructure": "🛣️",
  Crime:                 "🚨",
  Railway:               "🚂",
  Transport:             "🚌",
  Corruption:            "⚠️",
  Education:             "📚",
  Health:                "🏥",
  Environment:           "🌿",
  "Water Supply":        "💧",
  Electricity:           "⚡",
  Other:                 "📋",
};

export default function ProblemCard({ problem, showActions = false, onStatusChange }) {
  const {
    _id,
    title,
    description,
    location,
    category,
    assignedAgency,
    severity,
    status,
    supportCount,
    createdAt,
    createdBy,
    adminComment,
  } = problem;

  const catColor = CATEGORY_COLORS[category] || CATEGORY_COLORS.Other;
  const catIcon  = CATEGORY_ICONS[category]  || "📋";
  const date     = new Date(createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

  return (
    <div className="card hover:shadow-md transition-shadow duration-200 animate-fade-in" style={{ backgroundColor: "#D3CEC5" }}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="min-w-0">
            <Link
              to={`/problems/${_id}`}
              className="font-semibold text-gray-900 hover:text-blue-600 transition-colors line-clamp-1 block"
            >
              {title}
            </Link>
            <p className="text-xs text-gray-500 mt-0.5">{category} → {assignedAgency}</p>
          </div>
        </div>
        <StatusBadge status={status} />
      </div>

      {/* Description */}
      <p className="text-sm text-gray-600 line-clamp-2 mb-3">{description}</p>

      {/* Meta row */}
      <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          {location}
        </span>
        <span className="text-gray-300">•</span>
        <span>{date}</span>
        <span className="text-gray-300">•</span>
        <span className="flex items-center gap-1">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          {supportCount} {supportCount === 1 ? "report" : "reports"}
        </span>

      </div>

      {/* Agency response */}
      {adminComment && (
        <div className="mt-3 pt-3 border-t border-gray-100 bg-blue-50 rounded-lg px-3 py-2">
          <p className="text-xs font-semibold text-blue-700 mb-1">🏛️ Agency Response</p>
          <p className="text-xs text-blue-800 leading-relaxed">{adminComment}</p>
        </div>
      )}

      {/* Admin status change */}
      {showActions && onStatusChange && (
        <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-2">
          <label className="text-xs text-gray-500 font-medium shrink-0">Status:</label>
          <select
            value={status}
            onChange={(e) => onStatusChange(_id, e.target.value)}
            className="text-xs border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
          >
            {["Pending", "In Progress", "Resolved", "Rejected"].map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
