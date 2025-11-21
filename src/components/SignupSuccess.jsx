import React from "react";
import { Typography, Box, Button } from "@mui/material";
import { useNavigate } from "react-router-dom";

function SignupSuccess() {
  const navigate = useNavigate();

  return (
    <Box
      sx={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        textAlign: "center",
        background: "#f5f5f5",
        p: 4
      }}
    >
      <Typography variant="h4" sx={{ fontWeight: "bold", mb: 2 }}>
        Account Created Successfully!
      </Typography>

      <Typography sx={{ mb: 3 }}>
        Your VirtualFit account is ready. Please login to continue.
      </Typography>

      <Button
        variant="contained"
        sx={{ backgroundColor: "#111", "&:hover": { backgroundColor: "#333" } }}
        onClick={() => navigate("/")}
      >
        Go to Login
      </Button>
    </Box>
  );
}

export default SignupSuccess;
