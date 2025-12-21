import React, { useEffect, useRef, useState } from "react";
import { Box, Button, Typography } from "@mui/material";
import { useLocation } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";


export default function TryOn() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const [cameraOn, setCameraOn] = useState(false);
  const [captured, setCaptured] = useState(false);
  const [photo, setPhoto] = useState(null);

  const query = new URLSearchParams(useLocation().search);
  const itemId = query.get("item");

  /* ---------------- START CAMERA ---------------- */
  const startCamera = async () => {
    try {
      // Stop old stream if exists
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setCameraOn(true);
      setCaptured(false);
    } catch (err) {
      console.error("Camera error:", err);
      alert("Camera access failed");
    }
  };

  /* ---------------- CAPTURE PHOTO ---------------- */
  const capturePhoto = async () => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    const ctx = canvas.getContext("2d");

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // mirror fix
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(async (blob) => {
      setCaptured(true);
      setPhoto(URL.createObjectURL(blob));

      // ✅ SAVE TRY-ON
      await saveTryOn(blob);
    }, "image/png");
  };


  /* ---------------- RETAKE ---------------- */
  const retake = async () => {
    setCaptured(false);
    setPhoto(null);

    // Fully restart camera on retake
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    await startCamera();
  };

  /* ---------------- SAVE TRYON ---------------- */
  const saveTryOn = async (imageUrl) => {
    try {
      const {
        data: { user },
        error: userError
      } = await supabase.auth.getUser();

      if (userError || !user) {
        console.error("User not logged in");
        return;
      }

      const { error } = await supabase
        .from("tryon_history")
        .insert({
          user_id: user.id,
          image_url: imageUrl,
          item_id: itemId, // optional
          created_at: new Date().toISOString()
        });

      if (error) {
        console.error("DB insert error:", error);
        return;
      }

      console.log("Try-on saved successfully");

    } catch (err) {
      console.error("Unexpected error:", err);
    }
  };




  /* ---------------- CLEANUP ---------------- */
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: "#f6f7fb",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 3
      }}
    >
      <Typography variant="h4" fontWeight={700}>
        Virtual Try-On
      </Typography>

      {/* CAMERA / PHOTO AREA */}
      <Box
        sx={{
          width: 520,
          height: 360,
          borderRadius: 3,
          overflow: "hidden",
          bgcolor: "#000",
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
        }}
      >
        {!captured ? (
          <video
            ref={videoRef}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              transform: "scaleX(-1)" // selfie view
            }}
            muted
            playsInline
          />
        ) : (
          <img
            src={photo}
            alt="Captured"
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        )}
      </Box>

      {/* CONTROLS */}
      {!cameraOn && (
        <Button variant="contained" onClick={startCamera}>
          OPEN CAMERA
        </Button>
      )}

      {cameraOn && !captured && (
        <Button variant="contained" onClick={capturePhoto}>
          CAPTURE
        </Button>
      )}

      {captured && (
        <Button variant="outlined" onClick={retake}>
          RETAKE
        </Button>
      )}

      <canvas ref={canvasRef} style={{ display: "none" }} />
    </Box>
  );
}
