import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, X } from "lucide-react";
import { apiPatch } from "@/lib/api";
import type { CaronaAdmin, CaronaDecision } from "@/lib/types";
import { errMsg, fmtDate, fmtDateTime } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/StatusBadge";

export function CaronasPanel({ caronas }: { caronas: CaronaAdmin[] }) {
  const qc = useQueryClient();
  const [obs, setObs] = useState<Record<string, string>>({});
  const decide = useMutation({
    mutationFn: ({ id, body }: { id: string; body: CaronaDecision }) => apiPatch<CaronaAdmin>(`/admin/caronas/${id}/decisao`, body),
    onSuccess: (c) => {
      qc.invalidateQueries({ queryKey: ["admin"] });
      toast.success(`Carona ${c.protocolo} ${c.status}. Notificação enviada por e-mail ao solicitante.`);
    },
    onError: (e) => toast.error(errMsg(e)),
  });

  const pend = caronas.filter((c) => c.status === "pendente");
  const done = caronas.filter((c) => c.status !== "pendente");

  return (
    <div className="space-y-8" data-testid="admin-caronas-panel">
      <section>
        <h3 className="mb-3 text-lg font-semibold">Aguardando decisão <span className="text-slate-400">({pend.length})</span></h3>
        {pend.length === 0 && <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center text-slate-500" data-testid="admin-caronas-empty">Nenhum pedido de carona pendente.</p>}
        <div className="grid gap-3 lg:grid-cols-2">
          {pend.map((c) => (
            <article key={c.id} className="rise-in rounded-2xl border border-slate-200 bg-white p-4 shadow-xs" data-testid={`admin-carona-card-${c.protocolo}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-mono text-xs text-slate-500">{c.protocolo} · viagem {c.trip_protocolo}</p>
                  <p className="mt-1 font-medium text-slate-900">{c.nome} <span className="font-normal text-slate-500">· {c.diretoria}</span></p>
                  <p className="truncate text-sm text-slate-600">{fmtDate(c.trip_data_saida)} · {c.trip_destino}</p>
                  {c.motivo && <p className="mt-1 text-sm text-slate-600">“{c.motivo}”</p>}
                </div>
                <span className={`shrink-0 rounded-lg px-2 py-1 text-xs font-semibold ${c.vagas_disponiveis > 0 ? "bg-green-50 text-green-800" : "bg-red-50 text-red-700"}`}>
                  {c.vagas_disponiveis} vaga(s)
                </span>
              </div>
              <Input className="mt-3" placeholder="Observação (opcional)" value={obs[c.id] ?? ""}
                onChange={(e) => setObs({ ...obs, [c.id]: e.target.value })} data-testid={`admin-carona-obs-${c.protocolo}`} />
              <div className="mt-3 flex gap-2">
                <Button size="sm" className="bg-green-600 hover:bg-green-700" disabled={decide.isPending || c.vagas_disponiveis <= 0}
                  onClick={() => decide.mutate({ id: c.id, body: { acao: "deferir", obs: obs[c.id] ?? "" } })} data-testid={`admin-approve-carona-btn-${c.protocolo}`}>
                  <Check className="size-4" /> Deferir
                </Button>
                <Button size="sm" variant="outline" className="border-red-200 text-red-700 hover:bg-red-50" disabled={decide.isPending}
                  onClick={() => decide.mutate({ id: c.id, body: { acao: "indeferir", obs: obs[c.id] ?? "" } })} data-testid={`admin-reject-carona-btn-${c.protocolo}`}>
                  <X className="size-4" /> Indeferir
                </Button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section>
        <h3 className="mb-3 text-lg font-semibold">Histórico</h3>
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          {done.length === 0 && <p className="p-6 text-center text-slate-500">Sem decisões registradas.</p>}
          <ul className="divide-y divide-slate-100">
            {done.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm" data-testid={`admin-carona-history-${c.protocolo}`}>
                <span><span className="font-mono text-xs text-slate-500">{c.protocolo}</span> · {c.nome} · viagem {c.trip_protocolo}</span>
                <span className="flex items-center gap-3 text-slate-500">{fmtDateTime(c.decided_at)} <StatusBadge value={c.status} /></span>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
