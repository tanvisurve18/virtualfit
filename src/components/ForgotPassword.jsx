import React, { useState } from "react";
import { Box, TextField, Button, Typography, Paper } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const handleReset = async () => {
    setStatus("");
    setErrorMessage("");

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: "http://localhost:5173/reset-password",
    });

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setStatus("A reset link has been sent to your email.");
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #dfe9f3 0%, #ffffff 100%)",
      }}
    >
      <Paper
        elevation={10}
        sx={{
          width: 420,
          p: 4,
          borderRadius: "20px",
          backdropFilter: "blur(10px)",
          background: "rgba(255,255,255,0.85)",
        }}
      >
        <Typography variant="h4" textAlign="center" mb={2} fontWeight="bold">
          Forgot Password 🔒
        </Typography>

        <Typography textAlign="center" mb={3} color="gray">
          Enter your email to receive a reset link
        </Typography>

        {errorMessage && (
          <Typography color="error" textAlign="center" mb={2}>
            {errorMessage}
          </Typography>
        )}

        {status && (
          <Typography color="green" textAlign="center" mb={2}>
            {status}
          </Typography>
        )}

        <TextField
          fullWidth
          label="Email"
          sx={{ mb: 3 }}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <Button
          fullWidth
          variant="contained"
          sx={{
            height: "45px",
            background: "black",
            fontSize: "16px",
            borderRadius: "12px",
            "&:hover": { background: "#333" },
          }}
          onClick={handleReset}
        >
          SEND RESET LINK
        </Button>

        <Typography
          sx={{ mt: 3, textAlign: "center", cursor: "pointer", color: "#1976d2" }}
          onClick={() => navigate("/")}
        >
          Back to Login
        </Typography>
      </Paper>
    </Box>
  );
}
