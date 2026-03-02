import React, { useState } from "react";
import { Box, TextField, Button, Typography, Paper, InputAdornment, IconButton } from "@mui/material";
import { Visibility, VisibilityOff } from "@mui/icons-material";
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
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    setErrorMessage("");

    // Validate inputs
    if (!identifier || !password) {
      setErrorMessage("Please enter both email and password.");
      return;
    }

    // Only email login supported on frontend (no admin SDK)
    if (!identifier.includes("@")) {
      setErrorMessage("Please enter a valid email address.");
      return;
    }

    const loginEmail = identifier;

    // Sign in with email and password
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password,
      });

      if (error) {
        console.error("Login error:", error);
        
        if (error.message.includes("Email not confirmed")) {
          setErrorMessage("Please verify your email before logging in.");
        } else if (error.message.includes("Invalid login credentials")) {
          setErrorMessage("Invalid email or password.");
        } else {
          setErrorMessage(error.message || "Login failed. Please try again.");
        }
        return;
      }

      // Get user profile
      const { data: userProfile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", data.user.id)
        .single();

      // Store session
      localStorage.setItem("vf_token", data.session.access_token);
      if (userProfile) {
        localStorage.setItem("vf_user", JSON.stringify(userProfile));
      }

      // Remember credentials if checkbox is checked
      if (remember) {
        localStorage.setItem("rememberIdentifier", identifier);
        localStorage.setItem("rememberPassword", password);
      } else {
        localStorage.removeItem("rememberIdentifier");
        localStorage.removeItem("rememberPassword");
      }

      navigate("/dashboard");
    } catch (err) {
      console.error("Unexpected login error:", err);
      setErrorMessage("An unexpected error occurred. Please try again.");
    }
  };

  const handleForgotPassword = (e) => {
    e.preventDefault();
    e.stopPropagation();
    navigate("/forgot-password");
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        background: "linear-gradient(135deg, #e8d5ff 0%, #f5e6ff 50%, #ffeef8 100%)",
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
      {/* LEFT PANEL */}
      <Box
        sx={{
          width: { xs: "0%", md: "45%" },
          display: { xs: "none", md: "flex" },
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          padding: "60px",
          position: "relative",
          zIndex: 1,
        }}
      >
        <Box sx={{ maxWidth: "480px", width: "100%" }}>
          <Typography 
            sx={{ 
              fontSize: "56px", 
              fontWeight: "700",
              background: "linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              mb: 2,
              letterSpacing: "-0.02em",
              fontFamily: "'Playfair Display', serif",
            }}
          >
            VirtualFit
          </Typography>
          
          <Typography 
            sx={{ 
              fontSize: "20px", 
              color: "#6b5b7d",
              mb: 4,
              lineHeight: 1.6,
              fontWeight: "400",
            }}
          >
            Step into the future of fashion with AI-powered virtual try-ons and personalized styling
          </Typography>

          <Box sx={{ 
            display: "flex", 
            gap: 3, 
            mt: 5,
            flexDirection: "column",
          }}>
            {[
              { icon: "✨", text: "Smart Virtual Try-On" },
              { icon: "👗", text: "Curated Style Recommendations" },
              { icon: "💝", text: "Your Personal Digital Closet" }
            ].map((item, idx) => (
              <Box key={idx} sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                <Box sx={{
                  width: 48,
                  height: 48,
                  borderRadius: "12px",
                  background: "rgba(255, 255, 255, 0.8)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "24px",
                  boxShadow: "0 4px 12px rgba(124, 58, 237, 0.1)",
                }}>
                  {item.icon}
                </Box>
                <Typography sx={{ fontSize: "16px", color: "#5a4a6d", fontWeight: "500" }}>
                  {item.text}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>
      </Box>

      {/* LOGIN CARD */}
      <Box
        sx={{
          width: { xs: "100%", md: "55%" },
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          padding: { xs: 2, md: 4 },
          position: "relative",
          zIndex: 1,
        }}
      >
        <Paper
          elevation={0}
          sx={{
            width: { xs: "100%", sm: "440px" },
            padding: { xs: 4, sm: 5 },
            borderRadius: "24px",
            background: "rgba(255, 255, 255, 0.95)",
            backdropFilter: "blur(20px)",
            border: "1px solid rgba(255, 255, 255, 0.3)",
            boxShadow: "0 20px 60px rgba(124, 58, 237, 0.12)",
          }}
        >
          <Typography 
            variant="h4" 
            sx={{ 
              textAlign: "center", 
              mb: 1,
              fontWeight: "700",
              color: "#2d1b3d",
              fontSize: "32px",
            }}
          >
            Welcome Back
          </Typography>

          <Typography 
            sx={{ 
              textAlign: "center", 
              mb: 4,
              color: "#7d6a8e",
              fontSize: "15px",
            }}
          >
            Sign in to continue your style journey
          </Typography>

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

          <TextField
            label="Email Address"
            fullWidth
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
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
          />

          <TextField
            label="Password"
            type={showPassword ? "text" : "password"}
            fullWidth
            sx={{ 
              mb: 2,
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
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
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

          <Box sx={{ textAlign: "right", mb: 3 }}>
            <Typography
              sx={{ 
                color: "#7c3aed", 
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: "500",
                "&:hover": {
                  textDecoration: "underline",
                }
              }}
              onClick={handleForgotPassword}
            >
              Forgot Password?
            </Typography>
          </Box>

          <Button
            fullWidth
            variant="contained"
            sx={{
              background: "linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)",
              height: "52px",
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
            onClick={handleLogin}
          >
            Sign In
          </Button>

          <Typography sx={{ mt: 4, textAlign: "center", color: "#7d6a8e", fontSize: "15px" }}>
            Don't have an account?{" "}
            <span
              style={{ 
                color: "#7c3aed", 
                cursor: "pointer", 
                fontWeight: "600",
              }}
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