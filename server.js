const express = require("express");
const cors = require("cors");
const multer = require("multer");
const fs = require("fs");
const path = require("path");

const app = express();

const PORT = process.env.PORT || 3000;

// ========================================
// PATHS
// ========================================

const ROOT_DIR = __dirname;

const UPLOAD_DIR = path.join(
  ROOT_DIR,
  "uploads"
);

const OUTPUT_DIR = path.join(
  ROOT_DIR,
  "outputs"
);

const PUBLIC_DIR = path.join(
  ROOT_DIR,
  "public"
);

// ========================================
// CREATE DIRECTORIES
// ========================================

function createDirectory(directory) {
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, {
      recursive: true
    });
  }
}

createDirectory(UPLOAD_DIR);
createDirectory(OUTPUT_DIR);
createDirectory(PUBLIC_DIR);

// ========================================
// MIDDLEWARE
// ========================================

app.use(cors());

app.use(
  express.json({
    limit: "10mb"
  })
);

app.use(
  express.urlencoded({
    extended: true,
    limit: "10mb"
  })
);

// ========================================
// STATIC FILES
// ========================================

app.use(
  express.static(PUBLIC_DIR)
);

app.use(
  "/uploads",
  express.static(UPLOAD_DIR)
);

app.use(
  "/outputs",
  express.static(OUTPUT_DIR)
);

// ========================================
// MULTER UPLOAD
// ========================================

const storage = multer.diskStorage({

  destination: function (req, file, cb) {
    cb(null, UPLOAD_DIR);
  },

  filename: function (req, file, cb) {

    const extension =
      path.extname(file.originalname);

    const filename =
      Date.now() +
      "-" +
      Math.random()
        .toString(36)
        .substring(2, 10) +
      extension;

    cb(null, filename);
  }

});

const upload = multer({

  storage,

  limits: {
    fileSize: 100 * 1024 * 1024
  }

});

// ========================================
// HOME
// ========================================

app.get("/", (req, res) => {

  const indexFile =
    path.join(
      PUBLIC_DIR,
      "index.html"
    );

  if (fs.existsSync(indexFile)) {

    return res.sendFile(indexFile);

  }

  res.json({

    success: true,

    name: "KIM AI VIDEO",

    version: "1.0.0",

    status: "online",

    message:
      "Frontend index.html not found."

  });

});

// ========================================
// API STATUS
// ========================================

app.get(
  "/api/status",
  (req, res) => {

    res.json({

      success: true,

      service: "KIM AI VIDEO",

      version: "1.0.0",

      status: "online",

      aiModel: "not-connected",

      message:
        "KIM AI VIDEO backend is running."

    });

  }
);

// ========================================
// GENERATE VIDEO
// ========================================

