import React, { useState, useEffect } from "react";
import {
  Box,
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Avatar,
  Grid,
  Card,
  CardContent,
  IconButton,
  Snackbar,
  Alert,
  Menu,
  MenuItem
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import EditIcon from "@mui/icons-material/Edit";
import CameraAltIcon from "@mui/icons-material/CameraAlt";
import FavoriteIcon from "@mui/icons-material/Favorite";
import HistoryIcon from "@mui/icons-material/History";
import CameraIcon from "@mui/icons-material/Camera";
import DeleteIcon from "@mui/icons-material/Delete";
import { supabase } from "../lib/supabaseClient";
import { useNavigate } from "react-router-dom";

const THEME = {
  primary: "#6C5CE7",
  secondary: "#e91e63",
  bg: "#f8f9fa"
};

export default function Profile() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState({
    full_name: "",
    email: "",
    phone: "",
    bio: "",
    avatar_url: ""
  });
  const [originalProfile, setOriginalProfile] = useState({});
  const [stats, setStats] = useState({
    savedLooks: 0,
    totalTryOns: 0,
    historyCount: 0
  });
  const [isEditing, setIsEditing] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });
  const [loading, setLoading] = useState(true);
  const [avatarMenuAnchor, setAvatarMenuAnchor] = useState(null);

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      console.log("👤 Fetching user data...");
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.log("❌ No user found, redirecting to login");
        navigate("/login");
        return;
      }

      console.log("✅ User found:", user.id);
      setUser(user);

      // Fetch profile from database
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      console.log("📋 Profile data:", profileData);
      console.log("⚠️ Profile error:", profileError);

      let profileInfo = {
        full_name: "",
        email: user.email,
        phone: "",
        bio: "",
        avatar_url: ""
      };

      if (profileData && !profileError) {
        // Profile exists in database
        profileInfo = {
          full_name: profileData.full_name || user.user_metadata?.full_name || "",
          email: user.email,
          phone: profileData.phone || "",
          bio: profileData.bio || "",
          avatar_url: profileData.avatar_url || ""
        };
      } else {
        // Profile doesn't exist, use user metadata
        profileInfo.full_name = user.user_metadata?.full_name || user.email?.split("@")[0] || "User";
      }

      console.log("✅ Final profile info:", profileInfo);
      setProfile(profileInfo);
      setOriginalProfile({ ...profileInfo });

      // Fetch stats
      const { data: historyData, error: historyError } = await supabase
        .from("tryon_history")
        .select("id, is_saved")
        .eq("user_id", user.id);

      console.log("📊 History data:", historyData);

      if (historyData && !historyError) {
        setStats({
          savedLooks: historyData.filter(item => item.is_saved).length,
          totalTryOns: historyData.length,
          historyCount: historyData.filter(item => !item.is_saved).length
        });
      }

      setLoading(false);
    } catch (error) {
      console.error("❌ Error fetching user data:", error);
      setSnackbar({ open: true, message: "Error loading profile", severity: "error" });
      setLoading(false);
    }
  };

  const handleEditToggle = () => {
    if (isEditing) {
      // Cancel editing - restore original values
      setProfile({ ...originalProfile });
    }
    setIsEditing(!isEditing);
  };

  const handleSaveProfile = async () => {
    try {
      console.log("💾 Saving profile:", profile);
      
      const { error } = await supabase
        .from("profiles")
        .upsert({
          id: user.id,
          full_name: profile.full_name,
          phone: profile.phone,
          bio: profile.bio,
          avatar_url: profile.avatar_url,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'id'
        });

      if (error) {
        console.error("❌ Save error:", error);
        throw error;
      }

      console.log("✅ Profile saved successfully");
      setOriginalProfile({ ...profile });
      setSnackbar({ open: true, message: "Profile updated successfully!", severity: "success" });
      setIsEditing(false);
    } catch (error) {
      console.error("❌ Error updating profile:", error);
      setSnackbar({ open: true, message: `Error updating profile: ${error.message}`, severity: "error" });
    }
  };

  const handleAvatarUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      console.log("📸 Uploading avatar...");
      
      // Convert to base64
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64Image = e.target.result;
        
        // Update profile with base64 image
        const updatedProfile = { ...profile, avatar_url: base64Image };
        setProfile(updatedProfile);

        // Save to database
        const { error } = await supabase
          .from("profiles")
          .upsert({
            id: user.id,
            avatar_url: base64Image,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'id'
          });

        if (error) throw error;

        console.log("✅ Avatar uploaded successfully");
        setOriginalProfile(updatedProfile);
        setSnackbar({ open: true, message: "Avatar updated!", severity: "success" });
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("❌ Error uploading avatar:", error);
      setSnackbar({ open: true, message: "Error uploading avatar", severity: "error" });
    }
    
    setAvatarMenuAnchor(null);
  };

  const handleRemoveAvatar = async () => {
    try {
      console.log("🗑️ Removing avatar...");
      
      const updatedProfile = { ...profile, avatar_url: "" };
      setProfile(updatedProfile);

      const { error } = await supabase
        .from("profiles")
        .upsert({
          id: user.id,
          avatar_url: "",
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'id'
        });

      if (error) throw error;

      console.log("✅ Avatar removed successfully");
      setOriginalProfile(updatedProfile);
      setSnackbar({ open: true, message: "Avatar removed!", severity: "success" });
    } catch (error) {
      console.error("❌ Error removing avatar:", error);
      setSnackbar({ open: true, message: "Error removing avatar", severity: "error" });
    }
    
    setAvatarMenuAnchor(null);
  };

  if (loading) {
    return (
      <Box sx={{ 
        minHeight: "100vh", 
        bgcolor: THEME.bg,
        ml: { xs: "70px", md: "240px" },
        display: "flex", 
        alignItems: "center", 
        justifyContent: "center" 
      }}>
        <Typography>Loading...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ 
      minHeight: "100vh", 
      bgcolor: THEME.bg,
      ml: { xs: "70px", md: "240px" },
      pt: 0
    }}>
      {/* Header */}
      <Box sx={{ 
        background: `linear-gradient(135deg, ${THEME.primary} 0%, #a29bfe 100%)`,
        color: "white",
        py: 2,
        px: 3
      }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <IconButton 
            onClick={() => navigate("/dashboard")}
            sx={{ color: "white" }}
          >
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h5" fontWeight={700}>
            My Profile
          </Typography>
        </Box>
      </Box>

      {/* Main Content */}
      <Container maxWidth="lg" sx={{ py: 3 }}>
        {/* Profile Header Card */}
        <Paper 
          elevation={0}
          sx={{ 
            p: 3, 
            mb: 3,
            borderRadius: 3,
            background: `linear-gradient(135deg, ${THEME.primary} 0%, #a29bfe 100%)`,
            color: "white",
            position: "relative"
          }}
        >
          <Grid container spacing={3} alignItems="center">
            <Grid item xs={12} md={3} sx={{ display: "flex", justifyContent: { xs: "center", md: "flex-start" } }}>
              <Box sx={{ position: "relative" }}>
                <Avatar
                  src={profile.avatar_url}
                  sx={{ 
                    width: 100, 
                    height: 100,
                    border: "4px solid white",
                    fontSize: 40,
                    fontWeight: 700
                  }}
                >
                  {profile.full_name?.charAt(0)?.toUpperCase() || profile.email?.charAt(0)?.toUpperCase()}
                </Avatar>
                <IconButton
                  onClick={(e) => setAvatarMenuAnchor(e.currentTarget)}
                  sx={{
                    position: "absolute",
                    bottom: 0,
                    right: 0,
                    bgcolor: "white",
                    color: THEME.primary,
                    width: 32,
                    height: 32,
                    "&:hover": { bgcolor: "#f5f5f5" }
                  }}
                >
                  <CameraAltIcon fontSize="small" />
                </IconButton>
                <Menu
                  anchorEl={avatarMenuAnchor}
                  open={Boolean(avatarMenuAnchor)}
                  onClose={() => setAvatarMenuAnchor(null)}
                >
                  <MenuItem component="label">
                    <CameraAltIcon sx={{ mr: 1 }} fontSize="small" />
                    Upload Photo
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarUpload}
                      style={{ display: "none" }}
                    />
                  </MenuItem>
                  {profile.avatar_url && (
                    <MenuItem onClick={handleRemoveAvatar}>
                      <DeleteIcon sx={{ mr: 1 }} fontSize="small" />
                      Remove Photo
                    </MenuItem>
                  )}
                </Menu>
              </Box>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="h5" fontWeight={700} gutterBottom>
                {profile.full_name || "User"}
              </Typography>
              <Typography variant="body1" sx={{ mb: 1 }}>
                {profile.email}
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                Member since {new Date(user?.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
              </Typography>
            </Grid>
            <Grid item xs={12} md={3} sx={{ display: "flex", justifyContent: { xs: "center", md: "flex-end" } }}>
              <Button
                variant="contained"
                onClick={handleEditToggle}
                sx={{
                  bgcolor: "white",
                  color: THEME.primary,
                  fontWeight: 600,
                  "&:hover": { bgcolor: "#f5f5f5" }
                }}
                startIcon={<EditIcon />}
              >
                {isEditing ? "Cancel" : "Edit Profile"}
              </Button>
            </Grid>
          </Grid>
        </Paper>

        {/* Stats Cards */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={4}>
            <Card elevation={0} sx={{ borderRadius: 3, textAlign: "center", py: 2 }}>
              <CardContent>
                <FavoriteIcon sx={{ fontSize: 40, color: THEME.secondary, mb: 1 }} />
                <Typography variant="h3" fontWeight={700} color={THEME.secondary}>
                  {stats.savedLooks}
                </Typography>
                <Typography variant="body1" color="text.secondary" fontWeight={600}>
                  Saved Looks
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Card elevation={0} sx={{ borderRadius: 3, textAlign: "center", py: 2 }}>
              <CardContent>
                <HistoryIcon sx={{ fontSize: 40, color: THEME.primary, mb: 1 }} />
                <Typography variant="h3" fontWeight={700} color={THEME.primary}>
                  {stats.totalTryOns}
                </Typography>
                <Typography variant="body1" color="text.secondary" fontWeight={600}>
                  Total Try-Ons
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Card elevation={0} sx={{ borderRadius: 3, textAlign: "center", py: 2 }}>
              <CardContent>
                <CameraIcon sx={{ fontSize: 40, color: "#10b981", mb: 1 }} />
                <Typography variant="h3" fontWeight={700} color="#10b981">
                  {stats.historyCount}
                </Typography>
                <Typography variant="body1" color="text.secondary" fontWeight={600}>
                  Try-On History
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Profile Information */}
        <Paper elevation={0} sx={{ p: 3, borderRadius: 3 }}>
          <Typography variant="h6" fontWeight={700} gutterBottom sx={{ mb: 3 }}>
            Profile Information
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Full Name"
                value={profile.full_name}
                onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                disabled={!isEditing}
                variant="outlined"
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Email"
                value={profile.email}
                disabled
                variant="outlined"
                helperText="Email cannot be changed"
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Phone Number"
                value={profile.phone}
                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                disabled={!isEditing}
                variant="outlined"
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Account Status"
                value="Active"
                disabled
                variant="outlined"
              />
            </Grid>
            <Grid item xs={12} md={8}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Bio"
                value={profile.bio}
                onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                disabled={!isEditing}
                variant="outlined"
                placeholder="Tell us about yourself..."
              />
            </Grid>
          </Grid>
          {isEditing && (
            <Box sx={{ mt: 3, display: "flex", gap: 2, justifyContent: "flex-end" }}>
              <Button
                variant="outlined"
                onClick={handleEditToggle}
              >
                Cancel
              </Button>
              <Button
                variant="contained"
                onClick={handleSaveProfile}
                sx={{
                  bgcolor: THEME.primary,
                  "&:hover": { bgcolor: "#5f4dd1" }
                }}
              >
                Save Changes
              </Button>
            </Box>
          )}
        </Paper>

        {/* Quick Actions */}
        <Paper elevation={0} sx={{ p: 3, borderRadius: 3, mt: 3 }}>
          <Typography variant="h6" fontWeight={700} gutterBottom sx={{ mb: 3 }}>
            Quick Actions
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>
              <Button
                fullWidth
                variant="outlined"
                onClick={() => navigate("/dashboard")}
                sx={{ 
                  py: 1.5,
                  borderColor: THEME.primary,
                  color: THEME.primary,
                  fontWeight: 600,
                  "&:hover": { borderColor: THEME.primary, bgcolor: `${THEME.primary}10` }
                }}
              >
                VIEW DASHBOARD
              </Button>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Button
                fullWidth
                variant="outlined"
                onClick={() => navigate("/products")}
                sx={{ 
                  py: 1.5,
                  borderColor: THEME.primary,
                  color: THEME.primary,
                  fontWeight: 600,
                  "&:hover": { borderColor: THEME.primary, bgcolor: `${THEME.primary}10` }
                }}
              >
                TRY ON CLOTHES
              </Button>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Button
                fullWidth
                variant="outlined"
                onClick={() => navigate("/upload-tryon")}
                sx={{ 
                  py: 1.5,
                  borderColor: THEME.primary,
                  color: THEME.primary,
                  fontWeight: 600,
                  "&:hover": { borderColor: THEME.primary, bgcolor: `${THEME.primary}10` }
                }}
              >
                UPLOAD PHOTO TRY-ON
              </Button>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Button
                fullWidth
                variant="contained"
                onClick={() => {
                  navigate("/dashboard");
                  setTimeout(() => {
                    const event = new CustomEvent("changeView", { detail: "saved" });
                    window.dispatchEvent(event);
                  }, 100);
                }}
                sx={{ 
                  py: 1.5,
                  bgcolor: THEME.secondary,
                  fontWeight: 600,
                  "&:hover": { bgcolor: "#d81b60" }
                }}
              >
                MY SAVED LOOKS
              </Button>
            </Grid>
          </Grid>
        </Paper>
      </Container>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert 
          onClose={() => setSnackbar({ ...snackbar, open: false })} 
          severity={snackbar.severity}
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}