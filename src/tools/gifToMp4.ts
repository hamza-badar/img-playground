import { decompressFrames, parseGIF, type ParsedFrame } from "@flyskywhy/gifuct-js";
import { fetchFile } from "@ffmpeg/util";
import { getFFmpeg } from "./ffmpeg";

const MIN_FRAME_DELAY_MS = 33;

function toBlobPart(data: Uint8Array) {
  const copy = new Uint8Array(data.byteLength);
  copy.set(data);
  return copy.buffer;
}

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function clonePatch(patch: Uint8ClampedArray) {
  const copy = new Uint8ClampedArray(patch.length);
  copy.set(patch);
  return copy;
}

function getRecorderVideoConfig() {
  if (typeof MediaRecorder === "undefined") {
    return null;
  }

  const candidates = [
    { mimeType: "video/webm;codecs=vp9", extension: "webm" },
    { mimeType: "video/webm;codecs=vp8", extension: "webm" },
    { mimeType: "video/webm", extension: "webm" },
    { mimeType: "video/mp4;codecs=avc1.42E01E", extension: "mp4" },
    { mimeType: "video/mp4", extension: "mp4" },
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
  patchCanvas: HTMLCanvasElement,
  patchContext: CanvasRenderingContext2D,
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

  patchCanvas.width = frame.dims.width;
  patchCanvas.height = frame.dims.height;
  patchContext.clearRect(0, 0, frame.dims.width, frame.dims.height);
  patchContext.putImageData(new ImageData(clonePatch(frame.patch), frame.dims.width, frame.dims.height), 0, 0);
  context.drawImage(patchCanvas, frame.dims.left, frame.dims.top);
}

async function deleteIfPresent(ffmpeg: Awaited<ReturnType<typeof getFFmpeg>>, path: string) {
  try {
    await ffmpeg.deleteFile(path);
  } catch {
    // Ignore cleanup errors for files that were never written.
  }
}

async function readOutputFile(
  ffmpeg: Awaited<ReturnType<typeof getFFmpeg>>,
  inputName: string,
  outputName: string,
  mimeType: string,
  onProgress?: (progress: number) => void,
  onStatus?: (message: string) => void,
) {
  const data = await ffmpeg.readFile(outputName);
  onProgress?.(100);
  onStatus?.(`${outputName.endsWith(".mp4") ? "MP4" : "WebM"} file ready.`);

  return new File(
    [toBlobPart(data as Uint8Array)],
    inputName.replace(/\.gif$/i, outputName.endsWith(".mp4") ? ".mp4" : ".webm"),
    { type: mimeType },
  );
}

async function convertWithRecorder(
  file: File,
  onProgress?: (progress: number) => void,
  onStatus?: (message: string) => void,
) {
  if (typeof HTMLCanvasElement === "undefined" || typeof MediaRecorder === "undefined") {
    throw new Error("This browser does not support in-browser GIF conversion.");
  }

  const videoConfig = getRecorderVideoConfig();
  if (!videoConfig) {
    throw new Error("This browser cannot export a downloadable video from this GIF.");
  }

  onStatus?.(
    videoConfig.extension === "mp4"
      ? "Using browser recorder fallback for MP4 export..."
      : "Using browser recorder fallback for WebM export...",
  );
  onProgress?.(10);

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

  const patchCanvas = document.createElement("canvas");
  const patchContext = patchCanvas.getContext("2d", { willReadFrequently: true });

  if (!patchContext) {
    throw new Error("Canvas is not available in this browser.");
  }

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
      ? "Rendering GIF frames with browser recorder..."
      : "Rendering GIF frames into WebM with browser recorder...",
  );

  let elapsed = 0;
  let previousFrame: ParsedFrame | null = null;
  let restoreSnapshotForPreviousFrame: ImageData | null = null;

  for (const frame of frames) {
    const snapshotBeforeCurrentFrame =
      frame.disposalType === 3 ? context.getImageData(0, 0, canvas.width, canvas.height) : null;

    putFramePatch(context, frame, previousFrame, restoreSnapshotForPreviousFrame, patchCanvas, patchContext);
    requestFrame?.();

    const delay = Math.max(frame.delay || 0, MIN_FRAME_DELAY_MS);
    elapsed += delay;
    onProgress?.(15 + (elapsed / totalDuration) * 75);
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

export async function gifToMp4(
  file: File,
  onProgress?: (progress: number) => void,
  onStatus?: (message: string) => void,
) {
  try {
    const ffmpeg = await getFFmpeg(onProgress, onStatus);
    const inputName = "input.gif";
    const mp4OutputName = "output.mp4";
    const webmOutputName = "output.webm";
    const scaleFilter = "scale=ceil(iw/2)*2:ceil(ih/2)*2:flags=lanczos";

    onStatus?.("Loading GIF into the conversion engine...");
    await ffmpeg.writeFile(inputName, await fetchFile(file));
    onProgress?.(15);

    try {
      onStatus?.("Rendering video frames into MP4...");
      const mp4ExitCode = await ffmpeg.exec([
        "-i",
        inputName,
        "-vf",
        `${scaleFilter},format=yuv420p`,
        "-movflags",
        "+faststart",
        "-preset",
        "veryfast",
        "-c:v",
        "libx264",
        mp4OutputName,
      ]);

      if (mp4ExitCode === 0) {
        return await readOutputFile(ffmpeg, file.name, mp4OutputName, "video/mp4", onProgress, onStatus);
      }

      onProgress?.(75);
      onStatus?.("MP4 export was not available here. Retrying as WebM for broader browser support...");
      const webmExitCode = await ffmpeg.exec([
        "-i",
        inputName,
        "-vf",
        scaleFilter,
        "-c:v",
        "libvpx-vp9",
        "-pix_fmt",
        "yuva420p",
        webmOutputName,
      ]);

      if (webmExitCode === 0) {
        return await readOutputFile(ffmpeg, file.name, webmOutputName, "video/webm", onProgress, onStatus);
      }

      throw new Error("This GIF could not be converted to a browser-playable video.");
    } finally {
      await deleteIfPresent(ffmpeg, inputName);
      await deleteIfPresent(ffmpeg, mp4OutputName);
      await deleteIfPresent(ffmpeg, webmOutputName);
    }
  } catch (error) {
    console.warn("FFmpeg GIF conversion failed, falling back to MediaRecorder.", error);
    onStatus?.("The conversion engine did not start here. Falling back to the browser recorder...");
    return convertWithRecorder(file, onProgress, onStatus);
  }
}
