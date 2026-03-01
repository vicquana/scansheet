import { Github, Music } from "lucide-react";

export function Header() {
  return (
    <header className="border-b border-white/10 bg-zinc-950/50 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="bg-indigo-500/20 p-2 rounded-lg">
            <Music className="w-6 h-6 text-indigo-400" />
          </div>
          <h1 className="text-xl font-semibold text-zinc-100 tracking-tight">
            MuseScanner <span className="text-indigo-400">AI</span>
          </h1>
        </div>
        <a
          href="#"
          className="flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-100 transition-colors"
        >
          <Github className="w-5 h-5" />
          <span className="hidden sm:inline">Star on GitHub</span>
        </a>
      </div>
    </header>
  );
}
