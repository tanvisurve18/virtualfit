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
  const frameCountRef = useRef(0);
  const lastPoseUpdateRef = useRef(0);
  const imageLoadedRef = useRef(false);

  const { state } = useLocation();
  const navigate = useNavigate();

  const [cameraOn, setCameraOn] = useState(false);
  const [poseDetected, setPoseDetected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [savingLook, setSavingLook] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });
  const [showSettings, setShowSettings] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  
  const [garmentScale, setGarmentScale] = useState(1.0);
  const [garmentVerticalOffset, setGarmentVerticalOffset] = useState(0);
  const [garmentHorizontalOffset, setGarmentHorizontalOffset] = useState(0);
  const [currentProduct, setCurrentProduct] = useState(null);

  const [shouldersVisible, setShouldersVisible] = useState(false);
  const [isStandingStraight, setIsStandingStraight] = useState(false);
  const [distanceGood, setDistanceGood] = useState(false);

  // Extract product data from state
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

  // FIXED: Improved image loading with better CORS handling and retry logic
  useEffect(() => {
    if (!productData.image) {
      console.error("[OVERLAY] ❌ No product image URL provided");
      setImageLoading(false);
      return;
    }
    
    console.log("[OVERLAY] 📥 Loading product image:", productData.image);
    setImageLoading(true);
    imageLoadedRef.current = false;
    
    const img = new Image();
    
    // Try with crossOrigin first
    img.crossOrigin = "anonymous";
    
    img.onload = () => {
      console.log("[OVERLAY] ✅ Product image loaded successfully:", img.width, "x", img.height);
      productImgRef.current = img;
      imageLoadedRef.current = true;
      setImageLoading(false);
    };
    
    img.onerror = (e) => {
      console.warn("[OVERLAY] ⚠️ Failed to load with CORS, retrying without...", e);
      
      // Retry without crossOrigin for images that don't support CORS
      const img2 = new Image();
      
      img2.onload = () => {
        console.log("[OVERLAY] ✅ Product image loaded (no CORS):", img2.width, "x", img2.height);
        productImgRef.current = img2;
        imageLoadedRef.current = true;
        setImageLoading(false);
      };
      
      img2.onerror = (e2) => {
        console.error("[OVERLAY] ❌ Failed to load product image completely:", e2);
        setImageLoading(false);
        setSnackbar({ 
          open: true, 
          message: "Failed to load product image. Try a different product.", 
          severity: "error" 
        });
      };
      
      img2.src = productData.image;
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
    
    return () => {
      if (productImgRef.current) {
        productImgRef.current.src = '';
        productImgRef.current = null;
      }
      imageLoadedRef.current = false;
    };
  }, [productData]);

  useEffect(() => {
    const pose = new Pose({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
    });
    pose.setOptions({ 
      modelComplexity: 0,
      smoothLandmarks: true, 
      enableSegmentation: false,
      minDetectionConfidence: 0.3,
      minTrackingConfidence: 0.2
    });
    pose.onResults((results) => {
      if (!isDrawingRef.current) return;
      
      landmarksRef.current = results.poseLandmarks;
      const detected = !!results.poseLandmarks;
      
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
      ctxRef.current = null;
    };
  }, []);

  const analyzePoseQuality = (landmarks) => {
    const leftShoulder = landmarks[11];
    const rightShoulder = landmarks[12];
    
    // FIXED: Lowered visibility threshold to 0.3 for better detection
    const shouldersVisibleCheck = 
      leftShoulder && rightShoulder && 
      leftShoulder.visibility > 0.3 && 
      rightShoulder.visibility > 0.3;
    setShouldersVisible(shouldersVisibleCheck);
    
    if (leftShoulder && rightShoulder) {
      const shoulderTilt = Math.abs(leftShoulder.y - rightShoulder.y);
      const straightCheck = shoulderTilt < 0.08;
      setIsStandingStraight(straightCheck);
      
      const shoulderWidth = Math.abs(leftShoulder.x - rightShoulder.x);
      const distanceCheck = shoulderWidth > 0.15 && shoulderWidth < 0.6;
      setDistanceGood(distanceCheck);
    }
  };

  const startCamera = async () => {
    try {
      setLoading(true);
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: "user", 
          width: { ideal: 640 },
          height: { ideal: 480 },
          frameRate: { ideal: 24 }
        } 
      });
      
      console.log("[CAMERA] ✅ Camera stream acquired");
      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) throw new Error("Video element not found");
      
      video.srcObject = stream;
      
      await new Promise((resolve, reject) => {
        const onLoadedMetadata = () => {
          console.log("[CAMERA] ✅ Video metadata loaded:", video.videoWidth, "x", video.videoHeight);
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
      console.log("[CAMERA] ✅ Video playback started");
      
      isDrawingRef.current = true;
      setCameraOn(true);
      setLoading(false);
      
      drawLoop();
    } catch (err) {
      console.error("[CAMERA] ❌ Camera error:", err);
      setLoading(false);
      setSnackbar({ open: true, message: err.message || "Camera access denied", severity: "error" });
    }
  };

  const drawLoop = () => {
    if (!videoRef.current || !canvasRef.current || !isDrawingRef.current) {
      if (isDrawingRef.current) {
        animationRef.current = requestAnimationFrame(drawLoop);
      }
      return;
    }
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    // Get cached context or create new one
    let ctx = ctxRef.current;
    if (!ctx) {
      ctx = canvas.getContext("2d", { willReadFrequently: false });
      ctxRef.current = ctx;
    }
    
    // Check if video has data
    if (video.readyState >= video.HAVE_CURRENT_DATA) {
      // Sync canvas size with video
      if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        console.log("[CANVAS] 📐 Canvas resized to:", canvas.width, "x", canvas.height);
      }
      
      // Frame skipping - send to pose detection every 2 frames
      frameCountRef.current++;
      if (frameCountRef.current % 2 === 0 && poseRef.current) {
        poseRef.current.send({ image: video }).catch(err => {
          console.warn("[POSE] ⚠️ Pose detection error:", err);
        });
      }
      
      // Clear canvas and draw video with horizontal flip (mirror for selfie view)
      ctx.save();
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      ctx.restore();

      // FIXED: Draw garment overlay on top if image is loaded and landmarks exist
      if (imageLoadedRef.current && productImgRef.current) {
        if (landmarksRef.current) {
          drawGarmentOverlay(ctx, canvas);
        }
      }
    }
    
    animationRef.current = requestAnimationFrame(drawLoop);
  };

  // FIXED: Improved garment overlay rendering
  const drawGarmentOverlay = (ctx, canvas) => {
    const lm = landmarksRef.current;
    if (!lm || lm.length === 0) return;
    
    const img = productImgRef.current;
    if (!img || !img.complete || !img.width || !img.height) {
      return;
    }
    
    const leftShoulder = lm[11];
    const rightShoulder = lm[12];
    
    if (!leftShoulder || !rightShoulder) return;
    
    // FIXED: Lowered threshold to 0.2 for better detection
    if (leftShoulder.visibility < 0.2 || rightShoulder.visibility < 0.2) {
      return;
    }
    
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
    
    // Calculate body width considering elbows and wrists
    let bodyWidth = shoulderWidth;
    
    if (leftElbow && rightElbow && leftElbow.visibility > 0.2 && rightElbow.visibility > 0.2) {
      const lElbowX = mirrorX(leftElbow.x);
      const rElbowX = mirrorX(rightElbow.x);
      const elbowSpan = Math.abs(lElbowX - rElbowX);
      bodyWidth = Math.max(bodyWidth, elbowSpan * 0.8);
    }
    
    if (leftWrist && rightWrist && leftWrist.visibility > 0.2 && rightWrist.visibility > 0.2) {
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
    if (nose && nose.visibility > 0.2) {
      const noseY = nose.y * canvas.height;
      neckY = noseY + (shoulderCenterY - noseY) * 0.65;
    } else {
      neckY = shoulderCenterY - (shoulderWidth * 0.25);
    }
    
    // Calculate torso length
    let torsoLength = bodyWidth * 1.6;
    if (leftHip && rightHip && leftHip.visibility > 0.2 && rightHip.visibility > 0.2) {
      const hipY = ((leftHip.y + rightHip.y) / 2) * canvas.height;
      torsoLength = Math.abs(hipY - neckY) * 1.15;
    } else {
      const neckToShoulder = Math.abs(shoulderCenterY - neckY);
      torsoLength = neckToShoulder * 4.2;
    }
    
    // FIXED: Improved depth scaling - adjusts garment size based on distance
    const shoulderRatio = shoulderWidth / canvas.width;
    let sizeAdjustment = 1.0;
    
    // When user is far (small shoulder ratio), make garment bigger
    if (shoulderRatio < 0.25) {
      sizeAdjustment = 1.0 + (0.25 - shoulderRatio) * 2.5; // Increased multiplier
    } 
    // When user is close (large shoulder ratio), make garment smaller
    else if (shoulderRatio > 0.35) {
      sizeAdjustment = 1.0 - (shoulderRatio - 0.35) * 1.8; // Increased multiplier
    }
    
    // Clamp to reasonable range
    sizeAdjustment = Math.max(0.5, Math.min(1.8, sizeAdjustment));
    
    // Calculate final dimensions
    const baseWidth = bodyWidth * 2.6 * garmentScale * sizeAdjustment;
    const imgAspectRatio = img.width / img.height;
    const heightFromAspect = baseWidth / imgAspectRatio;
    const heightFromTorso = torsoLength * 1.3;
    const baseHeight = Math.max(heightFromAspect, heightFromTorso);
    
    // Position with offsets
    const garmentX = shoulderCenterX + garmentHorizontalOffset;
    const garmentY = neckY + garmentVerticalOffset;
    
    // FIXED: Draw with better error handling and alpha blending
    ctx.save();
    ctx.globalAlpha = 0.92;
    
    try {
      ctx.drawImage(
        img,
        garmentX - baseWidth / 2,
        garmentY,
        baseWidth,
        baseHeight
      );
      
      // Debug: Draw occasionally to confirm rendering
      if (frameCountRef.current % 60 === 0) {
        console.log("[CLOTH] ✅ Rendering overlay at:", 
          Math.round(garmentX - baseWidth / 2), 
          Math.round(garmentY), 
          Math.round(baseWidth), 
          Math.round(baseHeight)
        );
      }
    } catch (e) {
      console.error("[CLOTH] ❌ Draw error:", e);
    }
    
    ctx.restore();
  };

  const captureImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    try {
      const image = canvas.toDataURL("image/png");
      setCapturedImage(image);
      
      // Stop camera and drawing loop
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
      setCameraOn(false);
      isDrawingRef.current = false;
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    } catch (err) {
      console.error("[CAPTURE] ❌ Failed to capture image:", err);
      setSnackbar({ open: true, message: "Failed to capture image", severity: "error" });
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

      const base64Data = capturedImage.split(',')[1];
      const fileName = `look_${Date.now()}.png`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('looks')
        .upload(`${user.id}/${fileName}`, Buffer.from(base64Data, 'base64'), {
          contentType: 'image/png'
        });

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from('looks')
        .getPublicUrl(`${user.id}/${fileName}`);

      const { error: dbError } = await supabase
        .from('saved_looks')
        .insert({
          user_id: user.id,
          image_url: publicUrlData.publicUrl,
          product_id: productData.productId,
          product_name: productData.name,
          product_image: productData.image,
          product_price: productData.price,
          product_url: productData.link
        });

      if (dbError) throw dbError;

      setSnackbar({ open: true, message: "Look saved successfully! 💖", severity: "success" });
    } catch (err) {
      console.error("Save error:", err);
      setSnackbar({ open: true, message: "Failed to save look", severity: "error" });
    } finally {
      setSavingLook(false);
    }
  };

  const guidance = React.useMemo(() => {
    if (!cameraOn || capturedImage || !poseDetected) return null;
    
    if (shouldersVisible && isStandingStraight && distanceGood) {
      return {
        text: "Perfect! You're all set 🎯",
        color: "success",
        icon: <CheckCircleIcon fontSize="small" />
      };
    }
    
    if (!shouldersVisible) {
      return {
        text: "Show both shoulders in frame",
        color: "warning",
        icon: <VisibilityIcon fontSize="small" />
      };
    }
    
    if (!isStandingStraight) {
      return {
        text: "Stand straight with level shoulders",
        color: "warning",
        icon: <WarningIcon fontSize="small" />
      };
    }
    
    if (!distanceGood) {
      return {
        text: "Move closer or farther from camera",
        color: "warning",
        icon: <StraightenIcon fontSize="small" />
      };
    }
    
    return null;
  }, [cameraOn, capturedImage, poseDetected, shouldersVisible, isStandingStraight, distanceGood]);

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: THEME.pageBg, pb: 6 }}>
      {/* Header */}
      <Box sx={{ 
        background: THEME.gradient, 
        color: "white", 
        p: 2, 
        display: "flex", 
        alignItems: "center", 
        justifyContent: "space-between",
        boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
      }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <IconButton onClick={() => navigate("/dashboard")} sx={{ color: "white" }}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h6" fontWeight={700}>Virtual Try-On</Typography>
        </Box>
        <IconButton onClick={() => setShowSettings(!showSettings)} sx={{ color: "white" }}>
          <TuneIcon />
        </IconButton>
      </Box>

      <Box sx={{ maxWidth: 1200, mx: "auto", px: 3, mt: 3 }}>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "320px 1fr" }, gap: 3 }}>
          
          {/* Product Info Sidebar */}
          <Box>
            <Card elevation={2} sx={{ borderRadius: 3, overflow: "hidden" }}>
              <CardMedia
                component="img"
                image={productData.image}
                alt={productData.name}
                sx={{ height: 300, objectFit: "cover", bgcolor: "#f5f5f5" }}
                onError={(e) => {
                  console.error("[PRODUCT_IMAGE] ❌ Failed to load product card image");
                  e.target.style.display = 'none';
                }}
              />
              <CardContent>
                <Typography variant="h6" fontWeight={700} gutterBottom>
                  {productData.name}
                </Typography>
                <Typography variant="h5" fontWeight={800} color="primary" gutterBottom>
                  {productData.price}
                </Typography>
                <Button 
                  variant="contained" 
                  fullWidth 
                  startIcon={<ShoppingBagIcon />}
                  href={productData.link}
                  target="_blank"
                  sx={{ 
                    mt: 2, 
                    bgcolor: THEME.primary, 
                    fontWeight: 600,
                    "&:hover": { bgcolor: "#5B4CD6" }
                  }}
                >
                  Buy on H&M
                </Button>
              </CardContent>
            </Card>

            {/* Adjustment Controls */}
            {showSettings && (
              <Fade in={showSettings}>
                <Card elevation={2} sx={{ borderRadius: 3, mt: 2, p: 2 }}>
                  <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                    Garment Adjustments
                  </Typography>
                  
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="caption" gutterBottom>
                      Size: {garmentScale.toFixed(1)}x
                    </Typography>
                    <Slider
                      value={garmentScale}
                      onChange={(e, v) => setGarmentScale(v)}
                      min={0.5}
                      max={1.5}
                      step={0.1}
                      marks
                      size="small"
                    />
                  </Box>

                  <Box sx={{ mt: 2 }}>
                    <Typography variant="caption" gutterBottom>
                      Vertical Position: {garmentVerticalOffset}px
                    </Typography>
                    <Slider
                      value={garmentVerticalOffset}
                      onChange={(e, v) => setGarmentVerticalOffset(v)}
                      min={-100}
                      max={100}
                      step={5}
                      size="small"
                    />
                  </Box>

                  <Box sx={{ mt: 2 }}>
                    <Typography variant="caption" gutterBottom>
                      Horizontal Position: {garmentHorizontalOffset}px
                    </Typography>
                    <Slider
                      value={garmentHorizontalOffset}
                      onChange={(e, v) => setGarmentHorizontalOffset(v)}
                      min={-100}
                      max={100}
                      step={5}
                      size="small"
                    />
                  </Box>
                </Card>
              </Fade>
            )}

            {/* Image Loading Status */}
            {imageLoading && (
              <Card elevation={2} sx={{ borderRadius: 3, mt: 2, p: 2 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                  <CircularProgress size={20} />
                  <Typography variant="caption">Loading product image...</Typography>
                </Box>
              </Card>
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
                      disabled={loading || imageLoading} 
                      sx={{ bgcolor: THEME.primary, px: 4, py: 1.5, fontWeight: 600 }}
                    >
                      {loading ? "Starting..." : imageLoading ? "Loading Image..." : "Start"}
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