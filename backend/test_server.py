"""
TEST SERVER for Virtual Try-On API
Returns input image as-is for testing connectivity
"""

from fastapi import FastAPI, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image
import io
import base64

app = FastAPI(title="Virtual Try-On Test API")

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {
        "status": "online",
        "message": "Test server running!"
    }

@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "gpu_available": False,
        "device": "cpu",
        "model_loaded": True
    }

@app.post("/api/try-on-base64")
async def test_tryon(
    person_image: UploadFile = File(...),
    garment_image: UploadFile = File(...),
    garment_description: str = Form(default="clothing"),
    category: str = Form(default="upper_body")
):
    """
    Test endpoint - returns person image as-is
    """
    try:
        print("📸 Received try-on request")
        
        # Read person image
        person_img = Image.open(io.BytesIO(await person_image.read())).convert("RGB")
        print(f"✅ Person image: {person_img.size}")
        
        # Just return the person image (no processing)
        result_img = person_img
        
        # Convert to base64
        buffered = io.BytesIO()
        result_img.save(buffered, format="PNG")
        img_str = base64.b64encode(buffered.getvalue()).decode()
        
        print("✅ Returning result")
        
        return {
            "success": True,
            "image": f"data:image/png;base64,{img_str}",
            "message": "Test successful! Replace with AI model for real try-on."
        }
        
    except Exception as e:
        print(f"❌ Error: {e}")
        return {
            "success": False,
            "error": str(e)
        }

if __name__ == "__main__":
    import uvicorn
    
    print("=" * 60)
    print("🧪 TEST SERVER - Virtual Try-On API")
    print("=" * 60)
    print("🌐 Server: http://0.0.0.0:8000")
    print("📖 API Docs: http://0.0.0.0:8000/docs")
    print("⚠️  This is a TEST server - returns input image as-is")
    print("💡 Add AI model later for real try-on results")
    print("=" * 60)
    
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")