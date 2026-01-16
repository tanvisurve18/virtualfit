// src/components/Sidebar.jsx
import React, { useState } from "react";
import { Box, Typography, Avatar, IconButton, Tooltip } from "@mui/material";
import {
  Home as HomeIcon,
  Bookmark as BookmarkIcon,
  History as HistoryIcon,
  PhotoCamera as CameraIcon,
  Menu as MenuIcon,
  ChevronLeft,
  ChevronRight,
  Logout,
} from "@mui/icons-material";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

export default function Sidebar({ userName = "User" }) {
  const navigate = useNavigate();
  const location = useLocation();

  const [collapsed, setCollapsed] = useState(false);

  const menuItems = [
    { label: "Overview", icon: HomeIcon, path: "/dashboard" },
    { label: "Saved Looks", icon: BookmarkIcon, path: "/saved-looks" },
    { label: "Try-On History", icon: HistoryIcon, path: "/tryon-history" },
    { label: "Recommendations", icon: CameraIcon, path: "/recommendations" },
  ];

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      localStorage.removeItem("vf_token");
      localStorage.removeItem("vf_user");
      navigate("/");
    } catch (error) {
      console.error("Logout error:", error);
      navigate("/");
    }
  };

  return (
    <Box
      sx={{
        width: collapsed ? "70px" : "240px",
        transition: "width 0.25s ease",
        bgcolor: "#FFFFFF",
        height: "100vh",
        borderRight: "1px solid #eee",
        position: "fixed",
        left: 0,
        top: 0,
        display: "flex",
        flexDirection: "column",
        zIndex: 1000,
      }}
    >
      {/* TOP SECTION */}
      <Box
        sx={{
          p: collapsed ? 2 : 3,
          display: "flex",
          alignItems: "center",
          gap: collapsed ? 0 : 2,
          justifyContent: collapsed ? "center" : "flex-start",
        }}
      >
        <Avatar
          sx={{
            bgcolor: "#7B4BFF",
            width: 48,
            height: 48,
            fontSize: 22,
          }}
        >
          {userName.charAt(0).toUpperCase()}
        </Avatar>

        {!collapsed && (
          <Typography sx={{ fontWeight: 700, fontSize: "1rem", color: "#2B2345" }}>
            {userName}
          </Typography>
        )}
      </Box>

      {/* MENU ITEMS */}
      <Box sx={{ flexGrow: 1, mt: 2 }}>
        {menuItems.map((item, index) => {
          const isActive = location.pathname === item.path;

          return (
            <Box
              key={index}
              onClick={() => navigate(item.path)}
              sx={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: collapsed ? 0 : 2,
                justifyContent: collapsed ? "center" : "flex-start",
                py: 1.8,
                px: collapsed ? 0 : 3,
                cursor: "pointer",
                transition: "0.25s",
                bgcolor: isActive ? "rgba(123,75,255,0.15)" : "transparent",
                "&:hover": { bgcolor: "rgba(123,75,255,0.12)" },
              }}
            >
              <item.icon sx={{ fontSize: 24, color: "#7B4BFF" }} />

              {!collapsed && (
                <Typography sx={{ fontSize: "0.95rem", color: "#2B2345", fontWeight: isActive ? 600 : 400 }}>
                  {item.label}
                </Typography>
              )}
            </Box>
          );
        })}
      </Box>

      {/* LOGOUT */}
      <Box
        onClick={handleLogout}
        sx={{
          width: "100%",
          py: 2,
          px: collapsed ? 0 : 3,
          display: "flex",
          alignItems: "center",
          gap: collapsed ? 0 : 2,
          justifyContent: collapsed ? "center" : "flex-start",
          cursor: "pointer",
          transition: "0.25s",
          "&:hover": { bgcolor: "rgba(255,80,80,0.1)" },
          borderTop: "1px solid #eee",
        }}
      >
        <Logout sx={{ fontSize: 22, color: "#D32F2F" }} />

        {!collapsed && (
          <Typography sx={{ fontSize: "0.95rem", color: "#D32F2F", fontWeight: 600 }}>
            Logout
          </Typography>
        )}
      </Box>

      {/* COLLAPSE BUTTON */}
      <Box
        sx={{
          position: "absolute",
          top: 15,
          right: collapsed ? -12 : -12,
          bgcolor: "#fff",
          border: "1px solid #ddd",
          borderRadius: "50%",
          width: 26,
          height: 26,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          boxShadow: "0px 2px 6px rgba(0,0,0,0.15)",
        }}
        onClick={() => setCollapsed(!collapsed)}
      >
        {collapsed ? <ChevronRight fontSize="small" /> : <ChevronLeft fontSize="small" />}
      </Box>
    </Box>
  );
}