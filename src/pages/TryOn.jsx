import React, { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { 
  Box, Typography, IconButton, Button, Snackbar, Alert, 
  CircularProgress, Card, CardContent
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CameraAltIcon from "@mui/icons-material/CameraAlt";
import FavoriteIcon from "@mui/icons-material/Favorite";
import ShoppingBagIcon from "@mui/icons-material/ShoppingBag";
import { supabase } from "../lib/supabaseClient";

const THEME = {
  gradient: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
  pageBg: "#F6F7FB",
  primary: "#6C5CE7"
};

const BACKEND_URL = "http://localhost:8000";

export default function TryOn() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const { state } = useLocation();
  const navigate = useNavigate();

  const [cameraOn, setCameraOn] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [savingLook, setSavingLook] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });

  // Extract product data
  const productData = state ? {
    image: state.image || state.garment_image,
    name: state.name || state.title || state.product_name,
    price: state.price || state.product_price,
    link: state.link || state.product_url || state.buyUrl,
  } : null;

  // ✅ FIX: Assign stream to video element AFTER React renders the <video> tag.
  // Previously, srcObject was set before setCameraOn(true) re-rendered the component
  // and mounted the <video> element, so videoRef.current was null at assignment time.
  useEffect(() => {
    if (cameraOn && videoRef.current && streamRef.current) {
      const video = videoRef.current;
      video.srcObject = streamRef.current;
      video.onloadedmetadata = () => {
        video.play().catch(err => console.error("❌ Play failed:", err));
      };
      // In case metadata already loaded before handler was set
      if (video.readyState >= 2) {
        video.play().catch(err => console.error("❌ Play failed:", err));
      }
    }
  }, [cameraOn]);

  if (!productData || !productData.image) {
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

  const startCamera = async () => {
    try {
      console.log("🎥 Requesting camera...");
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: "user", 
          width: { ideal: 1280 }, 
          height: { ideal: 720 } 
        } 
      });
      
      console.log("✅ Camera stream obtained:", stream);

      // Store stream first, then trigger re-render.
      // The useEffect above will assign srcObject after <video> mounts.
      streamRef.current = stream;
      setCameraOn(true);
      
    } catch (err) {
      console.error("❌ Camera error:", err);
      setSnackbar({ open: true, message: `Camera error: ${err.message}`, severity: "error" });
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraOn(false);
  };

  const captureAndProcess = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    setProcessing(true);
    
    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.95));
      
      console.log("📸 Captured frame, sending to backend...");
      
      const formData = new FormData();
      formData.append('person_image', blob, 'camera.jpg');
      
      const garmentResponse = await fetch(productData.image);
      const garmentBlob = await garmentResponse.blob();
      formData.append('garment_image', garmentBlob, 'garment.jpg');
      formData.append('garment_description', productData.name || 'clothing');
      formData.append('category', 'upper_body');
      
      console.log("☁️ Calling backend API...");
      
      const response = await fetch(`${BACKEND_URL}/api/try-on-base64`, {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error(`Backend error: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success && data.image) {
        console.log("✅ Try-on generated!");
        setCapturedImage(data.image);
        stopCamera();
        setSnackbar({ 
          open: true, 
          message: "✨ Try-on generated successfully!", 
          severity: "success" 
        });
      } else {
        throw new Error(data.error || "Unknown error");
      }
      
    } catch (err) {
      console.error("❌ Error:", err);
      setSnackbar({ 
        open: true, 
        message: `Error: ${err.message}`, 
        severity: "error" 
      });
    } finally {
      setProcessing(false);
    }
  };

  const retake = () => {
    setCapturedImage(null);
    startCamera();
  };

  const saveLook = async () => {
    if (!capturedImage) return;
    
    setSavingLook(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setSnackbar({ open: true, message: "Please login to save", severity: "warning" });
        setSavingLook(false);
        return;
      }

      // Convert base64 to blob directly (fixes abort signal error)
      const base64Data = capturedImage.split(",")[1];
      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: "image/png" });
      
      const fileName = `${user.id}/${Date.now()}.png`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("tryon-images")
        .upload(fileName, blob, {
          contentType: "image/png",
          cacheControl: "3600"
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("tryon-images")
        .getPublicUrl(fileName);

      const { error: dbError } = await supabase
        .from("tryon_history")
        .insert({
          user_id: user.id,
          image_url: publicUrl,
          item_id: productData.name,
          product_name: productData.name,
          product_price: productData.price,
          product_image: productData.image,
          is_saved: true,
          status: "completed"
        });

      if (dbError) throw dbError;

      setSnackbar({ 
        open: true, 
        message: "✅ Look saved to your collection!", 
        severity: "success" 
      });
      
    } catch (err) {
      console.error("Save error:", err);
      setSnackbar({ 
        open: true, 
        message: `Failed to save: ${err.message}`, 
        severity: "error" 
      });
    } finally {
      setSavingLook(false);
    }
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: THEME.pageBg }}>
      {/* HEADER */}
      <Box sx={{ background: THEME.gradient, color: "white", py: 2, px: 2, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <IconButton onClick={() => navigate("/dashboard")} sx={{ color: "white" }}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h5" fontWeight={700}>Virtual Try-On</Typography>
        </Box>
      </Box>

      <Box sx={{ maxWidth: 1200, mx: "auto", p: 3 }}>
        <Box sx={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
          
          {/* PRODUCT INFO */}
          <Card sx={{ width: 300, height: "fit-content" }}>
            <Box sx={{ bgcolor: "#f5f5f5", p: 2, display: "flex", justifyContent: "center", alignItems: "center", height: 300 }}>
              <img 
                src={productData.image} 
                alt={productData.name}
                style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "cover" }}
              />
            </Box>
            <CardContent>
              <Typography variant="h6" fontWeight={700} gutterBottom>
                {productData.name}
              </Typography>
              <Typography variant="h5" color="primary" fontWeight={700} gutterBottom>
                {productData.price}
              </Typography>
              {productData.link && (
                <Button
                  fullWidth
                  variant="contained"
                  startIcon={<ShoppingBagIcon />}
                  onClick={() => window.open(productData.link, '_blank')}
                  sx={{ bgcolor: THEME.primary, mt: 1 }}
                >
                  BUY ON H&M
                </Button>
              )}
            </CardContent>
          </Card>

          {/* CAMERA/RESULT */}
          <Box sx={{ flex: 1, minWidth: 300 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" fontWeight={700} gutterBottom>
                  {capturedImage ? "✨ Try-On Result" : "📸 Live Camera"}
                </Typography>
              </CardContent>
              
              <Box sx={{ 
                position: "relative", 
                bgcolor: "#000", 
                width: "100%",
                aspectRatio: cameraOn ? "16/9" : "auto",
                overflow: "hidden"
              }}>
                {!cameraOn && !capturedImage && (
                  <Box sx={{ 
                    position: "absolute",
                    top: 0, left: 0, right: 0, bottom: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "white" 
                  }}>
                    <Box sx={{ textAlign: "center" }}>
                      <CameraAltIcon sx={{ fontSize: 60, mb: 2 }} />
                      <Typography>Click below to start camera</Typography>
                    </Box>
                  </Box>
                )}
                
                {/* ✅ Video is always rendered when cameraOn, ref is always available */}
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  style={{ 
                    position: "absolute",
                    top: 0, left: 0,
                    width: "100%", 
                    height: "100%", 
                    objectFit: "cover",
                    display: cameraOn && !capturedImage ? "block" : "none"
                  }}
                />
                
                {capturedImage && (
                  <img 
                    src={capturedImage} 
                    alt="Result"
                    style={{ 
                      width: "100%", 
                      height: "100%", 
                      objectFit: "cover" 
                    }}
                  />
                )}
                
                <canvas ref={canvasRef} style={{ display: "none" }} />
              </Box>

              <CardContent>
                {!cameraOn && !capturedImage && (
                  <Button
                    fullWidth
                    variant="contained"
                    size="large"
                    startIcon={<CameraAltIcon />}
                    onClick={startCamera}
                    sx={{ bgcolor: THEME.primary }}
                  >
                    Start Camera
                  </Button>
                )}

                {cameraOn && !capturedImage && (
                  <Box sx={{ display: "flex", gap: 2 }}>
                    <Button
                      fullWidth
                      variant="contained"
                      size="large"
                      onClick={captureAndProcess}
                      disabled={processing}
                      startIcon={processing ? <CircularProgress size={20} color="inherit" /> : <CameraAltIcon />}
                      sx={{ bgcolor: THEME.primary }}
                    >
                      {processing ? "Processing..." : "Capture & Try On"}
                    </Button>
                    <Button
                      variant="outlined"
                      onClick={stopCamera}
                      sx={{ borderColor: THEME.primary, color: THEME.primary }}
                    >
                      Cancel
                    </Button>
                  </Box>
                )}

                {capturedImage && (
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                    <Button
                      fullWidth
                      variant="contained"
                      size="large"
                      startIcon={savingLook ? <CircularProgress size={20} color="inherit" /> : <FavoriteIcon />}
                      onClick={saveLook}
                      disabled={savingLook}
                      sx={{ bgcolor: "#e91e63" }}
                    >
                      {savingLook ? "Saving..." : "Save to Collection"}
                    </Button>
                    <Button
                      fullWidth
                      variant="outlined"
                      onClick={retake}
                      sx={{ borderColor: THEME.primary, color: THEME.primary }}
                    >
                      Try Again
                    </Button>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Box>
        </Box>
      </Box>

      {/* SNACKBAR */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: "100%", fontWeight: 600 }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}