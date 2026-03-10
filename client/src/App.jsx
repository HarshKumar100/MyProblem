import React from "react";
import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "./context/AuthContext";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import PrivateRoute from "./components/PrivateRoute";
import AdminRoute from "./components/AdminRoute";
import AgencyRoute from "./components/AgencyRoute";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import ReportProblem from "./pages/ReportProblem";
import AdminPanel from "./pages/AdminPanel";
import AgencyDashboard from "./pages/AgencyDashboard";
import ProblemDetail from "./pages/ProblemDetail";

const NO_SHELL_ROUTES = ["/login", "/register"];

function AppShell() {
  const location = useLocation();
  const hideShell = NO_SHELL_ROUTES.includes(location.pathname);

  return (
    <div className={hideShell ? "" : "min-h-screen flex flex-col"}>
      {!hideShell && <Navbar />}
      <main className={hideShell ? "" : "flex-grow"}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/dashboard"
            element={
              <PrivateRoute>
                <Dashboard />
              </PrivateRoute>
            }
          />
          <Route
            path="/report"
            element={
              <PrivateRoute>
                <ReportProblem />
              </PrivateRoute>
            }
          />
          <Route
            path="/problems/:id"
            element={
              <PrivateRoute>
                <ProblemDetail />
              </PrivateRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <AdminRoute>
                <AdminPanel />
              </AdminRoute>
            }
          />
          <Route
            path="/agency"
            element={
              <AgencyRoute>
                <AgencyDashboard />
              </AgencyRoute>
            }
          />
        </Routes>
      </main>
      {!hideShell && location.pathname === "/" && <Footer />}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: { borderRadius: "8px", background: "#1e293b", color: "#f8fafc", fontSize: "14px" },
        }}
      />
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppShell />
      </Router>
    </AuthProvider>
  );
}

export default App;
