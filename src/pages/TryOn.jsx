import React, { useRef, useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Button,
  IconButton,
  Snackbar,
  Alert,
  CircularProgress,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CameraAltIcon from "@mui/icons-material/CameraAlt";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import AutoFixHighIcon from "@mui/icons-material/AutoFixHigh";
import { supabase } from "../lib/supabaseClient";

export default function TryOn() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const { state } = useLocation();
  const navigate = useNavigate();

  const [cameraOn, setCameraOn] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [resultImage, setResultImage] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "info",
  });

  if (!state) {
    return <Typography>No product selected</Typography>;
  }

  const startCamera = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    streamRef.current = stream;
    videoRef.current.srcObject = stream;
    await videoRef.current.play();
    setCameraOn(true);
  };

  const captureImage = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;

    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(videoRef.current, 0, 0);

    const img = canvas.toDataURL("image/jpeg", 0.9);
    setCapturedImage(img);

    streamRef.current.getTracks().forEach((t) => t.stop());
    setCameraOn(false);
  };

  const processWithAI = async () => {
    try {
      setProcessing(true);
      setSnackbar({
        open: true,
        message: "🧠 Processing garment…",
        severity: "info",
      });

      const personBlob = await fetch(capturedImage).then((r) => r.blob());
      const garmentBlob = await fetch(state.image).then((r) => r.blob());

      const formData = new FormData();
      formData.append("person_image", personBlob);
      formData.append("garment_image", garmentBlob);

      const res = await fetch(
        "https://fqpweatumhbxnuvwpgrb.supabase.co/functions/v1/ai-tryon",
        {
          method: "POST",
          headers: {
            apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: formData,
        }
      );

      if (!res.ok) throw new Error("AI failed");

      const blob = await res.blob();
      setResultImage(URL.createObjectURL(blob));

      setSnackbar({
        open: true,
        message: "✅ Garment ready (background removed)",
        severity: "success",
      });
    } catch (err) {
      setSnackbar({
        open: true,
        message: err.message,
        severity: "error",
      });
    } finally {
      setProcessing(false);
    }
  };

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  return (
    <Box p={2}>
      <IconButton onClick={() => navigate(-1)}>
        <ArrowBackIcon />
      </IconButton>

      <Box mt={2} sx={{ aspectRatio: "4/3", background: "#000" }}>
        {cameraOn && <video ref={videoRef} autoPlay muted />}
        {capturedImage && !resultImage && <img src={capturedImage} />}
        {resultImage && <img src={resultImage} />}
        <canvas ref={canvasRef} hidden />
      </Box>

      <Box mt={2} textAlign="center">
        {!cameraOn && !capturedImage && (
          <Button onClick={startCamera}>Start Camera</Button>
        )}

        {cameraOn && (
          <Button startIcon={<CameraAltIcon />} onClick={captureImage}>
            Capture
          </Button>
        )}

        {capturedImage && !resultImage && (
          <Button
            startIcon={<AutoFixHighIcon />}
            onClick={processWithAI}
            disabled={processing}
          >
            Try On
          </Button>
        )}

        {processing && <CircularProgress />}
      </Box>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
}
