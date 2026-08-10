"use strict";

const fs = require("fs");
const path = require("path");

// ========================================
// CONFIGURATION
// ========================================

const OUTPUT_DIR = path.join(
  __dirname,
  "..",
  "outputs"
);

const MINIMAX_API_KEY =
  process.env.MINIMAX_API_KEY;

const MINIMAX_BASE_URL =
  process.env.MINIMAX_BASE_URL ||
  "https://api.minimax.io";

const MINIMAX_VIDEO_MODEL =
  process.env.MINIMAX_VIDEO_MODEL ||
  "MiniMax-Hailuo-2.3";

// Polling interval.
// MiniMax documentation recommends around 10 seconds.
const POLL_INTERVAL_MS =
  Number(process.env.MINIMAX_POLL_INTERVAL_MS) ||
  10000;

// Maximum time we allow one generation job
// to stay in polling.
const MAX_POLL_TIME_MS =
  Number(process.env.MINIMAX_MAX_POLL_TIME_MS) ||
  30 * 60 * 1000;

// ========================================
// CREATE OUTPUT DIRECTORY
// ========================================

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, {
    recursive: true
  });
}

// ========================================
// LOCAL JOB STORAGE
// ========================================

const jobs = new Map();

// ========================================
// HELPERS
// ========================================

function requireApiKey() {
  if (!MINIMAX_API_KEY) {
    throw new Error(
      "MINIMAX_API_KEY is not configured."
    );
  }
}

function getHeaders() {
  requireApiKey();

  return {
    "Authorization":
      `Bearer ${MINIMAX_API_KEY}`,

    "Content-Type":
      "application/json"
  };
}

function sleep(ms) {
  return new Promise(resolve => {
    setTimeout(resolve, ms);
  });
}

function safeFilename(value) {
  return String(value)
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .substring(0, 80);
}

function getLocalImagePath(imagePath) {
  if (!imagePath) {
    return null;
  }

  const cleanPath = String(imagePath)
    .replace(/^\/+/, "")
    .replace(/^uploads[\\/]+/, "");

  const uploadsDir = path.resolve(
    __dirname,
    "..",
    "uploads"
  );

  const fullPath = path.resolve(
    uploadsDir,
    cleanPath
  );

  // Prevent path traversal.
  if (
    fullPath !== uploadsDir &&
    !fullPath.startsWith(
      uploadsDir + path.sep
    )
  ) {
    throw new Error(
      "Invalid image path."
    );
  }

  return fullPath;
}

// ========================================
// MINI MAX API REQUEST
// ========================================

async function minimaxRequest(
  url,
  options = {}
) {
  const response =
    await fetch(
      url,
      {
        ...options,
        headers: {
          ...getHeaders(),
          ...(options.headers || {})
        }
      }
    );

  const text =
    await response.text();

  let data;

  try {
    data = text
      ? JSON.parse(text)
      : {};
  } catch {
    data = {
      raw: text
    };
  }

  if (!response.ok) {

    const message =
      data?.base_resp?.status_msg ||
      data?.message ||
      data?.error_message ||
      `MiniMax API returned HTTP ${response.status}`;

    const error =
      new Error(message);

    error.status =
      response.status;

    error.response =
      data;

    throw error;
  }

  if (
    data?.base_resp &&
    Number(
      data.base_resp.status_code
    ) !== 0
  ) {

    const error =
      new Error(
        data.base_resp.status_msg ||
        "MiniMax API request failed."
      );

    error.response =
      data;

    throw error;
  }

  return data;
}

// ========================================
// CREATE MINIMAX VIDEO TASK
// ========================================

async function createMiniMaxTask({
  prompt,
  mode,
  duration,
  resolution,
  imagePath
}) {

  requireApiKey();

  const payload = {

    model:
      MINIMAX_VIDEO_MODEL,

    prompt:
      prompt,

    duration:
      Number(duration),

    resolution:
      resolution

  };

  // --------------------------------------
  // IMAGE TO VIDEO
  // --------------------------------------

  if (
    mode ===
    "image-to-video"
  ) {

    if (!imagePath) {

      throw new Error(
        "imagePath is required for image-to-video."
      );

    }

    const localImage =
      getLocalImagePath(
        imagePath
      );

    if (
      !localImage ||
      !fs.existsSync(localImage)
    ) {

      throw new Error(
        "The uploaded image was not found."
      );

    }

    /*
     * MiniMax I2V expects an image URL
     * for first_frame_image.
     *
     * Therefore, the local upload must
     * first be uploaded to a publicly
     * reachable URL / MiniMax file service.
     *
     * This implementation does not invent
     * a fake public URL.
     *
     * For now, reject local-only I2V until
     * the upload-to-MiniMax step is enabled.
     */

    throw new Error(
      "Image-to-video requires the uploaded image to be available as a public URL or uploaded through MiniMax File API. Text-to-video is ready now."
    );
  }

  // --------------------------------------
  // TEXT TO VIDEO
  // --------------------------------------

  const url =
    `${MINIMAX_BASE_URL}/v1/video_generation`;

  const data =
    await minimaxRequest(
      url,
      {
        method: "POST",

        body:
          JSON.stringify(
            payload
          )
      }
    );

  if (!data.task_id) {

    throw new Error(
      "MiniMax did not return a task_id."
    );
  }

  return data.task_id;
}

