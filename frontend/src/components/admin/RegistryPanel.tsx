import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { apiDelete, apiGet, apiPost, apiPut } from "@/lib/api";
import { errMsg } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type FieldDef = { key: string; label: string; type?: "text" | "number" | "bool"; required?: boolean };
type Row = { id: string } & Record<string, string | number | boolean>;

export function RegistryPanel({ resource, title, fields, singular }: {
  resource: "vehicles" | "drivers" | "diretorias"; title: string; singular: string; fields: FieldDef[];
}) {
  const qc = useQueryClient();
  const key = ["admin", resource];
  const list = useQuery({ queryKey: key, queryFn: () => apiGet<Row[]>(`/admin/${resource}`) });
  const blank = () => Object.fromEntries(fields.map((f) => [f.key, f.type === "bool" ? true : f.type === "number" ? 1 : ""]));
  const [edit, setEdit] = useState<{ id: string | null; data: Record<string, string | number | boolean> } | null>(null);

  const done = (msg: string) => {
    qc.invalidateQueries({ queryKey: key });
    if (resource === "diretorias") qc.invalidateQueries({ queryKey: ["diretorias"] });
    toast.success(msg);
  };
  const save = useMutation({
    mutationFn: (e: { id: string | null; data: Record<string, unknown> }) =>
      e.id ? apiPut<Row>(`/admin/${resource}/${e.id}`, e.data) : apiPost<Row>(`/admin/${resource}`, e.data),
    onSuccess: () => { setEdit(null); done(`${singular} salvo(a)`); },
    onError: (e) => toast.error(errMsg(e)),
  });
  const del = useMutation({
    mutationFn: (id: string) => apiDelete(`/admin/${resource}/${id}`),
    onSuccess: () => done(`${singular} excluído(a)`),
    onError: (e) => toast.error(errMsg(e)),
  });

  return (
    <div data-testid={`admin-registry-${resource}`}>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold">{title}</h3>
        <Button size="sm" onClick={() => setEdit({ id: null, data: blank() })} data-testid={`admin-${resource}-add-btn`}>
          <Plus className="size-4" /> Adicionar
        </Button>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white shadow-xs">
        <Table>
          <TableHeader>
            <TableRow>
              {fields.map((f) => <TableHead key={f.key}>{f.label}</TableHead>)}
              <TableHead className="w-24 text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(list.data ?? []).length === 0 && (
              <TableRow><TableCell colSpan={fields.length + 1} className="py-8 text-center text-slate-500">Nenhum registro.</TableCell></TableRow>
            )}
            {!list.isError && (list.data ?? []).map((r) => (
              <TableRow key={r.id} data-testid={`admin-${resource}-row-${r.id}`}>
                {fields.map((f) => (
                  <TableCell key={f.key}>{f.type === "bool" ? (r[f.key] ? "Sim" : "Não") : String(r[f.key] ?? "")}</TableCell>
                ))}
                <TableCell className="text-right">
                  <Button size="icon-sm" variant="ghost" aria-label="Editar" data-testid={`admin-${resource}-edit-${r.id}`}
                    onClick={() => setEdit({ id: r.id, data: Object.fromEntries(fields.map((f) => [f.key, r[f.key]])) })}>
                    <Pencil className="size-4" />
                  </Button>
                  <Button size="icon-sm" variant="ghost" aria-label="Excluir" data-testid={`admin-${resource}-delete-${r.id}`}
                    onClick={() => { if (window.confirm("Excluir este registro?")) del.mutate(r.id); }}>
                    <Trash2 className="size-4 text-red-600" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!edit} onOpenChange={(o) => { if (!o) setEdit(null); }}>
        <DialogContent data-testid={`admin-${resource}-dialog`}>
          {edit && (
            <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); save.mutate(edit); }}>
              <DialogHeader><DialogTitle>{edit.id ? "Editar" : "Novo(a)"} {singular.toLowerCase()}</DialogTitle></DialogHeader>
              {fields.map((f) => f.type === "bool" ? (
                <label key={f.key} className="flex items-center gap-2 text-sm">
                  <Checkbox checked={!!edit.data[f.key]} onCheckedChange={(c) => setEdit({ ...edit, data: { ...edit.data, [f.key]: !!c } })}
                    data-testid={`admin-${resource}-field-${f.key}`} />
                  {f.label}
                </label>
              ) : (
                <div key={f.key} className="space-y-1.5">
                  <Label htmlFor={`f-${f.key}`}>{f.label}{f.required && " *"}</Label>
                  <Input id={`f-${f.key}`} type={f.type === "number" ? "number" : "text"} min={f.type === "number" ? 2 : undefined}
                    required={f.required} value={String(edit.data[f.key] ?? "")}
                    onChange={(e) => setEdit({ ...edit, data: { ...edit.data, [f.key]: f.type === "number" ? Number(e.target.value) : e.target.value } })}
                    data-testid={`admin-${resource}-field-${f.key}`} />
                </div>
              ))}
              <DialogFooter>
                <Button type="submit" disabled={save.isPending} data-testid={`admin-${resource}-save-btn`}>Salvar</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
