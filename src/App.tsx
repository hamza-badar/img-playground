import { useEffect, useMemo, useState } from "react";
import { MoonStar, SunMedium } from "lucide-react";
import { UploadArea } from "@/components/UploadArea";
import { Preview } from "@/components/Preview";
import { ToolTabs } from "@/components/ToolTabs";
import { ResultViewer } from "@/components/ResultViewer";
import { Button } from "@/components/ui/button";
import { compressImage } from "@/tools/compressImage";
import { gifToMp4 } from "@/tools/gifToMp4";
import { resizeImage } from "@/tools/resizeImage";
import { videoToGif } from "@/tools/videoToGif";
import { useDarkMode } from "@/hooks/useDarkMode";
import type { MediaAsset, ProcessedResult, ToolKey } from "@/types/media";
import { createMediaAsset, fileFromUrl, formatBytes, readImageMetadata, readVideoMetadata, revokeUrl } from "@/utils/media";

function getFriendlyErrorMessage(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : fallback;
  const lowerMessage = message.toLowerCase();

  if (
    lowerMessage.includes("fetchevent.respondwith") ||
    lowerMessage.includes("returned response is null") ||
    lowerMessage.includes("failed to fetch") ||
    lowerMessage.includes("load failed")
  ) {
    return "This link could not be opened here. It is probably a webpage or a site that blocks direct downloads. Open the image or video itself in a new tab, copy the direct file URL, or download the file and upload it instead.";
  }

  if (lowerMessage.includes("networkerror") || lowerMessage.includes("network error")) {
    return "The browser could not reach that file. Check the link, then try again or upload the file directly.";
  }

  return message;
}

