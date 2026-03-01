import { useMemo, useState } from "react";
import { ConversionResult, ResultCard } from "./components/ResultCard";

type ApiResponse = {
  original_key?: string;
  download_url?: string;
  results?: ConversionResult[];
};

export default function App() {
  const [files, setFiles] = useState<File[]>([]);
  const [results, setResults] = useState<ConversionResult[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedNames = useMemo(() => files.map((file) => file.name).join(", "), [files]);

  const handleFilesChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(event.target.files ?? []);
    setFiles(selected);
    setResults([]);
    setError(null);
    setUploadProgress(0);
  };

  const uploadAndConvert = () => {
    if (files.length === 0) {
      setError("Please select at least one JPG or PNG file.");
      return;
    }

    setError(null);
    setIsUploading(true);

    const formData = new FormData();
    files.forEach((file) => formData.append("files", file));

    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/convert");

    // XHR upload event gives actual progress bytes for the form-data request.
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        setUploadProgress(Math.round((event.loaded / event.total) * 100));
      }
    };

    xhr.onerror = () => {
      setError("Network error while uploading files.");
      setIsUploading(false);
    };

    xhr.onload = () => {
      setIsUploading(false);
      setUploadProgress(100);

      if (xhr.status < 200 || xhr.status >= 300) {
        try {
          const parsed = JSON.parse(xhr.responseText) as { detail?: string };
          setError(parsed.detail ?? "Conversion failed.");
        } catch {
          setError("Conversion failed.");
        }
        return;
      }

      const payload = JSON.parse(xhr.responseText) as ApiResponse;
      if (Array.isArray(payload.results)) {
        setResults(payload.results);
      } else if (payload.original_key && payload.download_url && files[0]) {
        setResults([
          {
            filename: files[0].name,
            original_key: payload.original_key,
            download_url: payload.download_url,
          },
        ]);
      }
    };

    xhr.send(formData);
  };

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <main className="mx-auto w-full max-w-3xl rounded-2xl bg-white p-5 shadow-md sm:p-8">
        <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">ScoreTransposer</h1>
        <p className="mt-2 text-sm text-slate-600 sm:text-base">
          Upload sheet music images, convert with Audiveris, then download a MusicXML transposed to C major.
        </p>

        <section className="mt-6 space-y-4">
          <label className="block text-sm font-semibold text-slate-700">Sheet music images (JPG/PNG)</label>
          <input
            type="file"
            accept="image/png,image/jpeg"
            multiple
            onChange={handleFilesChange}
            className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-medium"
          />

          {files.length > 0 && (
            <p className="text-xs text-slate-500 sm:text-sm">Selected: {selectedNames}</p>
          )}

          <button
            type="button"
            onClick={uploadAndConvert}
            disabled={isUploading || files.length === 0}
            className="w-full rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400 sm:w-auto"
          >
            {isUploading ? "Processing..." : "Convert to C Major"}
          </button>

          {isUploading && (
            <div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full bg-emerald-500 transition-all"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <p className="mt-1 text-xs text-slate-500">Upload progress: {uploadProgress}%</p>
            </div>
          )}

          {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        </section>

        {results.length > 0 && (
          <section className="mt-8">
            <h2 className="text-lg font-semibold text-slate-900">Conversion Results</h2>
            <ul className="mt-3 space-y-3">
              {results.map((result) => (
                <ResultCard
                  key={`${result.filename}-${result.download_url}`}
                  result={result}
                />
              ))}
            </ul>
          </section>
        )}
      </main>
    </div>
  );
}