app.post(
  "/api/generate",
  async (req, res) => {

    try {

      const {

        prompt,

        duration = 5,

        resolution = "720p",

        mode = "text-to-video"

      } = req.body;

      // -------------------------------
      // VALIDATE PROMPT
      // -------------------------------

      if (
        !prompt ||
        typeof prompt !== "string" ||
        prompt.trim().length === 0
      ) {

        return res.status(400).json({

          success: false,

          error:
            "Prompt is required."

        });

      }

      // -------------------------------
      // VALIDATE MODE
      // -------------------------------

      const allowedModes = [
        "text-to-video",
        "image-to-video"
      ];

      if (
        !allowedModes.includes(mode)
      ) {

        return res.status(400).json({

          success: false,

          error:
            "Invalid generation mode."

        });

      }

      // -------------------------------
      // VALIDATE DURATION
      // -------------------------------

      const allowedDurations = [
        5,
        10,
        15
      ];

      const selectedDuration =
        Number(duration);

      if (
        !allowedDurations.includes(
          selectedDuration
        )
      ) {

        return res.status(400).json({

          success: false,

          error:
            "Invalid duration."

        });

      }

      // -------------------------------
      // VALIDATE RESOLUTION
      // -------------------------------

      const allowedResolutions = [
        "720p",
        "1080p",
        "2K"
      ];

      if (
        !allowedResolutions.includes(
          resolution
        )
      ) {

        return res.status(400).json({

          success: false,

          error:
            "Invalid resolution."

        });

      }

      // -------------------------------
      // CREATE JOB ID
      // -------------------------------

      const jobId =
        "job_" +
        Date.now() +
        "_" +
        Math.random()
          .toString(36)
          .substring(2, 8);

      // -------------------------------
      // LOG
      // -------------------------------

      console.log("");
      console.log(
        "===================================="
      );
      console.log(
        "       NEW VIDEO GENERATION"
      );
      console.log(
        "===================================="
      );
      console.log(
        "Job ID:",
        jobId
      );
      console.log(
        "Mode:",
        mode
      );
      console.log(
        "Prompt:",
        prompt.trim()
      );
      console.log(
        "Duration:",
        selectedDuration
      );
      console.log(
        "Resolution:",
        resolution
      );
      console.log(
        "===================================="
      );
      console.log("");

      // -------------------------------
      // RESPONSE
      // -------------------------------

      return res.json({

        success: true,

        jobId,

        status: "queued",

        mode,

        prompt: prompt.trim(),

        duration: selectedDuration,

        resolution,

        createdAt:
          new Date().toISOString(),

        message:
          "Video generation job created."

      });

    } catch (error) {

      console.error(
        "Generation error:",
        error
      );

      return res.status(500).json({

        success: false,

        error:
          "Failed to create video generation job."

      });

    }

  }
);

// ========================================
// UPLOAD IMAGE / VIDEO
// ========================================

app.post(
  "/api/upload",
  upload.single("file"),
  (req, res) => {

    try {

      if (!req.file) {

        return res.status(400).json({

          success: false,

          error:
            "No file uploaded."

        });

      }

      const fileUrl =
        "/uploads/" +
        req.file.filename;

      return res.json({

        success: true,

        filename:
          req.file.filename,

        originalName:
          req.file.originalname,

        size:
          req.file.size,

        mimetype:
          req.file.mimetype,

        url:
          fileUrl

      });

    } catch (error) {

      console.error(
        "Upload error:",
        error
      );

      return res.status(500).json({

        success: false,

        error:
          "Upload failed."

      });

    }

  }
);

// ========================================
// GET JOB STATUS
// ========================================

app.get(
  "/api/generate/:jobId",
  (req, res) => {

    const {
      jobId
    } = req.params;

    if (!jobId) {

      return res.status(400).json({

        success: false,

        error:
          "Job ID is required."

      });

    }

    return res.json({

      success: true,

      jobId,

      status: "queued",

      progress: 0,

      videoUrl: null,

      message:
        "Generation system is waiting for AI model integration."

    });

  }
);

// ========================================
// HEALTH CHECK
// ========================================

app.get(
  "/health",
  (req, res) => {

    res.status(200).json({

      status: "ok",

      service:
        "KIM AI VIDEO",

      timestamp:
        new Date().toISOString()

    });

  }
);

// ========================================
// 404
// ========================================

app.use(
  (req, res) => {

    res.status(404).json({

      success: false,

      error:
        "Route not found."

    });

  }
);

// ========================================
// ERROR HANDLER
// ========================================

app.use(
  (
    err,
    req,
    res,
    next
  ) => {

    console.error(
      "Server error:",
      err
    );

    res.status(500).json({

      success: false,

      error:
        "Internal server error."

    });

  }
);

// ========================================
// START SERVER
// ========================================

app.listen(
  PORT,
  "0.0.0.0",
  () => {

    console.log("");
    console.log(
      "===================================="
    );
    console.log(
      "          KIM AI VIDEO"
    );
    console.log(
      "===================================="
    );
    console.log(
      "Status: ONLINE"
    );
    console.log(
      "Port:",
      PORT
    );
    console.log(
      "Frontend: READY"
    );
    console.log(
      "Upload API: READY"
    );
    console.log(
      "Generate API: READY"
    );
    console.log(
      "===================================="
    );
    console.log("");

  }
);
