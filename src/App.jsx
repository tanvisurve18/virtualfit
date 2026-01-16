// App.jsx
import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";

import HomePage from "./components/HomePage";
import Login from "./components/Login";
import Signup from "./components/Signup";
import Dashboard from "./components/Dashboard";
import TryOnHistory from "./components/TryOnHistory";
import TryOn from "./pages/TryOn";

// 🔐 Auth pages
import ForgotPassword from "./components/ForgotPassword";
import ResetPassword from "./components/ResetPassword";

/**
 * Simple auth helper (localStorage based)
 */
const auth = {
  isAuthenticated: () => !!localStorage.getItem("vf_token"),
  getUser: () => JSON.parse(localStorage.getItem("vf_user") || "null"),
};

function ProtectedRoute({ children }) {
  const location = useLocation();

  if (!auth.isAuthenticated()) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return children;
}

export default function App() {
  return (
    <Router>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />

        {/* 🔐 Password reset flow */}
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* Protected routes */}
        <Route
          path="/dashboard/*"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        {/* Virtual Try-On */}
        <Route path="/tryon" element={<TryOn />} />
        <Route path="/tryon-history" element={<TryOnHistory />} />
        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}
