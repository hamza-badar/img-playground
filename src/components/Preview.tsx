import { FileVideo, Image as ImageIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import type { MediaAsset } from "@/types/media";

interface PreviewProps {
  asset: MediaAsset | null;
}

export function Preview({ asset }: PreviewProps) {
  if (!asset) {
    return (
      <Card className="flex min-h-[320px] items-center justify-center">
        <div className="max-w-sm text-center">
          <ImageIcon className="mx-auto mb-3 h-12 w-12 text-primary" />
          <h3 className="font-display text-xl font-semibold dark:text-white">Preview appears here</h3>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-300">
            Upload, paste, or load a file URL to start using the tools.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">Preview</p>
          <h2 className="font-display text-2xl font-bold dark:text-white">{asset.file.name}</h2>
        </div>
        {asset.kind === "video" ? <FileVideo className="h-6 w-6 text-dark-accent" /> : <ImageIcon className="h-6 w-6 text-dark-accent" />}
      </div>

      <div className="overflow-hidden rounded-3xl bg-slate-950/90">
        {asset.kind === "video" ? (
          <video src={asset.previewUrl} controls className="max-h-[420px] w-full object-contain" />
        ) : (
          <img src={asset.previewUrl} alt={asset.file.name} className="max-h-[420px] w-full object-contain" />
        )}
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {Object.entries(asset.metadata || {}).map(([key, value]) => (
          <div key={key} className="rounded-2xl bg-background/90 px-4 py-3 dark:bg-slate-900/80">
            <p className="text-xs uppercase tracking-[0.16em] text-slate-400">{key}</p>
            <p className="mt-1 text-sm font-semibold text-dark-accent dark:text-slate-100">{String(value)}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}
