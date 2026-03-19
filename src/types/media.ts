export type MediaKind = "image" | "video" | "gif";

export interface MediaAsset {
  file: File;
  previewUrl: string;
  kind: MediaKind;
  source: "upload" | "clipboard" | "url";
  metadata?: Record<string, string | number>;
}

export type ToolKey = "gifToMp4" | "videoToGif" | "compressImage" | "resizeImage";

export interface ProcessedResult {
  file: File;
  previewUrl: string;
  kind: MediaKind;
  actionLabel: string;
  metadata?: Record<string, string | number>;
}
