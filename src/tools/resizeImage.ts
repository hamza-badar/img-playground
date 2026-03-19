import { convertToPixels } from "@/utils/units";

interface ResizeImageOptions {
  width: number;
  height: number;
  unit: "px" | "cm" | "mm" | "inch" | "%";
}

async function loadImage(file: File) {
  const url = URL.createObjectURL(file);

  try {
    return await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("Unable to load the image for resizing."));
      image.src = url;
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function resizeImage(file: File, options: ResizeImageOptions) {
  const image = await loadImage(file);
  const width = convertToPixels(options.width, options.unit, image.naturalWidth);
  const height = convertToPixels(options.height, options.unit, image.naturalHeight);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Canvas is not available in this browser.");
  }

  context.drawImage(image, 0, 0, width, height);
  const mimeType = file.type || "image/png";
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, mimeType, 0.92));

  if (!blob) {
    throw new Error("Failed to export the resized image.");
  }

  return new File([blob], file.name, { type: mimeType });
}
