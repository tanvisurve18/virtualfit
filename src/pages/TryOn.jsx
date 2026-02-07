import React, { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { 
  Box, Typography, IconButton, Button, Snackbar, Alert, 
  CircularProgress, Card, CardContent, Chip, Paper, Slider, Fade, CardMedia
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
  const ctxRef = useRef(null);
  const streamRef = useRef(null);
  const poseRef = useRef(null);
  const animationRef = useRef(null);
  const landmarksRef = useRef(null);
  const productImgRef = useRef(null);
  const isDrawingRef = useRef(false);
  const frameCountRef = useRef(0); // For frame skipping
  const lastPoseUpdateRef = useRef(0); // For throttling pose analysis

  const { state } = useLocation();
  const navigate = useNavigate();

  const [cameraOn, setCameraOn] = useState(false);
  const [poseDetected, setPoseDetected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [savingLook, setSavingLook] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });
  const [showSettings, setShowSettings] = useState(false);
  
  // FIXED: Changed default garment scale to 1.0 (more intuitive - higher = bigger)
  const [garmentScale, setGarmentScale] = useState(1.0);
  const [garmentVerticalOffset, setGarmentVerticalOffset] = useState(0);
  const [garmentHorizontalOffset, setGarmentHorizontalOffset] = useState(0);
  const [currentProduct, setCurrentProduct] = useState(null);

  // Pose guidance states
  const [shouldersVisible, setShouldersVisible] = useState(false);
  const [isStandingStraight, setIsStandingStraight] = useState(false);
  const [distanceGood, setDistanceGood] = useState(false);

  // Extract product data from state - handle multiple field name variations
  const productData = state ? {
    image: state.garment_image || state.image,
    name: state.product_name || state.name || state.title,
    price: state.product_price || state.price,
    link: state.product_url || state.link || state.buyUrl,
    productId: state.product_id || state.productId
  } : null;

  if (!state || !productData.image) {
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
    if (!productData.image) return;
    
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      productImgRef.current = img;
    };
    img.onerror = (e) => {
      console.error("Failed to load product image:", productData.image, e);
      productImgRef.current = img;
    };
    img.src = productData.image;
    
    // Set current product for recommendations
    setCurrentProduct({
      id: productData.productId,
      title: productData.name,
      price: productData.price,
      image: productData.image,
      url: productData.link
    });
  }, [productData]);

  useEffect(() => {
    const pose = new Pose({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
    });
    pose.setOptions({ 
      modelComplexity: 0, // Lowest complexity for best performance
      smoothLandmarks: true, 
      enableSegmentation: false,
      minDetectionConfidence: 0.3, // Further reduced for faster detection
      minTrackingConfidence: 0.2   // Further reduced for smoother tracking
    });
    pose.onResults((results) => {
      if (!isDrawingRef.current) return; // Don't process if camera is off
      
      landmarksRef.current = results.poseLandmarks;
      const detected = !!results.poseLandmarks;
      
      // Throttle pose quality analysis - only update every 100ms for better responsiveness
      const now = Date.now();
      if (now - lastPoseUpdateRef.current > 100) {
        lastPoseUpdateRef.current = now;
        setPoseDetected(detected);
        
        if (detected && results.poseLandmarks) {
          analyzePoseQuality(results.poseLandmarks);
        } else {
          setShouldersVisible(false);
          setIsStandingStraight(false);
          setDistanceGood(false);
        }
      }
    });
    poseRef.current = pose;
    return () => {
      if (poseRef.current) poseRef.current.close();
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      isDrawingRef.current = false;
      ctxRef.current = null; // Clear cached context
    };
  }, []);

  const analyzePoseQuality = (landmarks) => {
    const leftShoulder = landmarks[11];
    const rightShoulder = landmarks[12];
    
    // Lowered visibility threshold from 0.65 to 0.4 for better detection
    const shouldersVisibleCheck = 
      leftShoulder && rightShoulder && 
      leftShoulder.visibility > 0.4 && 
      rightShoulder.visibility > 0.4;
    setShouldersVisible(shouldersVisibleCheck);
    
    if (leftShoulder && rightShoulder) {
      const shoulderTilt = Math.abs(leftShoulder.y - rightShoulder.y);
      const straightCheck = shoulderTilt < 0.08;
      setIsStandingStraight(straightCheck);
      
      const shoulderWidth = Math.abs(leftShoulder.x - rightShoulder.x);
      const distanceCheck = shoulderWidth > 0.2 && shoulderWidth < 0.5;
      setDistanceGood(distanceCheck);
    }
  };

  const startCamera = async () => {
    try {
      setLoading(true);
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: "user", 
          width: { ideal: 640 },   // Reduced for better performance
          height: { ideal: 480 },  // Reduced for better performance
          frameRate: { ideal: 24 } // Further reduced to 24 FPS
        } 
      });
      
      console.log("Camera stream acquired:", stream);
      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) throw new Error("Video element not found");
      
      video.srcObject = stream;
      
      // Wait for video to be ready
      await new Promise((resolve, reject) => {
        const onLoadedMetadata = () => {
          console.log("Video metadata loaded:", video.videoWidth, "x", video.videoHeight);
          video.removeEventListener("loadedmetadata", onLoadedMetadata);
          resolve();
        };
        video.addEventListener("loadedmetadata", onLoadedMetadata);
        video.onerror = () => {
          video.removeEventListener("loadedmetadata", onLoadedMetadata);
          reject(new Error("Video loading failed"));
        };
        setTimeout(() => {
          video.removeEventListener("loadedmetadata", onLoadedMetadata);
          reject(new Error("Timeout waiting for video"));
        }, 10000);
      });
      
      await video.play();
      console.log("Video playback started");
      
      isDrawingRef.current = true;
      setCameraOn(true);
      setLoading(false);
      
      // Start the draw loop
      drawLoop();
    } catch (err) {
      console.error("Camera error:", err);
      setLoading(false);
      setSnackbar({ open: true, message: err.message || "Camera access denied", severity: "error" });
    }
  };

  const drawLoop = () => {
    if (!videoRef.current || !canvasRef.current || !isDrawingRef.current) {
      animationRef.current = requestAnimationFrame(drawLoop);
      return;
    }
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    // Get cached context or create new one
    let ctx = ctxRef.current;
    if (!ctx) {
      ctx = canvas.getContext("2d");
      ctxRef.current = ctx;
    }
    
    // Check if video has data
    if (video.readyState >= video.HAVE_CURRENT_DATA) {
      // Sync canvas size with video
      if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
      }
      
      // Frame skipping - send to pose detection every 2 frames for better responsiveness
      frameCountRef.current++;
      if (frameCountRef.current % 2 === 0 && poseRef.current) {
        // Don't await - just send the frame
        poseRef.current.send({ image: video });
      }
      
      // Clear canvas and draw video with horizontal flip (mirror for selfie view)
      ctx.save();
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      ctx.restore();

      // Draw garment overlay on top if landmarks and image exist
      if (productImgRef.current && productImgRef.current.width && productImgRef.current.height) {
        if (landmarksRef.current) {
          drawGarmentOverlay(ctx, canvas);
        }
      } else if (productImgRef.current) {
        console.log("Image not ready yet:", productImgRef.current.width, productImgRef.current.height);
      }
    }
    
    // Continue animation loop
    animationRef.current = requestAnimationFrame(drawLoop);
  };

  const drawGarmentOverlay = (ctx, canvas) => {
    const lm = landmarksRef.current;
    if (!lm || lm.length === 0) {
      console.log("[CLOTH] No landmarks");
      return;
    }
    
    const img = productImgRef.current;
    if (!img) {
      console.log("[CLOTH] No image reference");
      return;
    }
    
    if (!img.width || !img.height) {
      console.log("[CLOTH] Image not loaded:", img.width, "x", img.height);
      return;
    }
    
    const leftShoulder = lm[11];
    const rightShoulder = lm[12];
    
    if (!leftShoulder || !rightShoulder) {
      console.log("[CLOTH] No shoulders in landmarks");
      return;
    }
    
    console.log("[CLOTH] Drawing with visibility:", leftShoulder.visibility, rightShoulder.visibility);
    
    // Lowered visibility threshold from 0.5 to 0.3 for better detection
    if (leftShoulder.visibility < 0.3 || rightShoulder.visibility < 0.3) {
      console.log("[CLOTH] Shoulders not visible enough");
      return;
    }
    
    console.log("[CLOTH] Rendering now");
    const nose = lm[0];
    const leftElbow = lm[13], rightElbow = lm[14];
    const leftWrist = lm[15], rightWrist = lm[16];
    const leftHip = lm[23], rightHip = lm[24];
    
    // Mirror X coordinates for selfie view
    const mirrorX = (x) => (1 - x) * canvas.width;
    const lShoulderX = mirrorX(leftShoulder.x);
    const rShoulderX = mirrorX(rightShoulder.x);
    const lShoulderY = leftShoulder.y * canvas.height;
    const rShoulderY = rightShoulder.y * canvas.height;
    const shoulderCenterX = (lShoulderX + rShoulderX) / 2;
    const shoulderCenterY = (lShoulderY + rShoulderY) / 2;
    
    // Calculate shoulder width
    const shoulderWidth = Math.abs(lShoulderX - rShoulderX);
    
    // Calculate body width
    let bodyWidth = shoulderWidth;
    
    if (leftElbow && rightElbow && leftElbow.visibility > 0.5 && rightElbow.visibility > 0.5) {
      const lElbowX = mirrorX(leftElbow.x);
      const rElbowX = mirrorX(rightElbow.x);
      const elbowSpan = Math.abs(lElbowX - rElbowX);
      bodyWidth = Math.max(bodyWidth, elbowSpan * 0.8);
    }
    
    if (leftWrist && rightWrist && leftWrist.visibility > 0.5 && rightWrist.visibility > 0.5) {
      const lWristX = mirrorX(leftWrist.x);
      const rWristX = mirrorX(rightWrist.x);
      const lWristY = leftWrist.y * canvas.height;
      const rWristY = rightWrist.y * canvas.height;
      
      if (leftElbow && rightElbow && lWristY > leftElbow.y * canvas.height && rWristY > rightElbow.y * canvas.height) {
        const wristSpan = Math.abs(lWristX - rWristX);
        bodyWidth = Math.max(bodyWidth, wristSpan * 0.75);
      }
    }
    
    // Calculate neck position
    let neckY = shoulderCenterY;
    if (nose && nose.visibility > 0.5) {
      const noseY = nose.y * canvas.height;
      neckY = noseY + (shoulderCenterY - noseY) * 0.65;
    } else {
      neckY = shoulderCenterY - (shoulderWidth * 0.25);
    }
    
    // Calculate torso length
    let torsoLength = bodyWidth * 1.6;
    if (leftHip && rightHip && leftHip.visibility > 0.5 && rightHip.visibility > 0.5) {
      const hipY = ((leftHip.y + rightHip.y) / 2) * canvas.height;
      torsoLength = Math.abs(hipY - neckY) * 1.15;
    } else {
      const neckToShoulder = Math.abs(shoulderCenterY - neckY);
      torsoLength = neckToShoulder * 4.2;
    }
    
    // Dynamic depth scaling
    const shoulderRatio = shoulderWidth / canvas.width;
    let sizeAdjustment = 1.0;
    if (shoulderRatio < 0.25) {
      sizeAdjustment = 1.0 + (0.25 - shoulderRatio) * 2;
    } else if (shoulderRatio > 0.35) {
      sizeAdjustment = 1.0 - (shoulderRatio - 0.35) * 1.5;
    }
    sizeAdjustment = Math.max(0.6, Math.min(1.4, sizeAdjustment));
    
    // Calculate final dimensions
    const baseWidth = bodyWidth * 2.6 * garmentScale * sizeAdjustment;
    const imgAspectRatio = productImgRef.current.width / productImgRef.current.height;
    const heightFromAspect = baseWidth / imgAspectRatio;
    const heightFromTorso = torsoLength * 1.3;
    const baseHeight = Math.max(heightFromAspect, heightFromTorso);
    
    // Position
    const garmentX = shoulderCenterX + garmentHorizontalOffset;
    const garmentY = neckY + garmentVerticalOffset;
    
    console.log("[CLOTH] Drawing params:", {
      canvasSize: canvas.width + "x" + canvas.height,
      imgSize: img.width + "x" + img.height,
      baseWidth: baseWidth.toFixed(0),
      baseHeight: baseHeight.toFixed(0),
      garmentX: garmentX.toFixed(0),
      garmentY: garmentY.toFixed(0),
      drawX: (garmentX - baseWidth / 2).toFixed(0)
    });
    
    // Draw with transparency
    ctx.globalAlpha = 0.92;
    ctx.drawImage(
      productImgRef.current,
      garmentX - baseWidth / 2,
      garmentY,
      baseWidth,
      baseHeight
    );
    ctx.globalAlpha = 1.0;
    console.log("[CLOTH] Draw complete");
  };

  const captureImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    try {
      const image = canvas.toDataURL("image/png");
      setCapturedImage(image);
    } catch (err) {
      console.error("Failed to capture image:", err);
      setSnackbar({ open: true, message: "Failed to capture image", severity: "error" });
      return;
    }
    
    // Stop camera and drawing loop
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
    }
    setCameraOn(false);
    isDrawingRef.current = false;
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
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
          product_name: productData.name,
          product_image: productData.image,
          product_price: productData.price,
          product_url: productData.link,
          tryon_image: capturedImage
        })
        .select();

      if (insertError) throw insertError;
      
      setSnackbar({ open: true, message: "Look saved to your closet! 💖", severity: "success" });
    } catch (error) {
      console.error("Save error:", error);
      setSnackbar({ open: true, message: "Failed to save look", severity: "error" });
    } finally {
      setSavingLook(false);
    }
  };

  // Determine guidance message based on pose quality
  const guidance = (() => {
    if (!cameraOn || capturedImage) return null;
    
    if (!poseDetected) {
      return {
        text: "Move into frame",
        icon: <VisibilityIcon sx={{ fontSize: 20 }} />,
        color: "error"
      };
    }
    
    if (!shouldersVisible) {
      return {
        text: "Show both shoulders",
        icon: <WarningIcon sx={{ fontSize: 20 }} />,
        color: "warning"
      };
    }
    
    if (!isStandingStraight) {
      return {
        text: "Stand straight",
        icon: <StraightenIcon sx={{ fontSize: 20 }} />,
        color: "warning"
      };
    }
    
    if (!distanceGood) {
      return {
        text: "Adjust distance (3-4 feet)",
        icon: <WarningIcon sx={{ fontSize: 20 }} />,
        color: "warning"
      };
    }
    
    return {
      text: "Perfect! Ready to capture",
      icon: <CheckCircleIcon sx={{ fontSize: 20 }} />,
      color: "success"
    };
  })();

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: THEME.pageBg, pb: 6 }}>
      {/* Header */}
      <Box 
        sx={{ 
          background: THEME.gradient, 
          color: "white", 
          py: 3, 
          px: 3,
          display: "flex", 
          alignItems: "center", 
          justifyContent: "space-between",
          boxShadow: "0 4px 12px rgba(0,0,0,0.15)"
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <IconButton onClick={() => navigate(-1)} sx={{ color: "white" }}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h5" fontWeight={700}>Virtual Try-On</Typography>
        </Box>
      </Box>

      <Box sx={{ maxWidth: 1200, mx: "auto", px: 3, mt: 4 }}>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 400px" }, gap: 3 }}>
          {/* Product Info Card */}
          <Box>
            <Card elevation={3} sx={{ mb: 3, borderRadius: 3 }}>
              <Box sx={{ p: 3, display: "flex", gap: 3, alignItems: "center" }}>
                <Box 
                  sx={{ 
                    width: 120, 
                    height: 120, 
                    borderRadius: 2, 
                    overflow: "hidden",
                    bgcolor: "#f5f5f5",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                  }}
                >
                  <CardMedia 
                    component="img" 
                    image={productData.image} 
                    alt={productData.name}
                    sx={{ width: "100%", height: "100%", objectFit: "contain" }}
                  />
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Chip label="Try On" size="small" sx={{ mb: 1, bgcolor: THEME.primary, color: "white", fontWeight: 600 }} icon={<ShoppingBagIcon sx={{ color: "white !important" }} />} />
                  <Typography variant="h6" fontWeight={600} gutterBottom>{productData.name}</Typography>
                  <Typography variant="h5" fontWeight={700} color={THEME.primary} gutterBottom>₹{productData.price}</Typography>
                  {productData.link && (
                    <Button 
                      variant="outlined" 
                      size="small" 
                      href={productData.link} 
                      target="_blank"
                      sx={{ mt: 1, fontWeight: 600 }}
                    >
                      Buy on H&M
                    </Button>
                  )}
                </Box>
              </Box>
            </Card>

            {/* Adjustment Settings */}
            <Button 
              variant="outlined" 
              size="small" 
              startIcon={<TuneIcon />}
              onClick={() => setShowSettings(!showSettings)}
              sx={{ mb: 2, fontWeight: 600 }}
            >
              {showSettings ? "Hide" : "Show"} Fit Adjustments
            </Button>

            {showSettings && (
              <Paper elevation={2} sx={{ p: 3, mb: 3, borderRadius: 2 }}>
                <Typography variant="subtitle2" fontWeight={600} gutterBottom>Adjust Garment Fit</Typography>
                <Box sx={{ mt: 2 }}>
                  <Typography variant="caption">Size: {garmentScale.toFixed(1)}x</Typography>
                  <Slider 
                    value={garmentScale} 
                    onChange={(e, v) => setGarmentScale(v)} 
                    min={0.5} 
                    max={1.5} 
                    step={0.05} 
                    sx={{ color: THEME.primary }} 
                  />
                </Box>
                <Box sx={{ mt: 2 }}>
                  <Typography variant="caption">Vertical Position: {garmentVerticalOffset}px</Typography>
                  <Slider value={garmentVerticalOffset} onChange={(e, v) => setGarmentVerticalOffset(v)} min={-50} max={50} step={2} sx={{ color: THEME.primary }} />
                </Box>
                <Box sx={{ mt: 2 }}>
                  <Typography variant="caption">Horizontal Position: {garmentHorizontalOffset}px</Typography>
                  <Slider value={garmentHorizontalOffset} onChange={(e, v) => setGarmentHorizontalOffset(v)} min={-60} max={60} step={2} sx={{ color: THEME.primary }} />
                </Box>
                <Button fullWidth size="small" onClick={() => { setGarmentScale(1.0); setGarmentVerticalOffset(0); setGarmentHorizontalOffset(0); }} sx={{ mt: 2 }}>Reset to Default</Button>
              </Paper>
            )}
          </Box>

          {/* Camera View */}
          <Box>
            <Card elevation={3} sx={{ borderRadius: 3 }}>
              <Box sx={{ bgcolor: "white", p: 2, borderBottom: "1px solid #e0e0e0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <Typography variant="subtitle1" fontWeight={600}>
                  {capturedImage ? "📸 Your Look" : cameraOn ? "👕 Try On" : "Ready"}
                </Typography>
                
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

              <Box sx={{ position: "relative", bgcolor: "#1a1a1a", aspectRatio: "4/3", display: "flex", alignItems: "center", justifyContent: "center" }}>
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

                {capturedImage && (
                  <img src={capturedImage} alt="Captured" style={{ 
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%", 
                    height: "100%", 
                    objectFit: "cover" 
                  }} />
                )}

                <canvas 
                  ref={canvasRef} 
                  style={{ 
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%", 
                    height: "100%",
                    display: cameraOn && !capturedImage ? "block" : "none" 
                  }} 
                />
                <video ref={videoRef} autoPlay playsInline muted style={{ display: "none" }} />

                {guidance && cameraOn && !capturedImage && (
                  <Fade in={true}>
                    <Box
                      sx={{
                        position: "absolute",
                        bottom: 16,
                        right: 16,
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
              </Box>

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
      </Box>

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
