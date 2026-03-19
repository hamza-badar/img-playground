import imageCompression from "browser-image-compression";

interface CompressImageOptions {
  targetSizeKB: number;
}

export async function compressImage(
  file: File,
  options: CompressImageOptions,
  onProgress?: (progress: number) => void,
) {
  const targetMB = Math.max(options.targetSizeKB / 1024, 0.02);
  const compressed = await imageCompression(file, {
    maxSizeMB: targetMB,
    maxIteration: 12,
    useWebWorker: true,
    initialQuality: 0.92,
    fileType: file.type || "image/jpeg",
    onProgress,
  });

  if (compressed.size <= options.targetSizeKB * 1024 * 1.08) {
    return new File([compressed], compressed.name, { type: compressed.type });
  }

  let quality = 0.82;
  let bestBlob: Blob = compressed;

  while (quality > 0.1) {
    const nextBlob = await imageCompression(file, {
      maxSizeMB: targetMB,
      useWebWorker: true,
      initialQuality: quality,
      maxIteration: 8,
      fileType: file.type || "image/jpeg",
    });
    bestBlob = nextBlob;
    if (nextBlob.size <= options.targetSizeKB * 1024 * 1.05) {
      break;
    }
    quality -= 0.1;
  }

  return new File([bestBlob], file.name, { type: bestBlob.type || file.type });
}
