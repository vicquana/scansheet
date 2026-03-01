import React, { useCallback, useState } from "react";
import { UploadCloud, FileImage } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface UploadZoneProps {
  onFileSelect: (file: File) => void;
  disabled?: boolean;
}

export function UploadZone({ onFileSelect, disabled }: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (!disabled) setIsDragging(true);
    },
    [disabled],
  );

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (disabled) return;

      const file = e.dataTransfer.files[0];
      if (file && (file.type === "image/jpeg" || file.type === "image/png")) {
        onFileSelect(file);
      }
    },
    [disabled, onFileSelect],
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (disabled) return;
      const file = e.target.files?.[0];
      if (file) {
        onFileSelect(file);
      }
    },
    [disabled, onFileSelect],
  );

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        "relative group cursor-pointer flex flex-col items-center justify-center w-full h-64 rounded-2xl border-2 border-dashed transition-all duration-200 ease-in-out",
        isDragging
          ? "border-indigo-500 bg-indigo-500/10"
          : "border-zinc-700 bg-zinc-900/50 hover:bg-zinc-800/50 hover:border-zinc-600",
        disabled && "opacity-50 cursor-not-allowed",
      )}
    >
      <input
        type="file"
        accept="image/jpeg, image/png"
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
        onChange={handleFileInput}
        disabled={disabled}
      />
      <div className="flex flex-col items-center gap-4 text-center p-6">
        <div
          className={cn(
            "p-4 rounded-full transition-colors duration-200",
            isDragging
              ? "bg-indigo-500/20 text-indigo-400"
              : "bg-zinc-800 text-zinc-400 group-hover:text-zinc-300",
          )}
        >
          <UploadCloud className="w-8 h-8" />
        </div>
        <div>
          <p className="text-lg font-medium text-zinc-200 mb-1">
            Drop your sheet music here
          </p>
          <p className="text-sm text-zinc-500">Supports JPEG and PNG formats</p>
        </div>
      </div>
    </div>
  );
}
