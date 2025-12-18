import React, { useState } from "react";
import CameraModule from "../components/CameraModule";

export default function TryOn() {
  const [userImage, setUserImage] = useState(null);

  const handleCapturedImage = (img) => {
    console.log("User photo:", img);
    setUserImage(img);

    // Here you will send this image to AI Try-On
    // e.g., sendToAI(img);
  };

  return (
    <div style={{ paddingTop: "80px" }}>
      <CameraModule onImageCaptured={handleCapturedImage} />

      {userImage && (
        <div style={{ textAlign: "center", marginTop: "20px" }}>
          <h3>Preview</h3>
          <img
            src={userImage}
            alt="User Uploaded"
            style={{ width: "260px", borderRadius: "10px" }}
          />
        </div>
      )}
    </div>
  );
}
