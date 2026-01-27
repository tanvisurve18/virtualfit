import React, { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { 
  Box, Typography, IconButton, Button, Snackbar, Alert, 
  CircularProgress, Card, CardContent, Chip, Paper, Slider
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CameraAltIcon from "@mui/icons-material/CameraAlt";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import SaveIcon from "@mui/icons-material/Save";
import ShoppingBagIcon from "@mui/icons-material/ShoppingBag";
import TuneIcon from "@mui/icons-material/Tune";
import { Pose } from "@mediapipe/pose";
import { supabase } from "../lib/supabaseClient";

const THEME = {
  gradient: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
  pageBg: "#F6F7FB",
  primary: "#6C5CE7"
};

export default function TryOn() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const poseRef = useRef(null);
  const animationRef = useRef(null);
  const landmarksRef = useRef(null);
  const productImgRef = useRef(null);
  const isDrawingRef = useRef(false);

  const { state } = useLocation();
  const navigate = useNavigate();

  const [cameraOn, setCameraOn] = useState(false);
  const [poseDetected, setPoseDetected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [saving, setSaving] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });
  const [showSettings, setShowSettings] = useState(false);
  const [garmentScale, setGarmentScale] = useState(1.4);
  const [garmentVerticalOffset, setGarmentVerticalOffset] = useState(0);
  const [garmentHorizontalOffset, setGarmentHorizontalOffset] = useState(0);
  const [necklineOffset, setNecklineOffset] = useState(20);

  if (!state) {
    return (
      <Box sx={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", bgcolor: THEME.pageBg }}>
        <Box sx={{ textAlign: "center" }}>
          <Typography variant="h5" fontWeight={700} gutterBottom>No product selected</Typography>
          <Button variant="contained" onClick={() => navigate("/dashboard")} sx={{ mt: 2, bgcolor: THEME.primary }}>
            Go to Dashboard
          </Button>
        </Box>
      </Box>
    );
  }

  // Pre-process garment image with better background removal
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = state.image;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      // Less aggressive cropping to preserve shirt shape
      const cropTop = img.height * 0.05; 
      const cropHeight = img.height * 0.85;
      
      canvas.width = img.width;
      canvas.height = cropHeight;
      ctx.drawImage(img, 0, cropTop, img.width, cropHeight, 0, 0, canvas.width, canvas.height);
      
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      
      // More sophisticated background removal
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const brightness = (r + g + b) / 3;
        
        // Remove white/light backgrounds
        if (brightness > 240) {
          data[i + 3] = 0;
        } else if (brightness > 220) {
          // Gradual transparency for near-white pixels
          data[i + 3] = Math.max(0, (240 - brightness) * 12);
        }
      }
      
      ctx.putImageData(imageData, 0, 0);
      const processedImg = new Image();
      processedImg.src = canvas.toDataURL();
      processedImg.onload = () => { 
        productImgRef.current = processedImg;
        console.log("Product image processed and ready");
      };
    };
  }, [state.image]);

  // Initialize MediaPipe Pose
  useEffect(() => {
    const pose = new Pose({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
    });
    pose.setOptions({ 
      modelComplexity: 1, 
      smoothLandmarks: true, 
      minDetectionConfidence: 0.6,
      minTrackingConfidence: 0.6
    });
    pose.onResults((results) => {
      landmarksRef.current = results.poseLandmarks;
      setPoseDetected(!!results.poseLandmarks);
    });
    poseRef.current = pose;
    
    return () => {
      if (poseRef.current) {
        poseRef.current.close();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      isDrawingRef.current = false;
    };
  }, []);

  const startCamera = async () => {
    try {
      setLoading(true);
      console.log("Starting camera...");
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: "user",
          width: { ideal: 1280 },
          height: { ideal: 720 }
        } 
      });
      
      console.log("Camera stream obtained");
      streamRef.current = stream;
      
      const video = videoRef.current;
      if (!video) {
        throw new Error("Video element not found");
      }

      video.srcObject = stream;
      
      await new Promise((resolve, reject) => {
        video.onloadedmetadata = () => {
          console.log("Video metadata loaded");
          resolve();
        };
        video.onerror = () => {
          reject(new Error("Video loading failed"));
        };
        setTimeout(() => reject(new Error("Video loading timeout")), 10000);
      });

      await video.play();
      console.log("Video playing, dimensions:", video.videoWidth, "x", video.videoHeight);
      
      isDrawingRef.current = true;
      setCameraOn(true);
      setLoading(false);
      
      console.log("Starting draw loop...");
      drawLoop();

    } catch (err) {
      console.error("Camera error:", err);
      setLoading(false);
      setSnackbar({ 
        open: true, 
        message: err.message || "Camera access denied. Please allow camera permissions.", 
        severity: "error" 
      });
    }
  };

  const drawLoop = async () => {
    if (!videoRef.current || !canvasRef.current || !isDrawingRef.current) {
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    
    if (video.readyState >= 2) {
      if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        console.log(`Canvas resized to ${canvas.width}x${canvas.height}`);
      }

      // Send video frame to MediaPipe for pose detection
      if (poseRef.current) {
        await poseRef.current.send({ image: video });
      }

      // Draw mirrored video
      ctx.save();
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      ctx.restore();

      // Enhanced garment overlay with better positioning
      if (landmarksRef.current && productImgRef.current) {
        const lm = landmarksRef.current;
        
        // Key body landmarks
        const leftShoulder = lm[11];
        const rightShoulder = lm[12];
        const leftHip = lm[23];
        const rightHip = lm[24];
        const leftElbow = lm[13];
        const rightElbow = lm[14];
        const nose = lm[0];
        const leftEye = lm[2];
        const rightEye = lm[5];
        
        // Check visibility
        if (leftShoulder.visibility > 0.5 && rightShoulder.visibility > 0.5 &&
            leftHip.visibility > 0.4 && rightHip.visibility > 0.4) {
          
          // Mirror function for horizontal coordinates
          const mirrorX = (x) => (1 - x) * canvas.width;
          
          // Calculate positions
          const shoulderLeftX = mirrorX(leftShoulder.x);
          const shoulderRightX = mirrorX(rightShoulder.x);
          const shoulderLeftY = leftShoulder.y * canvas.height;
          const shoulderRightY = rightShoulder.y * canvas.height;
          
          const hipLeftX = mirrorX(leftHip.x);
          const hipRightX = mirrorX(rightHip.x);
          const hipLeftY = leftHip.y * canvas.height;
          const hipRightY = rightHip.y * canvas.height;
          
          const noseY = nose.y * canvas.height;
          const noseX = mirrorX(nose.x);
          
          // Calculate eye center for better head reference
          const eyeCenterY = ((leftEye.y + rightEye.y) / 2) * canvas.height;
          
          // Calculate shoulder center and width
          const shoulderCenterX = (shoulderLeftX + shoulderRightX) / 2;
          const shoulderAvgY = (shoulderLeftY + shoulderRightY) / 2;
          const shoulderWidth = Math.abs(shoulderLeftX - shoulderRightX);
          
          // Calculate torso length and width
          const hipCenterY = (hipLeftY + hipRightY) / 2;
          const torsoLength = hipCenterY - shoulderAvgY;
          const hipWidth = Math.abs(hipLeftX - hipRightX);
          
          // Use shoulder width as base for garment sizing
          const baseWidth = shoulderWidth * garmentScale;
          
          // Calculate garment dimensions maintaining aspect ratio
          const garmentWidth = baseWidth;
          const garmentHeight = (productImgRef.current.height / productImgRef.current.width) * garmentWidth;
          
          // Calculate neckline position (between eyes and shoulders)
          const necklineY = eyeCenterY + (shoulderAvgY - eyeCenterY) * 0.7 + necklineOffset;
          
          // Position garment
          const garmentX = shoulderCenterX - garmentWidth / 2 + garmentHorizontalOffset;
          const garmentY = necklineY - (garmentHeight * 0.15) + garmentVerticalOffset; // Start slightly above neckline
          
          // Apply perspective transform for better fitting
          ctx.save();
          
          // Calculate shoulder angle for rotation
          const shoulderAngle = Math.atan2(
            shoulderRightY - shoulderLeftY, 
            shoulderRightX - shoulderLeftX
          );
          
          // Apply subtle rotation to match body angle
          ctx.translate(shoulderCenterX, shoulderAvgY);
          ctx.rotate(shoulderAngle * 0.3); // Reduce rotation effect
          ctx.translate(-shoulderCenterX, -shoulderAvgY);
          
          // Draw the garment with better blending
          ctx.globalAlpha = 0.90;
          ctx.globalCompositeOperation = 'source-over';
          
          ctx.drawImage(
            productImgRef.current,
            garmentX,
            garmentY,
            garmentWidth,
            garmentHeight
          );
          
          ctx.restore();
          
          // Optional: Draw debug visualization (uncomment to see key points)
          /*
          ctx.fillStyle = "rgba(255, 0, 0, 0.7)";
          ctx.beginPath();
          ctx.arc(shoulderLeftX, shoulderLeftY, 5, 0, Math.PI * 2);
          ctx.arc(shoulderRightX, shoulderRightY, 5, 0, Math.PI * 2);
          ctx.fill();
          
          ctx.fillStyle = "rgba(0, 255, 0, 0.7)";
          ctx.beginPath();
          ctx.arc(shoulderCenterX, necklineY, 5, 0, Math.PI * 2);
          ctx.fill();
          
          ctx.fillStyle = "rgba(0, 0, 255, 0.7)";
          ctx.beginPath();
          ctx.arc(hipLeftX, hipLeftY, 5, 0, Math.PI * 2);
          ctx.arc(hipRightX, hipRightY, 5, 0, Math.PI * 2);
          ctx.fill();
          
          // Draw garment bounding box
          ctx.strokeStyle = "rgba(255, 255, 0, 0.7)";
          ctx.lineWidth = 2;
          ctx.strokeRect(garmentX, garmentY, garmentWidth, garmentHeight);
          */
        }
      }
    }

    // Continue the loop
    animationRef.current = requestAnimationFrame(drawLoop);
  };

  const captureImage = () => {
    if (canvasRef.current) {
      const imageData = canvasRef.current.toDataURL("image/png");
      setCapturedImage(imageData);
      
      // Stop camera
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
      isDrawingRef.current = false;
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      setCameraOn(false);
      
      setSnackbar({ open: true, message: "Look captured successfully!", severity: "success" });
    }
  };

  const retakePhoto = () => {
    setCapturedImage(null);
    startCamera();
  };

  const saveToHistory = async () => {
    if (!capturedImage) return;
    
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      
      const blob = await (await fetch(capturedImage)).blob();
      const filename = `tryon_${Date.now()}.png`;
      
      const { error: uploadError } = await supabase.storage
        .from('tryon-images')
        .upload(`${user.id}/${filename}`, blob);
      
      if (uploadError) throw uploadError;
      
      const { data: urlData } = supabase.storage
        .from('tryon-images')
        .getPublicUrl(`${user.id}/${filename}`);
      
      const { error: dbError } = await supabase
        .from('tryon_history')
        .insert({
          user_id: user.id,
          product_name: state.name,
          product_price: state.price,
          product_image: state.image,
          tryon_image: urlData.publicUrl,
          buy_url: state.buyUrl
        });
      
      if (dbError) throw dbError;
      
      setSnackbar({ open: true, message: "Saved to your history!", severity: "success" });
      
      setTimeout(() => navigate("/dashboard"), 1500);
    } catch (err) {
      console.error("Save error:", err);
      setSnackbar({ open: true, message: "Failed to save. Please try again.", severity: "error" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box sx={{ 
      minHeight: "100vh", 
      background: THEME.gradient, 
      py: 4, 
      px: 2 
    }}>
      <Box sx={{ maxWidth: 1400, mx: "auto" }}>
        {/* Header */}
        <Box sx={{ 
          display: "flex", 
          alignItems: "center", 
          mb: 3,
          gap: 2
        }}>
          <IconButton 
            onClick={() => navigate("/dashboard")}
            sx={{ 
              bgcolor: "white", 
              boxShadow: 2,
              "&:hover": { bgcolor: "white", transform: "scale(1.05)" }
            }}
          >
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h4" fontWeight={700} sx={{ color: "white" }}>
            Virtual Try-On
          </Typography>
        </Box>

        {/* Main Content */}
        <Box sx={{ 
          display: "grid", 
          gridTemplateColumns: { xs: "1fr", md: "350px 1fr" },
          gap: 3
        }}>
          {/* Left Sidebar - Product Info */}
          <Box>
            <Card elevation={3} sx={{ borderRadius: 3, position: "sticky", top: 20 }}>
              <CardContent sx={{ p: 3 }}>
                <Box 
                  component="img" 
                  src={state.image} 
                  alt={state.name}
                  sx={{ 
                    width: "100%", 
                    height: 280,
                    objectFit: "cover", 
                    borderRadius: 2, 
                    mb: 2,
                    bgcolor: "#f5f5f5"
                  }} 
                />
                
                <Typography variant="h6" fontWeight={700} gutterBottom>
                  {state.name}
                </Typography>
                
                <Typography variant="h5" fontWeight={800} color={THEME.primary} gutterBottom>
                  {state.price}
                </Typography>

                {cameraOn && (
                  <Button
                    fullWidth
                    variant="outlined"
                    startIcon={<TuneIcon />}
                    onClick={() => setShowSettings(!showSettings)}
                    sx={{ mb: 2, fontWeight: 600 }}
                  >
                    {showSettings ? "Hide" : "Show"} Adjustments
                  </Button>
                )}
                
                <Button 
                  fullWidth 
                  variant="contained"
                  size="large"
                  startIcon={<ShoppingBagIcon />}
                  onClick={() => window.open(state.buyUrl, "_blank")}
                  sx={{ 
                    bgcolor: THEME.primary,
                    py: 1.5,
                    fontWeight: 600,
                    "&:hover": { bgcolor: "#5a4bc7" }
                  }}
                >
                  Buy on H&M
                </Button>
              </CardContent>
            </Card>

            {/* Adjustment Settings */}
            {showSettings && cameraOn && (
              <Paper elevation={2} sx={{ mt: 2, p: 3, borderRadius: 3 }}>
                <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                  Fine-tune Fit
                </Typography>
                
                <Box sx={{ mt: 2 }}>
                  <Typography variant="caption" color="text.secondary">
                    Size: {garmentScale.toFixed(1)}x
                  </Typography>
                  <Slider 
                    value={garmentScale} 
                    onChange={(e, v) => setGarmentScale(v)}
                    min={1.0}
                    max={1.8}
                    step={0.05}
                    sx={{ color: THEME.primary }}
                  />
                </Box>

                <Box sx={{ mt: 2 }}>
                  <Typography variant="caption" color="text.secondary">
                    Up/Down: {garmentVerticalOffset}px
                  </Typography>
                  <Slider 
                    value={garmentVerticalOffset} 
                    onChange={(e, v) => setGarmentVerticalOffset(v)}
                    min={-80}
                    max={80}
                    step={5}
                    sx={{ color: THEME.primary }}
                  />
                </Box>

                <Box sx={{ mt: 2 }}>
                  <Typography variant="caption" color="text.secondary">
                    Left/Right: {garmentHorizontalOffset}px
                  </Typography>
                  <Slider 
                    value={garmentHorizontalOffset} 
                    onChange={(e, v) => setGarmentHorizontalOffset(v)}
                    min={-50}
                    max={50}
                    step={5}
                    sx={{ color: THEME.primary }}
                  />
                </Box>

                <Box sx={{ mt: 2 }}>
                  <Typography variant="caption" color="text.secondary">
                    Neckline: {necklineOffset}px
                  </Typography>
                  <Slider 
                    value={necklineOffset} 
                    onChange={(e, v) => setNecklineOffset(v)}
                    min={-30}
                    max={50}
                    step={5}
                    sx={{ color: THEME.primary }}
                  />
                </Box>

                <Button 
                  fullWidth 
                  size="small"
                  onClick={() => {
                    setGarmentScale(1.4);
                    setGarmentVerticalOffset(0);
                    setGarmentHorizontalOffset(0);
                    setNecklineOffset(20);
                  }}
                  sx={{ mt: 2 }}
                >
                  Reset All
                </Button>
              </Paper>
            )}
          </Box>

          {/* Camera/Preview Card */}
          <Card elevation={3} sx={{ borderRadius: 3, overflow: "hidden" }}>
            {/* Status Bar */}
            <Box sx={{ 
              bgcolor: "white", 
              p: 2, 
              borderBottom: "1px solid #e0e0e0",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between"
            }}>
              <Typography variant="subtitle1" fontWeight={600}>
                {capturedImage ? "📸 Preview" : cameraOn ? "🎥 Live View" : "Ready to Try"}
              </Typography>
              
              {cameraOn && (
                <Chip 
                  label={poseDetected ? "✓ Pose Detected" : "Stand in frame"} 
                  color={poseDetected ? "success" : "default"}
                  size="small"
                  sx={{ fontWeight: 600 }}
                />
              )}
            </Box>

            {/* Camera Display */}
            <Box sx={{ 
              position: "relative", 
              bgcolor: "#1a1a1a",
              aspectRatio: "4/3",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}>
              {!cameraOn && !capturedImage && (
                <Box sx={{ 
                  textAlign: "center",
                  color: "white",
                  p: 4
                }}>
                  <CameraAltIcon sx={{ fontSize: 64, mb: 2, opacity: 0.7 }} />
                  <Typography variant="h6" gutterBottom>
                    Start Your Virtual Try-On
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 3, opacity: 0.8, maxWidth: 400 }}>
                    Position yourself in front of the camera. Make sure your full upper body is visible for best results.
                  </Typography>
                  <Button 
                    variant="contained" 
                    size="large"
                    startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <CameraAltIcon />}
                    onClick={startCamera}
                    disabled={loading}
                    sx={{ 
                      bgcolor: THEME.primary,
                      px: 4,
                      py: 1.5,
                      fontWeight: 600,
                      "&:hover": { bgcolor: "#5a4bc7" }
                    }}
                  >
                    {loading ? "Starting Camera..." : "Start Camera"}
                  </Button>
                </Box>
              )}

              {capturedImage && (
                <img 
                  src={capturedImage}
                  alt="Captured"
                  style={{ 
                    width: "100%", 
                    height: "100%", 
                    objectFit: "cover"
                  }} 
                />
              )}
              
              <canvas 
                ref={canvasRef} 
                style={{ 
                  width: "100%", 
                  height: "100%", 
                  objectFit: "cover",
                  display: cameraOn && !capturedImage ? "block" : "none"
                }} 
              />
              
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline
                muted
                style={{ display: "none" }} 
              />
            </Box>

            {/* Action Buttons */}
            <Box sx={{ 
              p: 2, 
              display: "flex", 
              gap: 2,
              justifyContent: "center",
              bgcolor: "white",
              flexWrap: "wrap"
            }}>
              {cameraOn && !capturedImage && (
                <Button 
                  variant="contained" 
                  size="large"
                  onClick={captureImage}
                  disabled={!poseDetected}
                  sx={{ 
                    bgcolor: THEME.primary,
                    px: 4,
                    fontWeight: 600,
                    "&:hover": { bgcolor: "#5a4bc7" }
                  }}
                >
                  📸 Capture Look
                </Button>
              )}

              {capturedImage && (
                <>
                  <Button 
                    variant="outlined" 
                    size="large"
                    startIcon={<RestartAltIcon />}
                    onClick={retakePhoto}
                    sx={{ fontWeight: 600, px: 3 }}
                  >
                    Retake
                  </Button>
                  <Button 
                    variant="contained" 
                    size="large"
                    startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
                    onClick={saveToHistory}
                    disabled={saving}
                    sx={{ 
                      bgcolor: THEME.primary,
                      fontWeight: 600,
                      px: 3,
                      "&:hover": { bgcolor: "#5a4bc7" }
                    }}
                  >
                    {saving ? "Saving..." : "Save to History"}
                  </Button>
                </>
              )}
            </Box>
          </Card>
        </Box>
      </Box>

      <Snackbar 
        open={snackbar.open} 
        autoHideDuration={3000} 
        onClose={() => setSnackbar({...snackbar, open: false})}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert 
          severity={snackbar.severity}
          sx={{ fontWeight: 600 }}
          onClose={() => setSnackbar({...snackbar, open: false})}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}