import { EmptyState, ErrorState, LoadingState, MetricCard, PageHeader, StatusBadge } from "@/components/OperationsUI";
import { TaskFormDialog } from "@/components/TaskFormDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Area,
  areaLabels,
  dateInputValue,
  dateRange,
  durationMinutes,
  formatDuration,
  TaskRecord,
} from "@/lib/operations";
import { trpc } from "@/lib/trpc";
import { CheckCircle2, ClipboardCheck, Clock3, PackageCheck, Plus, UsersRound } from "lucide-react";
import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type PersonPerformance = {
  name: string;
  tareas: number;
  completadas: number;
  cantidad: number;
  minutos: number;
  unidades: Set<string>;
};

export default function Home() {
  const [fromDate, setFromDate] = useState(dateInputValue);
  const [toDate, setToDate] = useState(dateInputValue);
  const [area, setArea] = useState<Area | "all">("all");
  const [employeeId, setEmployeeId] = useState("all");
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);

  const employeesQuery = trpc.operations.employees.list.useQuery();
  const employees = employeesQuery.data ?? [];
  const queryInput = useMemo(
    () => ({
      from: dateRange(fromDate).from,
      to: dateRange(toDate).to,
      area: area === "all" ? undefined : area,
      employeeId: employeeId === "all" ? undefined : Number(employeeId),
    }),
    [fromDate, toDate, area, employeeId],
  );
  const tasksQuery = trpc.operations.dailyTasks.list.useQuery(queryInput);
  const tasks = (tasksQuery.data ?? []) as TaskRecord[];
  const filteredEmployees = area === "all" ? employees : employees.filter(person => person.area === area);

  const completed = tasks.filter(task => task.status === "completada").length;
  const quantity = tasks.reduce((sum, task) => sum + Number(task.completedQuantity ?? 0), 0);
  const minutes = tasks.reduce((sum, task) => sum + durationMinutes(task.startAt, task.endAt), 0);
  const performance = Object.values(
    tasks.reduce<Record<string, PersonPerformance>>((acc, task) => {
      const current = acc[task.employeeId] ?? {
        name: task.employeeName,
        tareas: 0,
        completadas: 0,
        cantidad: 0,
        minutos: 0,
        unidades: new Set<string>(),
      };
      current.tareas += 1;
      current.completadas += task.status === "completada" ? 1 : 0;
      current.cantidad += Number(task.completedQuantity ?? 0);
      current.minutos += durationMinutes(task.startAt, task.endAt);
      if (task.completedQuantity) current.unidades.add(task.unit);
      acc[task.employeeId] = current;
      return acc;
    }, {}),
  ).sort((a, b) => b.completadas - a.completadas || b.cantidad - a.cantidad);

  return (
    <div className="min-h-screen px-4 py-6 sm:px-7 sm:py-8 lg:px-10">
      <div className="mx-auto max-w-[1500px] space-y-7">
        <PageHeader
          eyebrow="Centro de control"
          title="Resumen diario"
          description="Una lectura clara del trabajo asignado, los tiempos registrados y el avance de cada persona."
          actions={
            <Button size="lg" onClick={() => setTaskDialogOpen(true)} className="shadow-lg shadow-emerald-900/10">
              <Plus className="h-4 w-4" />Nueva tarea
            </Button>
          }
        />

        <Card className="border-0 bg-card/90 p-4 shadow-[0_12px_35px_rgba(36,62,54,0.05)]">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div>
              <p className="mb-1.5 text-[10px] font-extrabold uppercase tracking-[0.14em] text-muted-foreground">Desde</p>
              <Input type="date" value={fromDate} onChange={event => setFromDate(event.target.value)} />
            </div>
            <div>
              <p className="mb-1.5 text-[10px] font-extrabold uppercase tracking-[0.14em] text-muted-foreground">Hasta</p>
              <Input type="date" min={fromDate} value={toDate} onChange={event => setToDate(event.target.value)} />
            </div>
            <div>
              <p className="mb-1.5 text-[10px] font-extrabold uppercase tracking-[0.14em] text-muted-foreground">Área</p>
              <Select value={area} onValueChange={value => { setArea(value as Area | "all"); setEmployeeId("all"); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="all">Todas las áreas</SelectItem><SelectItem value="produccion">Producción</SelectItem><SelectItem value="ventas">Ventas</SelectItem><SelectItem value="administracion">Administración</SelectItem></SelectContent>
              </Select>
            </div>
            <div>
              <p className="mb-1.5 text-[10px] font-extrabold uppercase tracking-[0.14em] text-muted-foreground">Persona</p>
              <Select value={employeeId} onValueChange={setEmployeeId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="all">Todas las personas</SelectItem>{filteredEmployees.map(person => <SelectItem key={person.id} value={String(person.id)}>{person.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
        </Card>

        {tasksQuery.isLoading ? (
          <Card className="border-0 shadow-[0_12px_35px_rgba(36,62,54,0.06)]"><LoadingState label="Preparando el resumen de la jornada…" /></Card>
        ) : tasksQuery.isError ? (
          <ErrorState description="No fue posible cargar el resumen operativo. Revisa la conexión e intenta nuevamente." />
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard label="Tareas asignadas" value={tasks.length} detail="En el periodo seleccionado" icon={ClipboardCheck} tone="green" />
              <MetricCard label="Completadas" value={completed} detail={`${tasks.length ? Math.round(completed / tasks.length * 100) : 0}% de cumplimiento`} icon={CheckCircle2} tone="blue" />
              <MetricCard label="Cantidad registrada" value={quantity.toLocaleString("es-CO")} detail="Suma de resultados reportados" icon={PackageCheck} tone="orange" />
              <MetricCard label="Tiempo productivo" value={formatDuration(minutes)} detail="Con inicio y fin registrados" icon={Clock3} tone="sand" />
            </div>

            <div className="grid gap-6 xl:grid-cols-[1.15fr_.85fr]">
              <Card className="border-0 shadow-[0_12px_35px_rgba(36,62,54,0.06)]">
                <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><UsersRound className="h-5 w-5 text-primary" />Rendimiento por persona</CardTitle></CardHeader>
                <CardContent>{performance.length ? (
                  <div className="h-[310px] w-full"><ResponsiveContainer width="100%" height="100%"><BarChart data={performance} margin={{ top: 8, right: 12, left: -18, bottom: 8 }}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="oklch(0.89 0.018 94)" /><XAxis dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} /><YAxis allowDecimals={false} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} /><Tooltip cursor={{ fill: "oklch(0.93 0.027 91 / .45)" }} contentStyle={{ borderRadius: 14, border: "1px solid oklch(0.89 0.018 94)", boxShadow: "0 12px 30px rgba(36,62,54,.1)" }} /><Bar dataKey="tareas" name="Asignadas" fill="oklch(0.78 0.04 168)" radius={[6, 6, 0, 0]} /><Bar dataKey="completadas" name="Completadas" fill="oklch(0.48 0.09 176)" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></div>
                ) : <EmptyState title="Jornada sin iniciar" description="Asigna el primer proceso del día para comenzar el seguimiento del equipo." action={<Button onClick={() => setTaskDialogOpen(true)}><Plus className="h-4 w-4" />Asignar tarea</Button>} />}</CardContent>
              </Card>

              <Card className="border-0 shadow-[0_12px_35px_rgba(36,62,54,0.06)]">
                <CardHeader><CardTitle className="text-lg">Actividad reciente</CardTitle></CardHeader>
                <CardContent className="space-y-3">{tasks.length ? tasks.slice(0, 5).map(task => (
                  <div key={task.id} className="flex items-center justify-between gap-3 rounded-2xl bg-muted/45 p-3"><div className="min-w-0"><p className="truncate text-sm font-extrabold">{task.taskName}{task.variantName ? ` · ${task.variantName}` : ""}</p><p className="mt-1 truncate text-xs text-muted-foreground">{task.employeeName} · {areaLabels[task.area]}</p></div><StatusBadge status={task.status} /></div>
                )) : <EmptyState title="Sin novedades de jornada" description="Las tareas iniciadas o completadas aparecerán aquí." />}</CardContent>
              </Card>
            </div>

            {performance.length ? (
              <Card className="border-0 shadow-[0_12px_35px_rgba(36,62,54,0.06)]">
                <CardHeader><CardTitle className="text-lg">Detalle individual</CardTitle></CardHeader>
                <CardContent><div className="overflow-x-auto"><table className="w-full min-w-[820px] text-sm"><thead><tr className="border-b text-left text-[11px] uppercase tracking-[0.12em] text-muted-foreground"><th className="pb-3 font-bold">Persona</th><th className="pb-3 font-bold">Asignadas</th><th className="pb-3 font-bold">Completadas</th><th className="pb-3 font-bold">Cantidad</th><th className="pb-3 font-bold">Tiempo</th><th className="pb-3 font-bold">Promedio por unidad</th></tr></thead><tbody>{performance.map(person => {
                  const comparable = person.unidades.size === 1 && person.minutos > 0 && person.cantidad > 0;
                  const unit = comparable ? Array.from(person.unidades)[0] : null;
                  const averageMinutes = comparable ? Math.round((person.minutos / person.cantidad) * 10) / 10 : null;
                  return <tr key={person.name} className="border-b border-border/60 last:border-0"><td className="py-4 font-extrabold">{person.name}</td><td className="py-4">{person.tareas}</td><td className="py-4">{person.completadas}</td><td className="py-4">{person.cantidad.toLocaleString("es-CO")}</td><td className="py-4">{formatDuration(person.minutos)}</td><td className="py-4 font-semibold">{averageMinutes != null ? `${averageMinutes} min/${unit}` : <span className="font-normal text-muted-foreground">No comparable</span>}</td></tr>;
                })}</tbody></table></div></CardContent>
              </Card>
            ) : null}
          </>
        )}
      </div>
      <TaskFormDialog open={taskDialogOpen} onOpenChange={setTaskDialogOpen} />
    </div>
  );
}
