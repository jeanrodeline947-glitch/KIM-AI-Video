const fs = require("fs");
const path = require("path");

const OUTPUT_DIR = path.join(
  __dirname,
  "..",
  "outputs"
);

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, {
    recursive: true
  });
}

/**
 * Kreye yon job AI Video.
 *
 * Pou kounye a se yon adapter.
 * Nan pwochen etap la n ap konekte l
 * ak vrè modèl video AI a.
 */
async function createVideoJob({
  prompt,
  mode = "text-to-video",
  duration = 5,
  resolution = "720p",
  imagePath = null
}) {

  const jobId =
    "video_" +
    Date.now() +
    "_" +
    Math.random()
      .toString(36)
      .substring(2, 10);

  const job = {
    jobId,

    status: "queued",

    progress: 0,

    prompt,

    mode,

    duration,

    resolution,

    imagePath,

    videoUrl: null,

    createdAt:
      new Date().toISOString()
  };

  console.log("");
  console.log(
    "========== AI VIDEO JOB =========="
  );

  console.log(
    "Job:",
    jobId
  );

  console.log(
    "Mode:",
    mode
  );

  console.log(
    "Prompt:",
    prompt
  );

  console.log(
    "Duration:",
    duration
  );

  console.log(
    "Resolution:",
    resolution
  );

  console.log(
    "=================================="
  );

  /*
   * IMPORTANT:
   *
   * Nou pa fabrike yon fo videyo isit la.
   *
   * Fonksyon sa a prepare job la pou
   * vrè motè AI a.
   */

  return job;
}

/**
 * Verifye status yon job.
 */
async function getVideoJob(jobId) {

  return {
    jobId,

    status: "queued",

    progress: 0,

    videoUrl: null,

    message:
      "Waiting for AI video engine."
  };
}

module.exports = {
  createVideoJob,
  getVideoJob
};
