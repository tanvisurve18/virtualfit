import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Box, Typography, IconButton, Button, Snackbar, Alert, 
  CircularProgress, Card, CardContent, Paper, Slider,
  Stepper, Step, StepLabel, Grid
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import FavoriteIcon from "@mui/icons-material/Favorite";
import TuneIcon from "@mui/icons-material/Tune";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { Pose } from "@mediapipe/pose";
import { supabase } from "../lib/supabaseClient";
import { hmMenTshirts } from "../data/hmMenTshirts";
import { hmWomenTshirts } from "../data/hmWomenTshirts";

const THEME = {
  gradient: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
  pageBg: "#F6F7FB",
  primary: "#6C5CE7"
};

const steps = ['Upload Photo', 'Select Cloth', 'Try On'];

// ⚙️ BACKEND CONFIGURATION
// Your FastAPI server running on port 8000
const BACKEND_URL = "http://localhost:8000";

export default function UploadTryOn() {
  const canvasRef = useRef(null);
  const poseRef = useRef(null);
  const landmarksRef = useRef(null);
  const productImgRef = useRef(null);
  const uploadedImageRef = useRef(null);
  const navigate = useNavigate();
  
  const [activeStep, setActiveStep] = useState(0);
  const [uploadedImage, setUploadedImage] = useState(null);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [poseDetected, setPoseDetected] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [generatedImage, setGeneratedImage] = useState(null);
  const [savingLook, setSavingLook] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });
  const [showSettings, setShowSettings] = useState(false);
  const [garmentScale, setGarmentScale] = useState(1.0);
  const [garmentVerticalOffset, setGarmentVerticalOffset] = useState(0);
  const [garmentHorizontalOffset, setGarmentHorizontalOffset] = useState(0);
  const [products, setProducts] = useState([]);
  
  // NEW: Backend status state
  const [backendStatus, setBackendStatus] = useState("checking");

  useEffect(() => {
    // Load all products
    const allProducts = [...hmMenTshirts, ...hmWomenTshirts].map((item, index) => ({
      id: item.id || index,
      title: item.title,
      price: item.price,
      image: item.image,
      product_url: item.url,
    }));
    setProducts(allProducts);
    
    // Check backend health
    checkBackendHealth();
  }, []);

  useEffect(() => {
    const pose = new Pose({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
    });
    pose.setOptions({ 
      modelComplexity: 1, 
      smoothLandmarks: true, 
      enableSegmentation: false,
      minDetectionConfidence: 0.5, 
      minTrackingConfidence: 0.5
    });
    pose.onResults((results) => {
      landmarksRef.current = results.poseLandmarks;
      setPoseDetected(!!results.poseLandmarks);
    });
    poseRef.current = pose;
    
    return () => {
      if (poseRef.current) poseRef.current.close();
    };
  }, []);

  // NEW: Check backend health
  const checkBackendHealth = async () => {
    try {
      console.log("🔍 Checking backend health...");
      const response = await fetch(`${BACKEND_URL}/health`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log("✅ Backend online:", data);
        setBackendStatus("online");
        setSnackbar({ 
          open: true, 
          message: `✅ Backend connected! Ready for AI try-on.`, 
          severity: "success" 
        });
      } else {
        throw new Error("Backend not responding");
      }
    } catch (err) {
      console.error("❌ Backend offline:", err);
      setBackendStatus("offline");
      setSnackbar({ 
        open: true, 
        message: "⚠️ Backend offline! Make sure Python server is running.", 
        severity: "warning" 
      });
    }
  };

  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.src = e.target.result;
        img.onload = () => {
          setUploadedImage(e.target.result);
          setUploadedFile(file);
          uploadedImageRef.current = img;
          setActiveStep(1);
          setSnackbar({ 
            open: true, 
            message: "Photo uploaded! Now select clothing.", 
            severity: "success" 
          });
        };
      };
      reader.readAsDataURL(file);
    }
  };

  const handleProductSelect = (product) => {
    setSelectedProduct(product);
    
    // Load product image
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onerror = () => {
      const imgFallback = new Image();
      imgFallback.src = product.image;
      imgFallback.onload = () => {
        productImgRef.current = imgFallback;
        setActiveStep(2);
        setSnackbar({ 
          open: true, 
          message: "Clothing selected! Ready to generate try-on.", 
          severity: "success" 
        });
      };
    };
    img.onload = () => {
      productImgRef.current = img;
      setActiveStep(2);
      setSnackbar({ 
        open: true, 
        message: "Clothing selected! Ready to generate try-on.", 
        severity: "success" 
      });
    };
    img.src = product.image;
  };

  // UPDATED: Generate try-on using backend API
  const generateTryOn = async () => {
    if (!uploadedFile || !selectedProduct) {
      setSnackbar({ open: true, message: "Missing image data", severity: "error" });
      return;
    }

    if (backendStatus !== "online") {
      setSnackbar({ 
        open: true, 
        message: "❌ Backend is offline! Start the Python server first.", 
        severity: "error" 
      });
      return;
    }

    setProcessing(true);
    
    try {
      console.log("🚀 Calling local FastAPI backend...");
      
      // Prepare FormData
      const formData = new FormData();
      formData.append("person_image", uploadedFile);
      
      // Get garment image as blob
      const garmentResponse = await fetch(selectedProduct.image);
      const garmentBlob = await garmentResponse.blob();
      formData.append("garment_image", garmentBlob, "garment.jpg");
      formData.append("garment_description", selectedProduct.title || "clothing");
      formData.append("category", "upper_body");
      
      console.log("📤 Sending request to:", `${BACKEND_URL}/api/try-on-base64`);
      
      // Call local backend
      const response = await fetch(`${BACKEND_URL}/api/try-on-base64`, {
        method: "POST",
        body: formData,
        signal: AbortSignal.timeout(660000),
      });

      console.log("📡 Response status:", response.status);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Backend error: ${errorText}`);
      }

      const data = await response.json();
      console.log("📦 Response data:", data);

      if (data.success && data.image) {
        setGeneratedImage(data.image);
        setSnackbar({ 
          open: true, 
          message: "✨ AI Try-on generated successfully!", 
          severity: "success" 
        });
      } else {
        throw new Error(data.error || "Unknown error");
      }
      
    } catch (err) {
      console.error("💥 Try-on generation error:", err);
      setSnackbar({ 
        open: true, 
        message: `❌ Error: ${err.message}`, 
        severity: "error" 
      });
    } finally {
      setProcessing(false);
    }
  };

  const saveLook = async () => {
    if (!generatedImage) return;
    
    setSavingLook(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Please login first");

      // Convert base64 to blob directly (avoids abort signal error)
      const base64Data = generatedImage.split(',')[1];
      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'image/png' });
      
      // Upload to Supabase Storage
      const fileName = `${user.id}/${Date.now()}.png`;
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
          image_url: publicUrl,
          item_id: selectedProduct.title,
          product_name: selectedProduct.title,
          product_price: selectedProduct.price,
          product_image: selectedProduct.image,
          product_id: selectedProduct.id,
          is_saved: true,
          status: "completed"
        });

      if (dbError) throw dbError;

      setSnackbar({ 
        open: true, 
        message: "✅ Look saved to your profile!", 
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

  const resetAll = () => {
    setActiveStep(0);
    setUploadedImage(null);
    setUploadedFile(null);
    setSelectedProduct(null);
    setGeneratedImage(null);
    setPoseDetected(false);
    setGarmentScale(1.0);
    setGarmentVerticalOffset(0);
    setGarmentHorizontalOffset(0);
    uploadedImageRef.current = null;
    productImgRef.current = null;
  };

  return (
    <Box sx={{ minHeight: "100vh", background: THEME.pageBg, pb: 4 }}>
      {/* HEADER */}
      <Box sx={{ background: THEME.gradient, color: "white", py: 2, px: 2, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <IconButton onClick={() => navigate("/dashboard")} sx={{ color: "white" }}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h5" fontWeight={700}>AI Virtual Try-On</Typography>
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          {/* Backend Status Indicator */}
          <Box sx={{ 
            display: "flex", 
            alignItems: "center", 
            gap: 1, 
            bgcolor: "rgba(255,255,255,0.2)", 
            px: 2, 
            py: 0.5, 
            borderRadius: 2 
          }}>
            <Box sx={{ 
              width: 8, 
              height: 8, 
              borderRadius: "50%", 
              bgcolor: backendStatus === "online" ? "#4caf50" : backendStatus === "offline" ? "#ff9800" : "#999"
            }} />
            <Typography fontSize={13}>
              Backend: {backendStatus === "online" ? "Online" : backendStatus === "offline" ? "Offline" : "Checking..."}
            </Typography>
          </Box>
          <IconButton onClick={resetAll} sx={{ color: "white" }}>
            <RestartAltIcon />
          </IconButton>
        </Box>
      </Box>

      {/* STEPPER */}
      <Box sx={{ maxWidth: 900, mx: "auto", mt: 3, px: 2 }}>
        <Stepper activeStep={activeStep} alternativeLabel>
          {steps.map((label, index) => (
            <Step key={label}>
              <StepLabel 
                StepIconComponent={() => (
                  <Box 
                    sx={{ 
                      width: 32, 
                      height: 32, 
                      borderRadius: "50%", 
                      display: "flex", 
                      alignItems: "center", 
                      justifyContent: "center",
                      bgcolor: index <= activeStep ? THEME.primary : "#ccc",
                      color: "white",
                      fontWeight: 700
                    }}
                  >
                    {index < activeStep ? <CheckCircleIcon fontSize="small" /> : index + 1}
                  </Box>
                )}
              >
                {label}
              </StepLabel>
            </Step>
          ))}
        </Stepper>
      </Box>

      <Box sx={{ maxWidth: 1400, mx: "auto", mt: 4, px: 2 }}>
        {/* STEP 1: UPLOAD PHOTO */}
        {activeStep === 0 && (
          <Box sx={{ textAlign: "center", py: 6 }}>
            <Typography variant="h6" fontWeight={700} gutterBottom>
              📸 Upload Your Photo
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 3, maxWidth: 500, mx: "auto" }}>
              Upload a clear photo showing your upper body. Face the camera directly for best results.
            </Typography>
            <Button
              variant="contained"
              component="label"
              size="large"
              startIcon={<CloudUploadIcon />}
              sx={{ 
                bgcolor: THEME.primary, 
                fontWeight: 600, 
                px: 4, 
                py: 1.5,
                "&:hover": { bgcolor: "#5a4bc7" }
              }}
            >
              Choose Photo
              <input 
                type="file" 
                hidden 
                accept="image/*" 
                onChange={handleImageUpload} 
              />
            </Button>
          </Box>
        )}

        {/* STEP 2: SELECT CLOTH */}
        {activeStep === 1 && (
          <Box>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
              <Typography variant="h6" fontWeight={700}>
                👕 Select a Cloth to Try On
              </Typography>
              <Button 
                startIcon={<RestartAltIcon />} 
                onClick={resetAll}
                sx={{ color: THEME.primary }}
              >
                Start Over
              </Button>
            </Box>
            
            <Grid container spacing={2}>
              {products.map((product) => (
                <Grid item xs={6} sm={4} md={3} lg={2.4} key={product.id}>
                  <Card 
                    elevation={selectedProduct?.id === product.id ? 8 : 2}
                    onClick={() => handleProductSelect(product)}
                    sx={{ 
                      cursor: "pointer", 
                      borderRadius: 2,
                      border: selectedProduct?.id === product.id ? `3px solid ${THEME.primary}` : "3px solid transparent",
                      transition: "all 0.2s",
                      "&:hover": { 
                        transform: "translateY(-4px)", 
                        boxShadow: 4 
                      }
                    }}
                  >
                    <Box sx={{ 
                      bgcolor: "#f9f9f9", 
                      p: 2, 
                      display: "flex", 
                      alignItems: "center", 
                      justifyContent: "center",
                      height: 180
                    }}>
                      <img 
                        src={product.image} 
                        alt={product.title}
                        style={{ 
                          maxWidth: "100%", 
                          maxHeight: "100%", 
                          objectFit: "contain" 
                        }}
                        loading="lazy"
                      />
                    </Box>
                    <CardContent sx={{ p: 1.5 }}>
                      <Typography 
                        fontSize={12} 
                        fontWeight={600} 
                        sx={{ 
                          overflow: "hidden", 
                          textOverflow: "ellipsis", 
                          whiteSpace: "nowrap" 
                        }}
                      >
                        {product.title}
                      </Typography>
                      <Typography fontSize={14} fontWeight={700} color="primary">
                        {product.price}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Box>
        )}

        {/* STEP 3: TRY ON RESULT */}
        {activeStep === 2 && (
          <Box>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
              <Typography variant="h6" fontWeight={700}>
                ✨ Try-On Result
              </Typography>
              <Box sx={{ display: "flex", gap: 1 }}>
                <IconButton 
                  onClick={() => setShowSettings(!showSettings)}
                  sx={{ 
                    bgcolor: showSettings ? THEME.primary : "white", 
                    color: showSettings ? "white" : THEME.primary,
                    "&:hover": { bgcolor: showSettings ? "#5a4bc7" : "#f0f0f0" }
                  }}
                >
                  <TuneIcon />
                </IconButton>
                <Button 
                  startIcon={<RestartAltIcon />} 
                  onClick={resetAll}
                  sx={{ color: THEME.primary }}
                >
                  Start Over
                </Button>
              </Box>
            </Box>

            {/* SETTINGS PANEL */}
            {showSettings && (
              <Paper elevation={3} sx={{ p: 3, mb: 3, borderRadius: 2 }}>
                <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                  🎚️ Adjust Garment Fit (Local Overlay Only)
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
                  Note: These settings don't affect AI backend results
                </Typography>
                <Box sx={{ mt: 2 }}>
                  <Typography variant="caption">Size: {garmentScale.toFixed(2)}x</Typography>
                  <Slider 
                    value={garmentScale} 
                    onChange={(e, v) => setGarmentScale(v)} 
                    min={0.6} 
                    max={1.5} 
                    step={0.05} 
                    sx={{ color: THEME.primary }} 
                  />
                </Box>
                <Box sx={{ mt: 2 }}>
                  <Typography variant="caption">Vertical Position: {garmentVerticalOffset}px</Typography>
                  <Slider 
                    value={garmentVerticalOffset} 
                    onChange={(e, v) => setGarmentVerticalOffset(v)} 
                    min={-120} 
                    max={120} 
                    step={2} 
                    sx={{ color: THEME.primary }} 
                  />
                </Box>
                <Box sx={{ mt: 2 }}>
                  <Typography variant="caption">Horizontal Position: {garmentHorizontalOffset}px</Typography>
                  <Slider 
                    value={garmentHorizontalOffset} 
                    onChange={(e, v) => setGarmentHorizontalOffset(v)} 
                    min={-100} 
                    max={100} 
                    step={2} 
                    sx={{ color: THEME.primary }} 
                  />
                </Box>
              </Paper>
            )}

            <Grid container spacing={3}>
              {/* ORIGINAL PHOTO */}
              <Grid item xs={12} md={4}>
                <Card elevation={3} sx={{ borderRadius: 3 }}>
                  <CardContent>
                    <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                      📸 Original Photo
                    </Typography>
                  </CardContent>
                  <Box sx={{ bgcolor: "#f5f5f5", p: 3, display: "flex", alignItems: "center", justifyContent: "center", minHeight: 200 }}>
                    <img 
                      src={uploadedImage} 
                      alt="Original" 
                      style={{ maxWidth: "100%", maxHeight: 375, objectFit: "contain" }} 
                    />
                  </Box>
                </Card>
              </Grid>

              {/* SELECTED CLOTH */}
              <Grid item xs={12} md={4}>
                <Card elevation={3} sx={{ borderRadius: 3 }}>
                  <CardContent>
                    <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                      👕 Selected Cloth
                    </Typography>
                  </CardContent>
                  <Box sx={{ bgcolor: "#f5f5f5", p: 3, display: "flex", alignItems: "center", justifyContent: "center", minHeight: 200 }}>
                    <img 
                      src={selectedProduct.image} 
                      alt={selectedProduct.title} 
                      style={{ maxWidth: "100%", maxHeight: 280, objectFit: "contain" }} 
                    />
                  </Box>
                  <CardContent>
                    <Typography fontSize={14} fontWeight={700}>
                      {selectedProduct.title}
                    </Typography>
                    <Typography fontSize={18} fontWeight={700} color="primary" sx={{ mt: 1 }}>
                      {selectedProduct.price}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              {/* RESULT */}
              <Grid item xs={12} md={4}>
                <Card elevation={3} sx={{ borderRadius: 3 }}>
                  <CardContent>
                    <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                      ✨ Try-On Result
                    </Typography>
                  </CardContent>
                  <Box sx={{ bgcolor: "#f5f5f5", p: 3, display: "flex", alignItems: "center", justifyContent: "center", minHeight: 200 }}>
                    {!generatedImage ? (
                      <Box sx={{ textAlign: "center" }}>
                        <Typography color="text.secondary" sx={{ mb: 2 }}>
                          Click below to generate your try-on
                        </Typography>
                      </Box>
                    ) : (
                      <img 
                        src={generatedImage} 
                        alt="Result" 
                        style={{ width: "100%", height: "auto", objectFit: "contain", display: "block" }} 
                      />
                    )}
                  </Box>
                  <Box sx={{ p: 2, display: "flex", flexDirection: "column", gap: 1 }}>
                    {!generatedImage ? (
                      <Button
                        fullWidth
                        variant="contained"
                        size="large"
                        onClick={generateTryOn}
                        disabled={processing || backendStatus !== "online"}
                        startIcon={processing ? <CircularProgress size={20} color="inherit" /> : null}
                        sx={{ 
                          bgcolor: THEME.primary, 
                          fontWeight: 600,
                          py: 1.5,
                          "&:hover": { bgcolor: "#5a4bc7" }
                        }}
                      >
                        {processing ? "Generating..." : backendStatus !== "online" ? "Backend Offline" : "✨ Generate AI Try-On"}
                      </Button>
                    ) : (
                      <>
                        <Button
                          fullWidth
                          variant="contained"
                          size="large"
                          startIcon={savingLook ? <CircularProgress size={20} color="inherit" /> : <FavoriteIcon />}
                          onClick={saveLook}
                          disabled={savingLook}
                          sx={{ 
                            bgcolor: "#e91e63", 
                            fontWeight: 600,
                            py: 0.9,
                            "&:hover": { bgcolor: "#c2185b" }
                          }}
                        >
                          {savingLook ? "Saving..." : "Save to Collection"}
                        </Button>
                        <Button
                          fullWidth
                          variant="outlined"
                          onClick={generateTryOn}
                          disabled={processing || backendStatus !== "online"}
                          startIcon={processing ? <CircularProgress size={20} color="inherit" /> : null}
                          sx={{ borderColor: THEME.primary, color: THEME.primary }}
                        >
                          {processing ? "Regenerating..." : "Regenerate"}
                        </Button>
                      </>
                    )}
                  </Box>
                </Card>
              </Grid>
            </Grid>
          </Box>
        )}
      </Box>

      {/* HIDDEN CANVAS */}
      <canvas ref={canvasRef} style={{ display: "none" }} />

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