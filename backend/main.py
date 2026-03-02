"""
Virtual Try-On Backend
- Primary: yisol/IDM-VTON (GPU, best quality)
- Fallback: Face detection overlay
"""

from fastapi import FastAPI, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image, ImageFilter
import io
import base64
import logging
import numpy as np
import tempfile
import os
import asyncio
from dotenv import load_dotenv
load_dotenv()  # Load environment variables from .env file
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

HF_TOKEN = os.environ.get("HF_TOKEN", "")  # loaded from .env via load_dotenv()

try:
    from gradio_client import Client, handle_file
    # Login to HuggingFace if token provided
    if HF_TOKEN:
        from huggingface_hub import login
        login(token=HF_TOKEN, add_to_git_credential=False)
    hf_client = Client("yisol/IDM-VTON")
    IDM_VTON_AVAILABLE = True
    logger.info(f"✅ yisol/IDM-VTON connected! (logged in: {bool(HF_TOKEN)})")
except Exception as e:
    IDM_VTON_AVAILABLE = False
    logger.warning(f"⚠️ IDM-VTON not available: {e}")

app = FastAPI(title="Virtual Try-On API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def remove_background(garment_img: Image.Image) -> Image.Image:
    img = garment_img.convert("RGBA")
    data = np.array(img, dtype=np.float32)
    h, w = data.shape[:2]
    corner_size = max(3, min(8, h//10, w//10))
    corners = [
        data[:corner_size, :corner_size, :3],
        data[:corner_size, -corner_size:, :3],
        data[-corner_size:, :corner_size, :3],
        data[-corner_size:, -corner_size:, :3],
    ]
    corner_pixels = np.concatenate([c.reshape(-1, 3) for c in corners])
    bg_color = corner_pixels.mean(axis=0)
    bg_std = corner_pixels.std()
    bg_brightness = bg_color.mean()

    # Only remove if bg is clearly white/light and uniform
    if bg_std > 25 or bg_brightness < 180:
        return img

    r, g, b = data[:,:,0], data[:,:,1], data[:,:,2]
    dist = np.sqrt((r - bg_color[0])**2 + (g - bg_color[1])**2 + (b - bg_color[2])**2)
    threshold, soft_zone = 35, 15
    alpha = np.where(dist < threshold, 0,
             np.where(dist < threshold + soft_zone,
                      ((dist - threshold) / soft_zone * 255), 255))
    data[:,:,3] = np.clip(alpha, 0, 255).astype(np.uint8)
    result = Image.fromarray(data.astype(np.uint8), 'RGBA')
    result.putalpha(result.split()[3].filter(ImageFilter.GaussianBlur(1)))
    return result


def fallback_overlay(person_img: Image.Image, garment_img: Image.Image) -> Image.Image:
    width, height = person_img.size
    try:
        import cv2
        img_array = np.array(person_img)
        gray = cv2.cvtColor(img_array, cv2.COLOR_RGB2GRAY)
        face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
        faces = face_cascade.detectMultiScale(gray, 1.1, 4, minSize=(30, 30))
        if len(faces) > 0:
            faces = sorted(faces, key=lambda f: f[2] * f[3], reverse=True)
            fx, fy, fw, fh = faces[0]
            shoulder_top_y    = fy + fh + int(fh * 0.35)
            shoulder_width    = int(fw * 3.2)
            shoulder_center_x = fx + fw // 2
            torso_height      = int(fh * 3.8)
            logger.info(f"Face found: ({fx},{fy}) {fw}x{fh}")
        else:
            raise Exception("no face")
    except:
        shoulder_top_y    = int(height * 0.22)
        shoulder_width    = int(width * 0.42)
        shoulder_center_x = width // 2
        torso_height      = int(height * 0.36)

    g_w, g_h = garment_img.size
    garment_width  = int(shoulder_width * 1.2)
    garment_height = int(garment_width * g_h / g_w)
    max_h = int(torso_height * 1.05)
    if garment_height > max_h and max_h > 60:
        garment_height = max_h
        garment_width  = int(garment_height * g_w / g_h)

    garment_resized = garment_img.resize((garment_width, garment_height), Image.Resampling.LANCZOS)
    garment_rgba    = remove_background(garment_resized)
    x = max(0, min(shoulder_center_x - garment_width // 2, width - garment_width))
    y = max(0, min(shoulder_top_y, height - garment_height))
    result = person_img.convert("RGBA")
    result.paste(garment_rgba, (x, y), garment_rgba)
    return result.convert("RGB")


def run_idm_vton(person_img, garment_img, desc):
    with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as pf:
        person_img.save(pf.name); person_path = pf.name
    with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as gf:
        garment_img.save(gf.name); garment_path = gf.name
    try:
        logger.info("🚀 Calling yisol/IDM-VTON...")
        result = hf_client.predict(
            dict(background=handle_file(person_path), layers=[], composite=None),
            handle_file(garment_path),
            desc,
            True, True, 20, 42,
            api_name="/tryon",
        )
        output_path = result[0]
        if isinstance(output_path, dict):
            output_path = output_path.get("url") or output_path.get("path")
        logger.info(f"✅ IDM-VTON done: {output_path}")
        return Image.open(output_path).convert("RGB")
    finally:
        os.unlink(person_path)
        os.unlink(garment_path)


@app.get("/")
async def root():
    return {"status": "online", "idm_vton": IDM_VTON_AVAILABLE}

@app.get("/health")
async def health():
    return {"status": "healthy", "idm_vton": IDM_VTON_AVAILABLE}

@app.post("/api/try-on-base64")
async def tryon_base64(
    person_image:        UploadFile = File(...),
    garment_image:       UploadFile = File(...),
    garment_description: str        = Form(default="upper body clothing"),
    category:            str        = Form(default="upper_body"),
):
    try:
        logger.info(f"📸 Processing: {garment_description}")
        person_img  = Image.open(io.BytesIO(await person_image.read())).convert("RGB")
        garment_img = Image.open(io.BytesIO(await garment_image.read())).convert("RGB")
        logger.info(f"Person: {person_img.size}  Garment: {garment_img.size}")

        result_img = None

        if IDM_VTON_AVAILABLE:
            try:
                loop = asyncio.get_event_loop()
                result_img = await asyncio.wait_for(
                    loop.run_in_executor(None, run_idm_vton, person_img, garment_img, garment_description),
                    timeout=300  # 5 min - if yisol GPU doesn't respond in 5min, use fallback
                )
                logger.info("✅ IDM-VTON success!")
            except asyncio.TimeoutError:
                logger.error("❌ Timed out after 5min, using fallback")
            except Exception as e:
                logger.error(f"❌ IDM-VTON error: {e}, using fallback")

        if result_img is None:
            logger.info("⚙️ Running fallback overlay...")
            result_img = fallback_overlay(person_img, garment_img)

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
    print("=" * 55)
    print("🎨 Virtual Try-On — yisol/IDM-VTON (GPU)")
    print("=" * 55)
    print(f"   IDM-VTON : {'✅ connected' if IDM_VTON_AVAILABLE else '❌ not connected'}")
    print("   Timeout  : 300s")
    print("   Docs     : http://localhost:8000/docs")
    print("=" * 55)
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info", timeout_keep_alive=600)