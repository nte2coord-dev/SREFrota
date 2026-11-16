import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowRight, Car, Clock, Users } from "lucide-react";
import { apiGet, apiPost } from "@/lib/api";
import type { Carona, CaronaIn, Diretoria, RideOffer } from "@/lib/types";
import { errMsg, fmtDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

function SeatMeter({ left, total }: { left: number; total: number }) {
  return (
    <div className="flex gap-1" aria-label={`${left} de ${total} vagas livres`}>
      {Array.from({ length: total }).map((_, i) => (
        <span key={i} className={`h-2 w-5 rounded-full ${i < total - left ? "bg-slate-300" : "bg-green-500"}`} />
      ))}
    </div>
  );
}

export function RideBoard() {
  const qc = useQueryClient();
  const offers = useQuery({ queryKey: ["ride-offers"], queryFn: () => apiGet<RideOffer[]>("/caronas/disponiveis") });
  const diretorias = useQuery({ queryKey: ["diretorias"], queryFn: () => apiGet<Diretoria[]>("/diretorias") });
  const [target, setTarget] = useState<RideOffer | null>(null);
  const [form, setForm] = useState({ nome: "", email: "", diretoria: "", motivo: "" });
  const [created, setCreated] = useState<Carona | null>(null);

  const req = useMutation({
    mutationFn: (body: CaronaIn) => apiPost<Carona>("/caronas", body),
    onSuccess: (c) => {
      setCreated(c);
      setForm({ nome: "", email: "", diretoria: "", motivo: "" });
      qc.invalidateQueries({ queryKey: ["ride-offers"] });
      toast.success(`Pedido de carona enviado — protocolo ${c.protocolo}`);
    },
    onError: (e) => toast.error(errMsg(e)),
  });

  const close = () => { setTarget(null); setCreated(null); };

  return (
    <div data-testid="ride-board">
      {offers.isLoading && <p className="text-slate-500">Carregando viagens...</p>}
      {(offers.isError || (offers.data && offers.data.length === 0)) && (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center" data-testid="ride-board-empty">
          <Car className="mx-auto size-8 text-slate-400" />
          <p className="mt-3 font-medium text-slate-700">Nenhuma viagem com vagas no momento</p>
          <p className="text-sm text-slate-500">Assim que novas saídas forem deferidas, elas aparecerão aqui.</p>
        </div>
      )}
      <div className="grid gap-4 lg:grid-cols-2">
        {!offers.isError && (offers.data ?? []).map((o, idx) => {
          const full = o.vagas_disponiveis <= 0;
          return (
            <article key={o.trip_id} style={{ animationDelay: `${idx * 50}ms` }}
              className="rise-in group rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition-[box-shadow,border-color] duration-200 hover:border-slate-300 hover:shadow-md"
              data-testid={`ride-card-${o.protocolo}`}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-mono text-xs text-slate-500">{o.protocolo} · {o.diretoria}</p>
                  <h4 className="mt-1 text-lg font-semibold text-slate-900">
                    {o.destinos.map((d) => d.municipio).join(" → ")}
                  </h4>
                </div>
                <div className={`shrink-0 rounded-xl px-3 py-2 text-center ${full ? "bg-slate-100" : "bg-green-50"}`}>
                  <p className={`font-heading text-2xl font-semibold leading-none ${full ? "text-slate-500" : "text-green-700"}`} data-testid={`ride-card-vagas-${o.protocolo}`}>
                    {o.vagas_disponiveis}
                  </p>
                  <p className="mt-1 text-[10px] uppercase tracking-wider text-slate-500">{full ? "Lotado" : "vagas"}</p>
                </div>
              </div>
              <ul className="mt-3 space-y-1 text-sm text-slate-600">
                {o.destinos.map((d, i) => (
                  <li key={i} className="truncate">• {d.local} — {d.endereco}</li>
                ))}
              </ul>
              <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-slate-700">
                <span className="flex items-center gap-1.5"><Clock className="size-4 text-slate-400" />{fmtDate(o.data_saida)} · {o.hora_saida}–{o.hora_retorno}</span>
                <span className="flex items-center gap-1.5"><Car className="size-4 text-slate-400" />{o.veiculo}</span>
                <span className="flex items-center gap-1.5"><Users className="size-4 text-slate-400" />{o.roteiro}</span>
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">
                <SeatMeter left={o.vagas_disponiveis} total={o.vagas_totais} />
                <Button size="sm" disabled={full} onClick={() => setTarget(o)} data-testid={`ride-request-btn-${o.protocolo}`}>
                  Solicitar carona <ArrowRight className="size-4" />
                </Button>
              </div>
            </article>
          );
        })}
      </div>

      <Dialog open={!!target} onOpenChange={(o) => { if (!o) close(); }}>
        <DialogContent data-testid="ride-request-dialog">
          {created ? (
            <div className="space-y-3">
              <DialogHeader>
                <DialogTitle>Pedido enviado</DialogTitle>
                <DialogDescription>A administração analisará seu pedido e você receberá o retorno por e-mail.</DialogDescription>
              </DialogHeader>
              <div className="rounded-xl bg-slate-900 px-4 py-3 text-white">
                <span className="text-xs uppercase tracking-widest text-slate-400">Protocolo</span>
                <p className="font-mono text-xl" data-testid="ride-success-protocol">{created.protocolo}</p>
              </div>
              <DialogFooter><Button onClick={close} data-testid="ride-success-close-btn">Fechar</Button></DialogFooter>
            </div>
          ) : target && (
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                if (!form.diretoria) return toast.error("Selecione a diretoria");
                req.mutate({ trip_id: target.trip_id, ...form });
              }}
            >
              <DialogHeader>
                <DialogTitle>Solicitar carona</DialogTitle>
                <DialogDescription>
                  {target.protocolo} · {fmtDate(target.data_saida)} às {target.hora_saida} · {target.destinos.map((d) => d.municipio).join(" → ")}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-1.5">
                <Label htmlFor="c-nome">Nome *</Label>
                <Input id="c-nome" required value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} data-testid="ride-nome-input" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="c-email">E-mail *</Label>
                <Input id="c-email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} data-testid="ride-email-input" />
              </div>
              <div className="space-y-1.5">
                <Label>Diretoria *</Label>
                <Select value={form.diretoria} onValueChange={(v: string) => setForm({ ...form, diretoria: v })}>
                  <SelectTrigger className="w-full" data-testid="ride-diretoria-select">
                    <SelectValue>{(v) => (v as string) || <span className="text-slate-400">Selecione</span>}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {(diretorias.data ?? []).map((d) => (
                      <SelectItem key={d.id} value={d.nome} data-testid={`ride-diretoria-option-${d.id}`}>{d.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="c-motivo">Motivo (opcional)</Label>
                <Textarea id="c-motivo" rows={2} value={form.motivo} onChange={(e) => setForm({ ...form, motivo: e.target.value })} data-testid="ride-motivo-input" />
              </div>
              <DialogFooter>
                <Button type="submit" disabled={req.isPending} data-testid="ride-submit-btn">
                  {req.isPending ? "Enviando..." : "Enviar pedido"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
