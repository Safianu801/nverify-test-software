require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const multer = require("multer");
const { uploadFileToDrive } = require("./google_drive");
const Media = require("./media_model");

const app = express();
app.use(cors());
app.use(express.json());

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
});

mongoose
  .connect(process.env.LOCAL_DATABASE)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.error("❌ MongoDB Connection Error:", err));

app.post("/api/upload", upload.single("mediaFile"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file provided" });

    const driveResponse = await uploadFileToDrive(req.file);

    const newMedia = new Media({
      originalName: driveResponse.name,
      mimeType: req.file.mimetype,
      driveFileId: driveResponse.id,
      viewUrl: driveResponse.webViewLink,
      downloadUrl: driveResponse.webContentLink,
    });

    await newMedia.save();
    res.status(201).json({ message: "Success", data: newMedia });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Running on http://localhost:${PORT}`));
