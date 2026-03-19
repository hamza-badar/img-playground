import { fetchFile } from "@ffmpeg/util";
import { getFFmpeg } from "./ffmpeg";

function toBlobPart(data: Uint8Array) {
  const copy = new Uint8Array(data.byteLength);
  copy.set(data);
  return copy.buffer;
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

export async function gifToMp4(
  file: File,
  onProgress?: (progress: number) => void,
  onStatus?: (message: string) => void,
) {
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
}
