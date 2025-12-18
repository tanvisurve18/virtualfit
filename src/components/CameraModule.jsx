import React, { useState, useRef } from "react";
import {
  Box,
  Button,
  Typography,
  Paper,
  IconButton,
} from "@mui/material";
import PhotoCameraIcon from "@mui/icons-material/PhotoCamera";
import UploadIcon from "@mui/icons-material/Upload";
import ReplayIcon from "@mui/icons-material/Replay";

export default function CameraModule({ onImageCaptured }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const [cameraActive, setCameraActive] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);

  // Start Camera
  const startCamera = async () => {
    setCapturedImage(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameraActive(true);
      }
    } catch (err) {
      alert("Camera permission denied or unavailable.");
      console.error(err);
    }
  };

  // Capture Photo
  const capturePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas) return;

    const ctx = canvas.getContext("2d");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageData = canvas.toDataURL("image/jpeg");
    setCapturedImage(imageData);

    // Stop camera after capture
    const stream = video.srcObject;
    const tracks = stream.getTracks();
    tracks.forEach((track) => track.stop());

    setCameraActive(false);

    // Send to parent component (AI try-on module)
    if (onImageCaptured) onImageCaptured(imageData);
  };

  // Upload from device
  const handleUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setCapturedImage(reader.result);
      if (onImageCaptured) onImageCaptured(reader.result);
    };
    reader.readAsDataURL(file);
  };

  return (
    <Box
      sx={{
        width: "100%",
        display: "flex",
        justifyContent: "center",
        mt: 4,
      }}
    >
      <Paper
        sx={{
          width: "420px",
          p: 3,
          borderRadius: "20px",
          background: "#ffffffcc",
          backdropFilter: "blur(10px)",
          boxShadow: "0px 10px 25px rgba(0,0,0,0.1)",
        }}
      >
        <Typography
          sx={{
            fontSize: "1.5rem",
            fontWeight: 700,
            mb: 2,
            color: "#2B2345",
            textAlign: "center",
          }}
        >
          Upload or Capture Your Photo
        </Typography>

        {/* Camera Preview */}
        {cameraActive && (
          <Box sx={{ textAlign: "center" }}>
            <video
              ref={videoRef}
              autoPlay
              style={{
                width: "100%",
                borderRadius: "12px",
                marginBottom: "12px",
              }}
            />
            <Button
              variant="contained"
              onClick={capturePhoto}
              sx={{
                bgcolor: "#7B4BFF",
                ":hover": { bgcolor: "#6A3DE3" },
                px: 3,
                py: 1,
              }}
              startIcon={<PhotoCameraIcon />}
            >
              Capture
            </Button>
          </Box>
        )}

        {/* Image Preview */}
        {capturedImage && !cameraActive && (
          <Box sx={{ textAlign: "center" }}>
            <img
              src={capturedImage}
              alt="preview"
              style={{
                width: "100%",
                borderRadius: "12px",
                marginBottom: "12px",
              }}
            />
            <Button
              startIcon={<ReplayIcon />}
              sx={{
                color: "#7B4BFF",
                border: "1px solid #7B4BFF",
                px: 3,
                py: 1,
                borderRadius: "10px",
                ":hover": { borderColor: "#6A3DE3", color: "#6A3DE3" },
              }}
              onClick={() => setCapturedImage(null)}
            >
              Retake / Replace
            </Button>
          </Box>
        )}

        {/* Initial Options */}
        {!cameraActive && !capturedImage && (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <Button
              variant="contained"
              startIcon={<PhotoCameraIcon />}
              onClick={startCamera}
              sx={{
                bgcolor: "#7B4BFF",
                ":hover": { bgcolor: "#6A3DE3" },
                py: 1.2,
              }}
            >
              Open Camera
            </Button>

            <Button
              component="label"
              startIcon={<UploadIcon />}
              sx={{
                color: "#7B4BFF",
                border: "1px solid #7B4BFF",
                py: 1.2,
                borderRadius: "10px",
                ":hover": { borderColor: "#6A3DE3", color: "#6A3DE3" },
              }}
            >
              Upload From Device
              <input type="file" accept="image/*" hidden onChange={handleUpload} />
            </Button>
          </Box>
        )}

        <canvas ref={canvasRef} style={{ display: "none" }} />
      </Paper>
    </Box>
  );
}
