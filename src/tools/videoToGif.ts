import { fetchFile } from "@ffmpeg/util";
import { getFFmpeg } from "./ffmpeg";

function toBlobPart(data: Uint8Array) {
  const copy = new Uint8Array(data.byteLength);
  copy.set(data);
  return copy.buffer;
}

interface VideoToGifOptions {
  fps: number;
  quality: number;
  durationLimit: number;
}

export async function videoToGif(
  file: File,
  options: VideoToGifOptions,
  onProgress?: (progress: number) => void,
  onStatus?: (message: string) => void,
) {
  const ffmpeg = await getFFmpeg(onProgress, onStatus);
  const inputExt = file.name.split(".").pop() || "mp4";
  const inputName = `input.${inputExt}`;
  const paletteName = "palette.png";
  const outputName = "output.gif";

  onStatus?.("Loading video into the conversion engine...");
  await ffmpeg.writeFile(inputName, await fetchFile(file));
  onProgress?.(15);
  onStatus?.("Building GIF color palette...");
  await ffmpeg.exec([
    "-t",
    String(options.durationLimit),
    "-i",
    inputName,
    "-vf",
    `fps=${options.fps},scale=iw:-1:flags=lanczos,palettegen=max_colors=${Math.max(32, options.quality)}`,
    paletteName,
  ]);
  onProgress?.(55);
  onStatus?.("Rendering GIF frames...");
  await ffmpeg.exec([
    "-t",
    String(options.durationLimit),
    "-i",
    inputName,
    "-i",
    paletteName,
    "-lavfi",
    `fps=${options.fps},scale=iw:-1:flags=lanczos[x];[x][1:v]paletteuse=dither=bayer:bayer_scale=3`,
    outputName,
  ]);

  const data = await ffmpeg.readFile(outputName);
  onProgress?.(95);
  onStatus?.("Finalizing GIF file...");
  await ffmpeg.deleteFile(inputName);
  await ffmpeg.deleteFile(paletteName);
  await ffmpeg.deleteFile(outputName);

  return new File([toBlobPart(data as Uint8Array)], file.name.replace(/\.[^/.]+$/, "") + ".gif", {
    type: "image/gif",
  });
}
