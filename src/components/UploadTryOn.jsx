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
  }, []);

  useEffect(() => {
    const pose = new Pose({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
    });
    pose.setOptions({ 
      modelComplexity: 1, 
      smoothLandmarks: true, 
      enableSegmentation: false,
      minDetectionConfidence: 0.7, 
      minTrackingConfidence: 0.7
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
            message: "Photo uploaded successfully! Now select a cloth.", 
            severity: "success" 
          });
        };
      };
      reader.readAsDataURL(file);
    }
  };

  const handleProductSelect = (product) => {
    setSelectedProduct(product);
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = product.image;
    img.onload = () => {
      productImgRef.current = img;
      setActiveStep(2);
      setSnackbar({ 
        open: true, 
        message: "Cloth selected! Click 'Generate Try-On' to see the result.", 
        severity: "success" 
      });
    };
  };

  const generateTryOn = async () => {
    if (!uploadedImageRef.current || !productImgRef.current) {
      setSnackbar({ open: true, message: "Missing image data", severity: "error" });
      return;
    }

    setProcessing(true);
    
    try {
      // Detect pose on uploaded image
      await poseRef.current.send({ image: uploadedImageRef.current });
      
      // Wait a bit for pose detection
      await new Promise(resolve => setTimeout(resolve, 500));
      
      if (!landmarksRef.current) {
        setSnackbar({ 
          open: true, 
          message: "❌ Pose not detected! Please upload a clear full-body photo showing your shoulders.", 
          severity: "error" 
        });
        setProcessing(false);
        return;
      }

      // Create canvas and overlay garment
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      
      // Set canvas size to match uploaded image
      canvas.width = uploadedImageRef.current.width;
      canvas.height = uploadedImageRef.current.height;
      
      // Draw uploaded image
      ctx.drawImage(uploadedImageRef.current, 0, 0, canvas.width, canvas.height);
      
      // Overlay garment based on detected pose
      const lm = landmarksRef.current;
      const leftShoulder = lm[11], rightShoulder = lm[12];
      const leftElbow = lm[13], rightElbow = lm[14];
      const leftHip = lm[23], rightHip = lm[24];
      
      if (leftShoulder && rightShoulder && leftShoulder.visibility > 0.5 && rightShoulder.visibility > 0.5) {
        const lShoulderX = leftShoulder.x * canvas.width;
        const rShoulderX = rightShoulder.x * canvas.width;
        const lShoulderY = leftShoulder.y * canvas.height;
        const rShoulderY = rightShoulder.y * canvas.height;
        const shoulderCenterX = (lShoulderX + rShoulderX) / 2;
        const shoulderCenterY = (lShoulderY + rShoulderY) / 2;
        
        let shoulderWidth = Math.abs(lShoulderX - rShoulderX);

        // Use elbow span if arms are wider than shoulders
        if (leftElbow && rightElbow && leftElbow.visibility > 0.5 && rightElbow.visibility > 0.5) {
          const elbowWidth = Math.abs(leftElbow.x * canvas.width - rightElbow.x * canvas.width);
          shoulderWidth = Math.max(shoulderWidth, elbowWidth * 0.85);
        }

        // Torso length: shoulder to hip.  Fallback: 1.5x shoulder width.
        let torsoLength = shoulderWidth * 1.5;
        if (leftHip && rightHip && leftHip.visibility > 0.5 && rightHip.visibility > 0.5) {
          const hipY = ((leftHip.y + rightHip.y) / 2) * canvas.height;
          torsoLength = Math.abs(hipY - shoulderCenterY);
        }

        // Product images have ~35% whitespace padding around the actual garment.
        // PADDING_FACTOR compensates: the drawn bounding box must be larger than
        // the torso so that the visible garment inside it matches the torso.
        const PADDING_FACTOR = 1.7;

        // Target: visible garment height ≈ torso * garmentScale
        // Drawn bounding box height = that * PADDING_FACTOR
        const garmentHeight = torsoLength * garmentScale * PADDING_FACTOR;
        const aspectRatio = productImgRef.current.width / productImgRef.current.height;
        const garmentWidth = garmentHeight * aspectRatio;

        // Position: centre the bounding box so the visible garment (which sits
        // in the middle of the image) lands on the torso.
        // Top edge = shoulder - small offset so neckline clears the neck.
        const garmentY = shoulderCenterY - torsoLength * 0.12 + garmentVerticalOffset;
        const garmentX = shoulderCenterX - garmentWidth / 2 + garmentHorizontalOffset;
        
        // Draw garment with some transparency for blend
        ctx.globalAlpha = 0.9;
        ctx.drawImage(productImgRef.current, garmentX, garmentY, garmentWidth, garmentHeight);
        ctx.globalAlpha = 1.0;
        
        const result = canvas.toDataURL("image/png");
        setGeneratedImage(result);
        setSnackbar({ 
          open: true, 
          message: "✨ Try-on generated successfully!", 
          severity: "success" 
        });
      } else {
        setSnackbar({ 
          open: true, 
          message: "❌ Could not detect shoulders clearly. Please use a different photo.", 
          severity: "error" 
        });
      }
    } catch (err) {
      console.error("Try-on generation error:", err);
      setSnackbar({ 
        open: true, 
        message: `Error: ${err.message}`, 
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

      const { data: inserted, error: insertError } = await supabase
        .from("tryon_history")
        .insert({
          user_id: user.id,
          product_id: selectedProduct.id,
          product_name: selectedProduct.title,
          product_image: selectedProduct.image,
          image_data: generatedImage,
          product_price: selectedProduct.price,
          is_saved: true
        })
        .select()
        .single();

      if (insertError) throw insertError;

      setSnackbar({ 
        open: true, 
        message: "❤️ Saved to your collection!", 
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
    uploadedImageRef.current = null;
    productImgRef.current = null;
  };

  return (
    <Box sx={{ minHeight: "100vh", background: THEME.pageBg, pb: 4 }}>
      {/* HEADER */}
      <Box sx={{ background: THEME.gradient, color: "white", py: 2, px: 2, display: "flex", alignItems: "center", gap: 2 }}>
        <IconButton onClick={() => navigate("/dashboard")} sx={{ color: "white" }}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h5" fontWeight={700}>Upload Photo Try-On</Typography>
      </Box>

      {/* STEPPER */}
      <Box sx={{ maxWidth: 1200, mx: "auto", px: 2, mt: 3 }}>
        <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {/* STEP 1: UPLOAD PHOTO */}
        {activeStep === 0 && (
          <Card elevation={3} sx={{ borderRadius: 3, p: 4 }}>
            <Box sx={{ textAlign: "center" }}>
              <CloudUploadIcon sx={{ fontSize: 80, color: THEME.primary, mb: 2 }} />
              <Typography variant="h5" fontWeight={700} gutterBottom>
                Upload Your Photo
              </Typography>
              <Typography color="text.secondary" sx={{ mb: 3 }}>
                Choose a clear photo showing your upper body and shoulders for best results
              </Typography>
              
              <input
                accept="image/*"
                style={{ display: 'none' }}
                id="upload-photo"
                type="file"
                onChange={handleImageUpload}
              />
              <label htmlFor="upload-photo">
                <Button
                  variant="contained"
                  component="span"
                  size="large"
                  startIcon={<CloudUploadIcon />}
                  sx={{ 
                    bgcolor: THEME.primary, 
                    px: 4, 
                    py: 1.5, 
                    fontWeight: 600,
                    "&:hover": { bgcolor: "#5a4bc7" }
                  }}
                >
                  Choose Photo
                </Button>
              </label>

              {uploadedImage && (
                <Box sx={{ mt: 4 }}>
                  <img 
                    src={uploadedImage} 
                    alt="Uploaded" 
                    style={{ 
                      maxWidth: "100%", 
                      maxHeight: 400, 
                      borderRadius: 12,
                      boxShadow: "0 8px 24px rgba(0,0,0,0.15)"
                    }} 
                  />
                </Box>
              )}
            </Box>
          </Card>
        )}

        {/* STEP 2: SELECT CLOTH */}
        {activeStep === 1 && (
          <Box>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
              <Typography variant="h5" fontWeight={700}>
                Select a Cloth
              </Typography>
              <Button
                variant="outlined"
                onClick={() => setActiveStep(0)}
                sx={{ borderColor: THEME.primary, color: THEME.primary }}
              >
                Change Photo
              </Button>
            </Box>

            <Grid container spacing={3}>
              {products.slice(0, 12).map((product) => (
                <Grid item xs={6} sm={4} md={3} key={product.id}>
                  <Card
                    onClick={() => handleProductSelect(product)}
                    sx={{
                      borderRadius: 2,
                      cursor: "pointer",
                      border: selectedProduct?.id === product.id ? `3px solid ${THEME.primary}` : "1px solid #e0e0e0",
                      transition: "all 0.2s",
                      "&:hover": {
                        transform: "translateY(-4px)",
                        boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
                      },
                    }}
                  >
                    <Box
                      sx={{
                        height: 200,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        bgcolor: "#f5f5f5",
                        p: 2,
                        position: "relative"
                      }}
                    >
                      <img
                        src={product.image}
                        alt={product.title}
                        style={{
                          maxHeight: "100%",
                          maxWidth: "100%",
                          objectFit: "contain",
                        }}
                      />
                      {selectedProduct?.id === product.id && (
                        <CheckCircleIcon 
                          sx={{ 
                            position: "absolute", 
                            top: 8, 
                            right: 8, 
                            color: THEME.primary,
                            fontSize: 32
                          }} 
                        />
                      )}
                    </Box>
                    <CardContent>
                      <Typography
                        fontSize={13}
                        fontWeight={600}
                        sx={{
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                          minHeight: 36
                        }}
                      >
                        {product.title}
                      </Typography>
                      <Typography fontSize={16} fontWeight={700} color="primary" sx={{ mt: 1 }}>
                        {product.price}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Box>
        )}

        {/* STEP 3: GENERATE & VIEW RESULT */}
        {activeStep === 2 && (
          <Box>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
              <Typography variant="h5" fontWeight={700}>
                Try-On Result
              </Typography>
              <Box sx={{ display: "flex", gap: 2 }}>
                <IconButton 
                  onClick={() => setShowSettings(!showSettings)} 
                  sx={{ bgcolor: "white", boxShadow: 2 }}
                >
                  <TuneIcon />
                </IconButton>
                <Button
                  variant="outlined"
                  onClick={resetAll}
                  startIcon={<RestartAltIcon />}
                  sx={{ borderColor: THEME.primary, color: THEME.primary }}
                >
                  Start Over
                </Button>
              </Box>
            </Box>

            {/* SETTINGS PANEL */}
            {showSettings && (
              <Paper elevation={3} sx={{ p: 3, mb: 3, borderRadius: 2 }}>
                <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                  🎚️ Adjust Garment Fit
                </Typography>
                <Box sx={{ mt: 2 }}>
                  <Typography variant="caption">Size: {garmentScale.toFixed(2)}x</Typography>
                  <Slider 
                    value={garmentScale} 
                    onChange={(e, v) => setGarmentScale(v)} 
                    min={0.7} 
                    max={1.4} 
                    step={0.05} 
                    sx={{ color: THEME.primary }} 
                  />
                </Box>
                <Box sx={{ mt: 2 }}>
                  <Typography variant="caption">Vertical: {garmentVerticalOffset}px</Typography>
                  <Slider 
                    value={garmentVerticalOffset} 
                    onChange={(e, v) => setGarmentVerticalOffset(v)} 
                    min={-80} 
                    max={80} 
                    step={2} 
                    sx={{ color: THEME.primary }} 
                  />
                </Box>
                <Box sx={{ mt: 2 }}>
                  <Typography variant="caption">Horizontal: {garmentHorizontalOffset}px</Typography>
                  <Slider 
                    value={garmentHorizontalOffset} 
                    onChange={(e, v) => setGarmentHorizontalOffset(v)} 
                    min={-60} 
                    max={60} 
                    step={2} 
                    sx={{ color: THEME.primary }} 
                  />
                </Box>
                <Button 
                  fullWidth 
                  size="small" 
                  onClick={() => { 
                    setGarmentScale(1.0); 
                    setGarmentVerticalOffset(0); 
                    setGarmentHorizontalOffset(0);
                    if (generatedImage) generateTryOn();
                  }} 
                  sx={{ mt: 2 }}
                >
                  Reset & Regenerate
                </Button>
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
                        style={{ maxWidth: "100%", maxHeight: 280, objectFit: "contain" }} 
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
                        disabled={processing}
                        startIcon={processing ? <CircularProgress size={20} color="inherit" /> : null}
                        sx={{ 
                          bgcolor: THEME.primary, 
                          fontWeight: 600,
                          py: 1.5,
                          "&:hover": { bgcolor: "#5a4bc7" }
                        }}
                      >
                        {processing ? "Generating..." : "Generate Try-On"}
                      </Button>
                    ) : (
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
                    )}
                    {generatedImage && (
                      <Button
                        fullWidth
                        variant="outlined"
                        onClick={generateTryOn}
                        disabled={processing}
                        sx={{ borderColor: THEME.primary, color: THEME.primary }}
                      >
                        Regenerate
                      </Button>
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