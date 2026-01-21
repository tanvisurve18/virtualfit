import React, { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Box, Typography, IconButton, Button, Snackbar, Alert, CircularProgress } from "@mui/material";
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
  const [loading, setLoading] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [aiProcessedImage, setAiProcessedImage] = useState(null);
  const [processingAI, setProcessingAI] = useState(false);
  const [saving, setSaving] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });

  if (!state) {
    return (
      <Box sx={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Typography>No product selected</Typography>
      </Box>
    );
  }

  const startCamera = async () => {
    try {
      setLoading(true);
      
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Camera not supported in this browser. Try Chrome or Edge.");
      }
      
      console.log("🎥 Requesting camera access...");
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: "user",
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
      });

      console.log("✅ Camera access granted");
      console.log("Stream active:", stream.active);

      if (!stream) {
        throw new Error("Could not get camera stream");
      }

      streamRef.current = stream;
      
      if (videoRef.current) {
        console.log("📹 Setting video source...");
        videoRef.current.srcObject = stream;
        
        // Try to play immediately
        try {
          console.log("▶️ Attempting to play video...");
          await videoRef.current.play();
          console.log("✅ Video playing successfully!");
          setCameraOn(true);
          setLoading(false);
          console.log("Camera state set to ON");
        } catch (playError) {
          console.log("⚠️ Immediate play failed, trying onloadedmetadata:", playError);
          
          videoRef.current.onloadedmetadata = async () => {
            console.log("📊 Video metadata loaded");
            try {
              await videoRef.current.play();
              console.log("✅ Video playing after metadata loaded");
              setCameraOn(true);
              setLoading(false);
              console.log("Camera state set to ON (via metadata)");
            } catch (playError2) {
              console.error("❌ Play error after metadata:", playError2);
              // Force camera on anyway
              console.log("🔧 Forcing camera state to ON");
              setCameraOn(true);
              setLoading(false);
            }
          };
        }
        
        // Fallback: Force camera on after 3 seconds
        setTimeout(() => {
          console.log("⏰ Timeout triggered. Loading:", loading, "Stream active:", stream.active);
          if (loading && stream.active) {
            console.log("⚠️ FALLBACK: Forcing camera on after timeout");
            setCameraOn(true);
            setLoading(false);
          }
        }, 3000);
      } else {
        console.error("❌ videoRef.current is null!");
      }
    } catch (err) {
      console.error("❌ Camera error:", err);
      setLoading(false);
      
      let errorMessage = "Failed to access camera. ";
      
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        errorMessage += "Please allow camera access in browser settings.";
      } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
        errorMessage += "No camera found. Please connect a webcam.";
      } else if (err.name === "NotReadableError" || err.name === "TrackStartError") {
        errorMessage += "Camera is already in use by another app. Close other apps and try again.";
      } else if (err.name === "OverconstrainedError") {
        errorMessage += "Camera doesn't support the requested settings.";
      } else if (err.name === "SecurityError") {
        errorMessage += "Camera access blocked. Please use HTTPS or localhost.";
      } else {
        errorMessage += err.message || "Unknown error. Check browser console.";
      }
      
      setSnackbar({ open: true, message: errorMessage, severity: "error" });
    }
  };

  const captureImage = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    if (!video || !canvas) return;

    const ctx = canvas.getContext("2d");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw mirrored image
    ctx.save();
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    ctx.restore();

    const imageDataUrl = canvas.toDataURL("image/jpeg", 0.95);
    setCapturedImage(imageDataUrl);
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    setCameraOn(false);
  };

  const processWithAI = async () => {
    if (!capturedImage) return;

    try {
      setProcessingAI(true);
      setSnackbar({ 
        open: true, 
        message: "🎨 AI is creating your perfect fit... This takes 30-90 seconds", 
        severity: "info" 
      });

      // Convert person image to blob
      const personBlob = await fetch(capturedImage).then(r => r.blob());
      
      // Load garment image
      const garmentImg = new Image();
      garmentImg.crossOrigin = "anonymous";
      garmentImg.src = state.image;
      
      await new Promise((resolve, reject) => {
        garmentImg.onload = resolve;
        garmentImg.onerror = reject;
      });
      
      // Process garment - remove white background
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = garmentImg.width;
      canvas.height = garmentImg.height;
      ctx.drawImage(garmentImg, 0, 0);
      
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      
      // Aggressive background removal
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const brightness = (r + g + b) / 3;
        
        // Remove white/light backgrounds
        if (brightness > 240) {
          data[i + 3] = 0;
        } else if (brightness > 220) {
          data[i + 3] = Math.max(0, data[i + 3] - 100);
        }
      }
      
      ctx.putImageData(imageData, 0, 0);
      
      const garmentBlob = await new Promise((resolve) => {
        canvas.toBlob(resolve, 'image/png');
      });

      const formData = new FormData();
      formData.append('person_image', personBlob, 'person.jpg');
      formData.append('garment_image', garmentBlob, 'garment.png');

      console.log("📤 Sending to AI Try-On API...");
      console.log("Person size:", personBlob.size, "bytes");
      console.log("Garment size:", garmentBlob.size, "bytes");

      const response = await fetch(
        'https://fqpweatumhbxnuvwpgrb.supabase.co/functions/v1/ai-tryon',
        {
          method: 'POST',
          headers: {
            // REQUIRED for Supabase Edge Functions
            "apikey": import.meta.env.VITE_SUPABASE_ANON_KEY,

          },
          body: formData
        }
      );

      console.log("📥 Response status:", response.status);
      console.log("Response headers:", Object.fromEntries(response.headers.entries()));

      // Model still loading
      if (response.status === 503) {
        const errorData = await response.json();
        console.log("Model loading:", errorData);
        
        setSnackbar({ 
          open: true, 
          message: "⏳ AI model is warming up... Please wait 60-90 seconds and try again!", 
          severity: "warning" 
        });
        setProcessingAI(false);
        return;
      }

      // Handle errors
      if (!response.ok) {
        const contentType = response.headers.get("content-type");
        let errorData;
        
        if (contentType?.includes("application/json")) {
          errorData = await response.json();
        } else {
          errorData = { error: await response.text() };
        }
        
        console.error("❌ API Error:", errorData);
        
        // Specific error messages
        if (errorData.error?.includes("Missing") || errorData.error?.includes("authorization")) {
          throw new Error("❌ Server configuration error: HUGGINGFACE_TOKEN not set in Supabase. Contact administrator.");
        }
        
        throw new Error(errorData.error || errorData.message || `API failed with status ${response.status}`);
      }

      // Get the result image
      const blob = await response.blob();
      console.log("✅ Success! Result size:", blob.size, "bytes");
      
      if (blob.size < 1000) {
        throw new Error("Response too small - possible error in API response");
      }
      
      const imageUrl = URL.createObjectURL(blob);
      setAiProcessedImage(imageUrl);
      
      setSnackbar({ 
        open: true, 
        message: "✨ Perfect fit created successfully!", 
        severity: "success" 
      });

    } catch (error) {
      console.error("❌ AI Processing Error:", error);
      setSnackbar({ 
        open: true, 
        message: error.message || "AI processing failed. Please try again.", 
        severity: "error" 
      });
    } finally {
      setProcessingAI(false);
    }
  };

  const retakeImage = () => {
    setCapturedImage(null);
    setAiProcessedImage(null);
    startCamera();
  };

  const saveToDatabase = async () => {
    const imageToSave = aiProcessedImage || capturedImage;
    if (!imageToSave) return;

    try {
      setSaving(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setSnackbar({ open: true, message: "Please log in to save", severity: "error" });
        setSaving(false);
        return;
      }

      const base64Response = await fetch(imageToSave);
      const blob = await base64Response.blob();
      const fileName = `tryon_${user.id}_${Date.now()}.png`;
      
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
          item_id: state.title,
          image_url: publicUrl,
          action: "captured"
        });

      if (dbError) throw dbError;

      setSnackbar({ 
        open: true, 
        message: "✅ Saved to Try-On History!", 
        severity: "success" 
      });

      setTimeout(() => {
        navigate("/dashboard");
      }, 1500);

    } catch (error) {
      console.error("Save error:", error);
      setSnackbar({ 
        open: true, 
        message: "Failed to save: " + error.message, 
        severity: "error" 
      });
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  return (
    <Box sx={{ minHeight: "100vh", background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", p: 2 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2, maxWidth: 900, mx: "auto" }}>
        <IconButton onClick={() => navigate(-1)} sx={{ bgcolor: "white", "&:hover": { bgcolor: "rgba(255,255,255,0.9)" } }}>
          <ArrowBackIcon />
        </IconButton>
        
        <Box sx={{ flex: 1, bgcolor: "white", p: 2, borderRadius: 2, display: "flex", alignItems: "center", gap: 2 }}>
          <img src={state.image} alt={state.title} style={{ width: 60, height: 60, objectFit: "contain", borderRadius: 8, border: "1px solid #eee" }} />
          <Box>
            <Typography fontWeight={700} fontSize={16}>{state.title}</Typography>
            <Typography color="text.secondary" fontSize={14}>₹{state.price}</Typography>
          </Box>
        </Box>
      </Box>

      <Box sx={{ bgcolor: "white", borderRadius: 3, p: 2, maxWidth: 900, mx: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
        <Box sx={{ position: "relative", width: "100%", aspectRatio: "4/3", bgcolor: "#000", borderRadius: 2, overflow: "hidden" }}>
          {/* Always render video element but control visibility */}
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            muted 
            style={{ 
              width: "100%", 
              height: "100%", 
              objectFit: "cover",
              transform: "scaleX(-1)",
              display: (cameraOn && !capturedImage && !aiProcessedImage) ? "block" : "none"
            }} 
          />
          
          {aiProcessedImage && (
            <img src={aiProcessedImage} alt="AI Processed" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
          )}
          
          {capturedImage && !aiProcessedImage && (
            <img src={capturedImage} alt="Captured" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
          )}
          
          {!cameraOn && !capturedImage && !aiProcessedImage && (
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "white" }}>
              <Typography>Click "Start Camera" to begin</Typography>
            </Box>
          )}

          <canvas ref={canvasRef} style={{ display: "none" }} />

          {processingAI && (
            <Box sx={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, bgcolor: "rgba(0,0,0,0.9)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 3 }}>
              <CircularProgress size={80} sx={{ color: "#fff" }} />
              <Typography color="white" fontWeight={700} fontSize={22}>
                🎨 AI is Creating Your Perfect Fit
              </Typography>
              <Typography color="white" fontSize={16} sx={{ opacity: 0.9, textAlign: "center", maxWidth: 400 }}>
                The AI is analyzing your photo and the garment to create a realistic try-on. This takes 30-90 seconds.
              </Typography>
            </Box>
          )}
        </Box>

        <Box sx={{ textAlign: "center", mt: 3 }}>
          {!cameraOn && !capturedImage && (
            <>
              <Button 
                onClick={startCamera} 
                disabled={loading} 
                variant="contained" 
                size="large" 
                sx={{ 
                  px: 6, 
                  py: 2, 
                  background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", 
                  fontWeight: 700, 
                  fontSize: "1.1rem",
                  textTransform: "none",
                  "&:hover": { background: "linear-gradient(135deg, #5568d3 0%, #653a8b 100%)" } 
                }}
              >
                {loading ? "Starting Camera..." : "🎥 Start Camera"}
              </Button>
              <Typography sx={{ mt: 2, color: "text.secondary" }}>
                Take a photo and let AI create a realistic try-on
              </Typography>
            </>
          )}
          
          {cameraOn && !capturedImage && (
            <Box sx={{ display: "flex", gap: 2, justifyContent: "center", flexDirection: "column", alignItems: "center" }}>
              <Button 
                onClick={captureImage} 
                variant="contained" 
                size="large" 
                startIcon={<CameraAltIcon />} 
                sx={{ 
                  px: 6, 
                  py: 2, 
                  background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                  fontWeight: 700, 
                  fontSize: "1.1rem",
                  minWidth: 280,
                  textTransform: "none",
                  "&:hover": { background: "linear-gradient(135deg, #5568d3 0%, #653a8b 100%)" }
                }}
              >
                📸 Capture Photo
              </Button>
              <Typography color="text.secondary" fontSize={15} fontWeight={500}>
                Stand 2-3 feet from camera, face forward
              </Typography>
            </Box>
          )}

          {capturedImage && !aiProcessedImage && (
            <Box sx={{ display: "flex", gap: 2, justifyContent: "center", flexWrap: "wrap" }}>
              <Button 
                onClick={retakeImage} 
                variant="outlined" 
                size="large" 
                startIcon={<RestartAltIcon />} 
                sx={{ 
                  px: 4, 
                  py: 1.8, 
                  fontWeight: 700,
                  textTransform: "none",
                  borderColor: "#667eea", 
                  color: "#667eea",
                  "&:hover": {
                    borderColor: "#5568d3",
                    bgcolor: "rgba(102, 126, 234, 0.05)"
                  }
                }}
              >
                Retake Photo
              </Button>
              <Button 
                onClick={processWithAI} 
                variant="contained" 
                size="large" 
                disabled={processingAI} 
                startIcon={<AutoFixHighIcon />} 
                sx={{ 
                  px: 5, 
                  py: 1.8, 
                  background: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)", 
                  fontWeight: 700,
                  fontSize: "1.1rem",
                  textTransform: "none",
                  "&:hover": { background: "linear-gradient(135deg, #e082ea 0%, #e4465b 100%)" } 
                }}
              >
                {processingAI ? "Processing..." : "✨ Create Perfect Fit (AI)"}
              </Button>
            </Box>
          )}

          {aiProcessedImage && (
            <Box sx={{ display: "flex", gap: 2, justifyContent: "center", flexWrap: "wrap" }}>
              <Button 
                onClick={retakeImage} 
                variant="outlined" 
                size="large" 
                startIcon={<RestartAltIcon />} 
                sx={{ 
                  px: 4, 
                  py: 1.8, 
                  fontWeight: 700,
                  textTransform: "none",
                  borderColor: "#667eea", 
                  color: "#667eea" 
                }}
              >
                Try Again
              </Button>
              <Button 
                onClick={saveToDatabase} 
                variant="contained" 
                size="large" 
                disabled={saving} 
                sx={{ 
                  px: 6, 
                  py: 1.8, 
                  background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", 
                  fontWeight: 700,
                  fontSize: "1.1rem",
                  textTransform: "none",
                  "&:hover": { background: "linear-gradient(135deg, #5568d3 0%, #653a8b 100%)" }
                }}
              >
                {saving ? "Saving..." : "💾 Save to History"}
              </Button>
            </Box>
          )}
        </Box>
      </Box>

      <Snackbar 
        open={snackbar.open} 
        autoHideDuration={8000} 
        onClose={() => setSnackbar({ ...snackbar, open: false })} 
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert 
          onClose={() => setSnackbar({ ...snackbar, open: false })} 
          severity={snackbar.severity} 
          sx={{ width: "100%", fontSize: "1rem", fontWeight: 500 }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}