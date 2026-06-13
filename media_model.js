const mongoose = require("mongoose");

const mediaSchema = new mongoose.Schema({
  originalName: { type: String, required: true },
  mimeType: { type: String, required: true },
  driveFileId: { type: String, required: true },
  viewUrl: { type: String, required: true },
  downloadUrl: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Media", mediaSchema);
