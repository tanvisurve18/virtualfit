import React, { useState } from "react";
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  InputAdornment,
  IconButton,
  Stack,
  Snackbar,
  Alert,
  CircularProgress,
} from "@mui/material";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

export default function Signup() {
  const navigate = useNavigate();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [loading, setLoading] = useState(false);
  const [snack, setSnack] = useState({ open: false, severity: "info", message: "" });

  const [touched, setTouched] = useState({
    fullName: false,
    email: false,
    phone: false,
    password: false,
    confirm: false,
  });

  const nameValid = (() => {
    const trimmed = fullName.trim();
    if (!trimmed) return false;
    const re = /^[A-Za-z]+(?: [A-Za-z]+)*$/;
    return re.test(fullName);
  })();

  const emailValid = (() => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  })();

  const phoneValid = (() => {
    if (!phone.trim()) return true;
    const re = /^[6-9]\d{9}$/;
    return re.test(phone);
  })();

  const passwordValid = (() => {
    if (!password) return false;
    if (/\s/.test(password)) return false;
    return password.length >= 8;
  })();

  const confirmValid = confirm === password && passwordValid;

  const formValid = nameValid && emailValid && phoneValid && passwordValid && confirmValid;

  function handleTouch(field) {
    setTouched((t) => ({ ...t, [field]: true }));
  }

  function showSnack(message, severity = "info") {
    setSnack({ open: true, message, severity });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setTouched({ fullName: true, email: true, phone: true, password: true, confirm: true });

    if (!formValid) {
      showSnack("Please fix the highlighted fields.", "error");
      return;
    }

    setLoading(true);

    try {
      console.log("🔐 Starting signup process...");
      
      // Sign up user
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: fullName.trim(),
            phone: phone.trim() || null,
          }
        }
      });

      if (error) {
        console.error("❌ Signup error:", error);
        throw error;
      }

      console.log("✅ Signup successful:", data);

      const userId = data?.user?.id;

      // Create profile (only if signup was successful and we have a user ID)
      if (userId) {
        console.log("📝 Creating profile for user:", userId);
        
        const { error: profileError } = await supabase
          .from("profiles")
          .insert({
            id: userId,
            full_name: fullName.trim(),
            phone: phone.trim() || null,
          });

        if (profileError) {
          console.warn("⚠️ Profile creation warning:", profileError);
          // Don't fail signup if profile creation fails
        } else {
          console.log("✅ Profile created successfully");
        }
      }

      // Check if email confirmation is required
      if (data.user && !data.session) {
        // Email confirmation is enabled
        showSnack(
          "Account created! Please check your email to confirm your account before logging in.",
          "success"
        );
      } else if (data.session) {
        // Auto-logged in (email confirmation disabled)
        showSnack(
          "Account created successfully! Redirecting to dashboard...",
          "success"
        );
        
        setTimeout(() => {
          setLoading(false);
          navigate("/dashboard");
        }, 1500);
        return;
      }

      setTimeout(() => {
        setLoading(false);
        navigate("/login");
      }, 2000);

    } catch (err) {
      console.error("Signup error:", err);
      
      let errorMessage = "Signup failed. Please try again.";
      
      if (err.message.includes("already registered")) {
        errorMessage = "This email is already registered. Please login instead.";
      } else if (err.message.includes("fetch")) {
        errorMessage = "Connection failed. Please check your internet connection and Supabase configuration.";
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      showSnack(errorMessage, "error");
      setLoading(false);
    }
  }

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
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
          width: { xs: "100%", sm: "480px" },
          borderRadius: "24px",
          px: { xs: 3, sm: 5 },
          py: { xs: 4, sm: 5 },
          background: "rgba(255, 255, 255, 0.95)",
          backdropFilter: "blur(20px)",
          border: "1px solid rgba(255, 255, 255, 0.3)",
          boxShadow: "0 20px 60px rgba(124, 58, 237, 0.12)",
          position: "relative",
          zIndex: 1,
        }}
      >
        <Typography 
          sx={{ 
            fontSize: "32px", 
            fontWeight: "700", 
            color: "#2d1b3d",
            mb: 1,
            textAlign: "center",
          }}
        >
          Create Account
        </Typography>
        
        <Typography 
          sx={{ 
            color: "#7d6a8e", 
            mb: 4,
            textAlign: "center",
            fontSize: "15px",
          }}
        >
          Join VirtualFit and discover your perfect style
        </Typography>

        <Box component="form" onSubmit={handleSubmit} noValidate>
          <Stack spacing={2.5}>
            <TextField
              label="Full Name"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              onBlur={() => handleTouch("fullName")}
              error={touched.fullName && !nameValid}
              helperText={
                touched.fullName && !nameValid
                  ? "Enter your full name (letters and spaces only)"
                  : " "
              }
              sx={{
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
              InputLabelProps={{
                sx: { "& .MuiFormLabel-asterisk": { color: "#7c3aed" } },
              }}
            />

            <TextField
              label="Email Address"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => handleTouch("email")}
              error={touched.email && !emailValid}
              helperText={
                touched.email && !emailValid ? "Enter a valid email address" : " "
              }
              sx={{
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
              InputLabelProps={{
                sx: { "& .MuiFormLabel-asterisk": { color: "#7c3aed" } },
              }}
            />

            <TextField
              label="Phone Number (Optional)"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              onBlur={() => handleTouch("phone")}
              error={touched.phone && !phoneValid}
              helperText={
                touched.phone && !phoneValid
                  ? "Enter a valid 10-digit phone number"
                  : " "
              }
              sx={{
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
            />

            <TextField
              label="Password"
              required
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onBlur={() => handleTouch("password")}
              error={touched.password && !passwordValid}
              helperText={
                touched.password && !passwordValid
                  ? "Password must be at least 8 characters with no spaces"
                  : " "
              }
              sx={{
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
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPassword((s) => !s)}
                      edge="end"
                      sx={{ color: "#9d8aaa" }}
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              InputLabelProps={{
                sx: { "& .MuiFormLabel-asterisk": { color: "#7c3aed" } },
              }}
            />

            <TextField
              label="Confirm Password"
              required
              type={showConfirm ? "text" : "password"}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              onBlur={() => handleTouch("confirm")}
              error={touched.confirm && !confirmValid}
              helperText={
                touched.confirm && !confirmValid ? "Passwords do not match" : " "
              }
              sx={{
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
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowConfirm((s) => !s)}
                      edge="end"
                      sx={{ color: "#9d8aaa" }}
                    >
                      {showConfirm ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              InputLabelProps={{
                sx: { "& .MuiFormLabel-asterisk": { color: "#7c3aed" } },
              }}
            />

            <Button
              type="submit"
              fullWidth
              variant="contained"
              disabled={loading}
              sx={{
                background: "linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)",
                height: "52px",
                borderRadius: "12px",
                fontSize: "16px",
                fontWeight: "600",
                textTransform: "none",
                mt: 2,
                boxShadow: "0 8px 24px rgba(124, 58, 237, 0.3)",
                "&:hover": {
                  background: "linear-gradient(135deg, #6d28d9 0%, #9333ea 100%)",
                  boxShadow: "0 12px 32px rgba(124, 58, 237, 0.4)",
                }
              }}
            >
              {loading ? <CircularProgress size={24} color="inherit" /> : "Create Account"}
            </Button>

            <Typography 
              variant="body2" 
              sx={{ 
                textAlign: "center", 
                mt: 2,
                color: "#7d6a8e",
                fontSize: "15px",
              }}
            >
              Already have an account?{" "}
              <span
                onClick={() => navigate("/login")}
                style={{ 
                  color: "#7c3aed", 
                  cursor: "pointer", 
                  fontWeight: "600",
                }}
              >
                Sign In
              </span>
            </Typography>
          </Stack>
        </Box>
      </Paper>

      <Snackbar
        open={snack.open}
        autoHideDuration={5000}
        onClose={() => setSnack((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          onClose={() => setSnack((s) => ({ ...s, open: false }))}
          severity={snack.severity}
          sx={{ width: "100%" }}
        >
          {snack.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}