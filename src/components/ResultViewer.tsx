import { Copy, Download, Grip, WandSparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { ProcessedResult } from "@/types/media";

interface ResultViewerProps {
  result: ProcessedResult | null;
  isBusy: boolean;
  progress: number;
  statusMessage: string;
  onCopy: () => Promise<void>;
}

export function ResultViewer({ result, isBusy, progress, statusMessage, onCopy }: ResultViewerProps) {
  return (
    <Card className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">Output</p>
          <h2 className="font-display text-2xl font-bold dark:text-white">Processed result</h2>
        </div>
        {result ? (
          <a
            href={result.previewUrl}
            download={result.file.name}
            draggable
            className="inline-flex items-center rounded-2xl border border-dark-accent/15 bg-white/80 px-4 py-2 text-sm font-semibold text-dark-accent transition hover:bg-accent/20 dark:bg-slate-900/70 dark:text-slate-100"
          >
            <Grip className="mr-2 h-4 w-4" />
            Drag result
          </a>
        ) : null}
      </div>

      {isBusy ? (
        <div className="space-y-3 rounded-3xl bg-background/80 p-5 dark:bg-slate-900/80">
          <p className="font-medium text-dark-accent dark:text-slate-100">{statusMessage}</p>
          <Progress value={progress} />
          <p className="text-sm text-slate-500 dark:text-slate-300">{Math.round(progress)}% complete</p>
        </div>
      ) : null}

      {!result && !isBusy ? (
        <div className="flex min-h-[260px] items-center justify-center rounded-3xl border border-dashed border-dark-accent/20 bg-accent/10">
          <div className="text-center">
            <WandSparkles className="mx-auto mb-3 h-11 w-11 text-primary" />
            <p className="font-semibold text-dark-accent dark:text-slate-100">Your transformed file will appear here.</p>
          </div>
        </div>
      ) : null}

      {result ? (
        <>
          <div className="overflow-hidden rounded-3xl bg-slate-950/90">
            {result.kind === "video" ? (
              <video src={result.previewUrl} controls className="max-h-[420px] w-full object-contain" />
            ) : (
              <img src={result.previewUrl} alt={result.file.name} className="max-h-[420px] w-full object-contain" />
            )}
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            {Object.entries(result.metadata || {}).map(([key, value]) => (
              <div key={key} className="rounded-2xl bg-background/90 px-4 py-3 dark:bg-slate-900/80">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-400">{key}</p>
                <p className="mt-1 text-sm font-semibold text-dark-accent dark:text-slate-100">{String(value)}</p>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <a href={result.previewUrl} download={result.file.name} className="flex-1">
              <Button className="w-full">
                <Download className="mr-2 h-4 w-4" />
                Download file
              </Button>
            </a>
            {result.kind !== "video" ? (
              <Button variant="outline" className="flex-1" onClick={onCopy}>
                <Copy className="mr-2 h-4 w-4" />
                Copy image
              </Button>
            ) : null}
          </div>
        </>
      ) : null}
    </Card>
  );
}
