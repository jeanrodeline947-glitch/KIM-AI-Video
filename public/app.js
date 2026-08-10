const API_URL = "";

let currentMode = "text-to-video";

const promptInput = document.getElementById("prompt");
const charCount = document.getElementById("charCount");
const generateButton = document.getElementById("generateButton");

const uploadArea = document.getElementById("uploadArea");
const imageInput = document.getElementById("imageInput");
const imagePreview = document.getElementById("imagePreview");

const durationInput = document.getElementById("duration");
const resolutionInput = document.getElementById("resolution");

const message = document.getElementById("message");
const result = document.getElementById("result");

const jobIdElement = document.getElementById("jobId");
const jobStatus = document.getElementById("jobStatus");
const resultMode = document.getElementById("resultMode");

// ===============================
// MODE BUTTONS
// ===============================

document.querySelectorAll(".mode").forEach(button => {

  button.addEventListener("click", () => {

    document.querySelectorAll(".mode")
      .forEach(btn => btn.classList.remove("active"));

    button.classList.add("active");

    currentMode = button.dataset.mode;

    if (currentMode === "image-to-video") {
      uploadArea.classList.remove("hidden");
    } else {
      uploadArea.classList.add("hidden");
    }

  });

});

// ===============================
// CHARACTER COUNTER
// ===============================

promptInput.addEventListener("input", () => {

  charCount.textContent =
    promptInput.value.length;

});

// ===============================
// IMAGE PREVIEW
// ===============================

imageInput.addEventListener("change", () => {

  const file = imageInput.files[0];

  if (!file) {
    imagePreview.innerHTML = "";
    return;
  }

  if (!file.type.startsWith("image/")) {
    imagePreview.innerHTML =
      "<p>Fichye sa pa yon imaj.</p>";

    imageInput.value = "";

    return;
  }

  const reader = new FileReader();

  reader.onload = event => {

    imagePreview.innerHTML = `
      <img
        src="${event.target.result}"
        alt="Preview"
      >
    `;

  };

  reader.readAsDataURL(file);

});

// ===============================
// MESSAGE
// ===============================

function showMessage(text) {
  message.textContent = text;
}

// ===============================
// GENERATE
// ===============================

generateButton.addEventListener("click", async () => {

  const prompt =
    promptInput.value.trim();

  if (!prompt) {

    showMessage(
      "Tanpri ekri yon deskripsyon pou videyo a."
    );

    promptInput.focus();

    return;
  }

  generateButton.disabled = true;

  generateButton.innerHTML =
    "⏳ Creating job...";

  showMessage(
    "Nap prepare demann ou an..."
  );

  try {

    const response = await fetch(
      `${API_URL}/api/generate`,
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json"
        },

        body: JSON.stringify({
          prompt,
          duration: Number(durationInput.value),
          resolution: resolutionInput.value,
          mode: currentMode
        })
      }
    );

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(
        data.error || "Generation failed."
      );
    }

    result.classList.remove("hidden");

    jobIdElement.textContent =
      data.jobId;

    resultMode.textContent =
      data.mode;

    jobStatus.textContent =
      data.status.toUpperCase();

    showMessage(
      "Job la kreye avèk siksè."
    );

    result.scrollIntoView({
      behavior: "smooth"
    });

  } catch (error) {

    console.error(error);

    showMessage(
      "Erè: " + error.message
    );

  } finally {

    generateButton.disabled = false;

    generateButton.innerHTML =
      "<span>✨</span> Generate Video";

  }

});
