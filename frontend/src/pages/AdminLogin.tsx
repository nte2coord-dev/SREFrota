import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { LockKeyhole } from "lucide-react";
import { apiPost } from "@/lib/api";
import { beginSession } from "@/lib/session";
import { errMsg } from "@/lib/format";
import type { Me } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SiteHeader } from "@/components/SiteHeader";

export default function AdminLogin() {
  const nav = useNavigate();
  const [password, setPassword] = useState("");
  const login = useMutation({
    mutationFn: () => apiPost<Me>("/auth/login", { password }),
    onSuccess: () => { beginSession(); nav("/admin"); },
    onError: (e) => toast.error(errMsg(e, "Senha inválida")),
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <SiteHeader />
      <main className="mx-auto grid max-w-md px-4 py-20">
        <form
          onSubmit={(e) => { e.preventDefault(); login.mutate(); }}
          className="rise-in rounded-2xl border border-slate-200 bg-white p-8 shadow-lg"
          data-testid="admin-login-form"
        >
          <span className="grid size-11 place-items-center rounded-xl bg-[#1E3A8A] text-white"><LockKeyhole className="size-5" /></span>
          <h1 className="mt-5 text-2xl font-semibold">Área administrativa</h1>
          <p className="mt-1 text-sm text-slate-500">Gestão de solicitações, caronas e frota da SRE.</p>
          <div className="mt-6 space-y-1.5">
            <Label htmlFor="pw">Senha de acesso</Label>
            <Input id="pw" type="password" required autoFocus value={password} onChange={(e) => setPassword(e.target.value)} data-testid="admin-password-input" />
          </div>
          <Button type="submit" className="mt-6 w-full" size="lg" disabled={login.isPending} data-testid="admin-login-btn">
            {login.isPending ? "Entrando..." : "Entrar"}
          </Button>
        </form>
      </main>
    </div>
  );
}
