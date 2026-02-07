import React, { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { 
  Box, Typography, IconButton, Button, Snackbar, Alert, 
  CircularProgress, Card, CardContent, Chip, Paper, Slider, Fade
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CameraAltIcon from "@mui/icons-material/CameraAlt";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import FavoriteIcon from "@mui/icons-material/Favorite";
import ShoppingBagIcon from "@mui/icons-material/ShoppingBag";
import TuneIcon from "@mui/icons-material/Tune";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import WarningIcon from "@mui/icons-material/Warning";
import VisibilityIcon from "@mui/icons-material/Visibility";
import dashboard from '../components/Dashboard';
import StraightenIcon from "@mui/icons-material/Straighten";
import RecommendationWidget from '../components/RecommendationWidget';
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
  const [savingLook, setSavingLook] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });
  const [showSettings, setShowSettings] = useState(false);
  const [garmentScale, setGarmentScale] = useState(2.6);
  const [garmentVerticalOffset, setGarmentVerticalOffset] = useState(-110);
  const [garmentHorizontalOffset, setGarmentHorizontalOffset] = useState(0);
  const [currentProduct, setCurrentProduct] = useState(null);

  // NEW: Pose guidance states
  const [shouldersVisible, setShouldersVisible] = useState(false);
  const [isStandingStraight, setIsStandingStraight] = useState(false);
  const [distanceGood, setDistanceGood] = useState(false);

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

  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = state.image;
    img.onload = () => {
      productImgRef.current = img;
    };
    
    // Set current product for recommendations
    setCurrentProduct({
      id: state.productId,
      title: state.name || state.title,
      price: state.price,
      image: state.image,
      url: state.link || state.buyUrl
    });
  }, [state]);

  useEffect(() => {
    const pose = new Pose({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
    });
    pose.setOptions({ 
      modelComplexity: 1, smoothLandmarks: true, enableSegmentation: false,
      minDetectionConfidence: 0.7, minTrackingConfidence: 0.7
    });
    pose.onResults((results) => {
      landmarksRef.current = results.poseLandmarks;
      const detected = !!results.poseLandmarks;
      setPoseDetected(detected);
      
      // NEW: Analyze pose quality
      if (detected && results.poseLandmarks) {
        analyzePoseQuality(results.poseLandmarks);
      } else {
        // Reset all quality indicators when pose not detected
        setShouldersVisible(false);
        setIsStandingStraight(false);
        setDistanceGood(false);
      }
    });
    poseRef.current = pose;
    return () => {
      if (poseRef.current) poseRef.current.close();
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      isDrawingRef.current = false;
    };
  }, []);

  // NEW: Analyze pose quality and provide feedback
  const analyzePoseQuality = (landmarks) => {
    const leftShoulder = landmarks[11];
    const rightShoulder = landmarks[12];
    const nose = landmarks[0];
    const leftHip = landmarks[23];
    const rightHip = landmarks[24];
    
    // Check if shoulders are visible (good visibility)
    const shouldersVisibleCheck = 
      leftShoulder && rightShoulder && 
      leftShoulder.visibility > 0.65 && 
      rightShoulder.visibility > 0.65;
    setShouldersVisible(shouldersVisibleCheck);
    
    // Check if standing straight (shoulders level)
    if (leftShoulder && rightShoulder) {
      const shoulderTilt = Math.abs(leftShoulder.y - rightShoulder.y);
      const straightCheck = shoulderTilt < 0.08; // Threshold for acceptable tilt
      setIsStandingStraight(straightCheck);
    }
    
    // Check distance (shoulder width relative to frame)
    if (leftShoulder && rightShoulder) {
      const shoulderWidth = Math.abs(leftShoulder.x - rightShoulder.x);
      // Good distance: shoulders take up 20-50% of frame width
      const distanceCheck = shoulderWidth > 0.2 && shoulderWidth < 0.5;
      setDistanceGood(distanceCheck);
    }
  };

  const startCamera = async () => {
    try {
      setLoading(true);
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } } 
      });
      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) throw new Error("Video element not found");
      video.srcObject = stream;
      await new Promise((resolve, reject) => {
        video.onloadedmetadata = resolve;
        video.onerror = () => reject(new Error("Video loading failed"));
        setTimeout(() => reject(new Error("Timeout")), 10000);
      });
      await video.play();
      isDrawingRef.current = true;
      setCameraOn(true);
      setLoading(false);
      drawLoop();
    } catch (err) {
      console.error("Camera error:", err);
      setLoading(false);
      setSnackbar({ open: true, message: err.message || "Camera access denied", severity: "error" });
    }
  };

  const drawLoop = async () => {
    if (!videoRef.current || !canvasRef.current || !isDrawingRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (video.readyState >= 2) {
      if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
      }
      if (poseRef.current) await poseRef.current.send({ image: video });
      ctx.save();
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      ctx.restore();

      if (landmarksRef.current && productImgRef.current) {
        const lm = landmarksRef.current;
        const nose = lm[0], leftEye = lm[2], rightEye = lm[5];
        const leftShoulder = lm[11], rightShoulder = lm[12];
        const leftElbow = lm[13], rightElbow = lm[14];
        const leftHip = lm[23], rightHip = lm[24];
        
        if (leftShoulder && rightShoulder && leftShoulder.visibility > 0.5 && rightShoulder.visibility > 0.5) {
          const mirrorX = (x) => (1 - x) * canvas.width;
          const lShoulderX = mirrorX(leftShoulder.x);
          const rShoulderX = mirrorX(rightShoulder.x);
          const lShoulderY = leftShoulder.y * canvas.height;
          const rShoulderY = rightShoulder.y * canvas.height;
          const noseY = nose.y * canvas.height;
          const shoulderCenterX = (lShoulderX + rShoulderX) / 2;
          const shoulderCenterY = (lShoulderY + rShoulderY) / 2;
          
          // PERFECT FIT - improved body measurement for any distance
          let bodyWidth = Math.abs(lShoulderX - rShoulderX);
          
          // Enhanced depth adaptation based on shoulder position
          const shoulderMidpoint = shoulderCenterY / canvas.height;
          const depthFactor = 0.45 + (shoulderMidpoint * 1.55);
          
          // Use elbow width for accurate body frame detection
          if (leftElbow && rightElbow && leftElbow.visibility > 0.5 && rightElbow.visibility > 0.5) {
            const lElbowX = mirrorX(leftElbow.x);
            const rElbowX = mirrorX(rightElbow.x);
            const elbowWidth = Math.abs(lElbowX - rElbowX);
            bodyWidth = Math.max(bodyWidth, elbowWidth * 0.92);
          }
          
          // Calculate torso length for proportional sizing
          let torsoLength = 200;
          if (leftHip && rightHip && leftHip.visibility > 0.5 && rightHip.visibility > 0.5) {
            const hipY = ((leftHip.y + rightHip.y) / 2) * canvas.height;
            torsoLength = Math.abs(hipY - shoulderCenterY);
          }
          
          // Dynamic garment scaling based on body measurements
          const baseWidth = bodyWidth * garmentScale * depthFactor;
          const baseHeight = torsoLength * 1.35;
          
          // Position garment
          const garmentX = shoulderCenterX + garmentHorizontalOffset;
          const garmentY = shoulderCenterY + garmentVerticalOffset;
          
          // Draw the product garment
          ctx.globalAlpha = 0.95;
          ctx.drawImage(
            productImgRef.current,
            garmentX - baseWidth / 2,
            garmentY,
            baseWidth,
            baseHeight
          );
          ctx.globalAlpha = 1.0;
        }
      }
    }
    animationRef.current = requestAnimationFrame(drawLoop);
  };

  const captureImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const image = canvas.toDataURL("image/png");
    setCapturedImage(image);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
    }
    setCameraOn(false);
    isDrawingRef.current = false;
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
  };

  const saveLook = async () => {
    if (!capturedImage) return;
    setSavingLook(true);
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        setSnackbar({ open: true, message: "Please login to save looks", severity: "warning" });
        setSavingLook(false);
        return;
      }
      
      const { data: inserted, error: insertError } = await supabase
        .from("tryon_history")
        .insert({
          user_id: user.id,
          product_id: state.productId || "unknown",
          product_name: state.name || state.title,
          product_price: state.price,
          product_image: state.image,
          image_data: capturedImage,
          is_saved: true
        })
        .select()
        .single();

      if (insertError) {
        console.error("💥 Insert error:", insertError);
        throw insertError;
      }

      console.log("✅ Saved successfully:", inserted);
      setSnackbar({ open: true, message: "❤️ Saved to your collection!", severity: "success" });
      
    } catch (err) {
      console.error("💥 Save look error:", err);
      setSnackbar({ 
        open: true, 
        message: `Failed to save: ${err.message}`, 
        severity: "error" 
      });
    } finally {
      setSavingLook(false);
    }
  };

  // NEW: Get guidance message based on pose quality
  const getGuidanceMessage = () => {
    if (!cameraOn || capturedImage) return null;
    
    if (!poseDetected) {
      return {
        text: "Position yourself in frame",
        icon: <WarningIcon />,
        color: "warning"
      };
    }
    
    if (!shouldersVisible) {
      return {
        text: "Ensure both shoulders are visible",
        icon: <VisibilityIcon />,
        color: "warning"
      };
    }
    
    if (!isStandingStraight) {
      return {
        text: "Stand straight - level your shoulders",
        icon: <StraightenIcon />,
        color: "warning"
      };
    }
    
    if (!distanceGood) {
      return {
        text: "Adjust distance - step back or forward",
        icon: <WarningIcon />,
        color: "warning"
      };
    }
    
    return {
      text: "Perfect! Ready to capture",
      icon: <CheckCircleIcon />,
      color: "success"
    };
  };

  const guidance = getGuidanceMessage();

  return (
    <Box sx={{ minHeight: "100vh", background: THEME.pageBg, pb: 4 }}>
      <Box sx={{ background: THEME.gradient, color: "white", py: 2, px: 2, display: "flex", alignItems: "center", gap: 2 }}>
        <IconButton onClick={() => navigate("/dashboard")} sx={{ color: "white" }}><ArrowBackIcon /></IconButton>
        <Typography variant="h5" fontWeight={700}>Virtual Try-On</Typography>
      </Box>

      <Box sx={{ maxWidth: 1200, mx: "auto", px: 2, mt: 3, display: "flex", gap: 3, flexDirection: { xs: "column", md: "row" } }}>
        {/* Product Card */}
        <Box sx={{ flex: "0 0 300px" }}>
          <Card elevation={3} sx={{ borderRadius: 3 }}>
            <Box sx={{ bgcolor: "#f5f5f5", p: 3, display: "flex", alignItems: "center", justifyContent: "center", minHeight: 280 }}>
              <img src={state.image} alt={state.name} style={{ maxWidth: "100%", maxHeight: 280, objectFit: "contain" }}/>
            </Box>
            <CardContent>
              <Typography variant="h6" fontWeight={700}>{state.name}</Typography>
              <Typography variant="h5" color={THEME.primary} fontWeight={800} sx={{ mt: 1 }}>{state.price}</Typography>
              <Button 
                fullWidth 
                variant="contained" 
                startIcon={<ShoppingBagIcon />} 
                sx={{ 
                  mt: 2, 
                  bgcolor: THEME.primary, 
                  fontWeight: 600, 
                  py: 1.5, 
                  "&:hover": { bgcolor: "#5a4bc7" } 
                }}
                onClick={() => window.open(state.link, "_blank")}
              >
                BUY ON H&M
              </Button>
            </CardContent>
          </Card>

          {/* NEW: Pose Quality Indicators Card */}
          {cameraOn && !capturedImage && (
            <Fade in={true}>
              <Card elevation={3} sx={{ borderRadius: 3, mt: 2, bgcolor: "#f8f9fa" }}>
                <CardContent>
                  <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 2, display: "flex", alignItems: "center", gap: 1 }}>
                    📋 Pose Checklist
                  </Typography>
                  
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                    {/* Pose Detected */}
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      {poseDetected ? (
                        <CheckCircleIcon sx={{ fontSize: 20, color: "#4caf50" }} />
                      ) : (
                        <WarningIcon sx={{ fontSize: 20, color: "#ff9800" }} />
                      )}
                      <Typography variant="body2" sx={{ 
                        fontWeight: poseDetected ? 600 : 400,
                        color: poseDetected ? "#2e7d32" : "#ed6c02"
                      }}>
                        Body detected
                      </Typography>
                    </Box>

                    {/* Shoulders Visible */}
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      {shouldersVisible ? (
                        <CheckCircleIcon sx={{ fontSize: 20, color: "#4caf50" }} />
                      ) : (
                        <WarningIcon sx={{ fontSize: 20, color: "#ff9800" }} />
                      )}
                      <Typography variant="body2" sx={{ 
                        fontWeight: shouldersVisible ? 600 : 400,
                        color: shouldersVisible ? "#2e7d32" : "#ed6c02"
                      }}>
                        Both shoulders visible
                      </Typography>
                    </Box>

                    {/* Standing Straight */}
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      {isStandingStraight ? (
                        <CheckCircleIcon sx={{ fontSize: 20, color: "#4caf50" }} />
                      ) : (
                        <WarningIcon sx={{ fontSize: 20, color: "#ff9800" }} />
                      )}
                      <Typography variant="body2" sx={{ 
                        fontWeight: isStandingStraight ? 600 : 400,
                        color: isStandingStraight ? "#2e7d32" : "#ed6c02"
                      }}>
                        Standing straight
                      </Typography>
                    </Box>

                    {/* Good Distance */}
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      {distanceGood ? (
                        <CheckCircleIcon sx={{ fontSize: 20, color: "#4caf50" }} />
                      ) : (
                        <WarningIcon sx={{ fontSize: 20, color: "#ff9800" }} />
                      )}
                      <Typography variant="body2" sx={{ 
                        fontWeight: distanceGood ? 600 : 400,
                        color: distanceGood ? "#2e7d32" : "#ed6c02"
                      }}>
                        Good distance
                      </Typography>
                    </Box>
                  </Box>

                  {/* Overall Status */}
                  {poseDetected && shouldersVisible && isStandingStraight && distanceGood && (
                    <Box sx={{ 
                      mt: 2, 
                      pt: 2, 
                      borderTop: "1px solid #e0e0e0",
                      textAlign: "center"
                    }}>
                      <Typography variant="body2" sx={{ 
                        fontWeight: 700, 
                        color: "#2e7d32",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 0.5
                      }}>
                        <CheckCircleIcon sx={{ fontSize: 16 }} />
                        Perfect pose! 🎉
                      </Typography>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Fade>
          )}
        </Box>

        {/* Camera/Try-On Section */}
        <Box sx={{ flex: 1 }}>
          <Box sx={{ mb: 2, display: "flex", justifyContent: "flex-end" }}>
            <IconButton onClick={() => setShowSettings(!showSettings)} sx={{ bgcolor: "white", boxShadow: 2 }}>
              <TuneIcon />
            </IconButton>
          </Box>

          {showSettings && (
            <Paper elevation={3} sx={{ p: 3, mb: 2, borderRadius: 2 }}>
              <Typography variant="subtitle2" fontWeight={700}>🎚️ Adjust Fit</Typography>
              <Box sx={{ mt: 2 }}>
                <Typography variant="caption">Size: {garmentScale.toFixed(2)}x</Typography>
                <Slider value={garmentScale} onChange={(e, v) => setGarmentScale(v)} min={1.8} max={3.5} step={0.05} sx={{ color: THEME.primary }} />
              </Box>
              <Box sx={{ mt: 2 }}>
                <Typography variant="caption">Vertical: {garmentVerticalOffset}px</Typography>
                <Slider value={garmentVerticalOffset} onChange={(e, v) => setGarmentVerticalOffset(v)} min={-120} max={80} step={2} sx={{ color: THEME.primary }} />
              </Box>
              <Box sx={{ mt: 2 }}>
                <Typography variant="caption">Horizontal: {garmentHorizontalOffset}px</Typography>
                <Slider value={garmentHorizontalOffset} onChange={(e, v) => setGarmentHorizontalOffset(v)} min={-60} max={60} step={2} sx={{ color: THEME.primary }} />
              </Box>
              <Button fullWidth size="small" onClick={() => { setGarmentScale(2.6); setGarmentVerticalOffset(-110); setGarmentHorizontalOffset(0); }} sx={{ mt: 2 }}>Reset</Button>
            </Paper>
          )}

          <Card elevation={3} sx={{ borderRadius: 3 }}>
            {/* Header with enhanced status */}
            <Box sx={{ bgcolor: "white", p: 2, borderBottom: "1px solid #e0e0e0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <Typography variant="subtitle1" fontWeight={600}>
                {capturedImage ? "📸 Your Look" : cameraOn ? "👕 Try On" : "Ready"}
              </Typography>
              
              {/* Enhanced status chip */}
              {cameraOn && !capturedImage && (
                <Chip 
                  label={
                    poseDetected && shouldersVisible && isStandingStraight && distanceGood
                      ? "✓ Perfect Pose!" 
                      : poseDetected 
                      ? "Position yourself" 
                      : "Move into frame"
                  }
                  color={
                    poseDetected && shouldersVisible && isStandingStraight && distanceGood
                      ? "success" 
                      : poseDetected 
                      ? "warning" 
                      : "error"
                  }
                  size="small" 
                  sx={{ fontWeight: 600 }} 
                />
              )}
            </Box>

            {/* Camera View */}
            <Box sx={{ position: "relative", bgcolor: "#1a1a1a", aspectRatio: "4/3", display: "flex", alignItems: "center", justifyContent: "center" }}>
              {/* Start Screen */}
              {!cameraOn && !capturedImage && (
                <Box sx={{ textAlign: "center", color: "white", p: 4 }}>
                  <CameraAltIcon sx={{ fontSize: 64, mb: 2, opacity: 0.7 }} />
                  <Typography variant="h6">See How It Looks On You!</Typography>
                  <Typography variant="body2" sx={{ mb: 1, opacity: 0.8 }}>
                    Position your upper body in frame
                  </Typography>
                  <Typography variant="caption" sx={{ mb: 3, opacity: 0.6, display: "block" }}>
                    💡 Tip: Stand 3-4 feet from camera
                  </Typography>
                  <Button 
                    variant="contained" 
                    size="large" 
                    startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <CameraAltIcon />}
                    onClick={startCamera} 
                    disabled={loading} 
                    sx={{ bgcolor: THEME.primary, px: 4, py: 1.5, fontWeight: 600 }}
                  >
                    {loading ? "Starting..." : "Start"}
                  </Button>
                </Box>
              )}

              {/* Captured Image */}
              {capturedImage && (
                <img src={capturedImage} alt="Captured" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              )}

              {/* Live Camera */}
              <canvas 
                ref={canvasRef} 
                style={{ 
                  width: "100%", 
                  height: "100%", 
                  objectFit: "cover", 
                  display: cameraOn && !capturedImage ? "block" : "none" 
                }} 
              />
              <video ref={videoRef} autoPlay playsInline muted style={{ display: "none" }} />

              {/* NEW: On-Screen Guidance Overlay */}
              {guidance && cameraOn && !capturedImage && (
                <Fade in={true}>
                  <Box
                    sx={{
                      position: "absolute",
                      top: 16,
                      left: "50%",
                      transform: "translateX(-50%)",
                      bgcolor: guidance.color === "success" 
                        ? "rgba(46, 125, 50, 0.95)" 
                        : "rgba(237, 108, 2, 0.95)",
                      color: "white",
                      px: 3,
                      py: 1.5,
                      borderRadius: 3,
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
                      zIndex: 10
                    }}
                  >
                    {guidance.icon}
                    <Typography variant="body2" fontWeight={600}>
                      {guidance.text}
                    </Typography>
                  </Box>
                </Fade>
              )}

              {/* NEW: Corner Guides (when camera is on but pose not detected) */}
              {cameraOn && !capturedImage && !poseDetected && (
                <>
                  {/* Top-left corner guide */}
                  <Box sx={{
                    position: "absolute",
                    top: 20,
                    left: 20,
                    width: 40,
                    height: 40,
                    borderTop: "3px solid rgba(255, 255, 255, 0.5)",
                    borderLeft: "3px solid rgba(255, 255, 255, 0.5)",
                    zIndex: 5
                  }} />
                  
                  {/* Top-right corner guide */}
                  <Box sx={{
                    position: "absolute",
                    top: 20,
                    right: 20,
                    width: 40,
                    height: 40,
                    borderTop: "3px solid rgba(255, 255, 255, 0.5)",
                    borderRight: "3px solid rgba(255, 255, 255, 0.5)",
                    zIndex: 5
                  }} />
                  
                  {/* Bottom-left corner guide */}
                  <Box sx={{
                    position: "absolute",
                    bottom: 20,
                    left: 20,
                    width: 40,
                    height: 40,
                    borderBottom: "3px solid rgba(255, 255, 255, 0.5)",
                    borderLeft: "3px solid rgba(255, 255, 255, 0.5)",
                    zIndex: 5
                  }} />
                  
                  {/* Bottom-right corner guide */}
                  <Box sx={{
                    position: "absolute",
                    bottom: 20,
                    right: 20,
                    width: 40,
                    height: 40,
                    borderBottom: "3px solid rgba(255, 255, 255, 0.5)",
                    borderRight: "3px solid rgba(255, 255, 255, 0.5)",
                    zIndex: 5
                  }} />
                </>
              )}
            </Box>

            {/* Action Buttons */}
            <Box sx={{ p: 2, display: "flex", gap: 2, justifyContent: "center", bgcolor: "white" }}>
              {cameraOn && !capturedImage && (
                <Button 
                  variant="contained" 
                  size="large" 
                  onClick={captureImage} 
                  disabled={!poseDetected || !shouldersVisible || !isStandingStraight}
                  sx={{ 
                    bgcolor: THEME.primary, 
                    px: 4, 
                    fontWeight: 600,
                    "&:disabled": {
                      bgcolor: "#e0e0e0",
                      color: "#9e9e9e"
                    }
                  }}
                >
                  📸 Capture
                </Button>
              )}
              {capturedImage && (
                <>
                  <Button 
                    variant="outlined" 
                    size="large" 
                    startIcon={<RestartAltIcon />} 
                    onClick={() => { 
                      setCapturedImage(null); 
                      startCamera(); 
                    }}
                    sx={{ fontWeight: 600, px: 3 }}
                  >
                    Retake
                  </Button>
                  <Button 
                    variant="contained" 
                    size="large" 
                    startIcon={savingLook ? <CircularProgress size={20} color="inherit" /> : <FavoriteIcon />}
                    onClick={saveLook} 
                    disabled={savingLook}
                    sx={{ 
                      bgcolor: "#e91e63", 
                      px: 3, 
                      fontWeight: 600,
                      "&:hover": { bgcolor: "#c2185b" }
                    }}
                  >
                    {savingLook ? "Saving..." : "Save Look"}
                  </Button>
                </>
              )}
            </Box>
          </Card>
        </Box>
      </Box>

      {/* Recommendations Section */}
      <Box sx={{ maxWidth: 1200, mx: "auto", px: 3, mt: 4 }}>
        {currentProduct && (
          <RecommendationWidget
            type="similar"
            currentProduct={currentProduct}
            title="You May Also Like"
            count={4}
          />
        )}

        <RecommendationWidget
          type="history-based"
          title="Based on Your Recent Try-Ons"
          count={4}
          compact={true}
        />
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