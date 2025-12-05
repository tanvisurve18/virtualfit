// src/components/Signup.jsx
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
  Divider,
} from "@mui/material";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

/**
 * Signup.jsx
 * - Option B fields: Full Name, Email, Phone, Password, Confirm Password
 * - Theme 2: glassmorphic split layout (left decorative panel, right form card)
 * - Inline validation, password rules, show/hide password
 * - Inserts profile to `profiles` table after signUp
 * - Supabase will send confirmation email (ensure your Supabase project has email confirmations enabled)
 */

const colors = {
  primary: "#7B4BFF",
  primaryDark: "#6C3EE3",
  panelGradient: "linear-gradient(135deg, #ffd6e7, #ffe3f3)",
  pageBg: "#f5f7fb",
};

export default function Signup() {
  const navigate = useNavigate();

  // form fields
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  // visibility
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // UI state
  const [loading, setLoading] = useState(false);
  const [snack, setSnack] = useState({ open: false, severity: "info", message: "" });

  // Validation state
  const [touched, setTouched] = useState({
    fullName: false,
    email: false,
    phone: false,
    password: false,
    confirm: false,
  });

  // Helpers / validators
  const nameValid = (() => {
    const trimmed = fullName.trim();
    if (!trimmed) return false;
    // Allow letters and single spaces between words, no numbers or special chars
    // Must not start or end with space (trimmed), no consecutive spaces
    const re = /^[A-Za-z]+(?: [A-Za-z]+)*$/;
    return re.test(fullName);
  })();

  const emailValid = (() => {
    // simple email regex
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  })();

  const phoneValid = (() => {
    if (!phone) return true; // phone optional-ish; but you can require it by removing this line
    // Very permissive phone check: digits, +, spaces, hyphens
    const re = /^[\d+\-\s]{6,20}$/;
    return re.test(phone);
  })();

  const passwordValid = (() => {
    if (!password) return false;
    if (/\s/.test(password)) return false; // no spaces
    return password.length >= 8;
  })();

  const confirmValid = confirm === password && passwordValid;

  const formValid = nameValid && emailValid && phoneValid && passwordValid && confirmValid;

  function handleTouch(field) {
    setTouched((t) => ({ ...t, [field]: true }));
  }

  // UI snack helpers
  function showSnack(message, severity = "info") {
    setSnack({ open: true, message, severity });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    // mark all touched
    setTouched({ fullName: true, email: true, phone: true, password: true, confirm: true });

    if (!formValid) {
      showSnack("Please fix the highlighted fields.", "error");
      return;
    }

    setLoading(true);

    try {
      // Supabase sign up (v2 API)
      // This will send a confirmation/verification email based on your Supabase settings.
      const { data, error } = await supabase.auth.signUp(
        {
          email: email.trim(),
          password: password,
        },
        {
          // optional: set redirect url after verification (change to your app URL)
          options: {
            emailRedirectTo: window.location.origin + "/login",
          },
        }
      );

      if (error) {
        throw error;
      }

      // NOTE: data.user (or data) contains user object after signUp depending on supabase config.
      // We'll attempt to read user id safely.
      const userId = data?.user?.id || data?.id || null;

      // Insert profile in `profiles` table (if user id available)
      if (userId) {
        // attempt to insert profile row
        const profileInsert = await supabase.from("profiles").upsert(
          {
            id: userId,
            email: email.trim(),
            phone: phone.trim() || null,
            name: fullName.trim(),
            created_at: new Date().toISOString(),
          },
          { returning: "minimal" }
        );

        if (profileInsert.error) {
          // non-fatal: still show success but log
          console.warn("Profile insert error:", profileInsert.error);
        }
      } else {
        // In some Supabase setups the user object is available after confirmation; still OK.
        console.warn("No user id received yet from signUp response.");
      }

      // Show success / next steps
      showSnack(
        "Signup successful — a verification email has been sent. Please verify your email before logging in.",
        "success"
      );

      // Reset form or optionally redirect to login after short delay
      setTimeout(() => {
        setLoading(false);
        navigate("/login");
      }, 1600);
    } catch (err) {
      console.error(err);
      const msg = err?.message || "Signup failed — try again.";
      showSnack(msg, "error");
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
        bgcolor: colors.pageBg,
        p: 2,
      }}
    >
      {/* LEFT decorative panel */}
      <Box
        sx={{
          display: { xs: "none", md: "flex" },
          width: 420,
          height: 540,
          borderRadius: 4,
          mr: 4,
          background: colors.panelGradient,
          boxShadow: "0 20px 50px rgba(123,75,255,0.08)",
          flexDirection: "column",
          p: 4,
          justifyContent: "center",
        }}
      >
        <Typography sx={{ fontFamily: "Playfair Display, serif", fontSize: 32, fontWeight: 800, color: "#2B2345", mb: 1 }}>
          VirtualFit
        </Typography>
        <Typography sx={{ color: "#444", mb: 2 }}>
          Smart virtual try-ons, AI styling & personalized closets. Create an account to get started.
        </Typography>

        <Divider sx={{ my: 2 }} />

        <Box sx={{ mt: 2 }}>
          <Typography sx={{ fontWeight: 700, mb: 1 }}>Why join?</Typography>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            <li style={{ color: "#444" }}>Instant virtual try-ons</li>
            <li style={{ color: "#444" }}>Personalized recommendations</li>
            <li style={{ color: "#444" }}>Save your favorite looks</li>
          </ul>
        </Box>
      </Box>

      {/* RIGHT glassmorphic form */}
      <Paper
        elevation={8}
        sx={{
          width: { xs: "100%", md: 560 },
          borderRadius: 3,
          px: { xs: 3, md: 6 },
          py: { xs: 3, md: 5 },
          background: "rgba(255,255,255,0.85)",
          backdropFilter: "blur(6px)",
        }}
      >
        <Typography sx={{ fontSize: 22, fontWeight: 800, color: "#2B2345", mb: 1 }}>
          Create your account
        </Typography>
        <Typography sx={{ color: "#666", mb: 3 }}>Sign up to start using VirtualFit</Typography>

        <Box component="form" onSubmit={handleSubmit} noValidate>
          <Stack spacing={2}>
            {/* FULL NAME */}
            <TextField
              label="Full name"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              onBlur={() => handleTouch("fullName")}
              error={touched.fullName && !nameValid}
              helperText={
                touched.fullName && !nameValid
                  ? "Enter your full name (letters and single spaces only, no numbers)."
                  : " "
              }
              InputLabelProps={{
                sx: { "& .MuiFormLabel-asterisk": { color: "red" } },
              }}
            />

            {/* EMAIL */}
            <TextField
              label="Email address"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => handleTouch("email")}
              error={touched.email && !emailValid}
              helperText={
                touched.email && !emailValid ? "Enter a valid email (example@domain.com)" : " "
              }
              InputLabelProps={{
                sx: { "& .MuiFormLabel-asterisk": { color: "red" } },
              }}
            />

            {/* PHONE */}
            <TextField
              label="Phone (optional)"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              onBlur={() => handleTouch("phone")}
              error={touched.phone && !phoneValid}
              helperText={touched.phone && !phoneValid ? "Enter a valid phone number" : " "}
            />

            {/* PASSWORD */}
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
                  ? "Password must be at least 8 characters and contain no spaces."
                  : " "
              }
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPassword((s) => !s)}
                      edge="end"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              InputLabelProps={{
                sx: { "& .MuiFormLabel-asterisk": { color: "red" } },
              }}
            />

            {/* CONFIRM PASSWORD */}
            <TextField
              label="Confirm password"
              required
              type={showConfirm ? "text" : "password"}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              onBlur={() => handleTouch("confirm")}
              error={touched.confirm && !confirmValid}
              helperText={
                touched.confirm && !confirmValid ? "Passwords do not match." : " "
              }
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowConfirm((s) => !s)}
                      edge="end"
                      aria-label={showConfirm ? "Hide password" : "Show password"}
                    >
                      {showConfirm ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              InputLabelProps={{
                sx: { "& .MuiFormLabel-asterisk": { color: "red" } },
              }}
            />

            {/* SUBMIT */}
            <Box sx={{ mt: 1 }}>
              <Button
                type="submit"
                fullWidth
                variant="contained"
                disabled={loading}
                sx={{
                  background: colors.primary,
                  ":hover": { background: colors.primaryDark },
                  py: 1.2,
                }}
              >
                {loading ? <CircularProgress size={20} color="inherit" /> : "Sign up"}
              </Button>
            </Box>

            <Box sx={{ textAlign: "center", mt: 1 }}>
              <Typography variant="body2">
                Already have an account?{" "}
                <Button onClick={() => navigate("/login")} variant="text" sx={{ textTransform: "none" }}>
                  Log in
                </Button>
              </Typography>
            </Box>
          </Stack>
        </Box>
      </Paper>

      {/* SNACKBAR */}
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
