import { useEffect, useRef, useState } from "react";
import { OpenSheetMusicDisplay } from "opensheetmusicdisplay";
import { Download, FileCode, FileImage, FileText } from "lucide-react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

interface SheetMusicViewerProps {
  xmlData: string;
}

export function SheetMusicViewer({ xmlData }: SheetMusicViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const osmdRef = useRef<OpenSheetMusicDisplay | null>(null);
  const [isRendering, setIsRendering] = useState(true);

  useEffect(() => {
    if (!containerRef.current || !xmlData) {
      return;
    }

    setIsRendering(true);

    if (!osmdRef.current) {
      osmdRef.current = new OpenSheetMusicDisplay(containerRef.current, {
        autoResize: true,
        backend: "svg",
        pageFormat: "A4_P",
        pageBackgroundColor: "#fdfbf7",
      });
    }

    const renderScore = async () => {
      try {
        await osmdRef.current!.load(xmlData);
        osmdRef.current!.render();
      } catch (error) {
        console.error("Error rendering sheet music:", error);
      } finally {
        setIsRendering(false);
      }
    };

    void renderScore();
  }, [xmlData]);

  const handleDownloadXML = () => {
    const blob = new Blob([xmlData], { type: "application/xml" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "scoretransposer-result.musicxml";
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  };

  const handleDownloadPNG = async () => {
    if (!containerRef.current) {
      return;
    }
    try {
      const canvas = await html2canvas(containerRef.current, {
        backgroundColor: "#fdfbf7",
        scale: 2,
      });
      const url = canvas.toDataURL("image/png");
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "scoretransposer-result.png";
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
    } catch (error) {
      console.error("Error generating PNG:", error);
    }
  };

  const handleDownloadPDF = async () => {
    if (!containerRef.current) {
      return;
    }

    try {
      const canvas = await html2canvas(containerRef.current, {
        backgroundColor: "#fdfbf7",
        scale: 2,
      });
      const image = canvas.toDataURL("image/jpeg", 0.95);
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "px",
        format: [canvas.width, canvas.height],
      });
      pdf.addImage(image, "JPEG", 0, 0, canvas.width, canvas.height);
      pdf.save("scoretransposer-result.pdf");
    } catch (error) {
      console.error("Error generating PDF:", error);
    }
  };

  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/50 shadow-xl">
      <div className="flex flex-col items-center justify-between gap-4 border-b border-zinc-800 bg-zinc-900 p-4 sm:flex-row">
        <div className="flex items-center gap-2 font-medium text-zinc-300">
          <FileText className="h-5 w-5 text-indigo-400" />
          Digital Sheet Music
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleDownloadXML}
            className="flex items-center gap-2 rounded-md bg-zinc-800 px-3 py-1.5 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-700 hover:text-zinc-100"
          >
            <FileCode className="h-4 w-4" />
            <span className="hidden sm:inline">MusicXML</span>
          </button>
          <button
            onClick={handleDownloadPNG}
            className="flex items-center gap-2 rounded-md bg-zinc-800 px-3 py-1.5 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-700 hover:text-zinc-100"
          >
            <FileImage className="h-4 w-4" />
            <span className="hidden sm:inline">PNG</span>
          </button>
          <button
            onClick={handleDownloadPDF}
            className="flex items-center gap-2 rounded-md bg-indigo-500 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-indigo-600"
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">PDF</span>
          </button>
        </div>
      </div>

      <div className="relative min-h-[600px] flex-1 overflow-auto bg-[#fdfbf7] p-8">
        {isRendering && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#fdfbf7]/80 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-4">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
              <p className="font-medium text-zinc-600">Rendering sheet music...</p>
            </div>
          </div>
        )}
        <div ref={containerRef} className="h-full w-full" />
      </div>
    </div>
  );
}
