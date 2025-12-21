import React, { useRef, useState, useEffect } from "react";
import { Box, Button, Typography, Paper } from "@mui/material";
import { useSearchParams } from "react-router-dom";

export default function VirtualTryOn() {
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const [cameraOn, setCameraOn] = useState(false);
  const [error, setError] = useState("");

  const [searchParams] = useSearchParams();
  const itemId = searchParams.get("item");

  // 🔥 Attach stream AFTER state update
  useEffect(() => {
    if (cameraOn && videoRef.current && streamRef.current) {
      console.log("Attaching stream to video");
      videoRef.current.srcObject = streamRef.current;
    }
  }, [cameraOn]);

  const openCamera = async () => {
    try {
      console.log("Requesting camera...");

      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
      });

      console.log("Camera stream OK:", stream);

      streamRef.current = stream;
      setCameraOn(true);
    } catch (err) {
      console.error(err);
      setError("Camera failed to start");
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraOn(false);
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: "#f6f7fb",
      }}
    >
      <Paper sx={{ p: 4, borderRadius: 3, width: 420 }}>
        <Typography variant="h6" fontWeight={700} mb={2}>
          Try On Item: {itemId}
        </Typography>

        {/* 🎥 VIDEO — ALWAYS RENDERED */}
        <Box
          sx={{
            width: "100%",
            height: 360,
            bgcolor: "#000",
            borderRadius: 2,
            overflow: "hidden",
            mb: 2,
          }}
        >
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              opacity: cameraOn ? 1 : 0,
            }}
          />
        </Box>

        {!cameraOn ? (
          <Button
            fullWidth
            variant="contained"
            onClick={openCamera}
            sx={{ bgcolor: "#7B4BFF" }}
          >
            OPEN CAMERA
          </Button>
        ) : (
          <Button fullWidth variant="outlined" onClick={stopCamera}>
            STOP CAMERA
          </Button>
        )}

        {error && (
          <Typography color="error" mt={2}>
            {error}
          </Typography>
        )}
      </Paper>
    </Box>
  );
}
