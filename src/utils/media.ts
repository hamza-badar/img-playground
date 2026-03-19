import type { MediaAsset, MediaKind } from "@/types/media";

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/bmp"];
const VIDEO_TYPES = ["video/mp4", "video/quicktime", "video/webm", "video/x-m4v", "video/ogg"];
const DIRECT_MEDIA_EXTENSIONS = [
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".gif",
  ".bmp",
  ".svg",
  ".mp4",
  ".mov",
  ".webm",
  ".m4v",
  ".ogg",
];

function isGoogleRedirectUrl(url: URL) {
  return url.hostname.includes("google.") && url.pathname === "/url";
}

function getNestedRedirectTarget(url: URL) {
  return url.searchParams.get("url") || url.searchParams.get("q");
}

function looksLikeDirectMediaUrl(url: URL) {
  const pathname = url.pathname.toLowerCase();
  return DIRECT_MEDIA_EXTENSIONS.some((extension) => pathname.endsWith(extension));
}

function normalizeUrlInput(input: string) {
  let parsedUrl: URL;

  try {
    parsedUrl = new URL(input);
  } catch {
    throw new Error("Please paste a full media link starting with https://");
  }

  if (!["https:", "http:"].includes(parsedUrl.protocol)) {
    throw new Error("Only http and https links are supported.");
  }

  if (isGoogleRedirectUrl(parsedUrl)) {
    const nestedTarget = getNestedRedirectTarget(parsedUrl);
    if (nestedTarget) {
      try {
        parsedUrl = new URL(decodeURIComponent(nestedTarget));
      } catch {
        throw new Error("That Google redirect link could not be opened. Paste the original image or video URL instead.");
      }
    } else {
      throw new Error("That Google redirect link does not point directly to a media file. Open the result and copy the actual image or video URL.");
    }
  }

  return parsedUrl;
}

export function detectMediaKind(file: File): MediaKind {
  if (file.type === "image/gif") {
    return "gif";
  }

  if (IMAGE_TYPES.some((type) => file.type.startsWith(type.split("/")[0] + "/"))) {
    return "image";
  }

  if (VIDEO_TYPES.includes(file.type) || file.type.startsWith("video/")) {
    return "video";
  }

  if (file.name.toLowerCase().endsWith(".gif")) {
    return "gif";
  }

  return file.type.startsWith("video/") ? "video" : "image";
}

export function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return "0 B";
  }

  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** index;
  return `${value.toFixed(value >= 10 || index === 0 ? 0 : 1)} ${units[index]}`;
}

export async function readImageMetadata(file: File): Promise<Record<string, string | number>> {
  const metadata: Record<string, string | number> = {
    type: file.type || "unknown",
    size: formatBytes(file.size),
  };

  try {
    const imageUrl = URL.createObjectURL(file);
    const dimensions = await new Promise<{ width: number; height: number }>((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        resolve({ width: img.naturalWidth, height: img.naturalHeight });
        URL.revokeObjectURL(imageUrl);
      };
      img.onerror = () => {
        reject(new Error("Unable to read image dimensions."));
        URL.revokeObjectURL(imageUrl);
      };
      img.src = imageUrl;
    });
    metadata.dimensions = `${dimensions.width} x ${dimensions.height}`;
  } catch {
    metadata.dimensions = "Unavailable";
  }

  return metadata;
}

export async function readVideoMetadata(file: File): Promise<Record<string, string | number>> {
  const metadata: Record<string, string | number> = {
    type: file.type || "unknown",
    size: formatBytes(file.size),
  };

  try {
    const url = URL.createObjectURL(file);
    const details = await new Promise<{ duration: number; width: number; height: number }>((resolve, reject) => {
      const video = document.createElement("video");
      video.preload = "metadata";
      video.onloadedmetadata = () => {
        resolve({
          duration: video.duration,
          width: video.videoWidth,
          height: video.videoHeight,
        });
        URL.revokeObjectURL(url);
      };
      video.onerror = () => {
        reject(new Error("Unable to read video metadata."));
        URL.revokeObjectURL(url);
      };
      video.src = url;
    });
    metadata.duration = `${details.duration.toFixed(1)}s`;
    metadata.dimensions = `${details.width} x ${details.height}`;
  } catch {
    metadata.duration = "Unavailable";
  }

  return metadata;
}

export async function createMediaAsset(file: File, source: MediaAsset["source"]): Promise<MediaAsset> {
  const kind = detectMediaKind(file);
  const metadata =
    kind === "video" ? await readVideoMetadata(file) : await readImageMetadata(file);

  return {
    file,
    kind,
    source,
    previewUrl: URL.createObjectURL(file),
    metadata,
  };
}

export async function fileFromUrl(input: string): Promise<File> {
  const parsedUrl = normalizeUrlInput(input);

  let response: Response;
  try {
    response = await fetch(parsedUrl.toString());
  } catch {
    if (!looksLikeDirectMediaUrl(parsedUrl)) {
      throw new Error(
        "That link looks like a webpage, not a direct image or video file. Open the media in a new tab, then copy the direct file URL.",
      );
    }

    throw new Error(
      "This file could not be loaded in the browser. The website may block downloads from other sites. Try downloading the file first, then upload it here.",
    );
  }

  if (!response.ok) {
    throw new Error(`That link could not be loaded (${response.status}). Try opening it directly or uploading the file instead.`);
  }

  const blob = await response.blob();

  if (!blob.type) {
    throw new Error("This link did not return a usable file. Please use a direct image or video URL.");
  }

  if (!blob.type.startsWith("image/") && !blob.type.startsWith("video/")) {
    throw new Error(
      "That URL opened a webpage instead of an image or video file. Please paste a direct media link that ends with something like .jpg, .png, .gif, or .mp4.",
    );
  }

  const filename = parsedUrl.pathname.split("/").pop() || "remote-file";
  const extension = blob.type.split("/")[1] || "bin";

  return new File([blob], filename.includes(".") ? filename : `${filename}.${extension}`, {
    type: blob.type,
  });
}

export function revokeUrl(url?: string) {
  if (url) {
    URL.revokeObjectURL(url);
  }
}
