import * as faceapi from "face-api.js";

let modelsLoaded = false;
let loadingPromise: Promise<void> | null = null;

export const MODEL_URL = "/models";

export async function loadFaceModels(): Promise<void> {
  if (modelsLoaded) return;
  if (loadingPromise) return loadingPromise;

  loadingPromise = (async () => {
    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
      faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODEL_URL),
      faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
    ]);
    modelsLoaded = true;
  })();

  return loadingPromise;
}

export function isModelsLoaded() {
  return modelsLoaded;
}

export const DETECTOR_OPTIONS = new faceapi.TinyFaceDetectorOptions({
  inputSize: 320,
  scoreThreshold: 0.5,
});

export async function detectFaceDescriptor(
  input: HTMLVideoElement | HTMLCanvasElement | HTMLImageElement
): Promise<Float32Array | null> {
  const detection = await faceapi
    .detectSingleFace(input, DETECTOR_OPTIONS)
    .withFaceLandmarks(true)
    .withFaceDescriptor();
  return detection?.descriptor ?? null;
}

export interface FaceEntry {
  id: number;
  fullName: string;
  descriptor: number[];
}

export function buildFaceMatcher(entries: FaceEntry[], threshold = 0.5): faceapi.FaceMatcher | null {
  if (entries.length === 0) return null;
  const labeled = entries.map(
    (e) => new faceapi.LabeledFaceDescriptors(String(e.id), [new Float32Array(e.descriptor)])
  );
  return new faceapi.FaceMatcher(labeled, threshold);
}

export function captureFrameFromVideo(video: HTMLVideoElement, canvas: HTMLCanvasElement): string | null {
  canvas.width = video.videoWidth || 640;
  canvas.height = video.videoHeight || 480;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(video, 0, 0);
  return canvas.toDataURL("image/jpeg", 0.7);
}

export function drawFaceBox(
  canvas: HTMLCanvasElement,
  video: HTMLVideoElement,
  detections: faceapi.WithFaceDescriptor<faceapi.WithFaceLandmarks<{ detection: faceapi.FaceDetection }, faceapi.FaceLandmarks68>>[],
  matchedName?: string | null
) {
  const displaySize = { width: video.videoWidth, height: video.videoHeight };
  faceapi.matchDimensions(canvas, displaySize);
  const resized = faceapi.resizeResults(detections, displaySize);

  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  resized.forEach((d) => {
    const box = d.detection.box;
    const color = matchedName ? "#10b981" : "#3b82f6";
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.strokeRect(box.x, box.y, box.width, box.height);

    if (matchedName) {
      ctx.fillStyle = color;
      ctx.fillRect(box.x, box.y - 28, box.width, 28);
      ctx.fillStyle = "white";
      ctx.font = "bold 14px sans-serif";
      ctx.fillText(matchedName, box.x + 6, box.y - 8);
    }
  });
}
