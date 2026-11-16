import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, FileText, MoreHorizontal, X } from "lucide-react";
import { apiDelete, apiGet, apiPatch } from "@/lib/api";
import type { Driver, TripAdmin, TripDecision, TripStatus, Vehicle } from "@/lib/types";
import { errMsg, fmtDate } from "@/lib/format";
import { Button, buttonVariants } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { StatusBadge } from "@/components/StatusBadge";
import { cn } from "@/lib/utils";

const FILTERS: { value: TripStatus | "todas"; label: string }[] = [
  { value: "pendente", label: "Pendentes" },
  { value: "deferida", label: "Deferidas" },
  { value: "indeferida", label: "Indeferidas" },
  { value: "concluida", label: "Concluídas" },
  { value: "todas", label: "Todas" },
];

export function TripsPanel({ trips }: { trips: TripAdmin[] }) {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<TripStatus | "todas">("pendente");
  const [target, setTarget] = useState<{ trip: TripAdmin; acao: "deferir" | "indeferir" } | null>(null);
  const [detail, setDetail] = useState<TripAdmin | null>(null);
  const [vehicleId, setVehicleId] = useState("");
  const [driverId, setDriverId] = useState("");
  const [obs, setObs] = useState("");

  const vehicles = useQuery({ queryKey: ["admin", "vehicles"], queryFn: () => apiGet<Vehicle[]>("/admin/vehicles") });
  const drivers = useQuery({ queryKey: ["admin", "drivers"], queryFn: () => apiGet<Driver[]>("/admin/drivers") });
  const vMap = useMemo(() => Object.fromEntries((vehicles.data ?? []).map((v) => [v.id, v])), [vehicles.data]);
  const dMap = useMemo(() => Object.fromEntries((drivers.data ?? []).map((d) => [d.id, d])), [drivers.data]);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin"] });

  const decide = useMutation({
    mutationFn: ({ id, body }: { id: string; body: TripDecision }) => apiPatch<TripAdmin>(`/admin/trips/${id}/decisao`, body),
    onSuccess: (t) => {
      invalidate();
      setTarget(null);
      toast.success(`Solicitação ${t.protocolo} ${t.status}. Notificação enviada por e-mail ao solicitante.`);
    },
    onError: (e) => toast.error(errMsg(e)),
  });
  const setStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: TripStatus }) => apiPatch<TripAdmin>(`/admin/trips/${id}/status`, { status }),
    onSuccess: (t) => { invalidate(); toast.success(`Solicitação ${t.protocolo} marcada como ${t.status}`); },
    onError: (e) => toast.error(errMsg(e)),
  });
  const remove = useMutation({
    mutationFn: (id: string) => apiDelete(`/admin/trips/${id}`),
    onSuccess: () => { invalidate(); toast.success("Solicitação excluída"); },
    onError: (e) => toast.error(errMsg(e)),
  });

  const open = (trip: TripAdmin, acao: "deferir" | "indeferir") => {
    setTarget({ trip, acao });
    setVehicleId(trip.vehicle_id ?? "");
    setDriverId(trip.driver_id ?? "");
    setObs(trip.admin_obs ?? "");
  };

  const list = trips
    .filter((t) => filter === "todas" || t.status === filter)
    .sort((a, b) => (a.tipo === b.tipo ? 0 : a.tipo === "Emergencial" ? -1 : 1));

  return (
    <div data-testid="admin-trips-panel">
      <div className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const count = f.value === "todas" ? trips.length : trips.filter((t) => t.status === f.value).length;
          return (
            <button key={f.value} onClick={() => setFilter(f.value)} data-testid={`admin-trips-filter-${f.value}`}
              className={cn("rounded-full border px-3 py-1.5 text-sm transition-colors duration-150",
                filter === f.value ? "border-[#1E3A8A] bg-[#1E3A8A] text-white" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50")}>
              {f.label} <span className="ml-1 opacity-70">{count}</span>
            </button>
          );
        })}
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
        {list.length === 0 && <p className="p-8 text-center text-slate-500" data-testid="admin-trips-empty">Nenhuma solicitação nesta categoria.</p>}
        <ul className="divide-y divide-slate-100">
          {list.map((t) => (
            <li key={t.id} className="grid gap-3 p-4 transition-colors duration-150 hover:bg-slate-50/70 md:grid-cols-[1fr_auto] md:items-center" data-testid={`admin-trip-row-${t.protocolo}`}>
              <button className="min-w-0 text-left" onClick={() => setDetail(t)} data-testid={`admin-trip-detail-btn-${t.protocolo}`}>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs text-slate-500">{t.protocolo}</span>
                  <StatusBadge value={t.tipo} />
                  <StatusBadge value={t.status} testId={`admin-trip-status-${t.protocolo}`} />
                  {t.caronas_pendentes > 0 && (
                    <span className="rounded-full bg-sky-50 px-2 py-0.5 text-xs font-medium text-sky-800">{t.caronas_pendentes} carona(s) pendente(s)</span>
                  )}
                </div>
                <p className="mt-1 truncate font-medium text-slate-900">{t.solicitante_nome} · <span className="text-slate-500">{t.diretoria}</span></p>
                <p className="truncate text-sm text-slate-600">
                  {fmtDate(t.data_saida)} {t.hora_saida}–{t.hora_retorno} · {t.destinos.map((d) => `${d.local} (${d.municipio})`).join(" → ")}
                </p>
                {t.vehicle && (
                  <p className="text-sm text-slate-500">{t.vehicle.modelo} {t.vehicle.placa} · {t.driver?.nome} · vagas livres: <b>{t.vagas_disponiveis ?? 0}</b></p>
                )}
              </button>
              <div className="flex items-center gap-2">
                {t.status === "pendente" && (
                  <>
                    <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => open(t, "deferir")} data-testid={`admin-approve-trip-btn-${t.protocolo}`}>
                      <Check className="size-4" /> Deferir
                    </Button>
                    <Button size="sm" variant="outline" className="border-red-200 text-red-700 hover:bg-red-50" onClick={() => open(t, "indeferir")} data-testid={`admin-reject-trip-btn-${t.protocolo}`}>
                      <X className="size-4" /> Indeferir
                    </Button>
                  </>
                )}
                {t.status === "deferida" && (
                  <Link to={`/guia/${t.id}`} target="_blank" className={buttonVariants({ size: "sm", variant: "outline" })} data-testid={`admin-guide-btn-${t.protocolo}`}>
                    <FileText className="size-4" /> Guia do motorista
                  </Link>
                )}
                <DropdownMenu>
                  <DropdownMenuTrigger render={<Button size="icon-sm" variant="ghost" aria-label="Mais ações" data-testid={`admin-trip-menu-${t.protocolo}`} />}>
                    <MoreHorizontal className="size-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {t.status === "deferida" && <DropdownMenuItem onClick={() => open(t, "deferir")} data-testid={`admin-trip-reassign-${t.protocolo}`}>Alterar veículo/motorista</DropdownMenuItem>}
                    {t.status === "deferida" && <DropdownMenuItem onClick={() => setStatus.mutate({ id: t.id, status: "concluida" })} data-testid={`admin-trip-conclude-${t.protocolo}`}>Marcar como concluída</DropdownMenuItem>}
                    {t.status === "deferida" && <DropdownMenuItem onClick={() => setStatus.mutate({ id: t.id, status: "cancelada" })} data-testid={`admin-trip-cancel-${t.protocolo}`}>Cancelar viagem</DropdownMenuItem>}
                    {t.status !== "pendente" && t.status !== "deferida" && <DropdownMenuItem onClick={() => open(t, "deferir")} data-testid={`admin-trip-reopen-${t.protocolo}`}>Deferir</DropdownMenuItem>}
                    <DropdownMenuItem variant="destructive" data-testid={`admin-trip-delete-${t.protocolo}`}
                      onClick={() => { if (window.confirm(`Excluir a solicitação ${t.protocolo}?`)) remove.mutate(t.id); }}>
                      Excluir
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <Dialog open={!!target} onOpenChange={(o) => { if (!o) setTarget(null); }}>
        <DialogContent data-testid="admin-decision-dialog">
          {target && (
            <form className="space-y-4" onSubmit={(e) => {
              e.preventDefault();
              decide.mutate({ id: target.trip.id, body: { acao: target.acao, vehicle_id: vehicleId || null, driver_id: driverId || null, obs } });
            }}>
              <DialogHeader>
                <DialogTitle>{target.acao === "deferir" ? "Deferir solicitação" : "Indeferir solicitação"}</DialogTitle>
                <DialogDescription>
                  {target.trip.protocolo} · {target.trip.solicitante_nome} · {fmtDate(target.trip.data_saida)} {target.trip.hora_saida} · {target.trip.passageiros} passageiro(s)
                </DialogDescription>
              </DialogHeader>
              {target.acao === "deferir" && (
                <>
                  <div className="space-y-1.5">
                    <Label>Veículo *</Label>
                    <Select value={vehicleId} onValueChange={(v: string) => setVehicleId(v)}>
                      <SelectTrigger className="w-full" data-testid="admin-decision-vehicle-select">
                        <SelectValue>{(v) => (v && vMap[v as string] ? `${vMap[v as string].modelo} — ${vMap[v as string].placa} (${vMap[v as string].vagas} lugares)` : <span className="text-slate-400">Selecione o veículo</span>)}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {(vehicles.data ?? []).filter((v) => v.ativo).map((v) => (
                          <SelectItem key={v.id} value={v.id} data-testid={`admin-decision-vehicle-option-${v.placa}`}>{v.modelo} — {v.placa} ({v.vagas} lugares)</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Motorista *</Label>
                    <Select value={driverId} onValueChange={(v: string) => setDriverId(v)}>
                      <SelectTrigger className="w-full" data-testid="admin-decision-driver-select">
                        <SelectValue>{(v) => (v && dMap[v as string] ? dMap[v as string].nome : <span className="text-slate-400">Selecione o motorista</span>)}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {(drivers.data ?? []).filter((d) => d.ativo).map((d) => (
                          <SelectItem key={d.id} value={d.id} data-testid={`admin-decision-driver-option-${d.id}`}>{d.nome}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="obs">{target.acao === "indeferir" ? "Justificativa" : "Observação ao solicitante"}</Label>
                <Textarea id="obs" rows={3} value={obs} onChange={(e) => setObs(e.target.value)} data-testid="admin-decision-obs-input" />
              </div>
              <p className="text-xs text-slate-500">O solicitante será notificado por e-mail e poderá consultar pelo protocolo.</p>
              <DialogFooter>
                <Button type="submit" disabled={decide.isPending} data-testid="admin-decision-confirm-btn"
                  className={target.acao === "deferir" ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"}>
                  {decide.isPending ? "Salvando..." : target.acao === "deferir" ? "Confirmar deferimento" : "Confirmar indeferimento"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!detail} onOpenChange={(o) => { if (!o) setDetail(null); }}>
        <DialogContent className="sm:max-w-2xl" data-testid="admin-trip-detail-dialog">
          {detail && (
            <div className="space-y-4 text-sm">
              <DialogHeader>
                <DialogTitle>Solicitação {detail.protocolo}</DialogTitle>
                <DialogDescription>{detail.solicitante_nome} · {detail.solicitante_email} · {detail.diretoria}</DialogDescription>
              </DialogHeader>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-2">
                <dt className="text-slate-500">Tipo</dt><dd>{detail.tipo}</dd>
                <dt className="text-slate-500">Data do serviço externo</dt><dd>{fmtDate(detail.data_servico)}</dd>
                <dt className="text-slate-500">Saída da SRE</dt><dd>{fmtDate(detail.data_saida)} às {detail.hora_saida}</dd>
                <dt className="text-slate-500">Retorno à SRE</dt><dd>{detail.hora_retorno}</dd>
                <dt className="text-slate-500">Roteiro</dt><dd>{detail.roteiro}</dd>
                <dt className="text-slate-500">Motorista aguarda no local</dt><dd>{detail.motorista_aguarda ? "Sim" : "Não"}</dd>
                <dt className="text-slate-500">Passageiros</dt><dd>{detail.passageiros}</dd>
              </dl>
              <div>
                <p className="font-medium text-slate-900">Destinos</p>
                <ol className="mt-1 space-y-1">
                  {detail.destinos.map((d, i) => (
                    <li key={i}><b>{String(i + 1).padStart(2, "0")}</b> — {d.municipio} · {d.local} · {d.endereco}</li>
                  ))}
                </ol>
              </div>
              <div><p className="font-medium text-slate-900">Objetivo</p><p className="text-slate-700">{detail.objetivo}</p></div>
              {detail.admin_obs && <div><p className="font-medium text-slate-900">Observação da administração</p><p>{detail.admin_obs}</p></div>}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
