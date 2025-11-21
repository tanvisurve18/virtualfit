import React, { useState } from "react";
import { Box, TextField, Button, Typography, Paper } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

export default function Signup() {
  const navigate = useNavigate();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const handleSignup = async () => {
    setErrorMessage("");

    if (!email) {
      setErrorMessage("Email is required.");
      return;
    }

    if (password !== confirm) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    await supabase.from("profiles").insert({
      id: data.user.id,
      full_name: fullName,
      phone: phone || null,
      email: email,
    });

    navigate("/signup-success");
  };

  return (
    <Box
      sx={{
        height: "100vh",
        display: "flex",
        justifyContent: "center",
        background: "#f5f7fb",
      }}
    >
      {/* LEFT PANEL */}
      <Box
        sx={{
          width: "45%",
          background: "linear-gradient(135deg, #ffd6e7, #e3f0ff)",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          paddingLeft: "60px",
        }}
      >
        <Typography sx={{ fontSize: "48px", fontWeight: "800", mb: 2 }}>
          Join VirtualFit ✨
        </Typography>

        <Typography sx={{ fontSize: "18px", color: "#444" }}>
          Create an account & explore personalized virtual try-ons.
        </Typography>
      </Box>

      {/* SIGNUP CARD */}
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
            p: 4,
            borderRadius: "20px",
            background: "rgba(255,255,255,0.9)",
            backdropFilter: "blur(12px)",
          }}
        >
          <Typography variant="h5" textAlign="center" fontWeight="bold" mb={2}>
            Create Your Account
          </Typography>

          {errorMessage && (
            <Typography color="error" textAlign="center" mb={2}>
              {errorMessage}
            </Typography>
          )}

          <TextField
            label="Full Name"
            fullWidth
            sx={{ mb: 2 }}
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />

          <TextField
            label="Email (Required)"
            fullWidth
            sx={{ mb: 2 }}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          

          <TextField
            label="Password"
            fullWidth
            type="password"
            sx={{ mb: 2 }}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <TextField
            label="Confirm Password"
            fullWidth
            type="password"
            sx={{ mb: 3 }}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />

          <Button
            fullWidth
            variant="contained"
            sx={{
              background: "black",
              height: "45px",
              fontSize: "16px",
              borderRadius: "12px",
            }}
            onClick={handleSignup}
          >
            SIGN UP
          </Button>

          <Typography textAlign="center" mt={3}>
            Already have an account?{" "}
            <span
              style={{ color: "#1976d2", cursor: "pointer" }}
              onClick={() => navigate("/")}
            >
              Login
            </span>
          </Typography>
        </Paper>
      </Box>
    </Box>
  );
}
