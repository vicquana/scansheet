import { useEffect, useRef, useState } from "react";
import { SlidersHorizontal, Image as ImageIcon, Wand2 } from "lucide-react";

interface ImageProcessorProps {
  file: File;
  onProcessed: (blob: Blob) => void;
}

export function ImageProcessor({ file, onProcessed }: ImageProcessorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [originalUrl, setOriginalUrl] = useState<string>("");
  const [mode, setMode] = useState<"original" | "grayscale" | "binarized">(
    "original",
  );
  const [threshold, setThreshold] = useState(128);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setOriginalUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    if (!originalUrl || !canvasRef.current) return;

    const img = new Image();
    img.src = originalUrl;
    img.onload = () => {
      const canvas = canvasRef.current!;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Scale down image if it's too large to prevent memory issues
      const MAX_WIDTH = 2000;
      const MAX_HEIGHT = 2000;
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > MAX_WIDTH) {
          height *= MAX_WIDTH / width;
          width = MAX_WIDTH;
        }
      } else {
        if (height > MAX_HEIGHT) {
          width *= MAX_HEIGHT / height;
          height = MAX_HEIGHT;
        }
      }

      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);

      if (mode === "original") {
        updateOutput();
        return;
      }

      const imageData = ctx.getImageData(0, 0, width, height);
      const data = imageData.data;

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        // Standard grayscale conversion
        const gray = 0.299 * r + 0.587 * g + 0.114 * b;

        if (mode === "grayscale") {
          data[i] = gray;
          data[i + 1] = gray;
          data[i + 2] = gray;
        } else if (mode === "binarized") {
          const val = gray > threshold ? 255 : 0;
          data[i] = val;
          data[i + 1] = val;
          data[i + 2] = val;
        }
      }

      ctx.putImageData(imageData, 0, 0);
      updateOutput();
    };
  }, [originalUrl, mode, threshold]);

  const updateOutput = () => {
    if (!canvasRef.current) return;
    canvasRef.current.toBlob(
      (blob) => {
        if (blob) onProcessed(blob);
      },
      "image/jpeg",
      0.9,
    );
  };

  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
      <div className="p-4 border-b border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-4 bg-zinc-900">
        <div className="flex items-center gap-2 text-zinc-300 font-medium">
          <Wand2 className="w-5 h-5 text-indigo-400" />
          Image Pre-processing
        </div>

        <div className="flex items-center gap-2 bg-zinc-950 p-1 rounded-lg">
          <button
            onClick={() => setMode("original")}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              mode === "original"
                ? "bg-zinc-800 text-zinc-100 shadow-sm"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            Original
          </button>
          <button
            onClick={() => setMode("grayscale")}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              mode === "grayscale"
                ? "bg-zinc-800 text-zinc-100 shadow-sm"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            Grayscale
          </button>
          <button
            onClick={() => setMode("binarized")}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              mode === "binarized"
                ? "bg-zinc-800 text-zinc-100 shadow-sm"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            Binarized
          </button>
        </div>
      </div>

      {mode === "binarized" && (
        <div className="px-6 py-4 border-b border-zinc-800 bg-zinc-900/80 flex items-center gap-4">
          <SlidersHorizontal className="w-4 h-4 text-zinc-500" />
          <span className="text-sm text-zinc-400 font-medium whitespace-nowrap">
            Threshold
          </span>
          <input
            type="range"
            min="0"
            max="255"
            value={threshold}
            onChange={(e) => setThreshold(Number(e.target.value))}
            className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
          />
          <span className="text-sm text-zinc-400 font-mono w-8 text-right">
            {threshold}
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-zinc-800">
        <div className="bg-zinc-950 p-4 flex flex-col items-center justify-center min-h-[300px]">
          <div className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-4 flex items-center gap-2">
            <ImageIcon className="w-4 h-4" /> Original Photo
          </div>
          {originalUrl && (
            <img
              src={originalUrl}
              alt="Original"
              className="max-w-full max-h-[400px] object-contain rounded-lg shadow-lg border border-zinc-800"
            />
          )}
        </div>
        <div className="bg-zinc-950 p-4 flex flex-col items-center justify-center min-h-[300px]">
          <div className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Wand2 className="w-4 h-4" /> Processed Result
          </div>
          <canvas
            ref={canvasRef}
            className="max-w-full max-h-[400px] object-contain rounded-lg shadow-lg border border-zinc-800 bg-zinc-900"
          />
        </div>
      </div>
    </div>
  );
}
