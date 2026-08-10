const express = require("express");
const cors = require("cors");
const multer = require("multer");
const fs = require("fs");
const path = require("path");

const {
  createVideoJob,
  getVideoJob
} = require("./services/videoGenerator");

const app = express();

const PORT = process.env.PORT || 3000;

// ========================================
// DIRECTORIES
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
// FILE UPLOAD
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

  return res.json({

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

    return res.json({

      success: true,

      service: "KIM AI VIDEO",

      version: "1.0.0",

      status: "online",

      aiEngine: "ready",

      message:
        "KIM AI VIDEO backend is running."

    });

  }
);

// ========================================
// HEALTH CHECK
// ========================================

app.get(
  "/health",
  (req, res) => {

    return res.status(200).json({

      success: true,

      status: "ok",

      service:
        "KIM AI VIDEO",

      timestamp:
        new Date().toISOString()

    });

  }
);

// ========================================
// UPLOAD API
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

      console.log("");
      console.log(
        "========== FILE UPLOAD =========="
      );

      console.log(
        "Original:",
        req.file.originalname
      );

      console.log(
        "Saved:",
        req.file.filename
      );

      console.log(
        "Size:",
        req.file.size
      );

      console.log(
        "Type:",
        req.file.mimetype
      );

      console.log(
        "================================="
      );
      console.log("");

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
// GENERATE VIDEO API
// ========================================

app.post(
  "/api/generate",
  async (req, res) => {

    try {

      const {
        prompt,
        duration = 5,
        resolution = "720p",
        mode = "text-to-video",
        imagePath = null
      } = req.body;

      // ==================================
      // CHECK PROMPT
      // ==================================

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

      // ==================================
      // CHECK PROMPT LENGTH
      // ==================================

      if (
        prompt.trim().length > 2000
      ) {

        return res.status(400).json({

          success: false,

          error:
            "Prompt is too long. Maximum 2000 characters."

        });

      }

      // ==================================
      // VALID MODES
      // ==================================

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

      // ==================================
      // IMAGE-TO-VIDEO CHECK
      // ==================================

      if (
        mode === "image-to-video" &&
        imagePath
      ) {

        const cleanPath =
          imagePath
            .replace(/^\/+/, "")
            .replace(/^uploads\//, "");

        const fullImagePath =
          path.join(
            UPLOAD_DIR,
            cleanPath
          );

        if (
          !fs.existsSync(fullImagePath)
        ) {

          return res.status(400).json({

            success: false,

            error:
              "The selected image was not found."

          });

        }

      }

      // ==================================
      // DURATION
      // ==================================

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

      // ==================================
      // RESOLUTION
      // ==================================

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

      // ==================================
      // CREATE AI VIDEO JOB
      // ==================================

      const job =
        await createVideoJob({

          prompt:
            prompt.trim(),

          mode,

          duration:
            selectedDuration,

          resolution,

          imagePath

        });

      // ==================================
      // LOG JOB
      // ==================================

      console.log("");
      console.log(
        "===================================="
      );
      console.log(
        "       KIM AI VIDEO GENERATION"
      );
      console.log(
        "===================================="
      );

      console.log(
        "Job ID:",
        job.jobId
      );

      console.log(
        "Mode:",
        job.mode
      );

      console.log(
        "Prompt:",
        job.prompt
      );

      console.log(
        "Duration:",
        job.duration
      );

      console.log(
        "Resolution:",
        job.resolution
      );

      console.log(
        "Status:",
        job.status
      );

      console.log(
        "===================================="
      );
      console.log("");

      // ==================================
      // RESPONSE
      // ==================================

      return res.status(202).json({

        success: true,

        jobId:
          job.jobId,

        status:
          job.status,

        progress:
          job.progress,

        mode:
          job.mode,

        prompt:
          job.prompt,

        duration:
          job.duration,

        resolution:
          job.resolution,

        videoUrl:
          job.videoUrl,

        createdAt:
          job.createdAt,

        message:
          "Video generation job created successfully."

      });

    } catch (error) {

      console.error(
        "Generate API error:",
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
// GET VIDEO JOB STATUS
// ========================================

app.get(
  "/api/generate/:jobId",
  async (req, res) => {

    try {

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

      const job =
        await getVideoJob(
          jobId
        );

      return res.json({

        success: true,

        jobId:
          job.jobId,

        status:
          job.status,

        progress:
          job.progress,

        videoUrl:
          job.videoUrl,

        message:
          job.message

      });

    } catch (error) {

      console.error(
        "Job status error:",
        error
      );

      return res.status(500).json({

        success: false,

        error:
          "Unable to get video job status."

      });

    }

  }
);

// ========================================
// 404
// ========================================

app.use(
  (req, res) => {

    return res.status(404).json({

      success: false,

      error:
        "Route not found."

    });

  }
);

// ========================================
// GLOBAL ERROR HANDLER
// ========================================

app.use(
  (
    err,
    req,
    res,
    next
  ) => {

    console.error(
      "Global server error:",
      err
    );

    return res.status(500).json({

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
      "Job Status API: READY"
    );
    console.log(
      "===================================="
    );
    console.log("");

  }
);
