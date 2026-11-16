import { cn } from "@/lib/utils";

const STYLES: Record<string, string> = {
  pendente: "bg-amber-50 text-amber-800 border-amber-200",
  deferida: "bg-green-50 text-green-800 border-green-200",
  indeferida: "bg-red-50 text-red-800 border-red-200",
  concluida: "bg-slate-100 text-slate-700 border-slate-200",
  cancelada: "bg-slate-100 text-slate-500 border-slate-200",
  Emergencial: "bg-red-50 text-red-800 border-red-200",
  Rotina: "bg-green-50 text-green-800 border-green-200",
};

const LABELS: Record<string, string> = {
  pendente: "Pendente",
  deferida: "Deferida",
  indeferida: "Indeferida",
  concluida: "Concluída",
  cancelada: "Cancelada",
};

export function StatusBadge({ value, testId }: { value: string; testId?: string }) {
  return (
    <span
      data-testid={testId}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold",
        STYLES[value] ?? "bg-slate-100 text-slate-700 border-slate-200",
      )}
    >
      {value === "pendente" && <span className="pulse-dot size-1.5 rounded-full bg-amber-500" />}
      {value === "Emergencial" && <span className="size-1.5 rounded-full bg-red-600" />}
      {LABELS[value] ?? value}
    </span>
  );
}
