import React, { useState } from "react";
import { Box, TextField, Button, Typography, Paper } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

export default function ResetPassword() {
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [status, setStatus] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const handleUpdate = async () => {
    setErrorMessage("");
    setStatus("");

    if (password !== confirm) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setStatus("Password updated successfully!");
    setTimeout(() => navigate("/"), 1500);
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        background: "linear-gradient(135deg, #e3f0ff 0%, #ffffff 100%)",
      }}
    >
      <Paper
        elevation={10}
        sx={{
          width: 420,
          p: 4,
          borderRadius: "20px",
          background: "rgba(255,255,255,0.85)",
          backdropFilter: "blur(10px)",
        }}
      >
        <Typography variant="h4" textAlign="center" mb={2} fontWeight="bold">
          Reset Password 🔑
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
          label="New Password"
          type="password"
          sx={{ mb: 2 }}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <TextField
          fullWidth
          label="Confirm Password"
          type="password"
          sx={{ mb: 3 }}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />

        <Button
          fullWidth
          variant="contained"
          sx={{
            height: "45px",
            background: "black",
            borderRadius: "12px",
            fontSize: "16px",
            "&:hover": { background: "#333" },
          }}
          onClick={handleUpdate}
        >
          UPDATE PASSWORD
        </Button>
      </Paper>
    </Box>
  );
}
