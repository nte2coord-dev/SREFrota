import { Navigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { CarFront, ClipboardList, Building2, LogOut, Users, UserRound, Siren } from "lucide-react";
import { apiGet } from "@/lib/api";
import { endSession } from "@/lib/session";
import type { CaronaAdmin, Me, TripAdmin } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SiteHeader } from "@/components/SiteHeader";
import { TripsPanel } from "@/components/admin/TripsPanel";
import { CaronasPanel } from "@/components/admin/CaronasPanel";
import { RegistryPanel } from "@/components/admin/RegistryPanel";

function Stat({ label, value, tone, testId }: { label: string; value: number; tone: string; testId: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
      <p className="text-xs uppercase tracking-wider text-slate-400">{label}</p>
      <p className={`mt-1 font-heading text-3xl font-semibold ${tone}`} data-testid={testId}>{value}</p>
    </div>
  );
}

export default function AdminDashboard() {
  const me = useQuery({ queryKey: ["me"], queryFn: () => apiGet<Me>("/auth/me") });
  const isAdmin = !!me.data?.admin;
  const trips = useQuery({ queryKey: ["admin", "trips"], queryFn: () => apiGet<TripAdmin[]>("/admin/trips"), enabled: isAdmin });
  const caronas = useQuery({ queryKey: ["admin", "caronas"], queryFn: () => apiGet<CaronaAdmin[]>("/admin/caronas"), enabled: isAdmin });

  if (me.data && !me.data.admin) return <Navigate to="/login" replace />;

  const t = trips.isError ? [] : trips.data ?? [];
  const c = caronas.isError ? [] : caronas.data ?? [];
  const pend = t.filter((x) => x.status === "pendente");

  return (
    <div className="min-h-screen">
      <SiteHeader right={
        <Button variant="ghost" size="sm" onClick={() => endSession("/login")} data-testid="admin-logout-btn">
          <LogOut className="size-4" /> Sair
        </Button>
      } />
      <section className="bg-slate-900 text-white">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
          <p className="text-xs uppercase tracking-[0.16em] text-sky-300">Painel administrativo</p>
          <h1 className="mt-2 text-3xl font-semibold" data-testid="admin-title">Gestão de saídas e frota</h1>
          <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat label="Solicitações pendentes" value={pend.length} tone="text-amber-300" testId="admin-stat-pendentes" />
            <Stat label="Emergenciais pendentes" value={pend.filter((x) => x.tipo === "Emergencial").length} tone="text-red-300" testId="admin-stat-emergenciais" />
            <Stat label="Viagens deferidas" value={t.filter((x) => x.status === "deferida").length} tone="text-green-300" testId="admin-stat-deferidas" />
            <Stat label="Caronas pendentes" value={c.filter((x) => x.status === "pendente").length} tone="text-sky-300" testId="admin-stat-caronas" />
          </div>
        </div>
      </section>
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        {me.isError && <p className="mb-4 text-sm text-red-700">Não foi possível verificar a sessão. Recarregue a página.</p>}
        <Tabs defaultValue="trips">
          <TabsList className="h-auto flex-wrap justify-start gap-1 rounded-xl bg-white p-1 shadow-xs ring-1 ring-slate-200">
            <TabsTrigger value="trips" className="gap-2 px-3 py-2" data-testid="admin-tab-trips"><ClipboardList className="size-4" /> Solicitações {pend.length > 0 && <span className="rounded-full bg-amber-100 px-1.5 text-xs text-amber-800">{pend.length}</span>}</TabsTrigger>
            <TabsTrigger value="caronas" className="gap-2 px-3 py-2" data-testid="admin-tab-caronas"><Users className="size-4" /> Caronas</TabsTrigger>
            <TabsTrigger value="vehicles" className="gap-2 px-3 py-2" data-testid="admin-tab-vehicles"><CarFront className="size-4" /> Veículos</TabsTrigger>
            <TabsTrigger value="drivers" className="gap-2 px-3 py-2" data-testid="admin-tab-drivers"><UserRound className="size-4" /> Motoristas</TabsTrigger>
            <TabsTrigger value="diretorias" className="gap-2 px-3 py-2" data-testid="admin-tab-diretorias"><Building2 className="size-4" /> Diretorias</TabsTrigger>
          </TabsList>
          {pend.some((x) => x.tipo === "Emergencial") && (
            <p className="mt-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-800" data-testid="admin-emergency-alert">
              <Siren className="size-4" /> Há solicitações emergenciais aguardando decisão.
            </p>
          )}
          <div className="mt-6">
            <TabsContent value="trips"><TripsPanel trips={t} /></TabsContent>
            <TabsContent value="caronas"><CaronasPanel caronas={c} /></TabsContent>
            <TabsContent value="vehicles">
              <RegistryPanel resource="vehicles" title="Veículos da frota" singular="Veículo" fields={[
                { key: "modelo", label: "Modelo", required: true },
                { key: "placa", label: "Placa", required: true },
                { key: "vagas", label: "Lugares (incl. motorista)", type: "number", required: true },
                { key: "ativo", label: "Ativo", type: "bool" },
              ]} />
            </TabsContent>
            <TabsContent value="drivers">
              <RegistryPanel resource="drivers" title="Motoristas" singular="Motorista" fields={[
                { key: "nome", label: "Nome", required: true },
                { key: "telefone", label: "Telefone" },
                { key: "cnh", label: "CNH" },
                { key: "ativo", label: "Ativo", type: "bool" },
              ]} />
            </TabsContent>
            <TabsContent value="diretorias">
              <RegistryPanel resource="diretorias" title="Diretorias" singular="Diretoria" fields={[
                { key: "nome", label: "Nome", required: true },
              ]} />
            </TabsContent>
          </div>
        </Tabs>
      </main>
    </div>
  );
}
