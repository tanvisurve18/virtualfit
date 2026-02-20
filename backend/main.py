"""
Virtual Try-On Backend - Hugging Face IDM-VTON
Clean overlay: no black background, proper cloth placement
"""

from fastapi import FastAPI, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image, ImageFilter
from dotenv import load_dotenv
import io
import base64
import logging
import numpy as np
import tempfile
import os
import asyncio
load_dotenv()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ── Hugging Face token ─────────────────────────────────────────────────────
HF_TOKEN = os.getenv("HF_TOKEN") 

# ── Gradio client ──────────────────────────────────────────────────────────
try:
    from gradio_client import Client, handle_file
    hf_client = Client("yisol/IDM-VTON", hf_token=HF_TOKEN)
    IDM_VTON_AVAILABLE = True
    logger.info("✅ IDM-VTON Space connected!")
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


# ── Background removal ─────────────────────────────────────────────────────

def remove_white_background(garment_img: Image.Image) -> Image.Image:
    """Remove white/near-white background from garment image."""
    img = garment_img.convert("RGBA")
    data = np.array(img, dtype=np.float32)
    r, g, b = data[:,:,0], data[:,:,1], data[:,:,2]

    # Detect white pixels
    white_mask = (r > 230) & (g > 230) & (b > 230)

    # Soft edge for near-white
    whiteness = np.clip((r + g + b) / 3, 0, 255)
    new_alpha = np.where(
        white_mask, 0,
        np.where(whiteness > 200, (255 - whiteness) * 6, 255)
    )
    data[:,:,3] = np.clip(new_alpha, 0, 255).astype(np.uint8)

    result = Image.fromarray(data.astype(np.uint8), 'RGBA')

    # Soften edges slightly
    alpha = result.split()[3]
    alpha = alpha.filter(ImageFilter.GaussianBlur(1))
    result.putalpha(alpha)
    return result


# ── Fallback overlay (NO black background) ────────────────────────────────

def fallback_overlay(person_img: Image.Image, garment_img: Image.Image) -> Image.Image:
    """
    Overlay garment on person image.
    - No black background
    - Uses face detection to find correct body position
    - Garment is transparent where white
    """
    TARGET_W, TARGET_H = 768, 1024
    person_img = person_img.resize((TARGET_W, TARGET_H), Image.Resampling.LANCZOS)
    width, height = person_img.size

    # ── Detect face to anchor shirt position ──
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
        shoulder_top_y    = int(height * 0.20)
        shoulder_width    = int(width  * 0.44)
        shoulder_center_x = width // 2
        torso_height      = int(height * 0.38)

    # ── Size garment to torso ──
    g_w, g_h       = garment_img.size
    garment_width  = int(shoulder_width * 1.2)
    garment_height = int(garment_width * g_h / g_w)

    # Cap height to torso
    max_h = int(torso_height * 1.05)
    if garment_height > max_h and max_h > 60:
        garment_height = max_h
        garment_width  = int(garment_height * g_w / g_h)

    garment_resized = garment_img.resize((garment_width, garment_height), Image.Resampling.LANCZOS)

    # ── Remove white background from garment ──
    garment_rgba = remove_white_background(garment_resized)

    # ── Position: centered on shoulders ──
    x = shoulder_center_x - garment_width  // 2
    y = shoulder_top_y

    # Clamp to image bounds
    x = max(0, min(x, TARGET_W - garment_width))
    y = max(0, min(y, TARGET_H - garment_height))

    logger.info(
        f"📐 Garment {garment_width}x{garment_height} at ({x},{y}) "
        f"shoulders_width={shoulder_width} torso_h={torso_height}"
    )

    # ── Composite: paste garment ONTO person (no black box) ──
    result = person_img.convert("RGBA")
    result.paste(garment_rgba, (x, y), garment_rgba)   # uses alpha mask

    return result.convert("RGB")


# ── IDM-VTON via Hugging Face ──────────────────────────────────────────────

def run_idm_vton(person_img: Image.Image, garment_img: Image.Image, desc: str) -> Image.Image:
    with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as pf:
        person_img.save(pf.name)
        person_path = pf.name

    with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as gf:
        garment_img.save(gf.name)
        garment_path = gf.name

    try:
        logger.info("🚀 Calling IDM-VTON (timeout=300s)...")
        result = hf_client.predict(
            dict(background=handle_file(person_path), layers=[], composite=None),
            handle_file(garment_path),
            desc,
            True,   # auto-mask
            True,   # auto-crop
            30,     # steps
            42,     # seed
            api_name="/tryon",
        )
        logger.info(f"✅ IDM-VTON result: {result}")

        output_path = result[0]
        if isinstance(output_path, dict):
            output_path = output_path.get("url") or output_path.get("path")

        return Image.open(output_path).convert("RGB")

    finally:
        os.unlink(person_path)
        os.unlink(garment_path)


# ── Routes ─────────────────────────────────────────────────────────────────

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

        person_bytes  = await person_image.read()
        garment_bytes = await garment_image.read()

        person_img  = Image.open(io.BytesIO(person_bytes)).convert("RGB")
        garment_img = Image.open(io.BytesIO(garment_bytes)).convert("RGB")

        logger.info(f"Person: {person_img.size}  Garment: {garment_img.size}")

        result_img = None

        if IDM_VTON_AVAILABLE:
            try:
                # Run in thread so it doesn't block the event loop
                loop = asyncio.get_event_loop()
                result_img = await asyncio.wait_for(
                    loop.run_in_executor(
                        None, run_idm_vton, person_img, garment_img, garment_description
                    ),
                    timeout=300   # 5 minutes
                )
                logger.info("✅ IDM-VTON success!")
            except asyncio.TimeoutError:
                logger.error("❌ IDM-VTON timed out after 300s, using fallback")
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
        logger.error(f"❌ Unexpected error: {e}")
        import traceback; traceback.print_exc()
        return {"success": False, "error": str(e)}


if __name__ == "__main__":
    import uvicorn
    print("=" * 60)
    print("🎨 Virtual Try-On API — IDM-VTON (Hugging Face)")
    print("=" * 60)
    print(f"   IDM-VTON  : {'✅ connected' if IDM_VTON_AVAILABLE else '❌ not connected'}")
    print("   Timeout   : 300 seconds")
    print("   Docs      : http://localhost:8000/docs")
    print("=" * 60)
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info", timeout_keep_alive=300)