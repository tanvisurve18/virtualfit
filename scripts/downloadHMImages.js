// scripts/downloadHMImages.js
import fs from "fs";
import path from "path";
import https from "https";
import { fileURLToPath } from "url";

/* ✅ Fix __dirname for ES Modules */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/* Images to download */
const images = [
  {
    url: "https://www2.hm.com/en_in/productpage.1125307001/_jcr_content/mainProductImage/display.transform/jpeg_800/image.jpg",
    filename: "relaxed-fit.jpg",
  },
  {
    url: "https://www2.hm.com/en_in/productpage.0993840002/_jcr_content/mainProductImage/display.transform/jpeg_800/image.jpg",
    filename: "regular-fit.jpg",
  },
];

/* Destination folder */
const downloadDir = path.join(__dirname, "../public/hm/men-tshirts");

/* Create directory if not exists */
if (!fs.existsSync(downloadDir)) {
  fs.mkdirSync(downloadDir, { recursive: true });
}

/* Download images */
images.forEach(({ url, filename }) => {
  const filePath = path.join(downloadDir, filename);
  const file = fs.createWriteStream(filePath);

  https
    .get(url, (response) => {
      response.pipe(file);
      file.on("finish", () => {
        file.close();
        console.log(`✅ Downloaded: ${filename}`);
      });
    })
    .on("error", (err) => {
      fs.unlink(filePath, () => {});
      console.error(`❌ Error downloading ${filename}:`, err.message);
    });
});
