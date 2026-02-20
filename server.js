import express from "express";
import cors from "cors";
import multer from "multer";
import fetch from "node-fetch";
import FormData from "form-data";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const upload = multer();
app.use(cors());

app.post("/api/tryon", upload.fields([
  { name: "human_img" },
  { name: "garm_img" }
]), async (req, res) => {
  try {
    const formData = new FormData();
    formData.append("human_img", req.files.human_img[0].buffer);
    formData.append("garm_img", req.files.garm_img[0].buffer);
    formData.append("garment_des", "t-shirt");

    const hfRes = await fetch(
      "https://api-inference.huggingface.co/models/yisol/IDM-VTON",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.HF_API_TOKEN}`,
        },
        body: formData,
      }
    );

    const buffer = await hfRes.arrayBuffer();
    res.set("Content-Type", "image/png");
    res.send(Buffer.from(buffer));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Try-on failed" });
  }
});

app.listen(5000, () => {
  console.log("✅ Backend running at http://localhost:5000");
});
