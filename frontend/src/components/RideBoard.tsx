import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowRight, Car, Clock, MapPin, Route, UserRound, Users } from "lucide-react";
import { apiGet, apiPost } from "@/lib/api";
import type { Carona, CaronaIn, Diretoria, RideOffer } from "@/lib/types";
import { dateParts, errMsg, fmtDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
          const dt = dateParts(o.data_saida);
          return (
            <article key={o.trip_id} style={{ animationDelay: `${idx * 50}ms` }}
              className={`rise-in group overflow-hidden rounded-2xl border border-slate-200 border-l-4 bg-white shadow-xs transition-[box-shadow,border-color] duration-200 hover:border-slate-300 hover:shadow-md ${full ? "border-l-slate-300" : "border-l-[#1E3A8A]"}`}
              data-testid={`ride-card-${o.protocolo}`}>
              <div className="flex gap-4 p-5">
                <div className="flex w-16 shrink-0 flex-col items-center justify-center border-r border-slate-200 pr-4 text-center" data-testid={`ride-card-date-${o.protocolo}`}>
                  <span className="font-heading text-3xl font-semibold leading-none text-[#1E3A8A]">{dt.day}</span>
                  <span className="mt-1 text-xs font-bold text-slate-800">{dt.month}</span>
                  <span className="mt-2 text-[10px] leading-tight text-slate-500">{dt.weekday}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-slate-500"><span className="font-mono font-semibold tracking-wide">{o.protocolo}</span> · {o.diretoria}</p>
                  <h4 className="mt-1 truncate text-lg font-semibold text-slate-900">{o.destinos.map((d) => d.local).join(" → ")}</h4>
                  <p className="mt-1 flex items-start gap-1.5 text-sm text-slate-600">
                    <MapPin className="mt-0.5 size-4 shrink-0 text-slate-400" />
                    <span>{o.destinos.map((d) => d.municipio).join(" → ")} · {o.objetivo}</span>
                  </p>
                  <p className="mt-3 flex items-center gap-2 text-sm text-slate-600">
                    <Clock className="size-4 text-slate-400" />
                    <b className="text-slate-900">{o.hora_saida}</b> saída <ArrowRight className="size-3.5 text-slate-400" /> <b className="text-slate-900">{o.hora_retorno}</b> retorno
                  </p>
                  <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
                    <span className={`flex items-center gap-2 ${full ? "text-slate-500" : "text-green-700"}`}>
                      <Users className="size-5" />
                      <span className="font-heading text-2xl font-semibold leading-none" data-testid={`ride-card-vagas-${o.protocolo}`}>{o.vagas_disponiveis}</span>
                      <span className="text-xs leading-tight text-slate-600">{full ? "lotado" : <>vagas<br />disponíveis</>}</span>
                    </span>
                    <span className="text-xs text-slate-500" data-testid={`ride-card-ocupadas-${o.protocolo}`}>{o.vagas_ocupadas}/{o.vagas_totais} ocupadas</span>
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-slate-100 px-5 py-3 text-xs text-slate-600">
                <span className="flex items-center gap-1.5"><UserRound className="size-4 text-slate-400" />Solicitante: {o.solicitante_nome}</span>
                <span className="flex items-center gap-1.5"><Route className="size-4 text-slate-400" />{o.roteiro}</span>
                <span className="flex items-center gap-1.5 text-green-700"><span className="size-1.5 rounded-full bg-green-500" /><Car className="size-4" />{o.veiculo}</span>
                <span className="text-slate-400">{fmtDate(o.data_saida)}</span>
              </div>
              <div className="px-5 pb-5">
                <Button className="w-full" variant="secondary" disabled={full} onClick={() => setTarget(o)} data-testid={`ride-request-btn-${o.protocolo}`}>
                  {full ? "Sem vagas" : "Pedir carona"} {!full && <ArrowRight className="size-4" />}
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
