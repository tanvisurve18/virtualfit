"""
Virtual Try-On Backend - Face Detection Overlay
"""

from fastapi import FastAPI, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image, ImageFilter
import io
import base64
import logging
import numpy as np
import os
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Virtual Try-On API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def remove_white_background(garment_img: Image.Image) -> Image.Image:
    img = garment_img.convert("RGBA")
    data = np.array(img, dtype=np.float32)
    r, g, b = data[:,:,0], data[:,:,1], data[:,:,2]
    white_mask = (r > 230) & (g > 230) & (b > 230)
    whiteness = np.clip((r + g + b) / 3, 0, 255)
    new_alpha = np.where(white_mask, 0, np.where(whiteness > 200, (255 - whiteness) * 6, 255))
    data[:,:,3] = np.clip(new_alpha, 0, 255).astype(np.uint8)
    result = Image.fromarray(data.astype(np.uint8), 'RGBA')
    alpha = result.split()[3]
    alpha = alpha.filter(ImageFilter.GaussianBlur(1))
    result.putalpha(alpha)
    return result


def create_overlay(person_img: Image.Image, garment_img: Image.Image) -> Image.Image:
    width, height = person_img.size

    try:
        import cv2
        img_array = np.array(person_img)
        gray = cv2.cvtColor(img_array, cv2.COLOR_RGB2GRAY)
        face_cascade = cv2.CascadeClassifier(
            cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
        )
        faces = face_cascade.detectMultiScale(gray, 1.1, 4, minSize=(30, 30))

        if len(faces) > 0:
            faces = sorted(faces, key=lambda f: f[2] * f[3], reverse=True)
            fx, fy, fw, fh = faces[0]
            shoulder_top_y    = fy + fh + int(fh * 0.25)
            shoulder_width    = int(fw * 2.9)
            shoulder_center_x = fx + fw // 2
            torso_height      = int(fh * 3.2)
            logger.info(f"✅ Face found at ({fx},{fy}) size {fw}x{fh}")
        else:
            raise Exception("no face detected")

    except Exception as ex:
        logger.warning(f"⚠️ Face detection failed ({ex}), using geometry fallback")
        shoulder_top_y    = int(height * 0.22)
        shoulder_width    = int(width  * 0.42)
        shoulder_center_x = width // 2
        torso_height      = int(height * 0.36)

    g_w, g_h       = garment_img.size
    garment_width  = int(shoulder_width * 1.2)
    garment_height = int(garment_width * g_h / g_w)
    max_h = int(torso_height * 1.05)
    if garment_height > max_h and max_h > 60:
        garment_height = max_h
        garment_width  = int(garment_height * g_w / g_h)

    garment_resized = garment_img.resize((garment_width, garment_height), Image.Resampling.LANCZOS)
    garment_rgba    = remove_white_background(garment_resized)

    x = max(0, min(shoulder_center_x - garment_width // 2, width  - garment_width))
    y = max(0, min(shoulder_top_y,                         height - garment_height))

    logger.info(f"📐 Garment {garment_width}x{garment_height} at ({x},{y})")

    result = person_img.convert("RGBA")
    result.paste(garment_rgba, (x, y), garment_rgba)
    return result.convert("RGB")


@app.get("/")
async def root():
    return {"status": "online", "message": "Virtual Try-On API"}

@app.get("/health")
async def health():
    return {"status": "healthy"}

@app.post("/api/try-on-base64")
async def tryon_base64(
    person_image:        UploadFile = File(...),
    garment_image:       UploadFile = File(...),
    garment_description: str        = Form(default="clothing"),
    category:            str        = Form(default="upper_body"),
):
    try:
        logger.info(f"📸 Processing: {garment_description}")
        person_img  = Image.open(io.BytesIO(await person_image.read())).convert("RGB")
        garment_img = Image.open(io.BytesIO(await garment_image.read())).convert("RGB")
        logger.info(f"Person: {person_img.size}  Garment: {garment_img.size}")

        result_img = create_overlay(person_img, garment_img)

        buf = io.BytesIO()
        result_img.save(buf, format="PNG", optimize=True)
        img_b64 = base64.b64encode(buf.getvalue()).decode()

        return {
            "success": True,
            "image":   f"data:image/png;base64,{img_b64}",
            "message": "Try-on generated!",
        }

    except Exception as e:
        logger.error(f"❌ {e}")
        import traceback; traceback.print_exc()
        return {"success": False, "error": str(e)}


if __name__ == "__main__":
    import uvicorn
    print("=" * 50)
    print("🎨 Virtual Try-On API — Face Detection")
    print("=" * 50)
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")