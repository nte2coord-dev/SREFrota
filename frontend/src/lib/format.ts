import { ApiError } from "@/lib/api";

export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return d && m && y ? `${d}/${m}/${y}` : iso;
}

export function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

export function errMsg(e: unknown, fallback = "Não foi possível concluir a operação"): string {
  if (e instanceof ApiError) {
    const body = e.body as { detail?: unknown } | null;
    if (typeof body?.detail === "string") return body.detail;
    if (Array.isArray(body?.detail)) return "Verifique os campos obrigatórios e tente novamente";
  }
  return fallback;
}

const MESES = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];
const SEMANA = ["Domingo", "Segunda-Feira", "Terça-Feira", "Quarta-Feira", "Quinta-Feira", "Sexta-Feira", "Sábado"];

/** Partes de uma data ISO (AAAA-MM-DD) para o bloco de data dos cartões: dia, mês abreviado e dia da semana. */
export function dateParts(iso: string): { day: string; month: string; weekday: string } {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return { day: "—", month: "", weekday: "" };
  return { day: String(d).padStart(2, "0"), month: MESES[m - 1], weekday: SEMANA[new Date(y, m - 1, d).getDay()] };
}
