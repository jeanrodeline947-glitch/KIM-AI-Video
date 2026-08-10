require("dotenv").config();

const express = require("express");
const cors = require("cors");
const multer = require("multer");
const fs = require("fs");
const path = require("path");

const {
  createVideoJob,
  getVideoJob,
  deleteVideoJob
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
// UPLOAD CONFIG
// ========================================

const storage =
  multer.diskStorage({

    destination: function (
      req,
      file,
      cb
    ) {
      cb(
        null,
        UPLOAD_DIR
      );
    },

    filename: function (
      req,
      file,
      cb
    ) {

      const extension =
        path.extname(
          file.originalname
        );

      const filename =
        Date.now() +
        "-" +
        Math.random()
          .toString(36)
          .substring(2, 10) +
        extension;

      cb(
        null,
        filename
      );
    }

  });

const upload =
  multer({

    storage,

    limits: {
      fileSize:
        100 * 1024 * 1024
    }

  });

// ========================================
// HOME
// ========================================

app.get(
  "/",
  (req, res) => {

    const indexFile =
      path.join(
        PUBLIC_DIR,
        "index.html"
      );

    if (
      fs.existsSync(
        indexFile
      )
    ) {

      return res.sendFile(
        indexFile
      );

    }

    return res.json({

      success: true,

      name:
        "KIM AI VIDEO",

      version:
        "1.0.0",

      status:
        "online"

    });

  }
);

// ========================================
// STATUS API
// ========================================

app.get(
  "/api/status",
  (req, res) => {

    const apiConfigured =
      Boolean(
        process.env.MINIMAX_API_KEY
      );

    return res.json({

      success: true,

      service:
        "KIM AI VIDEO",

      version:
        "1.0.0",

      status:
        "online",

      aiProvider:
        "MiniMax",

      apiConfigured,

      message:
        apiConfigured
          ? "AI configuration detected."
          : "MINIMAX_API_KEY is not configured."

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

      status:
        "ok",

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

      // ------------------------------------
      // PROMPT
      // ------------------------------------

      if (
        !prompt ||
        typeof prompt !==
          "string" ||
        !prompt.trim()
      ) {

        return res.status(400).json({

          success: false,

          error:
            "Prompt is required."

        });

      }

      if (
        prompt.trim().length >
        2000
      ) {

        return res.status(400).json({

          success: false,

          error:
            "Prompt cannot exceed 2000 characters."

        });

      }

      // ------------------------------------
      // MODE
      // ------------------------------------

      const allowedModes = [
        "text-to-video",
        "image-to-video"
      ];

      if (
        !allowedModes.includes(
          mode
        )
      ) {

        return res.status(400).json({

          success: false,

          error:
            "Invalid generation mode."

        });

      }

      // ------------------------------------
      // DURATION
      // ------------------------------------

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

      // ------------------------------------
      // RESOLUTION
      // ------------------------------------

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

      // ------------------------------------
      // API KEY
      // ------------------------------------

      if (
        !process.env.MINIMAX_API_KEY
      ) {

        return res.status(503).json({

          success: false,

          error:
            "MINIMAX_API_KEY is not configured."

        });

      }

      // ------------------------------------
      // IMAGE VALIDATION
      // ------------------------------------

      if (
        mode ===
          "image-to-video" &&
        imagePath
      ) {

        const cleanPath =
          imagePath
            .replace(
              /^\/+/,
              ""
            )
            .replace(
              /^uploads\//,
              ""
            );

        const fullImagePath =
          path.join(
            UPLOAD_DIR,
            cleanPath
          );

        if (
          !fs.existsSync(
            fullImagePath
          )
        ) {

          return res.status(400).json({

            success: false,

            error:
              "Selected image was not found."

          });

        }

      }

      // ------------------------------------
      // CREATE JOB
      // ------------------------------------

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
          job.createdAt

      });

    } catch (error) {

      console.error(
        "Generate API error:",
        error
      );

      return res.status(500).json({

        success: false,

        error:
          "Failed to create video job."

      });

    }

  }
);

// ========================================
// JOB STATUS API
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

      if (
        job.status ===
        "not-found"
      ) {

        return res.status(404).json({

          success: false,

          error:
            "Video job not found."

        });

      }

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
          job.message,

        createdAt:
          job.createdAt,

        startedAt:
          job.startedAt,

        completedAt:
          job.completedAt

      });

    } catch (error) {

      console.error(
        "Status API error:",
        error
      );

      return res.status(500).json({

        success: false,

        error:
          "Unable to get job status."

      });

    }

  }
);

// ========================================
// DELETE JOB
// ========================================

app.delete(
  "/api/generate/:jobId",
  async (req, res) => {

    try {

      const {
        jobId
      } = req.params;

      const deleted =
        await deleteVideoJob(
          jobId
        );

      if (!deleted) {

        return res.status(404).json({

          success: false,

          error:
            "Video job not found."

        });

      }

      return res.json({

        success: true,

        message:
          "Video job deleted."

      });

    } catch (error) {

      console.error(
        "Delete job error:",
        error
      );

      return res.status(500).json({

        success: false,

        error:
          "Unable to delete job."

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
      "Server error:",
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
      "MiniMax API:",
      process.env.MINIMAX_API_KEY
        ? "CONFIGURED"
        : "NOT CONFIGURED"
    );
    console.log(
      "===================================="
    );
    console.log("");

  }
);
