import { FFmpeg } from "@ffmpeg/ffmpeg";
import coreURL from "@ffmpeg/core?url";
import wasmURL from "@ffmpeg/core/wasm?url";
import workerURL from "@ffmpeg/ffmpeg/worker?url";

let ffmpegInstance: FFmpeg | null = null;
let isLoading = false;
let loadPromise: Promise<FFmpeg> | null = null;
const FFMPEG_LOAD_TIMEOUT_MS = 90000;

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string) {
  return new Promise<T>((resolve, reject) => {
    const timeout = window.setTimeout(() => reject(new Error(message)), timeoutMs);

    promise.then(
      (value) => {
        window.clearTimeout(timeout);
        resolve(value);
      },
      (error) => {
        window.clearTimeout(timeout);
        reject(error);
      },
    );
  });
}

export async function getFFmpeg(
  onProgress?: (progress: number) => void,
  onStatus?: (message: string) => void,
) {
  if (ffmpegInstance) {
    if (onProgress) {
      ffmpegInstance.on("progress", ({ progress }) => onProgress(progress * 100));
    }
    return ffmpegInstance;
  }

  if (loadPromise) {
    return loadPromise;
  }

  isLoading = true;
  loadPromise = (async () => {
    const ffmpeg = new FFmpeg();

    if (onProgress) {
      ffmpeg.on("progress", ({ progress }) => onProgress(progress * 100));
    }

    ffmpeg.on("log", ({ message }) => {
      if (onStatus && message) {
        onStatus(message);
      }
    });

    onStatus?.("Loading conversion engine...");
    onProgress?.(5);

    await withTimeout(
      ffmpeg.load({
        coreURL,
        wasmURL,
        classWorkerURL: workerURL,
      }),
      FFMPEG_LOAD_TIMEOUT_MS,
      "The conversion engine is taking longer than expected to start. Safari can be slow with large browser-based video tools. Wait a little longer, refresh once, or use Chrome or Edge if it still does not begin.",
    );

    onStatus?.("Conversion engine ready.");
    onProgress?.(10);

    ffmpegInstance = ffmpeg;
    return ffmpeg;
  })();

  try {
    return await loadPromise;
  } finally {
    isLoading = false;
    loadPromise = ffmpegInstance ? Promise.resolve(ffmpegInstance) : null;
  }
}
