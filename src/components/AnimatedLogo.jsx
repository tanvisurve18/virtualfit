//AnimatedLogo.jsx
import React from "react";
import { Box } from "@mui/material";
import { keyframes } from "@mui/system";
import { useNavigate } from "react-router-dom";
import logo from "../assets/logo.png";

/* Animations */
const floatIn = keyframes`
  0% {
    opacity: 0;
    transform: translateY(-10px) scale(0.9);
  }
  60% {
    opacity: 1;
    transform: translateY(2px) scale(1.05);
  }
  100% {
    transform: translateY(0) scale(1);
  }
`;

const glow = keyframes`
  0% {
    filter: drop-shadow(0 0 0px rgba(123,75,255,0.4));
  }
  50% {
    filter: drop-shadow(0 0 12px rgba(123,75,255,0.8));
  }
  100% {
    filter: drop-shadow(0 0 0px rgba(123,75,255,0.4));
  }
`;

export default function AnimatedLogo({ size = 42 }) {
  const navigate = useNavigate();

  return (
    <Box
      component="img"
      src={logo}
      alt="VirtualFit Logo"
      onClick={() => navigate("/")}
      sx={{
        width: size,
        height: size,
        cursor: "pointer",
        animation: `${floatIn} 0.9s ease-out, ${glow} 3s ease-in-out infinite`,
        transition: "transform 0.3s ease",
        "&:hover": {
          transform: "scale(1.12) rotate(-2deg)",
        },
      }}
    />
  );
}
