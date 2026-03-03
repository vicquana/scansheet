import { useMemo, useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { Header } from "./components/Header";
import { SheetMusicViewer } from "./components/SheetMusicViewer";
import { UploadZone } from "./components/UploadZone";

type DownloadBundle = {
  transposed_musicxml_url: string;
  original_musicxml_url: string;
  original_clean_jpeg_url: string;
  original_pdf_url: string;
};

type ConvertResult = {
  filename: string;
  source_files?: string[];
  original_key: string;
  download_url: string;
  downloads?: DownloadBundle;
};

type ConvertResponse = {
  original_key?: string;
  download_url?: string;
  results?: ConvertResult[];
};

export default function App() {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [musicXml, setMusicXml] = useState<string | null>(null);
  const [originalKey, setOriginalKey] = useState<string | null>(null);
  const [downloads, setDownloads] = useState<DownloadBundle | null>(null);
  const [orderedNames, setOrderedNames] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const selectedSummary = useMemo(() => {
    if (selectedFiles.length === 0) {
      return null;
    }
    return `${selectedFiles.length} page(s) selected`;
  }, [selectedFiles]);

  const handleFilesSelect = (files: File[]) => {
    setSelectedFiles(files);
    setMusicXml(null);
    setOriginalKey(null);
    setDownloads(null);
    setOrderedNames([]);
    setError(null);
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const orderedFiles = [...selectedFiles].sort((a, b) => a.lastModified - b.lastModified);
      const formData = new FormData();
      orderedFiles.forEach((file) => {
        formData.append("files", file, file.name);
        formData.append("file_last_modified", String(file.lastModified));
      });

      const response = await fetch("/api/convert", {
        method: "POST",
        body: formData,
      });

      const data = (await response.json()) as ConvertResponse;
      if (!response.ok) {
        throw new Error((data as { detail?: string }).detail ?? "Failed to process sheet music");
      }

      const result = data.results?.[0];
      if (!result) {
        throw new Error("No conversion output returned from server");
      }

      const transposedUrl = result.downloads?.transposed_musicxml_url ?? result.download_url;
      const xmlResponse = await fetch(transposedUrl);
      if (!xmlResponse.ok) {
        throw new Error("Converted file generated but failed to download MusicXML");
      }

      const xmlText = await xmlResponse.text();
      setMusicXml(xmlText);
      setOriginalKey(result.original_key);
      setDownloads(result.downloads ?? null);
      setOrderedNames(result.source_files ?? orderedFiles.map((file) => file.name));
    } catch (err) {
      console.error("Upload error:", err);
      setError(err instanceof Error ? err.message : "An unknown error occurred");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 font-sans text-zinc-100 selection:bg-indigo-500/30">
      <Header />

      <main className="mx-auto max-w-7xl space-y-12 px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl space-y-4 text-center">
          <h2 className="text-4xl font-bold tracking-tight text-zinc-100 sm:text-5xl">
            Digitize your <span className="text-indigo-400">handwritten</span> music
          </h2>
          <p className="text-lg text-zinc-400">
            Upload multiple sheet photos from your phone. Files are ordered by capture/creation time and processed as one song.
          </p>
        </div>

        {selectedFiles.length === 0 && (
          <div className="mx-auto max-w-2xl">
            <UploadZone onFilesSelect={handleFilesSelect} />
          </div>
        )}

        {selectedFiles.length > 0 && !musicXml && (
          <div className="space-y-6">
            <div className="mx-auto max-w-3xl rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
              <p className="text-sm text-zinc-300">{selectedSummary}</p>
              <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-zinc-400">
                {[...selectedFiles]
                  .sort((a, b) => a.lastModified - b.lastModified)
                  .map((file) => (
                    <li key={`${file.name}-${file.lastModified}`}>{file.name}</li>
                  ))}
              </ol>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={handleUpload}
                disabled={isUploading}
                className="group relative inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-500 px-8 py-4 text-lg font-medium text-white shadow-lg shadow-indigo-500/20 transition-all duration-200 hover:bg-indigo-600 hover:shadow-indigo-500/40 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="h-6 w-6 animate-spin" />
                    Processing all pages...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-6 w-6" />
                    Process Combined Song
                  </>
                )}
              </button>
              <button
                onClick={() => handleFilesSelect([])}
                className="rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800"
              >
                Re-select Photos
              </button>
            </div>

            {error && (
              <div className="mx-auto max-w-2xl rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-center text-red-400">
                {error}
              </div>
            )}
          </div>
        )}

        {musicXml && (
          <div className="space-y-8">
            <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
              <div>
                <h3 className="text-2xl font-semibold text-zinc-100">Your Combined Digital Score</h3>
                {originalKey && <p className="mt-1 text-zinc-400">Detected original key: {originalKey}</p>}
                {orderedNames.length > 0 && (
                  <p className="mt-1 text-sm text-zinc-500">Ordered pages: {orderedNames.join(" -> ")}</p>
                )}
                {downloads && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <a
                      className="rounded-md bg-zinc-800 px-3 py-1.5 text-sm text-zinc-200 hover:bg-zinc-700"
                      href={downloads.original_pdf_url}
                    >
                      Original PDF
                    </a>
                    <a
                      className="rounded-md bg-zinc-800 px-3 py-1.5 text-sm text-zinc-200 hover:bg-zinc-700"
                      href={downloads.original_clean_jpeg_url}
                    >
                      Cleaned Original JPEG
                    </a>
                    <a
                      className="rounded-md bg-zinc-800 px-3 py-1.5 text-sm text-zinc-200 hover:bg-zinc-700"
                      href={downloads.original_musicxml_url}
                    >
                      Original MusicXML
                    </a>
                    <a
                      className="rounded-md bg-zinc-800 px-3 py-1.5 text-sm text-zinc-200 hover:bg-zinc-700"
                      href={downloads.transposed_musicxml_url}
                    >
                      Transposed MusicXML
                    </a>
                  </div>
                )}
              </div>
              <button
                onClick={() => {
                  setSelectedFiles([]);
                  setMusicXml(null);
                  setOriginalKey(null);
                  setDownloads(null);
                  setOrderedNames([]);
                }}
                className="rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-100"
              >
                Process Another Song
              </button>
            </div>
            <SheetMusicViewer xmlData={musicXml} />
          </div>
        )}
      </main>
    </div>
  );
}
