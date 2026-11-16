import { Link } from "react-router-dom";
import { CarFront } from "lucide-react";
import type { ReactNode } from "react";

export function SiteHeader({ right }: { right?: ReactNode }) {
  return (
    <header className="no-print sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 shadow-xs backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link to="/" data-testid="header-home-link" className="flex items-center gap-3">
          <span className="grid size-9 place-items-center rounded-lg bg-[#1E3A8A] text-white">
            <CarFront className="size-5" />
          </span>
          <span className="leading-tight">
            <span className="block font-heading text-lg font-semibold tracking-tight text-slate-900">SRE Frota</span>
            <span className="block text-[11px] uppercase tracking-[0.14em] text-slate-500">Saídas · Caronas · Frota</span>
          </span>
        </Link>
        <div className="flex items-center gap-2">{right}</div>
      </div>
    </header>
  );
}
