import { Github, Music } from "lucide-react";

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-zinc-950/50 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-indigo-500/20 p-2">
            <Music className="h-6 w-6 text-indigo-400" />
          </div>
          <h1 className="text-xl font-semibold tracking-tight text-zinc-100">
            ScoreTransposer <span className="text-indigo-400">OMR</span>
          </h1>
        </div>
        <a
          href="#"
          className="flex items-center gap-2 text-sm text-zinc-400 transition-colors hover:text-zinc-100"
        >
          <Github className="h-5 w-5" />
          <span className="hidden sm:inline">Frontend Restored</span>
        </a>
      </div>
    </header>
  );
}
