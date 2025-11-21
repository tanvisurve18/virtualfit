import React, { useEffect, useRef, useState } from 'react';
import { PoseLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';
import './VirtualTryOn.css';

// UPDATE 1: The component now accepts the full 'selectedItem' object as a prop.
const VirtualTryOn = ({ selectedItem }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [poseLandmarker, setPoseLandmarker] = useState(null);
  const [webcamRunning, setWebcamRunning] = useState(false);
  const [clothingItem, setClothingItem] = useState(null);

  // HOOK 1: This runs only ONCE to set up the pose landmarker. No changes here.
  useEffect(() => {
    const createPoseLandmarker = async () => {
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
      );
      const newPoseLandmarker = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: `/pose_landmarker_lite.task`,
          delegate: "GPU",
        },
        runningMode: "VIDEO",
        numPoses: 1,
      });
      setPoseLandmarker(newPoseLandmarker);
    };
    createPoseLandmarker();
  }, []);

  // UPDATE 2: This hook now watches for changes to 'selectedItem'.
  useEffect(() => {
    // It checks if the object exists and has an image property.
    if (selectedItem && selectedItem.image) {
      const img = new Image();
      img.crossOrigin = "anonymous";
      // It gets the URL from the object's 'image' property.
      img.src = selectedItem.image;
      img.onload = () => setClothingItem(img);
    } else {
      setClothingItem(null);
    }
    // The hook now depends on the entire 'selectedItem' object.
  }, [selectedItem]);

  // Function to enable the webcam
  const enableWebcam = () => {
    if (!poseLandmarker) {
      console.log("Wait! PoseLandmarker not loaded yet.");
      return;
    }
    setWebcamRunning(true);
    const constraints = { 
      video: { 
        width: { ideal: 640 }, 
        height: { ideal: 480 } 
      } 
    };
    navigator.mediaDevices.getUserMedia(constraints).then((stream) => {
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.addEventListener("loadeddata", predictWebcam);
      }
    });
  };

  // The main prediction loop
  // The main prediction loop
  let lastVideoTime = -1;
  const predictWebcam = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const canvasCtx = canvas.getContext('2d');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const startTimeMs = performance.now();
    if (lastVideoTime !== video.currentTime && poseLandmarker) {
      lastVideoTime = video.currentTime;
      poseLandmarker.detectForVideo(video, startTimeMs, (result) => {
        canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
        canvasCtx.drawImage(video, 0, 0, canvas.width, canvas.height);

        if (result.landmarks && result.landmarks.length > 0 && clothingItem) {
          // Get the live landmark data for the current frame
          const landmarks = result.landmarks[0];

          // Look up the coordinates for specific body parts using their index numbers
          const rightShoulder = landmarks[11];
          const leftShoulder = landmarks[12];
          const rightHip = landmarks[23];
          const leftHip = landmarks[24];

          // This safety check ensures we only run the math if the user's body is visible
          if (rightShoulder && leftShoulder && rightHip && leftHip) {
            
            // --- DYNAMIC CALCULATIONS USING LIVE LANDMARKS ---

            // 1. Calculate the user's current shoulder width from the live coordinates.
            const shoulderWidth = Math.abs(leftShoulder.x - rightShoulder.x) * canvas.width;

            // 2. Calculate the user's current torso height.
            const torsoHeight = Math.abs((leftShoulder.y + rightShoulder.y) / 2 - (leftHip.y + rightHip.y) / 2) * canvas.height;

            // 3. A master scale to fine-tune the overall size.
            const masterScale = 2.2; 

            // 4. Calculate the clothing width based on the user's shoulder width.
            const scaledWidth = shoulderWidth * masterScale;

            // 5. Calculate clothing height based on its own shape to prevent distortion.
            const clothingAspectRatio = clothingItem.width / clothingItem.height;
            const scaledHeight = scaledWidth / clothingAspectRatio;
            
            // 6. Calculate the center point of the user's shoulders for positioning.
            const centerX = ((leftShoulder.x + rightShoulder.x) / 2) * canvas.width;
            const centerY = ((leftShoulder.y + rightShoulder.y) / 2) * canvas.height;

            // 7. Add a small offset for a more natural collar position.
            const verticalOffset = torsoHeight * 0.1;

            // 8. Draw the image using these new calculations, which change every frame.
            canvasCtx.drawImage(
              clothingItem,
              centerX - scaledWidth / 2,
              centerY - verticalOffset,
              scaledWidth,
              scaledHeight
            );
          }
        }
      });
    }

    if (webcamRunning) {
      window.requestAnimationFrame(predictWebcam);
    }
  };

  return (
    <div className="container">
      {/* UPDATE 3: The title now shows the item's name if one is selected. */}
      <h2>{selectedItem ? selectedItem.title : 'VirtualFit - Virtual Try-On'}</h2>
      
      {/* The message now checks for 'selectedItem' as well. */}
      {!selectedItem && <p>Please select an item from the list to try it on!</p>}

      <div className="video-container">
        <video ref={videoRef} autoPlay playsInline style={{ display: 'none' }}></video>
        <canvas ref={canvasRef} className="output-canvas"></canvas>
      </div>
      <button onClick={enableWebcam} disabled={webcamRunning}>
        {webcamRunning ? 'WEBCAM ENABLED' : 'ENABLE WEBCAM'}
      </button>
    </div>
  );
};

export default VirtualTryOn; 