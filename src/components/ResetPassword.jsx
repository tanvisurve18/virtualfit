import React, { useState, useEffect } from "react";
import { Box, TextField, Button, Typography, Paper, InputAdornment, IconButton } from "@mui/material";
import { Visibility, VisibilityOff } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

export default function ResetPassword() {
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [status, setStatus] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    supabase.auth.getSession();
  }, []);

  const handleUpdate = async () => {
    setErrorMessage("");
    setStatus("");

    if (password !== confirm) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    const { error } = await supabase.auth.updateUser({
      password,
    });

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setStatus("Password updated successfully!");
    setTimeout(() => navigate("/login"), 1500);
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        background: "linear-gradient(135deg, #e8d5ff 0%, #f5e6ff 50%, #ffeef8 100%)",
        padding: 2,
        position: "relative",
        overflow: "hidden",
        "&::before": {
          content: '""',
          position: "absolute",
          top: "-50%",
          right: "-20%",
          width: "600px",
          height: "600px",
          background: "radial-gradient(circle, rgba(147, 112, 219, 0.15) 0%, transparent 70%)",
          borderRadius: "50%",
        },
        "&::after": {
          content: '""',
          position: "absolute",
          bottom: "-30%",
          left: "-15%",
          width: "500px",
          height: "500px",
          background: "radial-gradient(circle, rgba(186, 147, 216, 0.15) 0%, transparent 70%)",
          borderRadius: "50%",
        }
      }}
    >
      <Paper
        elevation={0}
        sx={{
          width: { xs: "100%", sm: "440px" },
          p: 5,
          borderRadius: "24px",
          background: "rgba(255, 255, 255, 0.95)",
          backdropFilter: "blur(20px)",
          border: "1px solid rgba(255, 255, 255, 0.3)",
          boxShadow: "0 20px 60px rgba(124, 58, 237, 0.12)",
          position: "relative",
          zIndex: 1,
        }}
      >
        <Box sx={{ textAlign: "center", mb: 4 }}>
          <Box sx={{
            width: 80,
            height: 80,
            borderRadius: "20px",
            background: "linear-gradient(135deg, rgba(124, 58, 237, 0.1) 0%, rgba(168, 85, 247, 0.1) 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 20px",
            fontSize: "40px",
          }}>
            🔐
          </Box>
          
          <Typography 
            variant="h4" 
            sx={{ 
              fontWeight: "700",
              color: "#2d1b3d",
              mb: 1,
              fontSize: "32px",
            }}
          >
            Reset Password
          </Typography>

          <Typography 
            sx={{ 
              color: "#7d6a8e",
              fontSize: "15px",
            }}
          >
            Create a new password for your account
          </Typography>
        </Box>

        {errorMessage && (
          <Box sx={{
            mb: 3,
            p: 2,
            borderRadius: "12px",
            background: "rgba(239, 68, 68, 0.08)",
            border: "1px solid rgba(239, 68, 68, 0.2)",
          }}>
            <Typography sx={{ color: "#dc2626", fontSize: "14px", textAlign: "center" }}>
              {errorMessage}
            </Typography>
          </Box>
        )}

        {status && (
          <Box sx={{
            mb: 3,
            p: 2,
            borderRadius: "12px",
            background: "rgba(34, 197, 94, 0.08)",
            border: "1px solid rgba(34, 197, 94, 0.2)",
          }}>
            <Typography sx={{ color: "#16a34a", fontSize: "14px", textAlign: "center" }}>
              ✓ {status}
            </Typography>
          </Box>
        )}

        <TextField
          fullWidth
          label="New Password"
          type={showPassword ? "text" : "password"}
          sx={{ 
            mb: 3,
            "& .MuiOutlinedInput-root": {
              borderRadius: "12px",
              background: "#fafafa",
              "&:hover fieldset": {
                borderColor: "#ff6b9d",
              },
              "&.Mui-focused fieldset": {
                borderColor: "#ff6b9d",
              }
            }
          }}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  onClick={togglePasswordVisibility}
                  edge="end"
                  sx={{ color: "#9d8aaa" }}
                >
                  {showPassword ? <VisibilityOff /> : <Visibility />}
                </IconButton>
              </InputAdornment>
            ),
          }}
        />

        <TextField
          fullWidth
          label="Confirm Password"
          type={showConfirmPassword ? "text" : "password"}
          sx={{ 
            mb: 3,
            "& .MuiOutlinedInput-root": {
              borderRadius: "12px",
              background: "#fafafa",
              "&:hover fieldset": {
                borderColor: "#ff6b9d",
              },
              "&.Mui-focused fieldset": {
                borderColor: "#ff6b9d",
              }
            }
          }}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  onClick={toggleConfirmPasswordVisibility}
                  edge="end"
                  sx={{ color: "#9d8aaa" }}
                >
                  {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                </IconButton>
              </InputAdornment>
            ),
          }}
        />

        <Button
          fullWidth
          variant="contained"
          sx={{
            height: "52px",
            background: "linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)",
            borderRadius: "12px",
            fontSize: "16px",
            fontWeight: "600",
            textTransform: "none",
            boxShadow: "0 8px 24px rgba(124, 58, 237, 0.3)",
            "&:hover": {
              background: "linear-gradient(135deg, #6d28d9 0%, #9333ea 100%)",
              boxShadow: "0 12px 32px rgba(124, 58, 237, 0.4)",
            }
          }}
          onClick={handleUpdate}
        >
          Update Password
        </Button>
      </Paper>
    </Box>
  );
}