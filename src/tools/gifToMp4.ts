import { fetchFile } from "@ffmpeg/util";
import { getFFmpeg } from "./ffmpeg";

function toBlobPart(data: Uint8Array) {
  const copy = new Uint8Array(data.byteLength);
  copy.set(data);
  return copy.buffer;
}

export async function gifToMp4(
  file: File,
  onProgress?: (progress: number) => void,
  onStatus?: (message: string) => void,
) {
  const ffmpeg = await getFFmpeg(onProgress, onStatus);
  const inputName = "input.gif";
  const outputName = "output.mp4";

  onStatus?.("Preparing GIF frames...");
  await ffmpeg.writeFile(inputName, await fetchFile(file));
  onProgress?.(20);
  onStatus?.("Converting GIF to MP4...");
  await ffmpeg.exec([
    "-i",
    inputName,
    "-movflags",
    "faststart",
    "-pix_fmt",
    "yuv420p",
    outputName,
  ]);

  const data = await ffmpeg.readFile(outputName);
  onProgress?.(95);
  onStatus?.("Finalizing MP4 file...");
  await ffmpeg.deleteFile(inputName);
  await ffmpeg.deleteFile(outputName);

  return new File([toBlobPart(data as Uint8Array)], file.name.replace(/\.gif$/i, "") + ".mp4", {
    type: "video/mp4",
  });
}
