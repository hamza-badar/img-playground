import { decompressFrames, parseGIF, type ParsedFrame } from "@flyskywhy/gifuct-js";

const MIN_FRAME_DELAY_MS = 33;

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function clonePatch(patch: Uint8ClampedArray) {
  const copy = new Uint8ClampedArray(patch.length);
  copy.set(patch);
  return copy;
}

function getSupportedVideoConfig() {
  if (typeof MediaRecorder === "undefined") {
    return null;
  }

  const candidates = [
    { mimeType: "video/mp4;codecs=avc1.42E01E", extension: "mp4" },
    { mimeType: "video/mp4", extension: "mp4" },
    { mimeType: "video/webm;codecs=vp9", extension: "webm" },
    { mimeType: "video/webm;codecs=vp8", extension: "webm" },
    { mimeType: "video/webm", extension: "webm" },
  ] as const;

  for (const candidate of candidates) {
    if (MediaRecorder.isTypeSupported(candidate.mimeType)) {
      return candidate;
    }
  }

  return null;
}

function putFramePatch(
  context: CanvasRenderingContext2D,
  frame: ParsedFrame,
  previousFrame: ParsedFrame | null,
  previousRestoreSnapshot: ImageData | null,
) {
  if (previousFrame?.disposalType === 2) {
    context.clearRect(
      previousFrame.dims.left,
      previousFrame.dims.top,
      previousFrame.dims.width,
      previousFrame.dims.height,
    );
  } else if (previousFrame?.disposalType === 3 && previousRestoreSnapshot) {
    context.putImageData(previousRestoreSnapshot, 0, 0);
  }

  const imageData = new ImageData(clonePatch(frame.patch), frame.dims.width, frame.dims.height);
  context.putImageData(imageData, frame.dims.left, frame.dims.top);
}

export async function gifToMp4(
  file: File,
  onProgress?: (progress: number) => void,
  onStatus?: (message: string) => void,
) {
  if (typeof HTMLCanvasElement === "undefined" || typeof MediaRecorder === "undefined") {
    throw new Error("This browser does not support in-browser GIF conversion. Please try Chrome, Edge, or a newer Safari version.");
  }

  const videoConfig = getSupportedVideoConfig();
  if (!videoConfig) {
    throw new Error("This browser cannot record a downloadable video from the GIF. Please try a newer browser.");
  }

  onStatus?.(
    videoConfig.extension === "mp4"
      ? "Preparing GIF to MP4 conversion..."
      : "Preparing GIF conversion. Your browser will export WebM because MP4 recording is not supported here.",
  );
  onProgress?.(5);

  const arrayBuffer = await file.arrayBuffer();
  const parsedGif = parseGIF(arrayBuffer);
  const frames = decompressFrames(parsedGif, true);

  if (!frames.length) {
    throw new Error("This GIF could not be decoded.");
  }

  const canvas = document.createElement("canvas");
  canvas.width = parsedGif.lsd.width;
  canvas.height = parsedGif.lsd.height;
  const context = canvas.getContext("2d", { willReadFrequently: true });

  if (!context) {
    throw new Error("Canvas is not available in this browser.");
  }

  context.clearRect(0, 0, canvas.width, canvas.height);

  const stream = canvas.captureStream(30);
  const recorder = new MediaRecorder(stream, { mimeType: videoConfig.mimeType });
  const chunks: Blob[] = [];

  recorder.addEventListener("dataavailable", (event) => {
    if (event.data.size > 0) {
      chunks.push(event.data);
    }
  });

  const stopped = new Promise<void>((resolve, reject) => {
    recorder.addEventListener("stop", () => resolve(), { once: true });
    recorder.addEventListener("error", () => reject(new Error("The browser could not record the converted video.")), {
      once: true,
    });
  });

  const track = stream.getVideoTracks()[0];
  const requestFrame = "requestFrame" in track ? () => (track as CanvasCaptureMediaStreamTrack).requestFrame() : null;
  const totalDuration = frames.reduce((sum, frame) => sum + Math.max(frame.delay || 0, MIN_FRAME_DELAY_MS), 0);

  recorder.start();
  onStatus?.(
    videoConfig.extension === "mp4"
      ? "Rendering GIF frames into MP4..."
      : "Rendering GIF frames into WebM..."
  );

  let elapsed = 0;
  let previousFrame: ParsedFrame | null = null;
  let restoreSnapshotForPreviousFrame: ImageData | null = null;

  for (const frame of frames) {
    const snapshotBeforeCurrentFrame =
      frame.disposalType === 3 ? context.getImageData(0, 0, canvas.width, canvas.height) : null;

    putFramePatch(context, frame, previousFrame, restoreSnapshotForPreviousFrame);
    requestFrame?.();

    const delay = Math.max(frame.delay || 0, MIN_FRAME_DELAY_MS);
    elapsed += delay;
    onProgress?.(10 + (elapsed / totalDuration) * 80);
    await sleep(delay);
    previousFrame = frame;
    restoreSnapshotForPreviousFrame = snapshotBeforeCurrentFrame;
  }

  recorder.stop();
  await stopped;
  stream.getTracks().forEach((streamTrack) => streamTrack.stop());

  const outputBlob = new Blob(chunks, { type: videoConfig.mimeType });
  onProgress?.(100);
  onStatus?.(videoConfig.extension === "mp4" ? "MP4 file ready." : "WebM file ready.");

  return new File(
    [outputBlob],
    file.name.replace(/\.gif$/i, "") + `.${videoConfig.extension}`,
    {
      type: outputBlob.type || videoConfig.mimeType,
    },
  );
}