export default function App() {
  const { isDark, toggleDarkMode } = useDarkMode();
  const [asset, setAsset] = useState<MediaAsset | null>(null);
  const [result, setResult] = useState<ProcessedResult | null>(null);
  const [activeTool, setActiveTool] = useState<ToolKey>("gifToMp4");
  const [isBusy, setIsBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState("Waiting for a file.");
  const [error, setError] = useState<string | null>(null);

  const [gifFps, setGifFps] = useState(12);
  const [gifQuality, setGifQuality] = useState(128);
  const [gifDurationLimit, setGifDurationLimit] = useState(8);
  const [targetSizeKB, setTargetSizeKB] = useState(100);
  const [resizeWidth, setResizeWidth] = useState(1080);
  const [resizeHeight, setResizeHeight] = useState(1080);
  const [resizeUnit, setResizeUnit] = useState<"px" | "cm" | "mm" | "inch" | "%">("px");

  useEffect(() => {
    return () => {
      revokeUrl(asset?.previewUrl);
      revokeUrl(result?.previewUrl);
    };
  }, [asset?.previewUrl, result?.previewUrl]);

  const featureSummary = useMemo(
    () => [
      "Turn GIFs into MP4s, make GIFs from videos, and optimize images in one place.",
      "Clipboard support with button-based and keyboard-paste flows.",
      "See your file preview instantly and download the finished result in a click.",
    ],
    [],
  );

  async function handleFilesSelected(file: File, source: "upload" | "clipboard" | "url") {
    try {
      setError(null);
      setStatusMessage("Preparing preview...");
      setProgress(0);

      const nextFile = source === "url" ? await fileFromUrl(file.name) : file;
      const mediaAsset = await createMediaAsset(nextFile, source);

      setAsset((current) => {
        revokeUrl(current?.previewUrl);
        return mediaAsset;
      });

      setResult((current) => {
        revokeUrl(current?.previewUrl);
        return null;
      });

      if (mediaAsset.kind === "gif") {
        setActiveTool("gifToMp4");
      } else if (mediaAsset.kind === "video") {
        setActiveTool("videoToGif");
      } else {
        setActiveTool("compressImage");
      }

      setStatusMessage("Ready to process.");
    } catch (nextError) {
      setError(getFriendlyErrorMessage(nextError, "Unable to load that media."));
      setStatusMessage("Input failed.");
    }
  }

  async function runTool() {
    if (!asset) {
      setError("Choose a file first.");
      return;
    }

    setError(null);
    setIsBusy(true);
    setProgress(0);

    try {
      let processedFile: File;

      if (activeTool === "gifToMp4") {
        if (asset.kind !== "gif") {
          throw new Error("GIF to MP4 requires a GIF input.");
        }
        setStatusMessage("Starting GIF conversion...");
        processedFile = await gifToMp4(asset.file, setProgress, setStatusMessage);
      } else if (activeTool === "videoToGif") {
        if (asset.kind !== "video") {
          throw new Error("Video to GIF requires a video input.");
        }
        setStatusMessage("Starting video to GIF conversion...");
        processedFile = await videoToGif(
          asset.file,
          {
            fps: gifFps,
            quality: gifQuality,
            durationLimit: gifDurationLimit,
          },
          setProgress,
          setStatusMessage,
        );
      } else if (activeTool === "compressImage") {
        if (asset.kind === "video") {
          throw new Error("Image compression only supports still images.");
        }
        setStatusMessage("Compressing image toward the target size...");
        processedFile = await compressImage(asset.file, { targetSizeKB }, setProgress);
      } else {
        if (asset.kind === "video") {
          throw new Error("Image resizing only supports still images.");
        }
        setStatusMessage("Resizing the image on canvas...");
        processedFile = await resizeImage(asset.file, {
          width: resizeWidth,
          height: resizeHeight,
          unit: resizeUnit,
        });
        setProgress(100);
      }

      const metadata =
        processedFile.type.startsWith("video/")
          ? await readVideoMetadata(processedFile)
          : await readImageMetadata(processedFile);

      const previewUrl = URL.createObjectURL(processedFile);
      setResult((current) => {
        revokeUrl(current?.previewUrl);
        return {
          file: processedFile,
          previewUrl,
          kind: processedFile.type.startsWith("video/") ? "video" : processedFile.type === "image/gif" ? "gif" : "image",
          actionLabel: activeTool,
          metadata: {
            ...metadata,
            outputSize: formatBytes(processedFile.size),
          },
        };
      });

      setStatusMessage("Transformation complete.");
      setProgress(100);
    } catch (nextError) {
      setError(getFriendlyErrorMessage(nextError, "Processing failed."));
      setStatusMessage("Processing failed.");
    } finally {
      setIsBusy(false);
    }
  }

  async function copyResultToClipboard() {
    if (!result || result.kind === "video") {
      return;
    }

    try {
      await navigator.clipboard.write([
        new ClipboardItem({
          [result.file.type]: result.file,
        }),
      ]);
      setStatusMessage("Result copied to clipboard.");
    } catch {
      setError("Clipboard write is not available in this browser.");
    }
  }

  return (
    <div className="relative overflow-hidden">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_right,rgba(219,26,26,0.18),transparent_24%),radial-gradient(circle_at_bottom_left,rgba(140,199,196,0.25),transparent_26%)]" />

      <main className="mx-auto flex min-h-screen max-w-7xl flex-col gap-8 px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
        <header className="glass-panel flex flex-col gap-6 p-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primary">Image Playground</p>
            <h1 className="mt-3 font-display text-4xl font-bold leading-tight text-ink dark:text-white sm:text-5xl">
              Browser-first media tools for quick conversions, compression, and resizing.
            </h1>
            <p className="mt-4 max-w-xl text-base text-slate-600 dark:text-slate-300">
              Drop a file, paste from the clipboard, or fetch from a URL and transform it without shipping your media to a heavy backend.
            </p>
          </div>

          <div className="space-y-4 lg:max-w-sm">
            <Button variant="outline" onClick={toggleDarkMode} className="w-full sm:w-auto">
              {isDark ? <SunMedium className="mr-2 h-4 w-4" /> : <MoonStar className="mr-2 h-4 w-4" />}
              {isDark ? "Light mode" : "Dark mode"}
            </Button>

            <div className="grid gap-3">
              {featureSummary.map((item) => (
                <div key={item} className="rounded-2xl bg-white/65 px-4 py-3 text-sm text-dark-accent dark:bg-slate-900/70 dark:text-slate-100">
                  {item}
                </div>
              ))}
            </div>
          </div>
        </header>

        {error ? (
          <div className="rounded-2xl border border-primary/20 bg-primary/10 px-4 py-3 text-sm font-medium text-primary">
            {error}
          </div>
        ) : null}

        <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <UploadArea onFilesSelected={handleFilesSelected} isBusy={isBusy} />
          <Preview asset={asset} />
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <ToolTabs
            activeTool={activeTool}
            onToolChange={setActiveTool}
            onRun={runTool}
            isBusy={isBusy}
            gifFps={gifFps}
            setGifFps={setGifFps}
            gifQuality={gifQuality}
            setGifQuality={setGifQuality}
            gifDurationLimit={gifDurationLimit}
            setGifDurationLimit={setGifDurationLimit}
            targetSizeKB={targetSizeKB}
            setTargetSizeKB={setTargetSizeKB}
            resizeWidth={resizeWidth}
            setResizeWidth={setResizeWidth}
            resizeHeight={resizeHeight}
            setResizeHeight={setResizeHeight}
            resizeUnit={resizeUnit}
            setResizeUnit={setResizeUnit}
          />
          <ResultViewer
            result={result}
            isBusy={isBusy}
            progress={progress}
            statusMessage={statusMessage}
            onCopy={copyResultToClipboard}
          />
        </section>

        <footer className="pb-2 text-center text-sm text-slate-500 dark:text-slate-300">
          Made with 🌄 by Hamza
        </footer>
      </main>
    </div>
  );
}
