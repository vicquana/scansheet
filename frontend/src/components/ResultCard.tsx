export type ConversionResult = {
  filename: string;
  original_key: string;
  download_url: string;
};

type ResultCardProps = {
  result: ConversionResult;
};

export function ResultCard({ result }: ResultCardProps) {
  return (
    <li className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="truncate text-sm text-slate-500">{result.filename}</p>
      <p className="mt-2 text-sm font-medium text-slate-900">
        Original key: {result.original_key}
      </p>
      <a
        href={result.download_url}
        className="mt-3 inline-flex rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
      >
        Download Transposed MusicXML
      </a>
    </li>
  );
}
