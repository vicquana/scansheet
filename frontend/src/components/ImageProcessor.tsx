import { useEffect, useRef, useState } from "react";
import { Image as ImageIcon, SlidersHorizontal, Wand2 } from "lucide-react";

interface ImageProcessorProps {
  file: File;
  onProcessed: (blob: Blob) => void;
}

export function ImageProcessor({ file, onProcessed }: ImageProcessorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [originalUrl, setOriginalUrl] = useState<string>("");
  const [mode, setMode] = useState<"original" | "grayscale" | "binarized">("original");
  const [threshold, setThreshold] = useState(128);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setOriginalUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    if (!originalUrl || !canvasRef.current) {
      return;
    }

    const img = new Image();
    img.src = originalUrl;

    img.onload = () => {
      const canvas = canvasRef.current;
      if (!canvas) {
        return;
      }
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        return;
      }

      const maxWidth = 2000;
      const maxHeight = 2000;
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > maxWidth) {
          height *= maxWidth / width;
          width = maxWidth;
        }
      } else if (height > maxHeight) {
        width *= maxHeight / height;
        height = maxHeight;
      }

      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);

      if (mode === "original") {
        canvas.toBlob(
          (blob) => {
            if (blob) {
              onProcessed(blob);
            }
          },
          "image/jpeg",
          0.9,
        );
        return;
      }

      const imageData = ctx.getImageData(0, 0, width, height);
      const data = imageData.data;

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const gray = 0.299 * r + 0.587 * g + 0.114 * b;

        if (mode === "grayscale") {
          data[i] = gray;
          data[i + 1] = gray;
          data[i + 2] = gray;
        } else {
          const value = gray > threshold ? 255 : 0;
          data[i] = value;
          data[i + 1] = value;
          data[i + 2] = value;
        }
      }

      ctx.putImageData(imageData, 0, 0);
      canvas.toBlob(
        (blob) => {
          if (blob) {
            onProcessed(blob);
          }
        },
        "image/jpeg",
        0.9,
      );
    };
  }, [mode, onProcessed, originalUrl, threshold]);

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/50 shadow-xl">
      <div className="flex flex-col items-center justify-between gap-4 border-b border-zinc-800 bg-zinc-900 p-4 sm:flex-row">
        <div className="flex items-center gap-2 font-medium text-zinc-300">
          <Wand2 className="h-5 w-5 text-indigo-400" />
          Image Pre-processing
        </div>

        <div className="flex items-center gap-2 rounded-lg bg-zinc-950 p-1">
          {(["original", "grayscale", "binarized"] as const).map((value) => (
            <button
              key={value}
              onClick={() => setMode(value)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                mode === value
                  ? "bg-zinc-800 text-zinc-100 shadow-sm"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {value[0].toUpperCase() + value.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {mode === "binarized" && (
        <div className="flex items-center gap-4 border-b border-zinc-800 bg-zinc-900/80 px-6 py-4">
          <SlidersHorizontal className="h-4 w-4 text-zinc-500" />
          <span className="whitespace-nowrap text-sm font-medium text-zinc-400">Threshold</span>
          <input
            type="range"
            min="0"
            max="255"
            value={threshold}
            onChange={(e) => setThreshold(Number(e.target.value))}
            className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-zinc-800 accent-indigo-500"
          />
          <span className="w-8 text-right font-mono text-sm text-zinc-400">{threshold}</span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-px bg-zinc-800 md:grid-cols-2">
        <div className="flex min-h-[300px] flex-col items-center justify-center bg-zinc-950 p-4">
          <div className="mb-4 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-zinc-500">
            <ImageIcon className="h-4 w-4" /> Original Photo
          </div>
          {originalUrl && (
            <img
              src={originalUrl}
              alt="Original"
              className="max-h-[400px] max-w-full rounded-lg border border-zinc-800 object-contain shadow-lg"
            />
          )}
        </div>
        <div className="flex min-h-[300px] flex-col items-center justify-center bg-zinc-950 p-4">
          <div className="mb-4 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-zinc-500">
            <Wand2 className="h-4 w-4" /> Processed Result
          </div>
          <canvas
            ref={canvasRef}
            className="max-h-[400px] max-w-full rounded-lg border border-zinc-800 bg-zinc-900 object-contain shadow-lg"
          />
        </div>
      </div>
    </div>
  );
}