// ========================================
// QUERY MINIMAX TASK
// ========================================

async function queryMiniMaxTask(
  taskId
) {

  const url =
    `${MINIMAX_BASE_URL}` +
    `/v1/query/video_generation` +
    `?task_id=${encodeURIComponent(taskId)}`;

  return minimaxRequest(
    url,
    {
      method: "GET"
    }
  );
}

// ========================================
// RETRIEVE FILE INFORMATION
// ========================================

async function retrieveMiniMaxFile(
  fileId
) {

  const url =
    `${MINIMAX_BASE_URL}` +
    `/v1/files/retrieve` +
    `?file_id=${encodeURIComponent(fileId)}`;

  const data =
    await minimaxRequest(
      url,
      {
        method: "GET"
      }
    );

  if (
    !data.file ||
    !data.file.download_url
  ) {

    throw new Error(
      "MiniMax did not return a download URL."
    );
  }

  return data.file;
}

// ========================================
// DOWNLOAD VIDEO
// ========================================

async function downloadVideo(
  downloadUrl,
  outputPath
) {

  const response =
    await fetch(
      downloadUrl
    );

  if (!response.ok) {

    throw new Error(
      `Video download failed with HTTP ${response.status}.`
    );

  }

  const arrayBuffer =
    await response.arrayBuffer();

  const buffer =
    Buffer.from(
      arrayBuffer
    );

  await fs.promises.writeFile(
    outputPath,
    buffer
  );

  return {
    outputPath,
    size: buffer.length
  };
}

// ========================================
// SAVE GENERATED VIDEO
// ========================================

async function saveGeneratedVideo(
  fileId,
  jobId
) {

  const file =
    await retrieveMiniMaxFile(
      fileId
    );

  const originalName =
    file.filename ||
    "output_aigc.mp4";

  const extension =
    path.extname(
      originalName
    ) || ".mp4";

  const filename =
    `${safeFilename(jobId)}${extension}`;

  const outputPath =
    path.join(
      OUTPUT_DIR,
      filename
    );

  const downloaded =
    await downloadVideo(
      file.download_url,
      outputPath
    );

  return {
    filename,
    outputPath,
    size:
      downloaded.size,
    url:
      `/outputs/${filename}`
  };
}

// ========================================
// POLL TASK UNTIL COMPLETE
// ========================================

async function waitForCompletion(
  jobId,
  taskId
) {

  const started =
    Date.now();

  while (
    Date.now() - started <
    MAX_POLL_TIME_MS
  ) {

    const job =
      jobs.get(jobId);

    if (!job) {

      throw new Error(
        "Local video job no longer exists."
      );

    }

    const result =
      await queryMiniMaxTask(
        taskId
      );

    const status =
      result.status;

    job.minimaxStatus =
      status;

    // ------------------------------------
    // PREPARING
    // ------------------------------------

    if (
      status ===
      "Preparing"
    ) {

      job.status =
        "processing";

      job.progress = 10;
    }

    // ------------------------------------
    // QUEUEING
    // ------------------------------------

    else if (
      status ===
      "Queueing"
    ) {

      job.status =
        "queued";

      job.progress = 15;
    }

    // ------------------------------------
    // PROCESSING
    // ------------------------------------

    else if (
      status ===
      "Processing"
    ) {

      job.status =
        "processing";

      /*
       * MiniMax does not expose a precise
       * percentage in this response.
       *
       * So we use a safe approximate
       * progress indicator.
       */

      if (
        job.progress < 25
      ) {
        job.progress = 25;
      } else if (
        job.progress < 90
      ) {
        job.progress += 5;
      }

    }

    // ------------------------------------
    // SUCCESS
    // ------------------------------------

    else if (
      status ===
      "Success"
    ) {

      if (!result.file_id) {

        throw new Error(
          "MiniMax reported Success but no file_id was returned."
        );

      }

      job.progress = 95;

      job.fileId =
        result.file_id;

      console.log(
        `MiniMax task ${taskId} succeeded.`
      );

      const saved =
        await saveGeneratedVideo(
          result.file_id,
          jobId
        );

      job.progress = 100;

      job.status =
        "completed";

      job.videoUrl =
        saved.url;

      job.outputFile =
        saved.filename;

      job.outputPath =
        saved.outputPath;

      job.completedAt =
        new Date().toISOString();

      return job;
    }

    // ------------------------------------
    // FAILURE
    // ------------------------------------

    else if (
      status ===
      "Fail"
    ) {

      const errorMessage =
        result.error_message ||
        result.base_resp?.status_msg ||
        "MiniMax video generation failed.";

      job.status =
        "failed";

      job.error =
        errorMessage;

      job.completedAt =
        new Date().toISOString();

      throw new Error(
        errorMessage
      );

    }

    else {

      console.log(
        "Unknown MiniMax status:",
        status
      );

    }

    console.log(
      `Job ${jobId}: ${status} (${job.progress}%)`
    );

    await sleep(
      POLL_INTERVAL_MS
    );
  }

  const job =
    jobs.get(jobId);

  if (job) {

    job.status =
      "failed";

    job.error =
      "Video generation timed out.";

    job.completedAt =
      new Date().toISOString();

  }

  throw new Error(
    "MiniMax video generation timed out."
  );
}

