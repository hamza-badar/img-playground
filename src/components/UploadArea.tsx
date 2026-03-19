import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDropzone } from "react-dropzone";
import { ClipboardPaste, Link2, UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface UploadAreaProps {
  onFilesSelected: (file: File, source: "upload" | "clipboard" | "url") => Promise<void>;
  isBusy: boolean;
}

export function UploadArea({ onFilesSelected, isBusy }: UploadAreaProps) {
  const [urlInput, setUrlInput] = useState("");
  const [pasteMessage, setPasteMessage] = useState("Paste from clipboard or press the button below.");
  const hasClipboardApi = typeof navigator !== "undefined" && "clipboard" in navigator && "read" in navigator.clipboard;
  const timeoutRef = useRef<number | null>(null);

  const handleDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles[0]) {
        await onFilesSelected(acceptedFiles[0], "upload");
      }
    },
    [onFilesSelected],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: handleDrop,
    accept: {
      "image/*": [".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp"],
      "video/*": [".mp4", ".mov", ".webm", ".m4v", ".ogg"],
    },
    multiple: false,
  });

  const setTransientMessage = useCallback((message: string) => {
    setPasteMessage(message);
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = window.setTimeout(() => {
      setPasteMessage("Paste from clipboard or press the button below.");
    }, 2600);
  }, []);

  const handleClipboard = useCallback(async () => {
    if (!hasClipboardApi) {
      setTransientMessage("Clipboard API is unavailable. Use Cmd/Ctrl + V directly.");
      return;
    }

    try {
      const items = await navigator.clipboard.read();
      for (const item of items) {
        const imageType = item.types.find((type) => type.startsWith("image/"));
        if (imageType) {
          const blob = await item.getType(imageType);
          const file = new File([blob], `clipboard-${Date.now()}.${imageType.split("/")[1] || "png"}`, {
            type: imageType,
          });
          await onFilesSelected(file, "clipboard");
          setTransientMessage("Image pasted from clipboard.");
          return;
        }
      }
      setTransientMessage("No image found in the clipboard.");
    } catch {
      setTransientMessage("Clipboard access was blocked. Try using Cmd/Ctrl + V.");
    }
  }, [hasClipboardApi, onFilesSelected, setTransientMessage]);

  useEffect(() => {
    const handlePaste = async (event: ClipboardEvent) => {
      const file = Array.from(event.clipboardData?.files || []).find((entry) => entry.type.startsWith("image/"));
      if (file) {
        await onFilesSelected(file, "clipboard");
        setTransientMessage("Image pasted from clipboard.");
      }
    };

    window.addEventListener("paste", handlePaste);
    return () => {
      window.removeEventListener("paste", handlePaste);
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, [onFilesSelected, setTransientMessage]);

  const uploadHint = useMemo(
    () => (isDragActive ? "Drop your media here." : "Drop images or videos here, or click to upload."),
    [isDragActive],
  );

  return (
    <Card className="space-y-5">
      <div className="space-y-1">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">Input</p>
        <h2 className="font-display text-2xl font-bold text-ink dark:text-white">Upload, paste, or fetch media</h2>
      </div>

      <div
        {...getRootProps()}
        className="rounded-3xl border border-dashed border-dark-accent/30 bg-accent/10 p-8 text-center transition hover:border-primary/40 hover:bg-accent/20"
      >
        <input {...getInputProps()} />
        <UploadCloud className="mx-auto mb-4 h-10 w-10 text-dark-accent" />
        <p className="text-base font-semibold text-dark-accent dark:text-slate-100">{uploadHint}</p>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-300">
          GIF, MP4, MOV, WebM, JPG, PNG, WEBP and more
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-[1fr_auto]">
        <div className="space-y-2">
          <Label htmlFor="media-url">Image or video URL</Label>
          <Input
            id="media-url"
            placeholder="https://example.com/cat.gif"
            value={urlInput}
            onChange={(event) => setUrlInput(event.target.value)}
          />
        </div>
        <Button
          className="mt-auto"
          variant="outline"
          disabled={!urlInput || isBusy}
          onClick={() => onFilesSelected(new File([], urlInput), "url")}
        >
          <Link2 className="mr-2 h-4 w-4" />
          Load URL
        </Button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Button variant="secondary" onClick={handleClipboard} disabled={isBusy}>
          <ClipboardPaste className="mr-2 h-4 w-4" />
          Paste from clipboard
        </Button>
        <p className="text-sm text-slate-500 dark:text-slate-300">{pasteMessage}</p>
      </div>
    </Card>
  );
}
