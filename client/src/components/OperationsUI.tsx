import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Area, areaLabels, TaskStatus, statusLabels } from "@/lib/operations";
import { LoaderCircle, LucideIcon, TriangleAlert } from "lucide-react";

export function PageHeader({ eyebrow, title, description, actions }: { eyebrow: string; title: string; description: string; actions?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
      <div className="max-w-3xl">
        <p className="mb-2 text-[11px] font-extrabold uppercase tracking-[0.2em] text-primary">{eyebrow}</p>
        <h1 className="text-3xl font-extrabold tracking-[-0.04em] text-foreground sm:text-4xl">{title}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p>
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function MetricCard({ label, value, detail, icon: Icon, tone = "green" }: { label: string; value: string | number; detail: string; icon: LucideIcon; tone?: "green" | "orange" | "blue" | "sand" }) {
  const tones = {
    green: "bg-emerald-50 text-emerald-700",
    orange: "bg-orange-50 text-orange-700",
    blue: "bg-sky-50 text-sky-700",
    sand: "bg-amber-50 text-amber-700",
  };
  return (
    <Card className="border-0 bg-card p-5 shadow-[0_12px_35px_rgba(36,62,54,0.06)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
          <p className="mt-3 text-3xl font-extrabold tracking-[-0.04em]">{value}</p>
          <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
        </div>
        <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl", tones[tone])}><Icon className="h-5 w-5" /></div>
      </div>
    </Card>
  );
}

export function AreaBadge({ area }: { area: Area }) {
  const colors: Record<Area, string> = {
    produccion: "border-emerald-200 bg-emerald-50 text-emerald-700",
    ventas: "border-sky-200 bg-sky-50 text-sky-700",
    administracion: "border-amber-200 bg-amber-50 text-amber-700",
  };
  return <Badge variant="outline" className={cn("font-bold", colors[area])}>{areaLabels[area]}</Badge>;
}

export function StatusBadge({ status }: { status: TaskStatus }) {
  const colors: Record<TaskStatus, string> = {
    pendiente: "border-slate-200 bg-slate-50 text-slate-600",
    en_proceso: "border-orange-200 bg-orange-50 text-orange-700",
    completada: "border-emerald-200 bg-emerald-50 text-emerald-700",
  };
  return <Badge variant="outline" className={cn("font-bold", colors[status])}>{statusLabels[status]}</Badge>;
}

export function EmptyState({ title, description, action }: { title: string; description: string; action?: React.ReactNode }) {
  return (
    <div className="relative flex min-h-52 flex-col items-center justify-center overflow-hidden rounded-2xl border border-dashed border-border bg-muted/25 px-6 text-center">
      <div className="pointer-events-none absolute inset-0 opacity-35 [background-image:linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] [background-size:24px_24px]" />
      <div className="relative mb-4 flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-primary/35" /><span className="h-2 w-8 rounded-full bg-primary/75" /><span className="h-2 w-2 rounded-full bg-primary/35" /></div>
      <h3 className="relative font-extrabold">{title}</h3>
      <p className="relative mt-1 max-w-md text-sm text-muted-foreground">{description}</p>
      {action ? <div className="relative mt-5">{action}</div> : null}
    </div>
  );
}

export function LoadingState({ label = "Cargando información operativa…" }: { label?: string }) {
  return <div className="flex min-h-40 items-center justify-center gap-3 text-sm font-semibold text-muted-foreground"><LoaderCircle className="h-5 w-5 animate-spin text-primary" />{label}</div>;
}

export function ErrorState({ description = "No fue posible consultar la información. Intenta nuevamente." }: { description?: string }) {
  return <div className="flex min-h-40 flex-col items-center justify-center gap-2 rounded-2xl border border-red-200 bg-red-50/60 px-6 text-center text-red-800"><TriangleAlert className="h-6 w-6" /><p className="font-extrabold">Error de conexión</p><p className="text-sm text-red-700">{description}</p></div>;
}
