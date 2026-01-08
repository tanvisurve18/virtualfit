import React, { useEffect, useRef, useState } from "react";
import { Pose } from "@mediapipe/pose";

// Mock Supabase client - replace with your actual import
const supabase = {
  auth: {
    getUser: async () => ({ 
      data: { user: { id: "user_123", email: "demo@virtualfit.com" } },
      error: null 
    })
  },
  storage: {
    from: (bucket) => ({
      upload: async (path, blob) => ({ data: { path }, error: null }),
      getPublicUrl: (path) => ({ 
        data: { publicUrl: `https://storage.supabase.co/${bucket}/${path}` }
      })
    })
  },
  from: (table) => ({
    insert: async (data) => ({ data, error: null })
  })
};

export default function TryOn() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const poseRef = useRef(null);
  const animationRef = useRef(null);
  const landmarksRef = useRef(null);
  const streamRef = useRef(null);
  const clothingImagesRef = useRef({});

  const [cameraOn, setCameraOn] = useState(false);
  const [captured, setCaptured] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedClothing, setSelectedClothing] = useState(null);
  const [selectedSize, setSelectedSize] = useState("M");
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [imagesLoaded, setImagesLoaded] = useState({});
  const [poseDetected, setPoseDetected] = useState(false);

  // Size scale factors
  const sizeScales = {
    XS: 0.8,
    S: 0.9,
    M: 1.0,
    L: 1.1,
    XL: 1.2,
    XXL: 1.3
  };

  /* ---------------- BETTER CLOTHING PRODUCTS WITH WORKING URLS ---------------- */
  useEffect(() => {
    const realProducts = [
      {
        id: 1,
        name: "Classic White Tee",
        type: "tshirt",
        fit_scale: "normal",
        // Using a simple SVG as fallback that always works
        image_svg: `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 250'%3E%3Cpath d='M50,30 Q50,20 60,20 L140,20 Q150,20 150,30 L170,60 Q175,70 170,80 L165,240 Q165,245 160,245 L40,245 Q35,245 35,240 L30,80 Q25,70 30,60 Z' fill='%23ffffff' stroke='%23333' stroke-width='2'/%3E%3C/svg%3E`,
        price: "$29"
      },
      {
        id: 2,
        name: "Black T-Shirt",
        type: "tshirt",
        fit_scale: "normal",
        image_svg: `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 250'%3E%3Cpath d='M50,30 Q50,20 60,20 L140,20 Q150,20 150,30 L170,60 Q175,70 170,80 L165,240 Q165,245 160,245 L40,245 Q35,245 35,240 L30,80 Q25,70 30,60 Z' fill='%23000000' stroke='%23333' stroke-width='2'/%3E%3C/svg%3E`,
        price: "$29"
      },
      {
        id: 3,
        name: "Blue Polo Shirt",
        type: "shirt",
        fit_scale: "normal",
        image_svg: `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 250'%3E%3Cpath d='M50,30 Q50,20 60,20 L140,20 Q150,20 150,30 L170,60 Q175,70 170,80 L165,240 Q165,245 160,245 L40,245 Q35,245 35,240 L30,80 Q25,70 30,60 Z' fill='%232196F3' stroke='%23333' stroke-width='2'/%3E%3Cpath d='M95,20 L95,40 Q100,45 100,45 Q100,45 105,40 L105,20' fill='%232196F3' stroke='%23333' stroke-width='1.5'/%3E%3C/svg%3E`,
        price: "$39"
      },
      {
        id: 4,
        name: "Red Hoodie",
        type: "hoodie",
        fit_scale: "oversized",
        image_svg: `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 220 280'%3E%3Cpath d='M40,25 Q40,10 55,10 L165,10 Q180,10 180,25 L200,70 Q205,85 200,95 L195,260 Q195,270 185,270 L35,270 Q25,270 25,260 L20,95 Q15,85 20,70 Z' fill='%23e53935' stroke='%23333' stroke-width='2'/%3E%3Cellipse cx='110' cy='20' rx='35' ry='15' fill='%23c62828' stroke='%23333' stroke-width='1.5'/%3E%3C/svg%3E`,
        price: "$59"
      },
      {
        id: 5,
        name: "Green T-Shirt",
        type: "tshirt",
        fit_scale: "normal",
        image_svg: `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 250'%3E%3Cpath d='M50,30 Q50,20 60,20 L140,20 Q150,20 150,30 L170,60 Q175,70 170,80 L165,240 Q165,245 160,245 L40,245 Q35,245 35,240 L30,80 Q25,70 30,60 Z' fill='%234CAF50' stroke='%23333' stroke-width='2'/%3E%3C/svg%3E`,
        price: "$29"
      },
      {
        id: 6,
        name: "Gray Hoodie",
        type: "hoodie",
        fit_scale: "oversized",
        image_svg: `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 220 280'%3E%3Cpath d='M40,25 Q40,10 55,10 L165,10 Q180,10 180,25 L200,70 Q205,85 200,95 L195,260 Q195,270 185,270 L35,270 Q25,270 25,260 L20,95 Q15,85 20,70 Z' fill='%23757575' stroke='%23333' stroke-width='2'/%3E%3Cellipse cx='110' cy='20' rx='35' ry='15' fill='%23616161' stroke='%23333' stroke-width='1.5'/%3E%3C/svg%3E`,
        price: "$65"
      }
    ];

    setProducts(realProducts);
    
    // Load all images
    let loadedCount = 0;
    const loadedStatus = {};

    realProducts.forEach(product => {
      const img = new Image();
      img.onload = () => {
        clothingImagesRef.current[product.id] = img;
        loadedStatus[product.id] = true;
        loadedCount++;
        console.log(`✅ Loaded: ${product.name}`);
        
        if (loadedCount === realProducts.length) {
          setImagesLoaded(loadedStatus);
          setLoadingProducts(false);
          console.log("✅ All clothing images loaded!");
        }
      };
      img.onerror = () => {
        console.error(`❌ Failed to load: ${product.name}`);
        loadedCount++;
        if (loadedCount === realProducts.length) {
          setImagesLoaded(loadedStatus);
          setLoadingProducts(false);
        }
      };
      img.src = product.image_svg;
    });
  }, []);

  /* ---------------- INIT MEDIAPIPE ---------------- */
  useEffect(() => {
    const pose = new Pose({
      locateFile: (file) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
    });

    pose.setOptions({
      modelComplexity: 1,
      smoothLandmarks: true,
      enableSegmentation: false,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

    pose.onResults((res) => {
      if (res.poseLandmarks) {
        landmarksRef.current = res.poseLandmarks;
        setPoseDetected(true);
      }
    });

    poseRef.current = pose;
    console.log("✅ MediaPipe Pose initialized");
    
    return () => pose.close();
  }, []);

  /* ---------------- START CAMERA ---------------- */
  const startCamera = async () => {
    if (cameraOn) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: "user",
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false,
      });

      streamRef.current = stream;
      videoRef.current.srcObject = stream;

      videoRef.current.onloadedmetadata = () => {
        videoRef.current.play();
        setCameraOn(true);
        setCaptured(false);
        setPoseDetected(false);
        console.log("✅ Camera started");
        drawLoop();
      };
    } catch (err) {
      alert("Camera access denied. Please allow camera permissions.");
      console.error(err);
    }
  };

  /* ---------------- STOP CAMERA ---------------- */
  const stopCamera = () => {
    cancelAnimationFrame(animationRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraOn(false);
    setPoseDetected(false);
  };

  /* ---------------- DRAW LOOP ---------------- */
  const drawLoop = async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    if (!video || video.readyState !== 4) {
      animationRef.current = requestAnimationFrame(drawLoop);
      return;
    }

    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Mirror camera feed
    ctx.save();
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    ctx.restore();

    // Draw clothing overlay
    if (selectedClothing && clothingImagesRef.current[selectedClothing.id]) {
      drawClothing(ctx);
    }

    // Send frame to mediapipe
    if (poseRef.current) {
      await poseRef.current.send({ image: video });
    }

    animationRef.current = requestAnimationFrame(drawLoop);
  };

  /* ---------------- IMPROVED CLOTHING OVERLAY ---------------- */
  const drawClothing = (ctx) => {
    const clothingImg = clothingImagesRef.current[selectedClothing.id];
    if (!clothingImg) {
      console.warn("Clothing image not loaded yet");
      return;
    }
    
    if (!landmarksRef.current) {
      console.warn("No pose landmarks detected yet");
      return;
    }

    const canvas = canvasRef.current;
    const lm = landmarksRef.current;

    // Key landmarks
    const leftShoulder = lm[11];
    const rightShoulder = lm[12];
    const leftHip = lm[23];
    const rightHip = lm[24];

    if (!leftShoulder || !rightShoulder || !leftHip || !rightHip) {
      console.warn("Missing required landmarks");
      return;
    }

    // Check visibility
    if (leftShoulder.visibility < 0.5 || rightShoulder.visibility < 0.5) {
      console.warn("Low visibility landmarks");
      return;
    }

    // Convert to canvas coordinates (mirrored)
    const ls = {
      x: (1 - leftShoulder.x) * canvas.width,
      y: leftShoulder.y * canvas.height,
      z: leftShoulder.z
    };
    const rs = {
      x: (1 - rightShoulder.x) * canvas.width,
      y: rightShoulder.y * canvas.height,
      z: rightShoulder.z
    };
    const lh = {
      x: (1 - leftHip.x) * canvas.width,
      y: leftHip.y * canvas.height
    };
    const rh = {
      x: (1 - rightHip.x) * canvas.width,
      y: rightHip.y * canvas.height
    };

    // Calculate measurements
    const shoulderWidth = Math.hypot(rs.x - ls.x, rs.y - ls.y);
    const torsoHeight = Math.hypot(
      (lh.x + rh.x) / 2 - (ls.x + rs.x) / 2,
      (lh.y + rh.y) / 2 - (ls.y + rs.y) / 2
    );

    // Clothing dimensions based on type
    let widthMultiplier = 1.8;
    let heightMultiplier = 1.4;
    let necklineOffset = 0.08;

    switch (selectedClothing.type) {
      case "hoodie":
        widthMultiplier = 2.2;
        heightMultiplier = 1.6;
        necklineOffset = 0.05;
        break;
      case "shirt":
        widthMultiplier = 1.8;
        heightMultiplier = 1.4;
        necklineOffset = 0.08;
        break;
      case "tshirt":
      default:
        widthMultiplier = 1.8;
        heightMultiplier = 1.4;
        necklineOffset = 0.08;
        break;
    }

    // Apply fit scale
    if (selectedClothing.fit_scale === "oversized") {
      widthMultiplier *= 1.15;
      heightMultiplier *= 1.1;
    }

    // Apply size
    const sizeMultiplier = sizeScales[selectedSize] || 1.0;

    // Final dimensions
    const clothingWidth = shoulderWidth * widthMultiplier * sizeMultiplier;
    const clothingHeight = torsoHeight * heightMultiplier * sizeMultiplier;

    // Center position
    const centerX = (ls.x + rs.x) / 2;
    const shoulderY = Math.min(ls.y, rs.y);

    // Position with neckline offset
    const x = centerX - clothingWidth / 2;
    const y = shoulderY + (shoulderWidth * necklineOffset);

    // Calculate rotation
    const angle = Math.atan2(rs.y - ls.y, rs.x - ls.x);

    // Draw with transformations
    ctx.save();
    ctx.translate(centerX, y + clothingHeight / 2);
    ctx.rotate(angle);
    
    ctx.translate(-centerX, -(y + clothingHeight / 2));

    // Draw the clothing
    ctx.globalAlpha = 0.95;

    try {
      ctx.drawImage(
        clothingImg,
        x,
        y,
        clothingWidth,
        clothingHeight
      );
      
      // Debug: Draw bounding box
      if (false) { // Set to true for debugging
        ctx.strokeStyle = "#00FF00";
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, clothingWidth, clothingHeight);
      }
    } catch (err) {
      console.error("Draw error:", err);
    }

    ctx.restore();

    // Debug: Draw landmarks
    if (false) { // Set to true for debugging
      drawLandmarks(ctx, lm);
    }
  };

  /* ---------------- DEBUG LANDMARKS ---------------- */
  const drawLandmarks = (ctx, landmarks) => {
    const canvas = canvasRef.current;
    
    const keyPoints = [11, 12, 23, 24];
    
    keyPoints.forEach(idx => {
      const lm = landmarks[idx];
      if (lm && lm.visibility > 0.5) {
        const x = (1 - lm.x) * canvas.width;
        const y = lm.y * canvas.height;
        
        ctx.fillStyle = "#00FF00";
        ctx.beginPath();
        ctx.arc(x, y, 8, 0, 2 * Math.PI);
        ctx.fill();
        
        ctx.fillStyle = "#FFFFFF";
        ctx.font = "12px Arial";
        ctx.fillText(idx, x + 10, y);
      }
    });
  };

  /* ---------------- CAPTURE & SAVE TO SUPABASE ---------------- */
  const capture = async () => {
    try {
      setSaving(true);
      cancelAnimationFrame(animationRef.current);
      
      const imageData = canvasRef.current.toDataURL("image/png");
      setCaptured(true);

      // Get authenticated user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        alert("Please log in to save your try-on");
        setSaving(false);
        return;
      }

      // Convert base64 to blob
      const response = await fetch(imageData);
      const blob = await response.blob();

      // Create unique filename
      const timestamp = Date.now();
      const filename = `tryon_${user.id}_${timestamp}.png`;

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("tryon-images")
        .upload(filename, blob, {
          contentType: "image/png",
          cacheControl: "3600",
          upsert: false
        });

      if (uploadError) {
        console.error("Upload error:", uploadError);
        alert("Failed to upload image");
        setSaving(false);
        return;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("tryon-images")
        .getPublicUrl(filename);

      // Save to database
      const { data: dbData, error: dbError } = await supabase
        .from("tryon_history")
        .insert({
          user_id: user.id,
          item_id: selectedClothing.id,
          item_name: selectedClothing.name,
          size: selectedSize,
          image_url: urlData.publicUrl,
          created_at: new Date().toISOString()
        });

      if (dbError) {
        console.error("Database error:", dbError);
        alert("Failed to save to database");
      } else {
        alert("✅ Try-on saved! Check your Dashboard > Try-On History");
      }

    } catch (err) {
      console.error("Capture error:", err);
      alert("Failed to save try-on");
    } finally {
      setSaving(false);
    }
  };

  /* ---------------- RETAKE ---------------- */
  const retake = () => {
    setCaptured(false);
    startCamera();
  };

  /* ---------------- DONE ---------------- */
  const handleDone = () => {
    stopCamera();
    setCaptured(false);
    alert("In your app, this will navigate to Dashboard > Try-On History");
  };

  /* ---------------- CLEANUP ---------------- */
  useEffect(() => () => stopCamera(), []);

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      padding: "20px",
      fontFamily: "system-ui, -apple-system, sans-serif"
    }}>
      {/* Header */}
      <div style={{
        maxWidth: "1400px",
        margin: "0 auto 30px",
        textAlign: "center"
      }}>
        <h1 style={{
          fontSize: "2.5rem",
          fontWeight: "800",
          color: "#fff",
          margin: "0 0 10px",
          textShadow: "0 2px 10px rgba(0,0,0,0.2)"
        }}>
          VirtualFit Try-On Studio
        </h1>
        <p style={{
          color: "rgba(255,255,255,0.9)",
          fontSize: "1.1rem"
        }}>
          See yourself in real clothing instantly with AI-powered virtual try-on
        </p>
      </div>

      <div style={{
        maxWidth: "1400px",
        margin: "0 auto",
        display: "grid",
        gridTemplateColumns: "1fr 380px",
        gap: "20px",
        alignItems: "start"
      }}>
        {/* Main Camera Section */}
        <div style={{
          background: "#fff",
          borderRadius: "20px",
          padding: "20px",
          boxShadow: "0 20px 60px rgba(0,0,0,0.3)"
        }}>
          {/* Status Indicators */}
          <div style={{
            marginBottom: "15px",
            display: "flex",
            gap: "10px",
            flexWrap: "wrap"
          }}>
            {cameraOn && (
              <div style={{
                padding: "6px 12px",
                background: "#4CAF50",
                color: "#fff",
                borderRadius: "20px",
                fontSize: "0.85rem",
                fontWeight: "600"
              }}>
                🎥 Camera Active
              </div>
            )}
            {poseDetected && (
              <div style={{
                padding: "6px 12px",
                background: "#2196F3",
                color: "#fff",
                borderRadius: "20px",
                fontSize: "0.85rem",
                fontWeight: "600"
              }}>
                ✅ Body Detected
              </div>
            )}
            {selectedClothing && imagesLoaded[selectedClothing.id] && (
              <div style={{
                padding: "6px 12px",
                background: "#FF9800",
                color: "#fff",
                borderRadius: "20px",
                fontSize: "0.85rem",
                fontWeight: "600"
              }}>
                👕 Clothing Loaded
              </div>
            )}
          </div>

          {/* Selected Item Info */}
          {selectedClothing && (
            <div style={{
              marginBottom: "15px",
              padding: "12px 16px",
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              borderRadius: "12px",
              color: "#fff",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center"
            }}>
              <div>
                <div style={{ fontSize: "0.85rem", opacity: 0.9 }}>Trying On</div>
                <div style={{ fontSize: "1.1rem", fontWeight: "700" }}>
                  {selectedClothing.name}
                </div>
              </div>
              <div style={{
                fontSize: "1.3rem",
                fontWeight: "700"
              }}>
                {selectedClothing.price}
              </div>
            </div>
          )}

          {/* Size Controls */}
          {selectedClothing && (
            <div style={{
              marginBottom: "20px",
              padding: "15px",
              background: "linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)",
              borderRadius: "12px"
            }}>
              <div style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "12px"
              }}>
                <span style={{ fontWeight: "600", fontSize: "0.95rem" }}>
                  Select Size:
                </span>
                <span style={{
                  background: "#667eea",
                  color: "#fff",
                  padding: "4px 12px",
                  borderRadius: "20px",
                  fontSize: "0.85rem",
                  fontWeight: "700"
                }}>
                  {selectedSize}
                </span>
              </div>
              <div style={{
                display: "flex",
                gap: "8px",
                flexWrap: "wrap"
              }}>
                {["XS", "S", "M", "L", "XL", "XXL"].map(size => (
                  <button
                    key={size}
                    onClick={() => setSelectedSize(size)}
                    style={{
                      padding: "8px 16px",
                      border: selectedSize === size ? "2px solid #667eea" : "2px solid #ddd",
                      background: selectedSize === size ? "#667eea" : "#fff",
                      color: selectedSize === size ? "#fff" : "#333",
                      borderRadius: "8px",
                      cursor: "pointer",
                      fontWeight: "600",
                      fontSize: "0.9rem",
                      transition: "all 0.2s"
                    }}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Camera Display */}
          <div style={{
            position: "relative",
            width: "100%",
            aspectRatio: "4/3",
            background: "#000",
            borderRadius: "16px",
            overflow: "hidden",
            marginBottom: "20px"
          }}>
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
                objectFit: "contain"
              }} 
            />
            
            {!cameraOn && !captured && (
              <div style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                background: "rgba(0,0,0,0.7)",
                color: "#fff"
              }}>
                <div style={{ fontSize: "4rem", marginBottom: "20px" }}>📷</div>
                <h3 style={{ marginBottom: "10px" }}>Camera Ready</h3>
                <p style={{ opacity: 0.8 }}>Click below to start your virtual try-on</p>
              </div>
            )}

            {saving && (
              <div style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                background: "rgba(0,0,0,0.8)",
                color: "#fff"
              }}>
                <div style={{ 
                  width: "50px", 
                  height: "50px", 
                  border: "4px solid rgba(255,255,255,0.3)",
                  borderTop: "4px solid #fff",
                  borderRadius: "50%",
                  animation: "spin 1s linear infinite"
                }} />
                <p style={{ marginTop: "20px", fontSize: "1.1rem" }}>
                  Saving to your closet...
                </p>
                <style>{`
                  @keyframes spin {
                    to { transform: rotate(360deg); }
                  }
                `}</style>
              </div>
            )}
          </div>

          {/* Camera Controls */}
          <div style={{
            display: "flex",
            gap: "12px",
            justifyContent: "center"
          }}>
            {!cameraOn && !captured && (
              <button
                onClick={startCamera}
                disabled={!selectedClothing || loadingProducts}
                style={{
                  padding: "14px 32px",
                  background: (selectedClothing && !loadingProducts)
                    ? "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
                    : "#ccc",
                  color: "#fff",
                  border: "none",
                  borderRadius: "12px",
                  fontSize: "1rem",
                  fontWeight: "700",
                  cursor: (selectedClothing && !loadingProducts) ? "pointer" : "not-allowed",
                  boxShadow: "0 4px 15px rgba(0,0,0,0.2)",
                  transition: "all 0.3s"
                }}
              >
                🎥 START CAMERA
              </button>
            )}

            {cameraOn && !captured && (
              <button
                onClick={capture}
                disabled={!poseDetected}
                style={{
                  padding: "14px 32px",
                  background: poseDetected 
                    ? "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)"
                    : "#ccc",
                  color: "#fff",
                  border: "none",
                  borderRadius: "12px",
                  fontSize: "1rem",
                  fontWeight: "700",
                  cursor: poseDetected ? "pointer" : "not-allowed",
                  boxShadow: "0 4px 15px rgba(0,0,0,0.2)",
                  transition: "all 0.3s"
                }}
              >
                📸 CAPTURE PHOTO
              </button>
            )}

            {captured && (
              <>
                <button
                  onClick={retake}
                  style={{
                    padding: "14px 32px",
                    background: "#fff",
                    color: "#667eea",
                    border: "2px solid #667eea",
                    borderRadius: "12px",
                    fontSize: "1rem",
                    fontWeight: "700",
                    cursor: "pointer",
                    transition: "all 0.3s"
                  }}
                >
                  🔄 RETAKE
                </button>
                <button
                  onClick={handleDone}
                  style={{
                    padding: "14px 32px",
                    background: "linear-gradient(135deg, #11998e 0%, #38ef7d 100%)",
                    color: "#fff",
                    border: "none",
                    borderRadius: "12px",
                    fontSize: "1rem",
                    fontWeight: "700",
                    cursor: "pointer",
                    boxShadow: "0 4px 15px rgba(0,0,0,0.2)"
                  }}
                >
                  ✅ VIEW IN DASHBOARD
                </button>
              </>
            )}
          </div>

          {!selectedClothing && (
            <div style={{
              marginTop: "20px",
              padding: "15px",
              background: "#fff3cd",
              border: "1px solid #ffc107",
              borderRadius: "8px",
              textAlign: "center",
              color: "#856404"
            }}>
              ⚠️ Please select a clothing item from the right panel to begin
            </div>
          )}

          {cameraOn && !poseDetected && (
            <div style={{
              marginTop: "20px",
              padding: "15px",
              background: "#e3f2fd",
              border: "1px solid #2196F3",
              borderRadius: "8px",
              textAlign: "center",
              color: "#1565C0"
            }}>
              👤 Position yourself in front of the camera. Make sure your shoulders and upper body are visible.
            </div>
          )}
        </div>

        {/* Clothing Selection Panel */}
        <div style={{
          background: "#fff",
          borderRadius: "20px",
          padding: "20px",
          boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
          maxHeight: "calc(100vh - 180px)",
          overflowY: "auto"
        }}>
          <h2 style={{
            fontSize: "1.3rem",
            fontWeight: "700",
            marginBottom: "20px",
            color: "#333"
          }}>
            Choose Your Outfit
          </h2>

          {loadingProducts ? (
            <div style={{ textAlign: "center", padding: "40px" }}>
              <div style={{ fontSize: "2rem" }}>⏳</div>
              <p>Loading products...</p>
            </div>
          ) : (
            <div style={{
              display: "grid",
              gridTemplateColumns: "1fr",
              gap: "12px"
            }}>
              {products.map(product => (
                <div
                  key={product.id}
                  onClick={() => setSelectedClothing(product)}
                  style={{
                    border: selectedClothing?.id === product.id 
                      ? "3px solid #667eea" 
                      : "2px solid #e0e0e0",
                    borderRadius: "12px",
                    padding: "12px",
                    cursor: "pointer",
                    transition: "all 0.2s",
                    background: selectedClothing?.id === product.id 
                      ? "linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)" 
                      : "#fff",
                    display: "flex",
                    gap: "12px",
                    alignItems: "center"
                  }}
                >
                  <div style={{
                    width: "80px",
                    height: "80px",
                    borderRadius: "8px",
                    overflow: "hidden",
                    flexShrink: 0,
                    background: "#f5f5f5",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    position: "relative"
                  }}>
                    <img
                      src={product.image_svg}
                      alt={product.name}
                      style={{
                        maxWidth: "100%",
                        maxHeight: "100%",
                        objectFit: "contain"
                      }}
                    />
                    {imagesLoaded[product.id] && (
                      <div style={{
                        position: "absolute",
                        top: "4px",
                        right: "4px",
                        background: "#4CAF50",
                        color: "#fff",
                        borderRadius: "50%",
                        width: "20px",
                        height: "20px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "0.7rem"
                      }}>
                        ✓
                      </div>
                    )}
                  </div>
                  <div style={{ flex: 1 }}>
                    <h3 style={{
                      fontSize: "0.95rem",
                      fontWeight: "600",
                      margin: "0 0 4px",
                      color: "#333"
                    }}>
                      {product.name}
                    </h3>
                    <div style={{
                      display: "flex",
                      gap: "6px",
                      marginBottom: "4px"
                    }}>
                      <span style={{
                        fontSize: "0.75rem",
                        padding: "2px 8px",
                        background: "#e3f2fd",
                        color: "#1976d2",
                        borderRadius: "4px",
                        fontWeight: "600"
                      }}>
                        {product.type}
                      </span>
                      {product.fit_scale === "oversized" && (
                        <span style={{
                          fontSize: "0.75rem",
                          padding: "2px 8px",
                          background: "#f3e5f5",
                          color: "#7b1fa2",
                          borderRadius: "4px",
                          fontWeight: "600"
                        }}>
                          Oversized
                        </span>
                      )}
                    </div>
                    <p style={{
                      fontSize: "1rem",
                      fontWeight: "700",
                      color: "#667eea",
                      margin: 0
                    }}>
                      {product.price}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}