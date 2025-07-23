// Script to download face-api.js model files
const fs = require("fs");
const path = require("path");
const https = require("https");

const modelsDir = path.join(__dirname);

// Create models directory if it doesn't exist
if (!fs.existsSync(modelsDir)) {
  fs.mkdirSync(modelsDir, { recursive: true });
}

const modelFiles = [
  // Tiny Face Detector
  "tiny_face_detector_model-weights_manifest.json",
  "tiny_face_detector_model-shard1",

  // Face Landmark Detection
  "face_landmark_68_model-weights_manifest.json",
  "face_landmark_68_model-shard1",

  // Face Expression Recognition
  "face_expression_model-weights_manifest.json",
  "face_expression_model-shard1",
];

const baseUrl =
  "https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/";

const downloadFile = (url, dest) => {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https
      .get(url, (response) => {
        response.pipe(file);
        file.on("finish", () => {
          file.close(resolve);
          console.log(`Downloaded: ${dest}`);
        });
      })
      .on("error", (err) => {
        fs.unlink(dest, () => {});
        reject(err);
      });
  });
};

const downloadModels = async () => {
  console.log("Downloading face-api.js model files...");

  try {
    const downloads = modelFiles.map((file) => {
      const url = `${baseUrl}${file}`;
      const dest = path.join(modelsDir, file);
      return downloadFile(url, dest);
    });

    await Promise.all(downloads);
    console.log("All model files downloaded successfully!");
  } catch (error) {
    console.error("Error downloading model files:", error);
  }
};

downloadModels();
