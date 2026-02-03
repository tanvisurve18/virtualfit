import React from "react";
import { Box, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Avatar, IconButton } from "@mui/material";
import HomeIcon from "@mui/icons-material/Home";
import FavoriteIcon from "@mui/icons-material/Favorite";
import HistoryIcon from "@mui/icons-material/History";
import CheckroomIcon from "@mui/icons-material/Checkroom";
import CameraAltIcon from "@mui/icons-material/CameraAlt";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import LogoutIcon from "@mui/icons-material/Logout";
import { supabase } from "../lib/supabaseClient";
import { useNavigate } from "react-router-dom";

const THEME = {
  primary: "#6C5CE7",
  bg: "#FFFFFF"
};

export default function Sidebar({ userName, activeView = "overview", onViewChange }) {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  const menuItems = [
    { id: "overview", label: "Overview",        icon: <HomeIcon /> },
    { id: "upload",   label: "Upload Try-On",   icon: <CameraAltIcon />, route: "/upload-tryon" },
    { id: "recommendations", label: "Recommendations", icon: <AutoAwesomeIcon />, route: "/recommendations" },
    { id: "saved",    label: "Saved Looks",     icon: <FavoriteIcon /> },
    { id: "history",  label: "Try-On History",  icon: <HistoryIcon /> },
    { id: "mycloset", label: "My Closet",       icon: <CheckroomIcon />, route: "/mycloset" },
  ];

  return (
    <>
      {/* DESKTOP SIDEBAR */}
      <Box
        sx={{
          position: "fixed",
          left: 0,
          top: 0,
          height: "100vh",
          width: 240,
          bgcolor: THEME.bg,
          borderRight: "1px solid #e0e0e0",
          display: { xs: "none", md: "flex" },
          flexDirection: "column",
          zIndex: 1000
        }}
      >
        {/* USER PROFILE */}
        <Box sx={{ p: 3, borderBottom: "1px solid #e0e0e0" }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Avatar sx={{ bgcolor: THEME.primary, width: 48, height: 48 }}>
              {userName.charAt(0).toUpperCase()}
            </Avatar>
            <Box>
              <Box sx={{ fontWeight: 700, fontSize: 16 }}>{userName}</Box>
            </Box>
          </Box>
        </Box>

        {/* MENU ITEMS */}
        <List sx={{ flexGrow: 1, py: 2 }}>
          {menuItems.map((item) => (
            <ListItem key={item.id} disablePadding>
              <ListItemButton
                selected={
                  activeView === item.id || 
                  (item.id === "mycloset" && window.location.pathname === "/mycloset") || 
                  (item.id === "upload" && window.location.pathname === "/upload") ||
                  (item.id === "recommendations" && window.location.pathname === "/recommendations")
                }
                onClick={() => item.route ? navigate(item.route) : (onViewChange && onViewChange(item.id))}
                sx={{
                  mx: 1,
                  borderRadius: 2,
                  "&.Mui-selected": {
                    bgcolor: `${THEME.primary}15`,
                    color: THEME.primary,
                    "& .MuiListItemIcon-root": {
                      color: THEME.primary
                    },
                    "&:hover": {
                      bgcolor: `${THEME.primary}25`
                    }
                  }
                }}
              >
                <ListItemIcon sx={{ minWidth: 40 }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText 
                  primary={item.label}
                  primaryTypographyProps={{
                    fontWeight: activeView === item.id ? 700 : 500
                  }}
                />
              </ListItemButton>
            </ListItem>
          ))}
        </List>

        {/* LOGOUT */}
        <Box sx={{ p: 2, borderTop: "1px solid #e0e0e0" }}>
          <ListItemButton
            onClick={handleLogout}
            sx={{
              borderRadius: 2,
              color: "#d32f2f",
              "&:hover": {
                bgcolor: "#ffebee"
              }
            }}
          >
            <ListItemIcon sx={{ minWidth: 40, color: "#d32f2f" }}>
              <LogoutIcon />
            </ListItemIcon>
            <ListItemText 
              primary="Logout"
              primaryTypographyProps={{
                fontWeight: 600
              }}
            />
          </ListItemButton>
        </Box>
      </Box>

      {/* MOBILE SIDEBAR */}
      <Box
        sx={{
          position: "fixed",
          left: 0,
          top: 0,
          height: "100vh",
          width: 70,
          bgcolor: THEME.bg,
          borderRight: "1px solid #e0e0e0",
          display: { xs: "flex", md: "none" },
          flexDirection: "column",
          alignItems: "center",
          zIndex: 1000,
          py: 2
        }}
      >
        {/* USER AVATAR */}
        <Avatar sx={{ bgcolor: THEME.primary, mb: 3 }}>
          {userName.charAt(0).toUpperCase()}
        </Avatar>

        {/* MENU ICONS */}
        <Box sx={{ flexGrow: 1 }}>
          {menuItems.map((item) => (
            <IconButton
              key={item.id}
              onClick={() => item.route ? navigate(item.route) : (onViewChange && onViewChange(item.id))}
              sx={{
                width: 48,
                height: 48,
                mb: 1,
                color: activeView === item.id ? THEME.primary : "inherit",
                bgcolor: activeView === item.id ? `${THEME.primary}15` : "transparent",
                "&:hover": {
                  bgcolor: activeView === item.id ? `${THEME.primary}25` : "#f5f5f5"
                }
              }}
            >
              {item.icon}
            </IconButton>
          ))}
        </Box>

        {/* LOGOUT ICON */}
        <IconButton
          onClick={handleLogout}
          sx={{
            width: 48,
            height: 48,
            color: "#d32f2f",
            "&:hover": {
              bgcolor: "#ffebee"
            }
          }}
        >
          <LogoutIcon />
        </IconButton>
      </Box>
    </>
  );
}