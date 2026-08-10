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

// ========================================
// JOB STORAGE
// ========================================

const jobs = new Map();

// ========================================
// CREATE VIDEO JOB
// ========================================

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

    error: null,

    createdAt:
      new Date().toISOString(),

    startedAt: null,

    completedAt: null

  };

  jobs.set(jobId, job);

  console.log("");
  console.log(
    "===================================="
  );
  console.log(
    "        NEW AI VIDEO JOB"
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
    "===================================="
  );
  console.log("");

  /*
   * Pou kounye a nou mete job la nan queue.
   *
   * Nan pwochen etap la, fonksyon sa a
   * ap rele vrè AI video engine lan.
   */

  startJobSimulation(jobId);

  return job;
}

// ========================================
// JOB PROCESSOR
// ========================================

function startJobSimulation(jobId) {

  const job = jobs.get(jobId);

  if (!job) {
    return;
  }

  job.status = "processing";

  job.progress = 5;

  job.startedAt =
    new Date().toISOString();

  /*
   * Sa a se sèlman yon SIMULATION
   * pou teste sistèm job la.
   *
   * Li PA pwodwi yon vrè videyo.
   */

  const progressSteps = [
    15,
    30,
    45,
    60,
    75,
    90
  ];

  let index = 0;

  const timer = setInterval(() => {

    const currentJob =
      jobs.get(jobId);

    if (!currentJob) {

      clearInterval(timer);

      return;
    }

    if (
      index >= progressSteps.length
    ) {

      clearInterval(timer);

      currentJob.status =
        "completed";

      currentJob.progress = 100;

      currentJob.completedAt =
        new Date().toISOString();

      /*
       * Pa mete yon fo videoUrl.
       *
       * Lè vrè AI engine lan konekte,
       * se la nou pral mete URL videyo a.
       */

      currentJob.videoUrl = null;

      console.log(
        `Job ${jobId} completed.`
      );

      return;
    }

    currentJob.progress =
      progressSteps[index];

    console.log(
      `Job ${jobId}: ${currentJob.progress}%`
    );

    index++;

  }, 1500);
}

// ========================================
// GET VIDEO JOB
// ========================================

async function getVideoJob(jobId) {

  const job =
    jobs.get(jobId);

  if (!job) {

    return {

      jobId,

      status: "not-found",

      progress: 0,

      videoUrl: null,

      message:
        "Video job not found."

    };

  }

  return {

    ...job,

    message:
      getStatusMessage(
        job.status
      )

  };

}

// ========================================
// STATUS MESSAGE
// ========================================

function getStatusMessage(status) {

  switch (status) {

    case "queued":

      return "Video job is queued.";

    case "processing":

      return "AI is processing the video.";

    case "completed":

      return "Video generation completed.";

    case "failed":

      return "Video generation failed.";

    default:

      return "Unknown job status.";

  }

}

// ========================================
// DELETE JOB
// ========================================

async function deleteVideoJob(jobId) {

  const exists =
    jobs.has(jobId);

  if (!exists) {
    return false;
  }

  jobs.delete(jobId);

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
