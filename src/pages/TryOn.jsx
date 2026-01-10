import React, { useEffect, useRef, useState } from "react";
import { Pose } from "@mediapipe/pose";
import { fetchShopifyProducts } from "../api/shopify";

/* ---------------- MOCK SUPABASE (unchanged) ---------------- */
const supabase = {
  auth: {
    getUser: async () => ({
      data: { user: { id: "user_123", email: "demo@virtualfit.com" } },
      error: null,
    }),
  },
  storage: {
    from: (bucket) => ({
      upload: async (path, blob) => ({ data: { path }, error: null }),
      getPublicUrl: (path) => ({
        data: { publicUrl: `https://storage.supabase.co/${bucket}/${path}` },
      }),
    }),
  },
  from: () => ({
    insert: async (data) => ({ data, error: null }),
  }),
};

export default function TryOn() {
  /* ---------------- REFS ---------------- */
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const poseRef = useRef(null);
  const animationRef = useRef(null);
  const landmarksRef = useRef(null);
  const streamRef = useRef(null);
  const clothingImagesRef = useRef({});

  /* ---------------- STATE ---------------- */
  const [cameraOn, setCameraOn] = useState(false);
  const [captured, setCaptured] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedClothing, setSelectedClothing] = useState(null);
  const [selectedSize, setSelectedSize] = useState("M");

  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [imagesLoaded, setImagesLoaded] = useState({});
  const [poseDetected, setPoseDetected] = useState(false);

  /* ---------------- SIZE SCALE ---------------- */
  const sizeScales = {
    XS: 0.8,
    S: 0.9,
    M: 1.0,
    L: 1.1,
    XL: 1.2,
    XXL: 1.3,
  };

  /* =========================================================
     ✅ SHOPIFY PRODUCTS (ONLY SOURCE OF PRODUCTS)
     ========================================================= */
  useEffect(() => {
    fetchShopifyProducts()
      .then((shopifyProducts) => {
        setProducts(shopifyProducts);
        preloadShopifyImages(shopifyProducts);
      })
      .catch(console.error)
      .finally(() => setLoadingProducts(false));
  }, []);

  /* ---------------- IMAGE PRELOAD (SHOPIFY) ---------------- */
  const preloadShopifyImages = (items) => {
    const loaded = {};
    let count = 0;

    items.forEach((product) => {
      const imgUrl = product.images?.[0]?.src;
      if (!imgUrl) return;

      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = imgUrl;

      img.onload = () => {
        clothingImagesRef.current[product.id] = img;
        loaded[product.id] = true;
        count++;

        if (count === items.length) {
          setImagesLoaded(loaded);
        }
      };
    });
  };

  useEffect(() => {
    async function loadProducts() {
      try {
        setLoadingProducts(true);
        const shopifyProducts = await fetchShopifyProducts();
        setProducts(shopifyProducts);
      } catch (err) {
        console.error("Shopify fetch failed:", err);
      } finally {
        setLoadingProducts(false);
      }
    }

    loadProducts();
  }, []);


  /* ---------------- MEDIAPIPE INIT ---------------- */
  useEffect(() => {
    const pose = new Pose({
      locateFile: (file) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
    });

    pose.setOptions({
      modelComplexity: 1,
      smoothLandmarks: true,
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
    return () => pose.close();
  }, []);

  /* ---------------- CAMERA ---------------- */
  const startCamera = async () => {
    if (cameraOn) return;

    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user" },
    });

    streamRef.current = stream;
    videoRef.current.srcObject = stream;
    videoRef.current.onloadedmetadata = () => {
      videoRef.current.play();
      setCameraOn(true);
      drawLoop();
    };
  };

  const stopCamera = () => {
    cancelAnimationFrame(animationRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    setCameraOn(false);
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

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    ctx.save();
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    ctx.restore();

    if (
      selectedClothing &&
      clothingImagesRef.current[selectedClothing.id]
    ) {
      drawClothing(ctx);
    }

    await poseRef.current.send({ image: video });
    animationRef.current = requestAnimationFrame(drawLoop);
  };

  /* ---------------- CLOTHING OVERLAY ---------------- */
  const drawClothing = (ctx) => {
    if (!landmarksRef.current) return;

    const img = clothingImagesRef.current[selectedClothing.id];
    if (!img) return;

    const lm = landmarksRef.current;
    const ls = lm[11];
    const rs = lm[12];
    const lh = lm[23];
    const rh = lm[24];

    if (!ls || !rs || !lh || !rh) return;

    const w = Math.abs(rs.x - ls.x) * canvasRef.current.width * 1.8;
    const h = Math.abs(lh.y - ls.y) * canvasRef.current.height * 1.4;
    const x = (1 - (ls.x + rs.x) / 2) * canvasRef.current.width - w / 2;
    const y = ls.y * canvasRef.current.height + 10;

    ctx.drawImage(img, x, y, w, h);
  };




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
              {products.map((product) => (
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
                    alignItems: "center",
                  }}
                >
                  {/* IMAGE */}
                  <div
                    style={{
                      width: "80px",
                      height: "80px",
                      borderRadius: "8px",
                      overflow: "hidden",
                      flexShrink: 0,
                      background: "#f5f5f5",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <img
                      src={product.images?.[0]?.src}
                      alt={product.title}
                      style={{
                        maxWidth: "100%",
                        maxHeight: "100%",
                        objectFit: "contain",
                      }}
                    />
                  </div>

                  {/* DETAILS */}
                  <div style={{ flex: 1 }}>
                    <h3
                      style={{
                        fontSize: "0.95rem",
                        fontWeight: "600",
                        margin: "0 0 4px",
                        color: "#333",
                      }}
                    >
                      {product.title}
                    </h3>

                    {product.product_type && (
                      <span
                        style={{
                          fontSize: "0.75rem",
                          padding: "2px 8px",
                          background: "#e3f2fd",
                          color: "#1976d2",
                          borderRadius: "4px",
                          fontWeight: "600",
                          display: "inline-block",
                          marginBottom: "6px",
                        }}
                      >
                        {product.product_type}
                      </span>
                    )}

                    <p
                      style={{
                        fontSize: "1rem",
                        fontWeight: "700",
                        color: "#667eea",
                        margin: 0,
                      }}
                    >
                      ₹{product.variants?.[0]?.price}
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