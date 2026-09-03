import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { dateInputValue, dateTimeInputValue, TaskRecord } from "@/lib/operations";
import { trpc } from "@/lib/trpc";
import { Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

type FormState = {
  workDate: string;
  employeeId: string;
  area: "produccion" | "ventas" | "administracion";
  taskCatalogId: string;
  variantId: string;
  targetQuantity: string;
  completedQuantity: string;
  unit: string;
  startAt: string;
  endAt: string;
  notes: string;
};

const emptyForm = (): FormState => ({
  workDate: dateInputValue(), employeeId: "", area: "produccion", taskCatalogId: "", variantId: "none",
  targetQuantity: "", completedQuantity: "", unit: "unidades", startAt: "", endAt: "", notes: "",
});

export function TaskFormDialog({ open, onOpenChange, task }: { open: boolean; onOpenChange: (open: boolean) => void; task?: TaskRecord | null }) {
  const [form, setForm] = useState<FormState>(emptyForm);
  const employeesQuery = trpc.operations.employees.list.useQuery(undefined, { enabled: open });
  const catalogQuery = trpc.operations.catalog.list.useQuery(undefined, { enabled: open });
  const utils = trpc.useUtils();
  const createMutation = trpc.operations.dailyTasks.create.useMutation();
  const updateMutation = trpc.operations.dailyTasks.update.useMutation();
  const pending = createMutation.isPending || updateMutation.isPending;

  useEffect(() => {
    if (!open) return;
    setForm(task ? {
      workDate: dateInputValue(task.workDate), employeeId: String(task.employeeId), area: task.area,
      taskCatalogId: String(task.taskCatalogId), variantId: task.variantId ? String(task.variantId) : "none",
      targetQuantity: task.targetQuantity ?? "", completedQuantity: task.completedQuantity ?? "", unit: task.unit,
      startAt: dateTimeInputValue(task.startAt), endAt: dateTimeInputValue(task.endAt), notes: task.notes ?? "",
    } : emptyForm());
  }, [open, task]);

  const employees = employeesQuery.data ?? [];
  const catalog = catalogQuery.data ?? [];
  const selectedCatalog = useMemo(() => catalog.find(item => String(item.id) === form.taskCatalogId), [catalog, form.taskCatalogId]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm(current => ({ ...current, [key]: value }));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!form.employeeId || !form.taskCatalogId) return toast.error("Selecciona responsable y tarea.");
    const input = {
      workDate: new Date(`${form.workDate}T12:00:00`).getTime(), employeeId: Number(form.employeeId), area: form.area,
      taskCatalogId: Number(form.taskCatalogId), variantId: form.variantId === "none" ? null : Number(form.variantId),
      targetQuantity: form.targetQuantity === "" ? null : Number(form.targetQuantity),
      completedQuantity: form.completedQuantity === "" ? null : Number(form.completedQuantity), unit: form.unit,
      startAt: form.startAt ? new Date(form.startAt).getTime() : null,
      endAt: form.endAt ? new Date(form.endAt).getTime() : null, notes: form.notes || null,
    };
    try {
      if (task) await updateMutation.mutateAsync({ id: task.id, ...input });
      else await createMutation.mutateAsync(input);
      await utils.operations.dailyTasks.invalidate();
      toast.success(task ? "Tarea actualizada" : "Tarea asignada");
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No fue posible guardar la tarea.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-extrabold tracking-tight">{task ? "Editar tarea" : "Asignar tarea diaria"}</DialogTitle>
          <DialogDescription>Define el responsable, la cantidad y los tiempos reales del proceso.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2"><Label>Fecha de trabajo</Label><Input type="date" value={form.workDate} onChange={e => update("workDate", e.target.value)} required /></div>
            <div className="space-y-2"><Label>Responsable</Label><Select value={form.employeeId} onValueChange={value => { const person = employees.find(item => String(item.id) === value); setForm(current => ({ ...current, employeeId: value, area: person?.area ?? current.area })); }}><SelectTrigger><SelectValue placeholder="Seleccionar persona" /></SelectTrigger><SelectContent>{employees.map(person => <SelectItem key={person.id} value={String(person.id)}>{person.name}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-2"><Label>Área</Label><Select value={form.area} onValueChange={value => update("area", value as FormState["area"])}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="produccion">Producción</SelectItem><SelectItem value="ventas">Ventas</SelectItem><SelectItem value="administracion">Administración</SelectItem></SelectContent></Select></div>
            <div className="space-y-2"><Label>Tarea</Label><Select value={form.taskCatalogId} onValueChange={value => { const item = catalog.find(option => String(option.id) === value); setForm(current => ({ ...current, taskCatalogId: value, unit: item?.unit ?? current.unit, variantId: "none" })); }}><SelectTrigger><SelectValue placeholder="Seleccionar tarea" /></SelectTrigger><SelectContent>{catalog.map(item => <SelectItem key={item.id} value={String(item.id)}>{item.name}</SelectItem>)}</SelectContent></Select></div>
            {selectedCatalog?.hasVariants ? <div className="space-y-2"><Label>Variante</Label><Select value={form.variantId} onValueChange={value => update("variantId", value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Sin variante</SelectItem>{selectedCatalog.variants.map(variant => <SelectItem key={variant.id} value={String(variant.id)}>{variant.name}</SelectItem>)}</SelectContent></Select></div> : null}
            <div className="space-y-2"><Label>Unidad</Label><Input value={form.unit} onChange={e => update("unit", e.target.value)} required /></div>
            {selectedCatalog?.usesQuantity !== false ? <><div className="space-y-2"><Label>Cantidad objetivo</Label><Input type="number" min="0" step="0.01" value={form.targetQuantity} onChange={e => update("targetQuantity", e.target.value)} placeholder="Ej. 120" /></div><div className="space-y-2"><Label>Cantidad completada</Label><Input type="number" min="0" step="0.01" value={form.completedQuantity} onChange={e => update("completedQuantity", e.target.value)} placeholder="Ej. 110" /></div></> : null}
          </div>
          <div className="rounded-2xl bg-muted/55 p-4">
            <p className="mb-3 text-xs font-extrabold uppercase tracking-[0.14em] text-muted-foreground">Registro de tiempo</p>
            <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label>Inicio</Label><Input type="datetime-local" value={form.startAt} onChange={e => update("startAt", e.target.value)} /></div><div className="space-y-2"><Label>Finalización</Label><Input type="datetime-local" value={form.endAt} onChange={e => update("endAt", e.target.value)} /></div></div>
            <p className="mt-3 text-xs text-muted-foreground">La tarea pasa a “En proceso” al registrar el inicio y a “Completada” al registrar la finalización.</p>
          </div>
          <div className="space-y-2"><Label>Observaciones</Label><Textarea value={form.notes} onChange={e => update("notes", e.target.value)} placeholder="Novedades, bloqueos o detalles del resultado…" rows={3} /></div>
          <DialogFooter><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button><Button type="submit" disabled={pending}>{pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}{task ? "Guardar cambios" : "Asignar tarea"}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
