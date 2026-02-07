import React from "react";
import { Box, List, ListItem, ListItemIcon, ListItemText, Avatar, Typography, Divider } from "@mui/material";
import HomeIcon from "@mui/icons-material/Home";
import PhotoCameraIcon from "@mui/icons-material/PhotoCamera";
import FavoriteIcon from "@mui/icons-material/Favorite";
import HistoryIcon from "@mui/icons-material/History";
import PersonIcon from "@mui/icons-material/Person";
import LogoutIcon from "@mui/icons-material/Logout";
import CheckroomIcon from "@mui/icons-material/Checkroom";
import RecommendIcon from "@mui/icons-material/Recommend";

const THEME = {
  primary: "#6C5CE7",
  primaryLight: "#F0EDFF",
};

export default function Sidebar({ userName, activeView, onViewChange }) {
  const menuItems = [
    { id: "overview", label: "Home", icon: <HomeIcon /> },
    { id: "recommendations", label: "Recommendations", icon: <RecommendIcon /> },
    { id: "upload-tryon", label: "Upload Try On", icon: <PhotoCameraIcon /> },
    { id: "closet", label: "My Closet", icon: <CheckroomIcon /> },
    { id: "saved", label: "Saved Looks", icon: <FavoriteIcon /> },
    { id: "history", label: "History", icon: <HistoryIcon /> },
    { id: "profile", label: "Profile", icon: <PersonIcon /> },
  ];

  return (
    <Box
      sx={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        bgcolor: "white",
      }}
    >
      {/* User Profile Section */}
      <Box
        sx={{
          p: 3,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 1.5,
        }}
      >
        <Avatar
          sx={{
            width: 64,
            height: 64,
            bgcolor: THEME.primary,
            fontSize: 28,
            fontWeight: 700,
          }}
        >
          {userName.charAt(0).toUpperCase()}
        </Avatar>
        <Typography
          sx={{
            fontWeight: 700,
            fontSize: 16,
            textAlign: "center",
          }}
        >
          {userName}
        </Typography>
      </Box>

      <Divider />

      {/* Navigation Menu */}
      <List sx={{ flexGrow: 1, py: 2 }}>
        {menuItems.map((item) => (
          <ListItem
            key={item.id}
            button
            onClick={() => onViewChange(item.id)}
            sx={{
              mx: 1.5,
              mb: 0.5,
              borderRadius: 2,
              bgcolor: activeView === item.id ? THEME.primaryLight : "transparent",
              color: activeView === item.id ? THEME.primary : "text.primary",
              "&:hover": {
                bgcolor: activeView === item.id ? THEME.primaryLight : "rgba(0,0,0,0.04)",
              },
            }}
          >
            <ListItemIcon
              sx={{
                color: activeView === item.id ? THEME.primary : "text.secondary",
                minWidth: 40,
              }}
            >
              {item.icon}
            </ListItemIcon>
            <ListItemText
              primary={item.label}
              primaryTypographyProps={{
                fontWeight: activeView === item.id ? 700 : 500,
                fontSize: 15,
              }}
            />
          </ListItem>
        ))}
      </List>

      {/* Logout Button at Bottom */}
      <Box sx={{ p: 2 }}>
        <ListItem
          button
          onClick={() => {
            // Add your logout logic here
            console.log("Logout clicked");
          }}
          sx={{
            borderRadius: 2,
            border: "1px solid #e0e0e0",
            "&:hover": {
              bgcolor: "rgba(0,0,0,0.04)",
            },
          }}
        >
          <ListItemIcon sx={{ minWidth: 40, color: "text.secondary" }}>
            <LogoutIcon />
          </ListItemIcon>
          <ListItemText
            primary="Logout"
            primaryTypographyProps={{
              fontWeight: 600,
              fontSize: 15,
            }}
          />
        </ListItem>
      </Box>
    </Box>
  );
}