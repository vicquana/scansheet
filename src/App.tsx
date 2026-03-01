import { useState } from "react";
import { Header } from "./components/Header";
import { UploadZone } from "./components/UploadZone";
import { ImageProcessor } from "./components/ImageProcessor";
import { SheetMusicViewer } from "./components/SheetMusicViewer";
import { Loader2, Sparkles } from "lucide-react";

export default function App() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [processedBlob, setProcessedBlob] = useState<Blob | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [musicXml, setMusicXml] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    setProcessedBlob(null);
    setMusicXml(null);
    setError(null);
  };

  const handleProcessed = (blob: Blob) => {
    setProcessedBlob(blob);
  };

  const handleUpload = async () => {
    if (!processedBlob) return;

    setIsUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("image", processedBlob, "processed-sheet-music.jpg");

      const response = await fetch("/api/upload-sheet", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to process sheet music");
      }

      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }

      setMusicXml(data.musicXml);
    } catch (err) {
      console.error("Upload error:", err);
      setError(
        err instanceof Error ? err.message : "An unknown error occurred",
      );
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-indigo-500/30">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
        <div className="text-center space-y-4 max-w-2xl mx-auto">
          <h2 className="text-4xl font-bold tracking-tight sm:text-5xl text-zinc-100">
            Digitize your <span className="text-indigo-400">handwritten</span>{" "}
            music
          </h2>
          <p className="text-lg text-zinc-400">
            Upload a photo of your handwritten sheet music and let our AI
            convert it into editable digital formats like MusicXML and PDF.
          </p>
        </div>

        {!selectedFile && (
          <div className="max-w-2xl mx-auto">
            <UploadZone onFileSelect={handleFileSelect} />
          </div>
        )}

        {selectedFile && !musicXml && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <ImageProcessor file={selectedFile} onProcessed={handleProcessed} />

            <div className="flex justify-center">
              <button
                onClick={handleUpload}
                disabled={!processedBlob || isUploading}
                className="group relative inline-flex items-center justify-center gap-2 px-8 py-4 text-lg font-medium text-white bg-indigo-500 hover:bg-indigo-600 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-6 h-6 animate-spin" />
                    AI is reading your handwriting...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-6 h-6" />
                    Digitize Sheet Music
                  </>
                )}
              </button>
            </div>

            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-center max-w-2xl mx-auto">
                {error}
              </div>
            )}
          </div>
        )}

        {musicXml && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex justify-between items-center">
              <h3 className="text-2xl font-semibold text-zinc-100">
                Your Digital Score
              </h3>
              <button
                onClick={() => {
                  setSelectedFile(null);
                  setMusicXml(null);
                  setProcessedBlob(null);
                }}
                className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-zinc-100 bg-zinc-900 hover:bg-zinc-800 rounded-lg transition-colors border border-zinc-800"
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
