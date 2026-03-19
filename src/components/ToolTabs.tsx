import { Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import type { ToolKey } from "@/types/media";

interface ToolTabsProps {
  activeTool: ToolKey;
  onToolChange: (tool: ToolKey) => void;
  onRun: () => Promise<void>;
  isBusy: boolean;
  gifFps: number;
  setGifFps: (value: number) => void;
  gifQuality: number;
  setGifQuality: (value: number) => void;
  gifDurationLimit: number;
  setGifDurationLimit: (value: number) => void;
  targetSizeKB: number;
  setTargetSizeKB: (value: number) => void;
  resizeWidth: number;
  setResizeWidth: (value: number) => void;
  resizeHeight: number;
  setResizeHeight: (value: number) => void;
  resizeUnit: "px" | "cm" | "mm" | "inch" | "%";
  setResizeUnit: (value: "px" | "cm" | "mm" | "inch" | "%") => void;
}

const tabs: Array<{ key: ToolKey; label: string; description: string }> = [
  { key: "gifToMp4", label: "GIF -> Video", description: "Convert GIFs into MP4 in the browser, with WebM fallback if MP4 encoding is unavailable." },
  { key: "videoToGif", label: "Video -> GIF", description: "Turn MP4, MOV, and WebM clips into GIFs." },
  { key: "compressImage", label: "Compress Image", description: "Shrink image file size toward a target in KB." },
  { key: "resizeImage", label: "Resize Image", description: "Resize image dimensions with pixel or print units." },
];

export function ToolTabs(props: ToolTabsProps) {
  const {
    activeTool,
    onToolChange,
    onRun,
    isBusy,
    gifFps,
    setGifFps,
    gifQuality,
    setGifQuality,
    gifDurationLimit,
    setGifDurationLimit,
    targetSizeKB,
    setTargetSizeKB,
    resizeWidth,
    setResizeWidth,
    resizeHeight,
    setResizeHeight,
    resizeUnit,
    setResizeUnit,
  } = props;

  return (
    <Card className="space-y-5">
      <div className="space-y-1">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">Tools</p>
        <h2 className="font-display text-2xl font-bold dark:text-white">Choose a transformation</h2>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {tabs.map((tab) => {
          const isActive = tab.key === activeTool;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => onToolChange(tab.key)}
              className={`rounded-3xl border p-4 text-left transition ${
                isActive
                  ? "border-primary bg-primary text-white shadow-lg shadow-primary/20"
                  : "border-dark-accent/10 bg-white/70 text-dark-accent hover:border-primary/20 hover:bg-accent/20 dark:bg-slate-900/70 dark:text-slate-100"
              }`}
            >
              <p className="font-semibold">{tab.label}</p>
              <p className={`mt-2 text-sm ${isActive ? "text-white/80" : "text-slate-500 dark:text-slate-300"}`}>{tab.description}</p>
            </button>
          );
        })}
      </div>

      {activeTool === "videoToGif" && (
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="fps">FPS</Label>
            <Input id="fps" type="number" min={1} max={30} value={gifFps} onChange={(event) => setGifFps(Number(event.target.value))} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="quality">Quality / color count</Label>
            <Input id="quality" type="number" min={32} max={256} value={gifQuality} onChange={(event) => setGifQuality(Number(event.target.value))} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="duration">Duration limit (seconds)</Label>
            <Input id="duration" type="number" min={1} max={30} value={gifDurationLimit} onChange={(event) => setGifDurationLimit(Number(event.target.value))} />
          </div>
        </div>
      )}

      {activeTool === "gifToMp4" && (
        <div className="rounded-2xl bg-background/80 px-4 py-3 text-sm text-slate-600 dark:bg-slate-900/80 dark:text-slate-300">
          This tool uses the in-browser conversion engine instead of screen-style recording, which is more reliable for tricky GIF frames. If MP4 encoding is unavailable, it falls back to WebM.
        </div>
      )}

      {activeTool === "compressImage" && (
        <div className="max-w-sm space-y-2">
          <Label htmlFor="target-size">Target Size (KB)</Label>
          <Input
            id="target-size"
            type="number"
            min={10}
            value={targetSizeKB}
            onChange={(event) => setTargetSizeKB(Number(event.target.value))}
          />
        </div>
      )}

      {activeTool === "resizeImage" && (
        <div className="grid gap-4 md:grid-cols-[1fr_1fr_160px]">
          <div className="space-y-2">
            <Label htmlFor="resize-width">Width</Label>
            <Input id="resize-width" type="number" min={1} value={resizeWidth} onChange={(event) => setResizeWidth(Number(event.target.value))} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="resize-height">Height</Label>
            <Input id="resize-height" type="number" min={1} value={resizeHeight} onChange={(event) => setResizeHeight(Number(event.target.value))} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="resize-unit">Unit</Label>
            <select
              id="resize-unit"
              value={resizeUnit}
              onChange={(event) => setResizeUnit(event.target.value as "px" | "cm" | "mm" | "inch" | "%")}
              className="flex h-11 w-full rounded-2xl border border-dark-accent/10 bg-white/80 px-4 py-2 text-sm outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/20 dark:bg-slate-900/70 dark:text-slate-50"
            >
              <option value="px">px</option>
              <option value="cm">cm</option>
              <option value="mm">mm</option>
              <option value="inch">inch</option>
              <option value="%">%</option>
            </select>
          </div>
        </div>
      )}

      <Button onClick={onRun} disabled={isBusy} className="w-full sm:w-auto">
        <Sparkles className="mr-2 h-4 w-4" />
        {isBusy ? "Processing..." : "Run Tool"}
      </Button>
    </Card>
  );
}
