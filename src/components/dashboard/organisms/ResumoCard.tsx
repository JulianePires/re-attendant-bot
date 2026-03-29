export function ResumoCard({ titulo, valor, cor }: { titulo: string; valor: number; cor: string }) {
  return (
    <div
      className={`rounded-2xl border border-zinc-800/50 bg-zinc-950/60 p-6 shadow-xl backdrop-blur-md text-${cor}-400 animate-in cursor-default transition-all duration-300 ease-out fade-in slide-in-from-bottom-4 hover:-translate-y-1 hover:scale-[1.02] focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 focus-visible:outline-none active:scale-95`}
      tabIndex={0}
      aria-label={`${titulo}: ${valor}`}
    >
      <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">{titulo}</p>
      <p className="mt-1 text-3xl font-bold">{valor}</p>
    </div>
  );
}
