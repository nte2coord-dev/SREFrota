import { Link } from "react-router-dom";
import { ClipboardList, Car, Search, ShieldCheck } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SiteHeader } from "@/components/SiteHeader";
import { TripForm } from "@/components/TripForm";
import { RideBoard } from "@/components/RideBoard";
import { TrackPanel } from "@/components/TrackPanel";

const HERO = "https://images.unsplash.com/photo-1760561149879-d2dcda994a42?auto=format&fit=crop&w=1600&q=70";

export default function PublicPortal() {
  return (
    <div className="min-h-screen">
      <SiteHeader
        right={
          <Link to="/admin" data-testid="header-admin-link" className={buttonVariants({ variant: "outline", size: "sm" })}>
            <ShieldCheck className="size-4" /> Área administrativa
          </Link>
        }
      />
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 text-white">
        <img src={HERO} alt="" className="absolute inset-0 h-full w-full object-cover opacity-20 mix-blend-luminosity" />
        <div className="relative mx-auto max-w-7xl px-4 pb-24 pt-14 sm:px-6">
          <p className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs uppercase tracking-[0.16em] text-sky-200">
            Superintendência Regional de Ensino
          </p>
          <h1 className="mt-5 max-w-3xl text-4xl font-semibold leading-tight tracking-tight sm:text-5xl" data-testid="portal-title">
            SRE - Metropolitana A
          </h1>
          <p className="mt-4 max-w-2xl text-base text-slate-300">
            Solicite um veículo para serviço externo, aproveite vagas livres em viagens já deferidas e acompanhe a resposta da administração pelo protocolo.
          </p>
        </div>
      </section>

      <main className="relative mx-auto -mt-14 max-w-7xl px-4 pb-20 sm:px-6">
        <Tabs defaultValue="nova">
          <TabsList className="h-auto w-full justify-start gap-1 overflow-x-auto rounded-2xl border border-slate-200 bg-white/95 p-1.5 shadow-lg backdrop-blur sm:w-auto">
            <TabsTrigger value="nova" className="gap-2 px-4 py-2.5" data-testid="tab-nova-solicitacao"><ClipboardList className="size-4" /> Nova solicitação</TabsTrigger>
            <TabsTrigger value="caronas" className="gap-2 px-4 py-2.5" data-testid="tab-caronas"><Car className="size-4" /> Caronas disponíveis</TabsTrigger>
            <TabsTrigger value="acompanhar" className="gap-2 px-4 py-2.5" data-testid="tab-acompanhar"><Search className="size-4" /> Acompanhar pedido</TabsTrigger>
          </TabsList>
          <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_280px]">
            <div className="min-w-0">
              <TabsContent value="nova"><TripForm /></TabsContent>
              <TabsContent value="caronas"><RideBoard /></TabsContent>
              <TabsContent value="acompanhar"><TrackPanel /></TabsContent>
            </div>
            <aside className="hidden space-y-4 lg:block">
              <div className="sticky top-24 rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-600 shadow-xs">
                <h3 className="text-base font-semibold text-slate-900">Como funciona</h3>
                <ol className="mt-3 space-y-3">
                  <li><b className="text-slate-900">1.</b> Envie a solicitação com destinos, horários e objetivo.</li>
                  <li><b className="text-slate-900">2.</b> A administração defere ou indefere e define veículo e motorista.</li>
                  <li><b className="text-slate-900">3.</b> Você recebe o retorno por e-mail e pode consultar pelo protocolo.</li>
                  <li><b className="text-slate-900">4.</b> Vagas livres ficam disponíveis como carona para outros servidores.</li>
                </ol>
              </div>
            </aside>
          </div>
        </Tabs>
      </main>
    </div>
  );
}
