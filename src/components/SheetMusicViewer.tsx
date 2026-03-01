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
    if (!containerRef.current || !xmlData) return;

    setIsRendering(true);

    // Initialize OSMD
    if (!osmdRef.current) {
      osmdRef.current = new OpenSheetMusicDisplay(containerRef.current, {
        autoResize: true,
        backend: "svg",
        drawTitle: true,
        drawSubtitle: true,
        drawComposer: true,
        drawLyricist: true,
        drawCredits: true,
        drawPartNames: true,
        drawPartAbbreviations: true,
        drawMeasureNumbers: true,
        drawMeasureNumbersOnlyAtSystemStart: true,
        drawTimeSignatures: true,
        pageFormat: "A4_P",
        pageBackgroundColor: "#fdfbf7", // Soft musical paper color
        renderSingleHorizontalStaffline: false,
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

    renderScore();

    return () => {
      // Cleanup if needed
    };
  }, [xmlData]);

  const handleDownloadXML = () => {
    const blob = new Blob([xmlData], { type: "application/xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "muse-scanner-result.musicxml";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadPNG = async () => {
    if (!containerRef.current) return;
    try {
      const canvas = await html2canvas(containerRef.current, {
        backgroundColor: "#fdfbf7",
        scale: 2,
      });
      const url = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = url;
      a.download = "muse-scanner-result.png";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (error) {
      console.error("Error generating PNG:", error);
    }
  };

  const handleDownloadPDF = async () => {
    if (!containerRef.current) return;
    try {
      const canvas = await html2canvas(containerRef.current, {
        backgroundColor: "#fdfbf7",
        scale: 2,
      });
      const imgData = canvas.toDataURL("image/jpeg", 0.95);

      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "px",
        format: [canvas.width, canvas.height],
      });

      pdf.addImage(imgData, "JPEG", 0, 0, canvas.width, canvas.height);
      pdf.save("muse-scanner-result.pdf");
    } catch (error) {
      console.error("Error generating PDF:", error);
    }
  };

  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl flex flex-col">
      <div className="p-4 border-b border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-4 bg-zinc-900">
        <div className="flex items-center gap-2 text-zinc-300 font-medium">
          <FileText className="w-5 h-5 text-indigo-400" />
          Digital Sheet Music
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleDownloadXML}
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium bg-zinc-800 text-zinc-300 hover:text-zinc-100 hover:bg-zinc-700 rounded-md transition-colors"
          >
            <FileCode className="w-4 h-4" />
            <span className="hidden sm:inline">MusicXML</span>
          </button>
          <button
            onClick={handleDownloadPNG}
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium bg-zinc-800 text-zinc-300 hover:text-zinc-100 hover:bg-zinc-700 rounded-md transition-colors"
          >
            <FileImage className="w-4 h-4" />
            <span className="hidden sm:inline">PNG</span>
          </button>
          <button
            onClick={handleDownloadPDF}
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium bg-indigo-500 text-white hover:bg-indigo-600 rounded-md transition-colors shadow-sm"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">PDF</span>
          </button>
        </div>
      </div>

      <div className="relative flex-1 bg-[#fdfbf7] min-h-[600px] overflow-auto p-8">
        {isRendering && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#fdfbf7]/80 backdrop-blur-sm z-10">
            <div className="flex flex-col items-center gap-4">
              <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-zinc-600 font-medium">
                Rendering sheet music...
              </p>
            </div>
          </div>
        )}
        <div ref={containerRef} className="w-full h-full" />
      </div>
    </div>
  );
}
