import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Car, UserRound } from "lucide-react";
import { apiGet } from "@/lib/api";
import type { TrackResult } from "@/lib/types";
import { fmtDate, fmtDateTime } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/StatusBadge";

const STEPS = ["pendente", "deferida", "concluida"] as const;

function Timeline({ status }: { status: string }) {
  const rejected = status === "indeferida" || status === "cancelada";
  const idx = rejected ? 1 : STEPS.indexOf(status as (typeof STEPS)[number]);
  const labels = ["Recebida", rejected ? (status === "cancelada" ? "Cancelada" : "Indeferida") : "Deferida", "Concluída"];
  return (
    <ol className="mt-4 flex items-center gap-2">
      {labels.map((l, i) => {
        const active = i <= idx;
        const color = rejected && i === 1 ? "bg-red-600" : active ? "bg-[#1E3A8A]" : "bg-slate-200";
        return (
          <li key={l} className="flex flex-1 items-center gap-2">
            <span className={`size-2.5 shrink-0 rounded-full ${color}`} />
            <span className={`text-xs ${active ? "text-slate-800 font-medium" : "text-slate-400"}`}>{l}</span>
            {i < labels.length - 1 && <span className={`h-px flex-1 ${i < idx ? "bg-[#1E3A8A]" : "bg-slate-200"}`} />}
          </li>
        );
      })}
    </ol>
  );
}

export function TrackPanel() {
  const [input, setInput] = useState("");
  const [q, setQ] = useState("");
  const res = useQuery({
    queryKey: ["track", q],
    queryFn: () => apiGet<TrackResult>(`/acompanhar?q=${encodeURIComponent(q)}`),
    enabled: q.length >= 3,
  });
  const empty = res.data && res.data.trips.length === 0 && res.data.caronas.length === 0;

  return (
    <div className="space-y-6" data-testid="track-panel">
      <form
        onSubmit={(e) => { e.preventDefault(); setQ(input.trim()); }}
        className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs sm:flex-row"
      >
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <Input className="h-11 pl-9" placeholder="Protocolo (ex.: SRE-2026-0001) ou e-mail" value={input}
            onChange={(e) => setInput(e.target.value)} data-testid="track-search-input" />
        </div>
        <Button type="submit" size="lg" className="h-11" data-testid="track-search-btn">Consultar</Button>
      </form>

      {res.isFetching && <p className="text-slate-500">Consultando...</p>}
      {res.isError && <p className="text-red-700" data-testid="track-error">Não foi possível consultar agora. Tente novamente.</p>}
      {empty && !res.isError && <p className="text-slate-600" data-testid="track-empty">Nenhum pedido encontrado para “{q}”.</p>}

      {!res.isError && res.data?.trips.map((t) => (
        <article key={t.protocolo} className="rise-in rounded-2xl border border-slate-200 bg-white p-5 shadow-xs" data-testid={`track-trip-${t.protocolo}`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="font-mono text-sm text-slate-500">Solicitação de saída · {t.protocolo}</p>
              <h4 className="text-lg font-semibold">{t.destinos.map((d) => d.local).join(" → ")}</h4>
            </div>
            <div className="flex gap-2"><StatusBadge value={t.tipo} /><StatusBadge value={t.status} testId={`track-trip-status-${t.protocolo}`} /></div>
          </div>
          <p className="mt-2 text-sm text-slate-600">Saída {fmtDate(t.data_saida)} às {t.hora_saida} · retorno previsto {t.hora_retorno} · enviado em {fmtDateTime(t.created_at)}</p>
          {(t.veiculo || t.motorista) && (
            <div className="mt-3 flex flex-wrap gap-4 text-sm text-slate-800">
              {t.veiculo && <span className="flex items-center gap-1.5"><Car className="size-4 text-slate-400" />{t.veiculo}</span>}
              {t.motorista && <span className="flex items-center gap-1.5"><UserRound className="size-4 text-slate-400" />Motorista: {t.motorista}</span>}
            </div>
          )}
          {t.admin_obs && <p className="mt-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-700"><b>Retorno da administração:</b> {t.admin_obs}</p>}
          <Timeline status={t.status} />
        </article>
      ))}

      {!res.isError && res.data?.caronas.map((c) => (
        <article key={c.protocolo} className="rise-in rounded-2xl border border-slate-200 bg-white p-5 shadow-xs" data-testid={`track-carona-${c.protocolo}`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="font-mono text-sm text-slate-500">Pedido de carona · {c.protocolo} · viagem {c.trip_protocolo}</p>
              <h4 className="text-lg font-semibold">{c.destino}</h4>
            </div>
            <StatusBadge value={c.status} testId={`track-carona-status-${c.protocolo}`} />
          </div>
          <p className="mt-2 text-sm text-slate-600">Saída {fmtDate(c.data_saida)} às {c.hora_saida} · solicitado por {c.nome}</p>
          {c.admin_obs && <p className="mt-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-700"><b>Retorno da administração:</b> {c.admin_obs}</p>}
        </article>
      ))}
    </div>
  );
}
