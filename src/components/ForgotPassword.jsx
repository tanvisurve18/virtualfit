import React, { useState } from "react";
import { Box, TextField, Button, Typography, Paper, CircularProgress, Alert } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [showManualInstructions, setShowManualInstructions] = useState(false);

  const handleReset = async () => {
    setStatus("");
    setErrorMessage("");
    setShowManualInstructions(false);

    // Validate email
    if (!email) {
      setErrorMessage("Please enter your email.");
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setErrorMessage("Please enter a valid email address.");
      return;
    }

    setLoading(true);

    try {
      console.log("🔑 Attempting password reset for:", email);
      
      const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      console.log("Reset response:", { data, error });

      if (error) {
        console.error("❌ Reset error:", error);
        
        // Check if it's an email sending error
        if (error.message.includes("Error sending") || 
            error.message.includes("AuthApiError") ||
            error.message.includes("SMTP") ||
            error.message.includes("email service")) {
          
          setErrorMessage("Email service is currently unavailable. Please contact support or try again later.");
          setShowManualInstructions(true);
          
        } else if (error.message.includes("Email not confirmed")) {
          setErrorMessage("Please verify your email address first. Check your inbox for the verification link.");
          
        } else if (error.message.includes("Email rate limit")) {
          setErrorMessage("Too many requests. Please wait a few minutes before trying again.");
          
        } else if (error.message.includes("User not found")) {
          // For security, show success message even if user doesn't exist
          setStatus("If an account exists with this email, you will receive a password reset link.");
          
        } else {
          setErrorMessage(error.message || "Failed to send reset email. Please try again.");
          setShowManualInstructions(true);
        }
        return;
      }

      console.log("✅ Reset email sent successfully");
      setStatus("Password reset link sent! Check your email inbox (and spam folder).");
      
      // Clear email field after successful send
      setTimeout(() => {
        setEmail("");
      }, 2000);

    } catch (err) {
      console.error("💥 Unexpected error:", err);
      setErrorMessage("An unexpected error occurred. Email service may be unavailable.");
      setShowManualInstructions(true);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !loading) {
      handleReset();
    }
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
          p: 5, 
          width: { xs: "100%", sm: "500px" },
          maxWidth: "95%",
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
            🔒
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
            Forgot Password?
          </Typography>

          <Typography 
            sx={{ 
              color: "#7d6a8e",
              fontSize: "15px",
            }}
          >
            No worries! Enter your email and we'll send you a reset link
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
            <Typography sx={{ color: "#dc2626", fontSize: "14px", textAlign: "center", fontWeight: 500 }}>
              ❌ {errorMessage}
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
            <Typography sx={{ color: "#16a34a", fontSize: "14px", textAlign: "center", fontWeight: 500 }}>
              ✓ {status}
            </Typography>
          </Box>
        )}

        {showManualInstructions && (
          <Alert severity="info" sx={{ mb: 3, borderRadius: "12px" }}>
            <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
              Email Service Unavailable
            </Typography>
            <Typography variant="body2" sx={{ fontSize: "13px", mb: 1 }}>
              Our email service is currently experiencing issues. To reset your password:
            </Typography>
            <Typography variant="body2" sx={{ fontSize: "13px", pl: 2 }}>
              1. Contact support with your email: <strong>{email}</strong><br/>
              2. Or try again in a few minutes
            </Typography>
          </Alert>
        )}

        <TextField
          fullWidth
          label="Email Address"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value.trim())}
          onKeyPress={handleKeyPress}
          disabled={loading}
          placeholder="your.email@example.com"
          sx={{ 
            mb: 3,
            "& .MuiOutlinedInput-root": {
              borderRadius: "12px",
              background: "#fafafa",
              "&:hover fieldset": {
                borderColor: "#7c3aed",
              },
              "&.Mui-focused fieldset": {
                borderColor: "#7c3aed",
              }
            }
          }}
        />

        <Button
          fullWidth
          variant="contained"
          disabled={loading || !email}
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
            },
            "&:disabled": {
              background: "#e0e0e0",
              color: "#9e9e9e",
              boxShadow: "none",
            }
          }}
          onClick={handleReset}
        >
          {loading ? (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <CircularProgress size={20} sx={{ color: "white" }} />
              <span>Sending...</span>
            </Box>
          ) : (
            "Send Reset Link"
          )}
        </Button>

        <Typography
          sx={{ 
            mt: 4, 
            textAlign: "center", 
            cursor: "pointer", 
            color: "#7c3aed",
            fontSize: "15px",
            fontWeight: "500",
            "&:hover": {
              textDecoration: "underline",
            }
          }}
          onClick={() => navigate("/login")}
        >
          ← Back to Sign In
        </Typography>

        {/* Help text */}
        <Box sx={{ 
          mt: 3, 
          p: 2, 
          borderRadius: "12px", 
          background: "rgba(124, 58, 237, 0.05)",
          border: "1px solid rgba(124, 58, 237, 0.1)"
        }}>
          <Typography sx={{ fontSize: "13px", color: "#7d6a8e", textAlign: "center" }}>
            💡 <strong>Note:</strong> If you continue to experience issues, please contact our support team.
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
}