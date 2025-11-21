import React, { useState, useEffect } from "react";
import { Box, TextField, Button, Typography, Paper } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

export default function Login() {
  const navigate = useNavigate();

  const [identifier, setIdentifier] = useState(
    localStorage.getItem("rememberIdentifier") || ""
  );
  const [password, setPassword] = useState(
    localStorage.getItem("rememberPassword") || ""
  );
  const [remember, setRemember] = useState(
    localStorage.getItem("rememberPassword") ? true : false
  );
  const [errorMessage, setErrorMessage] = useState("");

  const handleLogin = async () => {
    setErrorMessage("");

    let loginEmail = identifier;

    // If phone entered, fetch email
    if (!identifier.includes("@")) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("email")
        .eq("phone", identifier)
        .single();

      if (!profile) {
        setErrorMessage("Invalid email / phone or password.");
        return;
      }

      loginEmail = profile.email;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password,
    });

    if (error) {
      setErrorMessage("Invalid email / phone or password.");
      return;
    }

    if (remember) {
      localStorage.setItem("rememberIdentifier", identifier);
      localStorage.setItem("rememberPassword", password);
    } else {
      localStorage.removeItem("rememberIdentifier");
      localStorage.removeItem("rememberPassword");
    }

    navigate("/dashboard");
  };

  return (
    <Box
      sx={{
        height: "100vh",
        display: "flex",
        background: "#f5f7fb",
      }}
    >
      {/* LEFT PANEL */}
      <Box
        sx={{
          width: "45%",
          background: "linear-gradient(135deg, #ffd6e7, #ffe3f3)",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          paddingLeft: "60px",
        }}
      >
        <Typography sx={{ fontSize: "48px", fontWeight: "800" }}>
          VirtualFit 👗✨
        </Typography>

        <Typography sx={{ fontSize: "18px", color: "#444", mt: 2 }}>
          Your Smart Virtual Try-On & Style Assistant.
        </Typography>
      </Box>

      {/* LOGIN CARD */}
      <Box
        sx={{
          width: "55%",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Paper
          elevation={10}
          sx={{
            width: 400,
            padding: 4,
            borderRadius: "20px",
            background: "rgba(255,255,255,0.9)",
            backdropFilter: "blur(10px)",
          }}
        >
          <Typography variant="h5" textAlign="center" mb={2} fontWeight="bold">
            Login
          </Typography>

          {errorMessage && (
            <Typography color="error" mb={2} textAlign="center">
              {errorMessage}
            </Typography>
          )}

          <TextField
            label="Email ID"
            fullWidth
            sx={{ mb: 2 }}
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
          />

          <TextField
            label="Password"
            type="password"
            fullWidth
            sx={{ mb: 2 }}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          

          <Button
            fullWidth
            variant="contained"
            sx={{
              background: "black",
              height: "45px",
              borderRadius: "12px",
              fontSize: "16px",
            }}
            onClick={handleLogin}
          >
            LOGIN
          </Button>

          <Typography
            sx={{ mt: 2, textAlign: "right", color: "#1976d2", cursor: "pointer" }}
            onClick={() => navigate("/forgot-password")}
          >
            Forgot Password?
          </Typography>

          <Typography sx={{ mt: 3, textAlign: "center" }}>
            Don’t have an account?{" "}
            <span
              style={{ color: "#1976d2", cursor: "pointer" }}
              onClick={() => navigate("/signup")}
            >
              Sign Up
            </span>
          </Typography>
        </Paper>
      </Box>
    </Box>
  );
}
