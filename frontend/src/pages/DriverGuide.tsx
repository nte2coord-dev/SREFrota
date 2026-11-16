import { Navigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Printer } from "lucide-react";
import { apiGet, ApiError } from "@/lib/api";
import type { DriverGuide } from "@/lib/types";
import { fmtDate, fmtDateTime } from "@/lib/format";
import { Button } from "@/components/ui/button";

function Cell({ label, value, testId }: { label: string; value: string; testId?: string }) {
  return (
    <div className="border border-black p-2">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-600">{label}</p>
      <p className="text-sm font-semibold text-black" data-testid={testId}>{value || "—"}</p>
    </div>
  );
}

export default function DriverGuidePage() {
  const { tripId = "" } = useParams();
  const q = useQuery({ queryKey: ["admin", "guide", tripId], queryFn: () => apiGet<DriverGuide>(`/admin/trips/${tripId}/guia`), retry: false });

  if (q.error instanceof ApiError && q.error.status === 401) return <Navigate to="/login" replace />;

  const g = q.data;
  const t = g?.trip;

  return (
    <div className="min-h-screen bg-slate-100 py-8 print:bg-white print:py-0">
      <div className="no-print mx-auto mb-4 flex max-w-[210mm] justify-end px-4">
        <Button onClick={() => window.print()} disabled={!g} data-testid="guide-print-btn"><Printer className="size-4" /> Imprimir / Salvar PDF</Button>
      </div>
      <div className="print-sheet mx-auto max-w-[210mm] bg-white p-10 text-black shadow-lg" data-testid="driver-guide-sheet">
        <header className="flex items-start justify-between border-b-2 border-black pb-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest">Governo do Estado de Minas Gerais</p>
            <p className="text-xs uppercase tracking-widest">Secretaria de Estado de Educação · Superintendência Regional de Ensino</p>
            <h1 className="mt-3 text-2xl font-bold">Guia do Motorista — Roteiro de Viagem</h1>
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-widest">Protocolo</p>
            <p className="font-mono text-xl font-bold" data-testid="guide-protocol">{t?.protocolo ?? "—"}</p>
            {t && <p className="mt-1 text-xs font-semibold uppercase">{t.tipo}</p>}
          </div>
        </header>

        {q.isLoading && <p className="py-10 text-center">Carregando guia...</p>}
        {q.isError && !(q.error instanceof ApiError && q.error.status === 401) && (
          <p className="py-10 text-center" data-testid="guide-error">Guia indisponível no momento.</p>
        )}

        {g && t && (
          <>
            <section className="mt-5 grid grid-cols-2 gap-0">
              <Cell label="Motorista" value={g.driver?.nome ?? ""} testId="guide-driver" />
              <Cell label="Telefone / CNH" value={[g.driver?.telefone, g.driver?.cnh].filter(Boolean).join(" · ")} />
              <Cell label="Veículo" value={g.vehicle ? `${g.vehicle.modelo} — ${g.vehicle.placa}` : ""} testId="guide-vehicle" />
              <Cell label="Roteiro" value={t.roteiro} />
              <Cell label="Data de saída da SRE" value={fmtDate(t.data_saida)} />
              <Cell label="Data do serviço externo" value={fmtDate(t.data_servico)} />
              <Cell label="Hora de saída da SRE" value={t.hora_saida} testId="guide-hora-saida" />
              <Cell label="Hora de retorno à SRE" value={t.hora_retorno} testId="guide-hora-retorno" />
              <Cell label="Aguardar no local?" value={t.motorista_aguarda ? "SIM — aguardar o solicitante" : "NÃO"} />
              <Cell label="Solicitante / Diretoria" value={`${t.solicitante_nome} — ${t.diretoria}`} />
            </section>

            <section className="mt-6">
              <h2 className="mb-2 text-sm font-bold uppercase tracking-wider">Trajeto</h2>
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-100">
                    <th className="border border-black p-2 text-left">Nº</th>
                    <th className="border border-black p-2 text-left">Município</th>
                    <th className="border border-black p-2 text-left">Local do evento</th>
                    <th className="border border-black p-2 text-left">Endereço</th>
                  </tr>
                </thead>
                <tbody>
                  <tr><td className="border border-black p-2 font-mono">00</td><td className="border border-black p-2" colSpan={3}>Saída: SRE — {t.hora_saida}</td></tr>
                  {t.destinos.map((d, i) => (
                    <tr key={i} data-testid={`guide-destino-${i + 1}`}>
                      <td className="border border-black p-2 font-mono">{String(i + 1).padStart(2, "0")}</td>
                      <td className="border border-black p-2">{d.municipio}</td>
                      <td className="border border-black p-2">{d.local}</td>
                      <td className="border border-black p-2">{d.endereco}</td>
                    </tr>
                  ))}
                  {t.roteiro !== "Somente ida" && (
                    <tr><td className="border border-black p-2 font-mono">↩</td><td className="border border-black p-2" colSpan={3}>Retorno: SRE — previsão {t.hora_retorno}</td></tr>
                  )}
                </tbody>
              </table>
            </section>

            <section className="mt-6">
              <h2 className="mb-2 text-sm font-bold uppercase tracking-wider">Objetivo</h2>
              <p className="border border-black p-3 text-sm">{t.objetivo}</p>
            </section>

            <section className="mt-6">
              <h2 className="mb-2 text-sm font-bold uppercase tracking-wider">Passageiros</h2>
              <table className="w-full border-collapse text-sm">
                <tbody>
                  <tr><td className="border border-black p-2">{t.solicitante_nome} (solicitante){t.passageiros > 1 ? ` + ${t.passageiros - 1} acompanhante(s)` : ""}</td><td className="border border-black p-2">{t.diretoria}</td><td className="w-40 border border-black p-2 text-xs text-slate-500">Assinatura</td></tr>
                  {g.caronas.map((c) => (
                    <tr key={c.protocolo} data-testid={`guide-carona-${c.protocolo}`}>
                      <td className="border border-black p-2">{c.nome} (carona {c.protocolo})</td>
                      <td className="border border-black p-2">{c.diretoria}</td>
                      <td className="border border-black p-2 text-xs text-slate-500">Assinatura</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            {t.admin_obs && (
              <section className="mt-6">
                <h2 className="mb-2 text-sm font-bold uppercase tracking-wider">Observações da administração</h2>
                <p className="border border-black p-3 text-sm">{t.admin_obs}</p>
              </section>
            )}

            <section className="mt-10 grid grid-cols-2 gap-8 text-sm">
              <div>
                <p>Km saída: ____________ Hora real: ________</p>
                <p className="mt-4">Km chegada: __________ Hora real: ________</p>
              </div>
              <div className="space-y-10">
                <div className="border-t border-black pt-1 text-center text-xs">Motorista</div>
                <div className="border-t border-black pt-1 text-center text-xs">Responsável pela frota — SRE</div>
              </div>
            </section>
            <p className="mt-8 text-right text-[10px] text-slate-500">Emitido em {fmtDateTime(g.emitido_em)} · SRE Frota</p>
          </>
        )}
      </div>
    </div>
  );
}
