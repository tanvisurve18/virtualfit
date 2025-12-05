import React, { useEffect, useState } from "react";
import {
  Box,
  Paper,
  Typography,
  Avatar,
  Button,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  IconButton,
  Tabs,
  Tab,
  Card,
  CardMedia,
  CardContent,
  CardActions,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Tooltip,
  Stack,
  CircularProgress,
} from "@mui/material";

import HomeIcon from "@mui/icons-material/Home";
import PhotoCameraIcon from "@mui/icons-material/PhotoCamera";
import BookmarkIcon from "@mui/icons-material/Bookmark";
import HistoryIcon from "@mui/icons-material/History";
import DeleteIcon from "@mui/icons-material/Delete";
import ShareIcon from "@mui/icons-material/Share";
import LogoutIcon from "@mui/icons-material/Logout";
import FileDownloadIcon from "@mui/icons-material/FileDownload";

import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

const THEME = {
  primary: "#7B4BFF",
  primaryDark: "#6C3EE3",
  pageBg: "#F6F7FB",
  topGradient:
    "linear-gradient(90deg,#dbe9ff 0%,#e3d3f7 50%,#f8d9e3 100%)",
};

function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem("vf_user") || "null");
  } catch {
    return null;
  }
}

export default function Dashboard() {
  const navigate = useNavigate();
  const storedUser = getStoredUser();

  const [tab, setTab] = useState(0);
  const [savedOutfits, setSavedOutfits] = useState([]);
  const [history, setHistory] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedOutfit, setSelectedOutfit] = useState(null);

  const FALLBACK_IMAGES = [
    "https://i.ibb.co/8cF4XjT/outfit1.jpg",
    "https://i.ibb.co/xh0Y3n2/outfit2.jpg",
    "https://i.ibb.co/0y9q8kq/outfit3.jpg",
    "https://i.ibb.co/4d6t8T8/outfit4.jpg",
  ];

  // Fetch data
  useEffect(() => {
    setLoading(true);

    // Fallback mock data
    setSavedOutfits([
      { id: "1", name: "Summer Floral", image: FALLBACK_IMAGES[0] },
      { id: "2", name: "Office Chic", image: FALLBACK_IMAGES[1] },
    ]);

    setHistory([
      {
        id: "h1",
        outfit_name: "Sun Dress",
        image: FALLBACK_IMAGES[2],
        action: "Tried On",
        created_at: new Date(),
      },
    ]);

    setRecommendations([
      { id: "r1", title: "Floral Midi", image: FALLBACK_IMAGES[3] },
    ]);

    setLoading(false);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("vf_token");
    localStorage.removeItem("vf_user");
    navigate("/");
  };

  const openOutfit = (o) => {
    setSelectedOutfit(o);
    setModalOpen(true);
  };

  const formatDate = (iso) => {
    if (!iso) return "";
    return new Date(iso).toLocaleString();
  };

  return (
    <Box
      sx={{
        display: "flex",
        bgcolor: THEME.pageBg,
        minHeight: "100vh",
      }}
    >
      {/* ------------------------------------------ */}
      {/* SIDEBAR — FIXED LEFT, FULL HEIGHT         */}
      {/* ------------------------------------------ */}
      <Box
        sx={{
          width: 260,
          bgcolor: "#FFFFFF",
          borderRight: "1px solid rgba(0,0,0,0.08)",
          p: 2.5,
          height: "100vh",
          overflowY: "auto",
        }}
      >
        {/* USER PROFILE */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
          <Avatar sx={{ bgcolor: THEME.primary, width: 50, height: 50 }}>
            {(storedUser?.name || "U").charAt(0)}
          </Avatar>

          <Typography sx={{ fontWeight: 700 }}>
            {storedUser?.name || "User Name"}
          </Typography>
        </Box>

        <Divider sx={{ mb: 2 }} />

        {/* MENU ITEMS */}
        <List>
          <ListItem button selected>
            <ListItemIcon>
              <HomeIcon sx={{ color: THEME.primary }} />
            </ListItemIcon>
            <ListItemText primary="Overview" />
          </ListItem>

          <ListItem button onClick={() => setTab(0)}>
            <ListItemIcon>
              <BookmarkIcon sx={{ color: THEME.primary }} />
            </ListItemIcon>
            <ListItemText primary={`Saved Looks (${savedOutfits.length})`} />
          </ListItem>

          <ListItem button onClick={() => setTab(1)}>
            <ListItemIcon>
              <HistoryIcon sx={{ color: THEME.primary }} />
            </ListItemIcon>
            <ListItemText primary={`Try-On History (${history.length})`} />
          </ListItem>

          <ListItem button onClick={() => setTab(2)}>
            <ListItemIcon>
              <PhotoCameraIcon sx={{ color: THEME.primary }} />
            </ListItemIcon>
            <ListItemText primary="Recommendations" />
          </ListItem>
        </List>

        <Divider sx={{ my: 2 }} />

        {/* ACTION BUTTONS */}
        <Stack spacing={1}>
          <Button
            variant="contained"
            startIcon={<PhotoCameraIcon />}
            sx={{ background: THEME.primary }}
          >
            New Try-On
          </Button>

          <Button variant="outlined" startIcon={<FileDownloadIcon />}>
            Export
          </Button>

          <Button startIcon={<LogoutIcon />} onClick={handleLogout}>
            Logout
          </Button>
        </Stack>
      </Box>

      {/* ------------------------------------------ */}
      {/* MAIN AREA                                 */}
      {/* ------------------------------------------ */}
      <Box sx={{ flexGrow: 1, p: 3 }}>
        {/* HEADER BAR */}
        <Paper
          sx={{
            p: 2,
            mb: 3,
            borderRadius: 2,
            background: THEME.topGradient,
          }}
        >
          <Typography sx={{ fontSize: 22, fontWeight: 800 }}>
            Hello, {storedUser?.name?.split(" ")[0] || "there"} 👋
          </Typography>
          <Typography sx={{ color: "#555" }}>
            Welcome back — your wardrobe is ready.
          </Typography>
        </Paper>

        {/* TABS */}
        <Tabs value={tab} onChange={(e, v) => setTab(v)} sx={{ mb: 3 }}>
          <Tab label={`Saved Looks (${savedOutfits.length})`} />
          <Tab label={`Try-On History (${history.length})`} />
          <Tab label="Recommendations" />
        </Tabs>

        {/* CONTENT */}
        <Box>
          {loading ? (
            <CircularProgress />
          ) : tab === 0 ? (
            <Typography>Saved Looks Coming...</Typography>
          ) : tab === 1 ? (
            <Typography>History Coming...</Typography>
          ) : (
            <Typography>Recommendations Coming...</Typography>
          )}
        </Box>
      </Box>
    </Box>
  );
}
