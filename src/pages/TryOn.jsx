import React, { useEffect, useRef, useState } from "react";
import { Pose } from "@mediapipe/pose";
import { useLocation, useNavigate } from "react-router-dom";
import { Box, Typography, IconButton, Button, Snackbar, Alert } from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CameraAltIcon from "@mui/icons-material/CameraAlt";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import { supabase } from "../lib/supabaseClient";

export default function TryOn() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const poseRef = useRef(null);
  const animationRef = useRef(null);
  const landmarksRef = useRef(null);
  const streamRef = useRef(null);
  const productImgRef = useRef(null);

  const { state } = useLocation();
  const navigate = useNavigate();

  const [cameraOn, setCameraOn] = useState(false);
  const [poseDetected, setPoseDetected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [saving, setSaving] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });

  if (!state) {
    return (
      <Box sx={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Typography>No product selected</Typography>
      </Box>
    );
  }

  // Load product image
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = state.image;
    img.onload = () => {
      productImgRef.current = img;
    };
  }, [state.image]);

  // Initialize MediaPipe Pose
  useEffect(() => {
    const pose = new Pose({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
    });

    pose.setOptions({
      modelComplexity: 0,
      smoothLandmarks: true,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

    pose.onResults((results) => {
      if (results.poseLandmarks) {
        landmarksRef.current = results.poseLandmarks;
        setPoseDetected(true);
      }
    });

    poseRef.current = pose;
    return () => {
      if (poseRef.current) {
        poseRef.current.close();
      }
    };
  }, []);

  const startCamera = async () => {
    try {
      setLoading(true);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: "user",
          width: { ideal: 640 },
          height: { ideal: 480 }
        },
      });

      streamRef.current = stream;
      videoRef.current.srcObject = stream;
      
      videoRef.current.onloadedmetadata = () => {
        videoRef.current.play();
        setCameraOn(true);
        setLoading(false);
        drawLoop();
      };
    } catch (err) {
      console.error("Camera error:", err);
      setLoading(false);
      setSnackbar({ open: true, message: "Failed to access camera", severity: "error" });
    }
  };

  const drawLoop = async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    if (!video || video.readyState !== 4) {
      animationRef.current = requestAnimationFrame(drawLoop);
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw mirrored video
    ctx.save();
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    ctx.restore();

    // Draw product overlay if pose detected
    if (landmarksRef.current && productImgRef.current) {
      const landmarks = landmarksRef.current;
      
      // Get key body points
      const leftShoulder = landmarks[11];
      const rightShoulder = landmarks[12];
      const leftHip = landmarks[23];
      const rightHip = landmarks[24];

      if (leftShoulder && rightShoulder && leftHip && rightHip) {
        // Calculate center points (mirrored)
        const shoulderCenterX = ((1 - leftShoulder.x) + (1 - rightShoulder.x)) / 2 * canvas.width;
        const shoulderCenterY = (leftShoulder.y + rightShoulder.y) / 2 * canvas.height;
        
        const hipCenterY = (leftHip.y + rightHip.y) / 2 * canvas.height;
        
        // Calculate body dimensions
        const shoulderWidth = Math.abs((leftShoulder.x - rightShoulder.x) * canvas.width);
        const torsoHeight = Math.abs(hipCenterY - shoulderCenterY);
        
        // Product dimensions
        const productWidth = shoulderWidth * 2.4;
        const productHeight = torsoHeight * 2.0;
        
        // Position
        const productX = shoulderCenterX - productWidth / 2;
        const productY = shoulderCenterY - productHeight * 0.15;
        
        // Calculate body tilt angle
        const bodyAngle = Math.atan2(
          leftShoulder.y - rightShoulder.y,
          leftShoulder.x - rightShoulder.x
        );

        ctx.save();
        
        // Apply rotation around center point
        ctx.translate(shoulderCenterX, shoulderCenterY);
        ctx.rotate(-bodyAngle);
        ctx.translate(-shoulderCenterX, -shoulderCenterY);
        
        // Draw with transparency
        ctx.globalAlpha = 0.8;
        
        // Draw the product
        ctx.drawImage(
          productImgRef.current,
          productX,
          productY,
          productWidth,
          productHeight
        );
        
        ctx.restore();
      }
    }

    // Send frame to pose detection
    await poseRef.current.send({ image: video });

    animationRef.current = requestAnimationFrame(drawLoop);
  };

  const captureImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Capture the current canvas frame
    const imageDataUrl = canvas.toDataURL("image/png");
    setCapturedImage(imageDataUrl);
    
    // Stop the camera and animation
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    setCameraOn(false);
  };

  const retakeImage = () => {
    setCapturedImage(null);
    startCamera();
  };

  const saveToDatabase = async () => {
    if (!capturedImage) return;

    try {
      setSaving(true);

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setSnackbar({ open: true, message: "Please log in to save", severity: "error" });
        setSaving(false);
        return;
      }

      // Convert base64 to blob
      const base64Response = await fetch(capturedImage);
      const blob = await base64Response.blob();
      
      // Create unique filename
      const fileName = `tryon_${user.id}_${Date.now()}.png`;
      
      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("tryon-images")
        .upload(fileName, blob, {
          contentType: "image/png",
          cacheControl: "3600"
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from("tryon-images")
        .getPublicUrl(fileName);

      // Save to database
      const { error: dbError } = await supabase
        .from("tryon_history")
        .insert({
          user_id: user.id,
          item_id: state.title,
          image_url: publicUrl,
          action: "captured"
        });

      if (dbError) throw dbError;

      setSnackbar({ 
        open: true, 
        message: "Successfully saved to Try-On History!", 
        severity: "success" 
      });

      // Navigate back after short delay
      setTimeout(() => {
        navigate("/dashboard");
      }, 1500);

    } catch (error) {
      console.error("Error saving:", error);
      setSnackbar({ 
        open: true, 
        message: "Failed to save image: " + error.message, 
        severity: "error" 
      });
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  return (
    <Box
      sx={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        p: 2,
      }}
    >
      {/* Header with Product Info */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 2,
          mb: 2,
          maxWidth: 900,
          mx: "auto",
        }}
      >
        <IconButton
          onClick={() => navigate(-1)}
          sx={{
            bgcolor: "white",
            "&:hover": { bgcolor: "rgba(255,255,255,0.9)" },
          }}
        >
          <ArrowBackIcon />
        </IconButton>
        
        <Box
          sx={{
            flex: 1,
            bgcolor: "white",
            p: 2,
            borderRadius: 2,
            display: "flex",
            alignItems: "center",
            gap: 2,
          }}
        >
          <img
            src={state.image}
            alt={state.title}
            style={{
              width: 60,
              height: 60,
              objectFit: "contain",
              borderRadius: 8,
              border: "1px solid #eee",
            }}
          />
          <Box>
            <Typography fontWeight={700} fontSize={16}>
              {state.title}
            </Typography>
            <Typography color="text.secondary" fontSize={14}>
              ₹{state.price}
            </Typography>
          </Box>
          <Button
            variant="outlined"
            onClick={() => window.open(state.buyUrl, "_blank")}
          >
            BUY ON WEBSITE
          </Button>
        </Box>
      </Box>

      {/* Camera Section */}
      <Box
        sx={{
          bgcolor: "white",
          borderRadius: 3,
          p: 2,
          maxWidth: 900,
          mx: "auto",
          boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
        }}
      >
        <Box
          sx={{
            position: "relative",
            width: "100%",
            aspectRatio: "4/3",
            bgcolor: "#000",
            borderRadius: 2,
            overflow: "hidden",
          }}
        >
          {capturedImage ? (
            <img 
              src={capturedImage} 
              alt="Captured" 
              style={{
                width: "100%",
                height: "100%",
                objectFit: "contain",
              }}
            />
          ) : (
            <>
              <video
                ref={videoRef}
                playsInline
                muted
                style={{ display: "none" }}
              />
              <canvas
                ref={canvasRef}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "contain",
                }}
              />
            </>
          )}
          
          {/* Pose indicator */}
          {cameraOn && !capturedImage && (
            <Box
              sx={{
                position: "absolute",
                top: 16,
                right: 16,
                bgcolor: poseDetected ? "success.main" : "warning.main",
                color: "white",
                px: 2,
                py: 0.5,
                borderRadius: 2,
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              {poseDetected ? "✓ Pose Detected" : "⚠ Stand in frame"}
            </Box>
          )}
        </Box>

        <Box sx={{ textAlign: "center", mt: 3 }}>
          {!cameraOn && !capturedImage && (
            <Button
              onClick={startCamera}
              disabled={loading}
              variant="contained"
              size="large"
              sx={{
                px: 4,
                py: 1.5,
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                fontWeight: 700,
                fontSize: "1rem",
                "&:hover": {
                  background: "linear-gradient(135deg, #5568d3 0%, #653a8b 100%)",
                }
              }}
            >
              {loading ? "Loading..." : "🎥 START CAMERA"}
            </Button>
          )}
          
          {cameraOn && !capturedImage && (
            <Box sx={{ display: "flex", gap: 2, justifyContent: "center", flexDirection: "column", alignItems: "center" }}>
              <Button
                onClick={captureImage}
                variant="contained"
                size="large"
                startIcon={<CameraAltIcon />}
                sx={{
                  px: 4,
                  py: 1.5,
                  background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                  fontWeight: 700,
                  minWidth: 200,
                  "&:hover": {
                    background: "linear-gradient(135deg, #5568d3 0%, #653a8b 100%)",
                  }
                }}
              >
                CAPTURE
              </Button>
              <Typography color="text.secondary" fontSize={14}>
                Move to see the product on your body
              </Typography>
            </Box>
          )}

          {capturedImage && (
            <Box sx={{ display: "flex", gap: 2, justifyContent: "center" }}>
              <Button
                onClick={retakeImage}
                variant="outlined"
                size="large"
                startIcon={<RestartAltIcon />}
                sx={{ 
                  px: 4, 
                  py: 1.5, 
                  fontWeight: 700,
                  borderColor: "#667eea",
                  color: "#667eea",
                  "&:hover": {
                    borderColor: "#5568d3",
                    bgcolor: "rgba(102, 126, 234, 0.04)"
                  }
                }}
              >
                RETAKE
              </Button>
              <Button
                onClick={saveToDatabase}
                variant="contained"
                size="large"
                disabled={saving}
                sx={{
                  px: 4,
                  py: 1.5,
                  background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                  fontWeight: 700,
                  "&:hover": {
                    background: "linear-gradient(135deg, #5568d3 0%, #653a8b 100%)",
                  }
                }}
              >
                {saving ? "SAVING..." : "SAVE TO HISTORY"}
              </Button>
            </Box>
          )}
        </Box>
      </Box>
          alert("Try-On saved successfully!");
          navigate("/dashboard?tab=tryon-history");

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert 
          onClose={() => setSnackbar({ ...snackbar, open: false })} 
          severity={snackbar.severity}
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}