// ========================================
// START BACKGROUND GENERATION
// ========================================

async function processJob(
  jobId
) {

  const job =
    jobs.get(jobId);

  if (!job) {
    return;
  }

  try {

    job.status =
      "processing";

    job.progress = 5;

    job.startedAt =
      new Date().toISOString();

    console.log(
      `Starting MiniMax task for ${jobId}...`
    );

    const taskId =
      await createMiniMaxTask({

        prompt:
          job.prompt,

        mode:
          job.mode,

        duration:
          job.duration,

        resolution:
          job.resolution,

        imagePath:
          job.imagePath

      });

    job.taskId =
      taskId;

    job.progress = 10;

    console.log(
      `MiniMax task created: ${taskId}`
    );

    await waitForCompletion(
      jobId,
      taskId
    );

  } catch (error) {

    console.error(
      `Job ${jobId} failed:`,
      error.message
    );

    const currentJob =
      jobs.get(jobId);

    if (currentJob) {

      currentJob.status =
        "failed";

      currentJob.error =
        error.message;

      currentJob.completedAt =
        new Date().toISOString();

    }

  }
}

// ========================================
// CREATE VIDEO JOB
// ========================================

async function createVideoJob({
  prompt,
  mode = "text-to-video",
  duration = 6,
  resolution = "1080P",
  imagePath = null
}) {

  requireApiKey();

  const jobId =
    "video_" +
    Date.now() +
    "_" +
    Math.random()
      .toString(36)
      .substring(2, 10);

  const job = {

    jobId,

    status:
      "queued",

    progress:
      0,

    prompt,

    mode,

    duration:
      Number(duration),

    resolution,

    imagePath,

    taskId:
      null,

    fileId:
      null,

    videoUrl:
      null,

    outputFile:
      null,

    outputPath:
      null,

    error:
      null,

    createdAt:
      new Date().toISOString(),

    startedAt:
      null,

    completedAt:
      null

  };

  jobs.set(
    jobId,
    job
  );

  console.log(
    `Created local job ${jobId}`
  );

  // Start asynchronously.
  processJob(
    jobId
  );

  return {
    ...job
  };
}

// ========================================
// GET VIDEO JOB
// ========================================

async function getVideoJob(
  jobId
) {

  const job =
    jobs.get(jobId);

  if (!job) {

    return {

      jobId,

      status:
        "not-found",

      progress:
        0,

      videoUrl:
        null,

      message:
        "Video job not found."

    };

  }

  let message;

  switch (
    job.status
  ) {

    case "queued":
      message =
        "Video job is queued.";
      break;

    case "processing":
      message =
        "MiniMax is generating the video.";
      break;

    case "completed":
      message =
        "Video generation completed.";
      break;

    case "failed":
      message =
        job.error ||
        "Video generation failed.";
      break;

    default:
      message =
        "Unknown job status.";

  }

  return {

    ...job,

    message

  };
}

// ========================================
// DELETE VIDEO JOB
// ========================================

async function deleteVideoJob(
  jobId
) {

  const job =
    jobs.get(jobId);

  if (!job) {
    return false;
  }

  // Delete local generated video if it exists.
  if (
    job.outputPath &&
    fs.existsSync(
      job.outputPath
    )
  ) {

    try {

      await fs.promises.unlink(
        job.outputPath
      );

    } catch (error) {

      console.error(
        "Unable to delete output file:",
        error.message
      );

    }

  }

  jobs.delete(
    jobId
  );

  return true;
}

// ========================================
// EXPORTS
// ========================================

module.exports = {

  createVideoJob,

  getVideoJob,

  deleteVideoJob

};
