import React, { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { 
  Box, Typography, IconButton, Button, Snackbar, Alert, 
  CircularProgress, Card, CardContent, Chip, Paper, Slider
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CameraAltIcon from "@mui/icons-material/CameraAlt";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import FavoriteIcon from "@mui/icons-material/Favorite";
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
  const [savingLook, setSavingLook] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });
  const [showSettings, setShowSettings] = useState(false);
  const [garmentScale, setGarmentScale] = useState(2.6);
  const [garmentVerticalOffset, setGarmentVerticalOffset] = useState(-110);
  const [garmentHorizontalOffset, setGarmentHorizontalOffset] = useState(0);

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
  }, [state.image]);

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
      setPoseDetected(!!results.poseLandmarks);
    });
    poseRef.current = pose;
    return () => {
      if (poseRef.current) poseRef.current.close();
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      isDrawingRef.current = false;
    };
  }, []);

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
          
          // Enhanced body proportion for realistic fit
          let bodyProportionFactor = 1.05;
          if (leftHip && rightHip && leftHip.visibility > 0.5 && rightHip.visibility > 0.5) {
            const lHipX = mirrorX(leftHip.x);
            const rHipX = mirrorX(rightHip.x);
            const hipWidth = Math.abs(lHipX - rHipX);
            const shoulderWidth = Math.abs(lShoulderX - rShoulderX);
            const proportionRatio = hipWidth / shoulderWidth;
            
            if (proportionRatio > 0.95) {
              bodyProportionFactor = 1.15 + (proportionRatio - 0.95) * 0.5;
            } else if (proportionRatio > 0.85) {
              bodyProportionFactor = 1.0 + (proportionRatio - 0.85) * 1.5;
            } else {
              bodyProportionFactor = 0.95 + (proportionRatio * 0.6);
            }
          }
          
          // Calculate torso length for height adjustment
          let torsoLengthFactor = 1.0;
          if (leftHip && rightHip) {
            const lHipY = leftHip.y * canvas.height;
            const rHipY = rightHip.y * canvas.height;
            const hipCenterY = (lHipY + rHipY) / 2;
            const torsoLength = hipCenterY - shoulderCenterY;
            const expectedTorso = canvas.height * 0.25;
            torsoLengthFactor = torsoLength / expectedTorso;
          }
          
          // SMART NECKLINE CALCULATION
          const distanceToShoulder = shoulderCenterY - noseY;
          const neckY = noseY + (distanceToShoulder * 0.55);
          
          // ADAPTIVE GARMENT SIZE - applies depth factor for distance adjustment
          const adaptiveScale = garmentScale * bodyProportionFactor * depthFactor;
          const garmentWidth = bodyWidth * adaptiveScale;
          const garmentHeight = garmentWidth * (productImgRef.current.height / productImgRef.current.width);
          
          // Adaptive height based on torso length
          const finalGarmentHeight = garmentHeight * Math.min(torsoLengthFactor, 1.2);
          
          // Position
          const garmentX = shoulderCenterX - garmentWidth / 2 + garmentHorizontalOffset;
          const garmentY = neckY - (finalGarmentHeight * 0.02) + garmentVerticalOffset;
          
          // Rotation
          const shoulderAngle = Math.atan2(rShoulderY - lShoulderY, rShoulderX - lShoulderX);
          
          ctx.save();
          ctx.translate(shoulderCenterX, shoulderCenterY);
          ctx.rotate(shoulderAngle * 0.35);
          ctx.translate(-shoulderCenterX, -shoulderCenterY);
          
          // Perspective
          const perspectiveScale = 1 + (shoulderCenterY / canvas.height) * 0.1;
          const finalWidth = garmentWidth * perspectiveScale;
          const finalHeight = finalGarmentHeight * perspectiveScale;
          
          // RENDER GARMENT WITH FULL OPACITY - REALISTIC LOOK
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
          ctx.shadowBlur = 25;
          ctx.shadowOffsetY = 10;
          ctx.globalAlpha = 1.0; // Completely opaque
          ctx.drawImage(productImgRef.current, garmentX, garmentY, finalWidth, finalHeight);
          
          // REALISTIC FABRIC SHADING - minimal overlay for natural depth
          ctx.shadowColor = 'transparent';
          ctx.shadowBlur = 0;
          ctx.globalCompositeOperation = 'soft-light';
          ctx.globalAlpha = 0.05; // Very minimal shading
          const gradient = ctx.createLinearGradient(shoulderCenterX, garmentY, shoulderCenterX, garmentY + finalHeight);
          gradient.addColorStop(0, 'rgba(255, 255, 255, 0.15)');
          gradient.addColorStop(0.5, 'rgba(0, 0, 0, 0)');
          gradient.addColorStop(1, 'rgba(0, 0, 0, 0.2)');
          ctx.fillStyle = gradient;
          ctx.fillRect(garmentX, garmentY, finalWidth, finalHeight);
          ctx.restore();
        }
      }
    }
    animationRef.current = requestAnimationFrame(drawLoop);
  };

  const captureImage = async () => {
    if (!canvasRef.current) return;
    const dataUrl = canvasRef.current.toDataURL("image/png");
    setCapturedImage(dataUrl);
    setCameraOn(false);
    isDrawingRef.current = false;
    if (streamRef.current) streamRef.current.getTracks().forEach(track => track.stop());
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    await saveToHistory(dataUrl);
  };

  const saveToHistory = async (imageData) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const fileName = `tryon_${Date.now()}.png`;
      const blob = await fetch(imageData).then(r => r.blob());
      const { error: uploadError } = await supabase.storage
        .from("user-tryon-history").upload(`${user.id}/${fileName}`, blob);
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from("user-tryon-history")
        .getPublicUrl(`${user.id}/${fileName}`);
      await supabase.from("tryon_history").insert({
        user_id: user.id, 
        product_id: state.id, 
        product_name: state.name,
        product_image: state.image, 
        image_data: imageData,
        tryon_image: urlData.publicUrl, 
        product_price: state.price,
        is_saved: false
      });
      setSnackbar({ open: true, message: "✓ Saved to Try-On History!", severity: "success" });
    } catch (err) {
      console.error("Save to history error:", err);
    }
  };

  const saveLook = async () => {
    setSavingLook(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      
      // If user has captured image, save it with is_saved=true
      if (capturedImage) {
        // First save to history
        const canvas = canvasRef.current;
        const imageData = canvas.toDataURL("image/png");
        const fileName = `tryon_${Date.now()}.png`;
        const base64Data = imageData.split(",")[1];
        const blob = await fetch(`data:image/png;base64,${base64Data}`).then(r => r.blob());
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("user-tryon-history")
          .upload(`${user.id}/${fileName}`, blob, { contentType: "image/png" });
        
        if (uploadError) throw uploadError;
        
        const { data: urlData } = supabase.storage.from("user-tryon-history").getPublicUrl(uploadData.path);
        
        // Insert with is_saved = true
        await supabase.from("tryon_history").insert({
          user_id: user.id, 
          product_id: state.id, 
          product_name: state.name,
          product_image: state.image, 
          image_data: imageData,
          tryon_image: urlData.publicUrl, 
          product_price: state.price,
          is_saved: true
        });
      } else {
        // Check if already saved
        const { data: existing } = await supabase.from("tryon_history").select("id, is_saved")
          .eq("user_id", user.id)
          .eq("product_id", state.id)
          .eq("is_saved", true)
          .maybeSingle();
        
        if (existing) {
          setSnackbar({ open: true, message: "Already in Saved Looks!", severity: "info" });
          setSavingLook(false);
          return;
        }
        
        // Save product with product image as placeholder
        await supabase.from("tryon_history").insert({
          user_id: user.id, 
          product_id: state.id, 
          product_name: state.name,
          product_image: state.image, 
          image_data: state.image,
          product_price: state.price,
          is_saved: true
        });
      }
      
      setSnackbar({ open: true, message: "❤️ Added to Saved Looks!", severity: "success" });
    } catch (err) {
      console.error("Save look error:", err);
      setSnackbar({ open: true, message: "Failed to save look", severity: "error" });
    } finally {
      setSavingLook(false);
    }
  };

  return (
    <Box sx={{ minHeight: "100vh", background: THEME.pageBg, pb: 4 }}>
      <Box sx={{ background: THEME.gradient, color: "white", py: 2, px: 2, display: "flex", alignItems: "center", gap: 2 }}>
        <IconButton onClick={() => navigate("/dashboard")} sx={{ color: "white" }}><ArrowBackIcon /></IconButton>
        <Typography variant="h5" fontWeight={700}>Virtual Try-On</Typography>
      </Box>

      <Box sx={{ maxWidth: 1200, mx: "auto", px: 2, mt: 3, display: "flex", gap: 3, flexDirection: { xs: "column", md: "row" } }}>
        <Box sx={{ flex: "0 0 300px" }}>
          <Card elevation={3} sx={{ borderRadius: 3 }}>
            <Box sx={{ bgcolor: "#f5f5f5", p: 3, display: "flex", alignItems: "center", justifyContent: "center", minHeight: 280 }}>
              <img src={state.image} alt={state.name} style={{ maxWidth: "100%", maxHeight: 280, objectFit: "contain" }}/>
            </Box>
            <CardContent>
              <Typography variant="h6" fontWeight={700}>{state.name}</Typography>
              <Typography variant="h5" color={THEME.primary} fontWeight={800} sx={{ mt: 1 }}>₹{state.price}</Typography>
              <Button fullWidth variant="outlined" startIcon={<FavoriteIcon />} onClick={saveLook} disabled={savingLook}
                sx={{ mt: 2, fontWeight: 600, borderColor: THEME.primary, color: THEME.primary, 
                  "&:hover": { borderColor: THEME.primary, bgcolor: "rgba(108, 92, 231, 0.08)" } }}>
                {savingLook ? "Saving..." : "Save Look"}
              </Button>
              <Button fullWidth variant="contained" startIcon={<ShoppingBagIcon />} 
                sx={{ mt: 1, bgcolor: THEME.primary, fontWeight: 600, py: 1.5, "&:hover": { bgcolor: "#5a4bc7" } }}
                onClick={() => window.open(state.link, "_blank")}>BUY ON H&M</Button>
            </CardContent>
          </Card>
        </Box>

        <Box sx={{ flex: 1 }}>
          <Box sx={{ mb: 2, display: "flex", justifyContent: "flex-end" }}>
            <IconButton onClick={() => setShowSettings(!showSettings)} sx={{ bgcolor: "white", boxShadow: 2 }}><TuneIcon /></IconButton>
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
            <Box sx={{ bgcolor: "white", p: 2, borderBottom: "1px solid #e0e0e0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <Typography variant="subtitle1" fontWeight={600}>{capturedImage ? "📸 Your Look" : cameraOn ? "👕 Try On" : "Ready"}</Typography>
              {cameraOn && <Chip label={poseDetected ? "✓ Looking Great!" : "Position yourself"} color={poseDetected ? "success" : "warning"} size="small" sx={{ fontWeight: 600 }} />}
            </Box>

            <Box sx={{ position: "relative", bgcolor: "#1a1a1a", aspectRatio: "4/3", display: "flex", alignItems: "center", justifyContent: "center" }}>
              {!cameraOn && !capturedImage && (
                <Box sx={{ textAlign: "center", color: "white", p: 4 }}>
                  <CameraAltIcon sx={{ fontSize: 64, mb: 2, opacity: 0.7 }} />
                  <Typography variant="h6">See How It Looks On You!</Typography>
                  <Typography variant="body2" sx={{ mb: 3, opacity: 0.8 }}>Position your upper body in frame</Typography>
                  <Button variant="contained" size="large" startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <CameraAltIcon />}
                    onClick={startCamera} disabled={loading} sx={{ bgcolor: THEME.primary, px: 4, py: 1.5, fontWeight: 600 }}>
                    {loading ? "Starting..." : "Start"}
                  </Button>
                </Box>
              )}
              {capturedImage && <img src={capturedImage} alt="Captured" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
              <canvas ref={canvasRef} style={{ width: "100%", height: "100%", objectFit: "cover", display: cameraOn && !capturedImage ? "block" : "none" }} />
              <video ref={videoRef} autoPlay playsInline muted style={{ display: "none" }} />
            </Box>

            <Box sx={{ p: 2, display: "flex", gap: 2, justifyContent: "center", bgcolor: "white" }}>
              {cameraOn && !capturedImage && (
                <Button variant="contained" size="large" onClick={captureImage} disabled={!poseDetected}
                  sx={{ bgcolor: THEME.primary, px: 4, fontWeight: 600 }}>📸 Capture</Button>
              )}
              {capturedImage && (
                <Button variant="outlined" size="large" startIcon={<RestartAltIcon />} onClick={() => { setCapturedImage(null); startCamera(); }}
                  sx={{ fontWeight: 600, px: 3 }}>Retake</Button>
              )}
            </Box>
          </Card>
        </Box>
      </Box>

      <Snackbar open={snackbar.open} autoHideDuration={3000} onClose={() => setSnackbar({...snackbar, open: false})} anchorOrigin={{ vertical: "bottom", horizontal: "center" }}>
        <Alert severity={snackbar.severity} sx={{ fontWeight: 600 }} onClose={() => setSnackbar({...snackbar, open: false})}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
}