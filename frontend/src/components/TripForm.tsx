import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CheckCircle2, MapPin, Plus, Siren, Trash2, CalendarClock } from "lucide-react";
import { apiGet, apiPost } from "@/lib/api";
import type { Destino, Diretoria, Roteiro, Tipo, Trip, TripIn } from "@/lib/types";
import { errMsg, fmtDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const emptyDestino = (): Destino => ({ municipio: "", local: "", endereco: "" });

const initial = (): TripIn => ({
  solicitante_nome: "",
  solicitante_email: "",
  diretoria: "",
  tipo: "Rotina",
  data_servico: "",
  data_saida: "",
  hora_saida: "",
  hora_retorno: "",
  roteiro: "Ida e volta",
  motorista_aguarda: false,
  passageiros: 1,
  destinos: [emptyDestino()],
  objetivo: "",
});

function Segmented<T extends string>({
  value, options, onChange, testId,
}: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; testId: string }) {
  return (
    <div className="flex flex-wrap gap-2" role="radiogroup" data-testid={testId}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          data-testid={`${testId}-${o.value.toLowerCase().replace(/\s+/g, "-")}`}
          onClick={() => onChange(o.value)}
          className={cn(
            "rounded-lg border px-4 py-2 text-sm font-medium transition-[background-color,border-color,color,transform] duration-150 active:scale-[0.98]",
            value === o.value
              ? o.value === "Emergencial"
                ? "border-red-600 bg-red-600 text-white"
                : "border-[#1E3A8A] bg-[#1E3A8A] text-white"
              : "border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Field({ label, hint, required, children, htmlFor }: {
  label: string; hint?: string; required?: boolean; children: React.ReactNode; htmlFor?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor} className="text-sm font-medium text-slate-800">
        {label} {required && <span className="text-red-600">*</span>}
      </Label>
      {children}
      {hint && <p className="text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

function SectionTitle({ n, title, sub }: { n: string; title: string; sub?: string }) {
  return (
    <div className="mb-5 flex items-baseline gap-3 border-b border-slate-200 pb-3">
      <span className="font-mono text-xs text-[#2563EB]">{n}</span>
      <div>
        <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
        {sub && <p className="text-sm text-slate-500">{sub}</p>}
      </div>
    </div>
  );
}

export function TripForm() {
  const qc = useQueryClient();
  const [f, setF] = useState<TripIn>(initial);
  const [done, setDone] = useState<Trip | null>(null);
  const diretorias = useQuery({ queryKey: ["diretorias"], queryFn: () => apiGet<Diretoria[]>("/diretorias") });

  const set = <K extends keyof TripIn>(k: K, v: TripIn[K]) => setF((p) => ({ ...p, [k]: v }));
  const setDest = (i: number, k: keyof Destino, v: string) =>
    setF((p) => ({ ...p, destinos: p.destinos.map((d, j) => (j === i ? { ...d, [k]: v } : d)) }));

  const create = useMutation({
    mutationFn: (body: TripIn) => apiPost<Trip>("/trips", body),
    onSuccess: (t) => {
      setDone(t);
      setF(initial());
      qc.invalidateQueries({ queryKey: ["track"] });
      toast.success(`Solicitação registrada — protocolo ${t.protocolo}`);
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    onError: (e) => toast.error(errMsg(e)),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!f.diretoria) return toast.error("Selecione a diretoria");
    create.mutate(f);
  };

  if (done) {
    return (
      <div className="rise-in rounded-2xl border border-green-200 bg-white p-8 shadow-sm" data-testid="trip-success-panel">
        <CheckCircle2 className="size-10 text-green-600" />
        <h3 className="mt-4 text-2xl font-semibold text-slate-900">Solicitação enviada</h3>
        <p className="mt-1 text-slate-600">Guarde o número de protocolo para acompanhar seu pedido. Você também receberá o retorno por e-mail.</p>
        <div className="mt-6 inline-flex items-center gap-3 rounded-xl bg-slate-900 px-5 py-3 text-white">
          <span className="text-xs uppercase tracking-widest text-slate-400">Protocolo</span>
          <span className="font-mono text-xl" data-testid="trip-success-protocol">{done.protocolo}</span>
        </div>
        <p className="mt-4 text-sm text-slate-600">
          Saída em {fmtDate(done.data_saida)} às {done.hora_saida} · Status: <b>aguardando análise</b>
        </p>
        <Button className="mt-6" variant="outline" onClick={() => setDone(null)} data-testid="trip-new-request-btn">
          Fazer nova solicitação
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-6" data-testid="trip-form">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
        <SectionTitle n="01" title="Solicitante" sub="Identificação de quem solicita a saída" />
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Nome do solicitante" required htmlFor="nome">
            <Input id="nome" required value={f.solicitante_nome} onChange={(e) => set("solicitante_nome", e.target.value)} data-testid="trip-nome-input" />
          </Field>
          <Field label="E-mail para retorno" required htmlFor="email" hint="Você receberá o deferimento/indeferimento neste e-mail.">
            <Input id="email" type="email" required value={f.solicitante_email} onChange={(e) => set("solicitante_email", e.target.value)} data-testid="trip-email-input" />
          </Field>
          <Field label="Diretoria" required>
            <Select value={f.diretoria} onValueChange={(v: string) => set("diretoria", v)}>
              <SelectTrigger className="w-full" data-testid="trip-diretoria-select">
                <SelectValue>{(v) => (v as string) || <span className="text-slate-400">Selecione a diretoria</span>}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {(diretorias.data ?? []).map((d) => (
                  <SelectItem key={d.id} value={d.nome} data-testid={`trip-diretoria-option-${d.id}`}>{d.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Nº de passageiros (incluindo você)" required htmlFor="pax" hint="Usado para calcular as vagas de carona.">
            <Input id="pax" type="number" min={1} max={20} required value={f.passageiros}
              onChange={(e) => set("passageiros", Math.max(1, Number(e.target.value) || 1))} data-testid="trip-passageiros-input" />
          </Field>
          <div className="md:col-span-2">
            <Field label="Tipo de solicitação" required>
              <Segmented<Tipo> testId="trip-tipo" value={f.tipo} onChange={(v) => set("tipo", v)}
                options={[{ value: "Rotina", label: "Rotina" }, { value: "Emergencial", label: "Emergencial" }]} />
            </Field>
            {f.tipo === "Emergencial" && (
              <p className="mt-2 flex items-center gap-2 text-sm text-red-700"><Siren className="size-4" /> Solicitações emergenciais têm prioridade na análise.</p>
            )}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
        <SectionTitle n="02" title="Serviço externo" sub="Datas, horários e roteiro" />
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Data do serviço externo" required htmlFor="dserv">
            <Input id="dserv" type="date" required value={f.data_servico} onChange={(e) => set("data_servico", e.target.value)} data-testid="trip-data-servico-input" />
          </Field>
          <Field label="Data de saída da SRE" required htmlFor="dsaida">
            <Input id="dsaida" type="date" required value={f.data_saida} onChange={(e) => set("data_saida", e.target.value)} data-testid="trip-data-saida-input" />
          </Field>
          <Field label="Hora de saída da SRE" required htmlFor="hsaida" hint="Hora prevista para saída da SRE.">
            <Input id="hsaida" type="time" required value={f.hora_saida} onChange={(e) => set("hora_saida", e.target.value)} data-testid="trip-hora-saida-input" />
          </Field>
          <Field label="Hora de retorno à SRE" required htmlFor="hret" hint="Hora prevista de chegada na SRE.">
            <Input id="hret" type="time" required value={f.hora_retorno} onChange={(e) => set("hora_retorno", e.target.value)} data-testid="trip-hora-retorno-input" />
          </Field>
          <Field label="Roteiro" required>
            <Segmented<Roteiro> testId="trip-roteiro" value={f.roteiro} onChange={(v) => set("roteiro", v)}
              options={[{ value: "Ida e volta", label: "Ida e volta" }, { value: "Somente ida", label: "Somente ida" }, { value: "Somente volta", label: "Somente volta" }]} />
          </Field>
          <Field label="Há necessidade que o motorista aguarde no local?" required>
            <Segmented<"sim" | "nao"> testId="trip-aguarda" value={f.motorista_aguarda ? "sim" : "nao"}
              onChange={(v) => set("motorista_aguarda", v === "sim")}
              options={[{ value: "sim", label: "Sim" }, { value: "nao", label: "Não" }]} />
          </Field>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
        <SectionTitle n="03" title="Destinos" sub="Até 3 locais. O destino 01 é obrigatório." />
        <div className="space-y-5">
          {f.destinos.map((d, i) => {
            const n = String(i + 1).padStart(2, "0");
            const req = i === 0;
            return (
              <div key={i} className="rise-in relative rounded-xl border border-slate-200 bg-slate-50/60 p-4" data-testid={`trip-destino-${n}`}>
                <div className="mb-3 flex items-center justify-between">
                  <span className="flex items-center gap-2 text-sm font-semibold text-slate-800"><MapPin className="size-4 text-[#2563EB]" /> Destino {n}</span>
                  {!req && (
                    <Button type="button" variant="ghost" size="sm" data-testid={`trip-destino-${n}-remove-btn`}
                      onClick={() => setF((p) => ({ ...p, destinos: p.destinos.filter((_, j) => j !== i) }))}>
                      <Trash2 className="size-4" /> Remover
                    </Button>
                  )}
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                  <Field label={`${n} - Município`} required>
                    <Input required value={d.municipio} onChange={(e) => setDest(i, "municipio", e.target.value)} data-testid={`trip-destino-${n}-municipio-input`} />
                  </Field>
                  <Field label={`${n} - Local do evento`} required hint="Informe se Escola, CAMG ou outro órgão. Ex.: EE Afonso Pena.">
                    <Input required value={d.local} onChange={(e) => setDest(i, "local", e.target.value)} data-testid={`trip-destino-${n}-local-input`} />
                  </Field>
                  <Field label={`${n} - Endereço do local`} required hint="Favor verificar o endereço completo antes de fazer a solicitação.">
                    <Input required value={d.endereco} onChange={(e) => setDest(i, "endereco", e.target.value)} data-testid={`trip-destino-${n}-endereco-input`} />
                  </Field>
                </div>
              </div>
            );
          })}
          {f.destinos.length < 3 && (
            <Button type="button" variant="outline" data-testid="trip-add-destino-btn"
              onClick={() => setF((p) => ({ ...p, destinos: [...p.destinos, emptyDestino()] }))}>
              <Plus className="size-4" /> Adicionar destino {String(f.destinos.length + 1).padStart(2, "0")}
            </Button>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
        <SectionTitle n="04" title="Objetivo" />
        <Field label="Objetivo" required htmlFor="obj" hint="Informe o motivo da ida ao local. Ex.: Reunião de acompanhamento do PIP.">
          <Textarea id="obj" required rows={4} value={f.objetivo} onChange={(e) => set("objetivo", e.target.value)} data-testid="trip-objetivo-input" />
        </Field>
      </section>

      <div className="flex items-center justify-between gap-4 rounded-2xl bg-slate-900 p-5 text-white">
        <p className="flex items-center gap-2 text-sm text-slate-300"><CalendarClock className="size-4 text-sky-400" /> Após o envio, a administração analisará e você receberá o retorno.</p>
        <Button type="submit" size="lg" disabled={create.isPending} data-testid="submit-trip-btn"
          className="bg-sky-400 text-slate-900 hover:bg-sky-300">
          {create.isPending ? "Enviando..." : "Enviar solicitação"}
        </Button>
      </div>
    </form>
  );
}
