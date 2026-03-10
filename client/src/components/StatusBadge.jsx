import React from "react";

const STATUS_STYLES = {
  Pending:     "bg-yellow-100 text-yellow-800 border border-yellow-200",
  "In Progress": "bg-blue-100 text-blue-800 border border-blue-200",
  Resolved:    "bg-green-100 text-green-800 border border-green-200",
  Rejected:    "bg-red-100 text-red-800 border border-red-200",
};

const SEVERITY_STYLES = {
  High:   "bg-red-100 text-red-700 border border-red-200",
  Medium: "bg-orange-100 text-orange-700 border border-orange-200",
  Low:    "bg-gray-100 text-gray-600 border border-gray-200",
};

export const StatusBadge = ({ status }) => (
  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[status] || STATUS_STYLES.Pending}`}>
    {status}
  </span>
);

export const SeverityBadge = ({ severity }) => (
  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${SEVERITY_STYLES[severity] || SEVERITY_STYLES.Medium}`}>
    {severity}
  </span>
);

export default StatusBadge;
