import { type ChangeEvent, type DragEvent, useCallback, useState } from "react";
import { UploadCloud } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface UploadZoneProps {
  onFilesSelect: (files: File[]) => void;
  disabled?: boolean;
}

export function UploadZone({ onFilesSelect, disabled }: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback(
    (event: DragEvent) => {
      event.preventDefault();
      if (!disabled) {
        setIsDragging(true);
      }
    },
    [disabled],
  );

  const handleDragLeave = useCallback((event: DragEvent) => {
    event.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (event: DragEvent) => {
      event.preventDefault();
      setIsDragging(false);
      if (disabled) {
        return;
      }

      const files = Array.from(event.dataTransfer.files).filter(
        (file) => file.type === "image/jpeg" || file.type === "image/png",
      );
      if (files.length > 0) {
        onFilesSelect(files);
      }
    },
    [disabled, onFilesSelect],
  );

  const handleFileInput = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      if (disabled) {
        return;
      }
      const files = Array.from(event.target.files ?? []);
      const validFiles = files.filter(
        (file) => file.type === "image/jpeg" || file.type === "image/png",
      );
      if (validFiles.length > 0) {
        onFilesSelect(validFiles);
      }
    },
    [disabled, onFilesSelect],
  );

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        "relative flex h-64 w-full cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed transition-all duration-200 ease-in-out",
        isDragging
          ? "border-indigo-500 bg-indigo-500/10"
          : "border-zinc-700 bg-zinc-900/50 hover:border-zinc-600 hover:bg-zinc-800/50",
        disabled && "cursor-not-allowed opacity-50",
      )}
    >
      <input
        type="file"
        accept="image/jpeg, image/png"
        multiple
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
        onChange={handleFileInput}
        disabled={disabled}
      />
      <div className="flex flex-col items-center gap-4 p-6 text-center">
        <div
          className={cn(
            "rounded-full p-4 transition-colors duration-200",
            isDragging
              ? "bg-indigo-500/20 text-indigo-400"
              : "bg-zinc-800 text-zinc-400 group-hover:text-zinc-300",
          )}
        >
          <UploadCloud className="h-8 w-8" />
        </div>
        <div>
          <p className="mb-1 text-lg font-medium text-zinc-200">Drop your sheet music photos here</p>
          <p className="text-sm text-zinc-500">Select multiple JPEG/PNG pages from your phone</p>
        </div>
      </div>
    </div>
  );
}
