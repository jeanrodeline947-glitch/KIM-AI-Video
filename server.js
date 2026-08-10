const express = require("express");
const cors = require("cors");
const multer = require("multer");
const fs = require("fs");
const path = require("path");

const app = express();

const PORT = process.env.PORT || 3000;

// ===============================
// DOSYE PWOJÈ A
// ===============================

const ROOT_DIR = __dirname;
const UPLOAD_DIR = path.join(ROOT_DIR, "uploads");
const OUTPUT_DIR = path.join(ROOT_DIR, "outputs");

// Kreye dosye yo si yo pa egziste
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// ===============================
// MIDDLEWARE
// ===============================

app.use(cors());

app.use(express.json({
  limit: "10mb"
}));

app.use(express.urlencoded({
  extended: true,
  limit: "10mb"
}));

// Pèmèt aksè ak fichiers uploads/outputs
app.use("/uploads", express.static(UPLOAD_DIR));
app.use("/outputs", express.static(OUTPUT_DIR));

// ===============================
// UPLOAD CONFIGURATION
// ===============================

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, UPLOAD_DIR);
  },

  filename: function (req, file, cb) {
    const extension = path.extname(file.originalname);

    const filename =
      Date.now() +
      "-" +
      Math.random().toString(36).substring(2, 10) +
      extension;

    cb(null, filename);
  }
});

const upload = multer({
  storage: storage,

  limits: {
    fileSize: 100 * 1024 * 1024
  }
});

// ===============================
// HOME
// ===============================

app.get("/", (req, res) => {
  res.json({
    success: true,
    name: "KIM AI VIDEO",
    version: "1.0.0",
    status: "online",
    message: "KIM AI Video backend is running."
  });
});

// ===============================
// API STATUS
// ===============================

app.get("/api/status", (req, res) => {
  res.json({
    success: true,
    service: "KIM AI VIDEO",
    status: "online",
    aiModel: "not-connected",
    message: "Backend is ready for AI model integration."
  });
});

// ===============================
// GENERATE VIDEO
// ===============================

app.post("/api/generate", async (req, res) => {
  try {
    const {
      prompt,
      duration = 5,
      resolution = "720p",
      mode = "text-to-video"
    } = req.body;

    if (!prompt || typeof prompt !== "string") {
      return res.status(400).json({
        success: false,
        error: "Prompt is required."
      });
    }

    const jobId =
      "job_" +
      Date.now() +
      "_" +
      Math.random().toString(36).substring(2, 8);

    console.log("=================================");
    console.log("NEW VIDEO JOB");
    console.log("Job ID:", jobId);
    console.log("Mode:", mode);
    console.log("Prompt:", prompt);
    console.log("Duration:", duration);
    console.log("Resolution:", resolution);
    console.log("=================================");

    /*
      Pati sa a poko konekte ak yon modèl AI.

      Nan pwochen pati yo n ap ranplase
      simulation sa a ak vrè pipeline
      jenerasyon videyo.
    */

    return res.json({
      success: true,
      jobId,
      status: "queued",
      mode,
      prompt,
      duration,
      resolution,
      message: "Video generation job created."
    });

  } catch (error) {
    console.error("Generate error:", error);

    return res.status(500).json({
      success: false,
      error: "Failed to create video generation job."
    });
  }
});

// ===============================
// IMAGE / VIDEO UPLOAD
// ===============================

app.post("/api/upload", upload.single("file"), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: "No file uploaded."
      });
    }

    const fileUrl =
      `/uploads/${req.file.filename}`;

    return res.json({
      success: true,
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype,
      url: fileUrl
    });

  } catch (error) {
    console.error("Upload error:", error);

    return res.status(500).json({
      success: false,
      error: "Upload failed."
    });
  }
});

// ===============================
// JOB STATUS
// ===============================

app.get("/api/generate/:jobId", (req, res) => {
  const { jobId } = req.params;

  return res.json({
    success: true,
    jobId,
    status: "queued",
    message: "Generation system is waiting for AI model integration."
  });
});

// ===============================
// 404
// ===============================

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: "Route not found."
  });
});

// ===============================
// ERROR HANDLER
// ===============================

app.use((err, req, res, next) => {
  console.error("Server error:", err);

  res.status(500).json({
    success: false,
    error: "Internal server error."
  });
});

// ===============================
// START SERVER
// ===============================

app.listen(PORT, () => {
  console.log("");
  console.log("=================================");
  console.log("      KIM AI VIDEO");
  console.log("=================================");
  console.log(`Server running on port ${PORT}`);
  console.log(`http://localhost:${PORT}`);
  console.log("=================================");
  console.log("");
});
