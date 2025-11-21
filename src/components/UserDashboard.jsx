import React from "react";
import { Typography, Box } from "@mui/material";

function UserDashboard() {
  return (
    <Box
      sx={{
        padding: "2rem",
        textAlign: "center",
        
        minHeight: "100vh",
      }}
    >
      <Typography variant="h4" sx={{ fontWeight: "bold", mb: 2 }}>
        Welcome to Your Dashboard
      </Typography>

      <Typography variant="h6" sx={{ mb: 2 }}>
        Start your Virtual Try-On experience!
      </Typography>
    </Box>
  );
}

export default UserDashboard;
