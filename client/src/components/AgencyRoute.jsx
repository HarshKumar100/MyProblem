import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const AgencyRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-600" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== "agency" && user.role !== "admin")
    return <Navigate to="/dashboard" replace />;
  return children;
};

export default AgencyRoute;
