import { useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { Header } from "./components/Header";
import { ImageProcessor } from "./components/ImageProcessor";
import { SheetMusicViewer } from "./components/SheetMusicViewer";
import { UploadZone } from "./components/UploadZone";

type ConvertResponse = {
  original_key?: string;
  download_url?: string;
  results?: Array<{
    filename: string;
    original_key: string;
    download_url: string;
  }>;
};

export default function App() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [processedBlob, setProcessedBlob] = useState<Blob | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [musicXml, setMusicXml] = useState<string | null>(null);
  const [originalKey, setOriginalKey] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    setProcessedBlob(null);
    setMusicXml(null);
    setOriginalKey(null);
    setDownloadUrl(null);
    setError(null);
  };

  const handleProcessed = (blob: Blob) => {
    setProcessedBlob(blob);
  };

  const handleUpload = async () => {
    if (!processedBlob) {
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("files", processedBlob, "processed-sheet-music.jpg");

      const response = await fetch("/api/convert", {
        method: "POST",
        body: formData,
      });

      const data = (await response.json()) as ConvertResponse;
      if (!response.ok) {
        throw new Error((data as { detail?: string }).detail ?? "Failed to process sheet music");
      }

      const firstResult = data.results?.[0]
        ? data.results[0]
        : data.original_key && data.download_url
          ? {
              filename: selectedFile?.name ?? "score.png",
              original_key: data.original_key,
              download_url: data.download_url,
            }
          : null;

      if (!firstResult) {
        throw new Error("No conversion output returned from server");
      }

      const xmlResponse = await fetch(firstResult.download_url);
      if (!xmlResponse.ok) {
        throw new Error("Converted file generated but failed to download MusicXML");
      }

      const xmlText = await xmlResponse.text();
      setMusicXml(xmlText);
      setOriginalKey(firstResult.original_key);
      setDownloadUrl(firstResult.download_url);
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
            Upload a photo of your handwritten sheet music and convert it into transposed MusicXML.
          </p>
        </div>

        {!selectedFile && (
          <div className="mx-auto max-w-2xl">
            <UploadZone onFileSelect={handleFileSelect} />
          </div>
        )}

        {selectedFile && !musicXml && (
          <div className="space-y-8">
            <ImageProcessor file={selectedFile} onProcessed={handleProcessed} />

            <div className="flex justify-center">
              <button
                onClick={handleUpload}
                disabled={!processedBlob || isUploading}
                className="group relative inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-500 px-8 py-4 text-lg font-medium text-white shadow-lg shadow-indigo-500/20 transition-all duration-200 hover:bg-indigo-600 hover:shadow-indigo-500/40 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="h-6 w-6 animate-spin" />
                    Converting and transposing...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-6 w-6" />
                    Convert to C Major
                  </>
                )}
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
                <h3 className="text-2xl font-semibold text-zinc-100">Your Digital Score</h3>
                {originalKey && <p className="mt-1 text-zinc-400">Detected original key: {originalKey}</p>}
                {downloadUrl && (
                  <a
                    className="mt-2 inline-block text-sm text-indigo-400 hover:text-indigo-300"
                    href={downloadUrl}
                  >
                    Download transposed MusicXML from server
                  </a>
                )}
              </div>
              <button
                onClick={() => {
                  setSelectedFile(null);
                  setMusicXml(null);
                  setProcessedBlob(null);
                  setOriginalKey(null);
                  setDownloadUrl(null);
                }}
                className="rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-100"
              >
                Scan Another
              </button>
            </div>
            <SheetMusicViewer xmlData={musicXml} />
          </div>
        )}
      </main>
    </div>
  );
}
