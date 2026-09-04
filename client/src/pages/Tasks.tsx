import { AreaBadge, EfficiencyBadge, EmptyState, ErrorState, LoadingState, PageHeader, StatusBadge } from "@/components/OperationsUI";
import { TaskFormDialog } from "@/components/TaskFormDialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { dateInputValue, dateRange, durationMinutes, formatDate, formatDateTime, formatDuration, TaskRecord } from "@/lib/operations";
import { trpc } from "@/lib/trpc";
import { taskEfficiencyPercent } from "@shared/operations";
import { Clock3, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

export default function Tasks() {
  const [fromDate, setFromDate] = useState(dateInputValue);
  const [toDate, setToDate] = useState(dateInputValue);
  const [area, setArea] = useState("all");
  const [employeeId, setEmployeeId] = useState("all");
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<TaskRecord | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState<TaskRecord | null>(null);
  const employees = trpc.operations.employees.list.useQuery().data ?? [];
  const queryInput = useMemo(() => ({
    from: dateRange(fromDate).from,
    to: dateRange(toDate).to,
    area: area === "all" ? undefined : area as "produccion" | "ventas" | "administracion",
    employeeId: employeeId === "all" ? undefined : Number(employeeId),
    status: status === "all" ? undefined : status as "pendiente" | "en_proceso" | "completada",
  }), [fromDate, toDate, area, employeeId, status]);
  const tasksQuery = trpc.operations.dailyTasks.list.useQuery(queryInput);
  const tasks = ((tasksQuery.data ?? []) as TaskRecord[]).filter(task => `${task.taskName} ${task.employeeName} ${task.variantName ?? ""}`.toLowerCase().includes(search.toLowerCase()));
  const utils = trpc.useUtils();
  const removeMutation = trpc.operations.dailyTasks.remove.useMutation();

  async function remove() {
    if (!deleting) return;
    try {
      await removeMutation.mutateAsync({ id: deleting.id });
      await utils.operations.dailyTasks.invalidate();
      toast.success("Tarea eliminada");
      setDeleting(null);
    } catch {
      toast.error("No fue posible eliminar la tarea.");
    }
  }

  return (
    <div className="min-h-screen px-4 py-6 sm:px-7 sm:py-8 lg:px-10">
      <div className="mx-auto max-w-[1500px] space-y-7">
        <PageHeader eyebrow="Operación" title="Tareas diarias" description="Asigna, consulta y actualiza cada proceso desde su inicio hasta su finalización." actions={<Button size="lg" onClick={() => { setEditing(null); setDialogOpen(true); }}><Plus className="h-4 w-4" />Nueva tarea</Button>} />

        <Card className="border-0 shadow-[0_12px_35px_rgba(36,62,54,0.06)]"><CardContent className="p-4"><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6"><Input type="date" value={fromDate} onChange={event => setFromDate(event.target.value)} /><Input type="date" value={toDate} onChange={event => setToDate(event.target.value)} /><Select value={area} onValueChange={setArea}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todas las áreas</SelectItem><SelectItem value="produccion">Producción</SelectItem><SelectItem value="ventas">Ventas</SelectItem><SelectItem value="administracion">Administración</SelectItem></SelectContent></Select><Select value={employeeId} onValueChange={setEmployeeId}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todas las personas</SelectItem>{employees.map(person => <SelectItem key={person.id} value={String(person.id)}>{person.name}</SelectItem>)}</SelectContent></Select><Select value={status} onValueChange={setStatus}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todos los estados</SelectItem><SelectItem value="pendiente">Pendiente</SelectItem><SelectItem value="en_proceso">En proceso</SelectItem><SelectItem value="completada">Completada</SelectItem></SelectContent></Select><div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={search} onChange={event => setSearch(event.target.value)} placeholder="Buscar…" className="pl-9" /></div></div></CardContent></Card>

        <Card className="border-0 shadow-[0_12px_35px_rgba(36,62,54,0.06)]">
          <CardContent className="p-0">
            {tasksQuery.isLoading ? <LoadingState label="Consultando tareas…" /> : tasksQuery.isError ? <div className="p-5"><ErrorState /></div> : tasks.length ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1260px] text-sm">
                  <thead><tr className="border-b bg-muted/35 text-left text-[11px] uppercase tracking-[0.12em] text-muted-foreground"><th className="px-5 py-4 font-bold">Tarea</th><th className="px-4 py-4 font-bold">Responsable</th><th className="px-4 py-4 font-bold">Fecha</th><th className="px-4 py-4 font-bold">Área</th><th className="px-4 py-4 font-bold">Meta</th><th className="px-4 py-4 font-bold">Resultado</th><th className="px-4 py-4 font-bold">Tiempo real</th><th className="px-4 py-4 font-bold">Eficiencia</th><th className="px-4 py-4 font-bold">Estado</th><th className="px-5 py-4 text-right font-bold">Acciones</th></tr></thead>
                  <tbody>{tasks.map(task => {
                    const actualMinutes = durationMinutes(task.startAt, task.endAt);
                    const efficiency = taskEfficiencyPercent(task.completedQuantity, actualMinutes, task.targetQuantity, task.targetDurationMinutes);
                    return (
                      <tr key={task.id} className="border-b border-border/60 last:border-0 hover:bg-muted/25">
                        <td className="px-5 py-4"><p className="font-extrabold">{task.taskName}</p><p className="mt-1 text-xs text-muted-foreground">{task.variantName ?? task.notes ?? "Sin detalle adicional"}</p></td>
                        <td className="px-4 py-4 font-semibold">{task.employeeName}</td>
                        <td className="px-4 py-4">{formatDate(task.workDate)}</td>
                        <td className="px-4 py-4"><AreaBadge area={task.area} /></td>
                        <td className="px-4 py-4">{task.targetQuantity && task.targetDurationMinutes ? <><p className="font-extrabold">{Number(task.targetQuantity).toLocaleString("es-CO")} {task.unit}</p><p className="mt-1 text-[11px] text-muted-foreground">en {task.targetDurationMinutes} min</p></> : <span className="text-muted-foreground">Sin meta</span>}</td>
                        <td className="px-4 py-4"><span className="font-extrabold">{task.completedQuantity ?? "—"}</span> <span className="text-xs text-muted-foreground">{task.completedQuantity ? task.unit : ""}</span></td>
                        <td className="px-4 py-4"><div className="flex items-center gap-2 font-semibold"><Clock3 className="h-4 w-4 text-muted-foreground" />{formatDuration(actualMinutes)}</div><p className="mt-1 text-[11px] text-muted-foreground">{formatDateTime(task.startAt)}</p></td>
                        <td className="px-4 py-4"><EfficiencyBadge value={efficiency} /></td>
                        <td className="px-4 py-4"><StatusBadge status={task.status} /></td>
                        <td className="px-5 py-4"><div className="flex justify-end gap-1"><Button variant="ghost" size="icon" onClick={() => { setEditing(task); setDialogOpen(true); }} aria-label="Editar tarea"><Pencil className="h-4 w-4" /></Button><Button variant="ghost" size="icon" onClick={() => setDeleting(task)} aria-label="Eliminar tarea" className="text-destructive"><Trash2 className="h-4 w-4" /></Button></div></td>
                      </tr>
                    );
                  })}</tbody>
                </table>
              </div>
            ) : <div className="p-6"><EmptyState title="Sin asignaciones para este periodo" description="Ajusta los filtros o registra el siguiente proceso de la jornada." action={<Button onClick={() => setDialogOpen(true)}><Plus className="h-4 w-4" />Crear tarea</Button>} /></div>}
          </CardContent>
        </Card>
      </div>

      <TaskFormDialog open={dialogOpen} onOpenChange={setDialogOpen} task={editing} />
      <AlertDialog open={Boolean(deleting)} onOpenChange={open => !open && setDeleting(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>¿Eliminar esta tarea?</AlertDialogTitle><AlertDialogDescription>Se eliminará el registro operativo, incluyendo sus tiempos y cantidades. Esta acción no se puede deshacer.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={remove} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Eliminar</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </div>
  );
}
