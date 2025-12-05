// App.jsx
import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom";
import HomePage from "./components/HomePage"; // your existing improved HomePage
import Login from "./components/Login";
import Signup from "./components/Signup"; // optional - if you have it
import Dashboard from "./components/Dashboard";

/**
 * Simple auth helper using localStorage.
 * Replace with real auth context / token verification later.
 */
const auth = {
  isAuthenticated: () => !!localStorage.getItem("vf_token"),
  getUser: () => JSON.parse(localStorage.getItem("vf_user") || "null"),
};

function ProtectedRoute({ children }) {
  const location = useLocation();
  if (!auth.isAuthenticated()) {
    // Redirect to /login and preserve attempted URL
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  return children;
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />

        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />


        {/* Protected dashboard route */}
        <Route
          path="/dashboard/*"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        {/* Try-on page route (if present) */}
        <Route path="/tryon" element={<div style={{padding:40}}>Try-On Page (wire up later)</div>} />

        {/* fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}
