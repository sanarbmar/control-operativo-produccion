import { AreaBadge, EmptyState, ErrorState, LoadingState, PageHeader } from "@/components/OperationsUI";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Area } from "@/lib/operations";
import { trpc } from "@/lib/trpc";
import { Boxes, Pencil, Plus, Tags } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type Variant = { id: number; name: string; isActive: boolean; taskCatalogId: number };
type CatalogItem = { id: number; name: string; area: Area; unit: string; usesQuantity: boolean; hasVariants: boolean; isActive: boolean; variants: Variant[] };

export default function Catalog() {
  const query = trpc.operations.catalog.list.useQuery({ includeInactive: true });
  const items = (query.data ?? []) as CatalogItem[];
  const utils = trpc.useUtils();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CatalogItem | null>(null);
  const [name, setName] = useState("");
  const [area, setArea] = useState<Area>("produccion");
  const [unit, setUnit] = useState("unidades");
  const [usesQuantity, setUsesQuantity] = useState(true);
  const [hasVariants, setHasVariants] = useState(false);
  const [variantDialogOpen, setVariantDialogOpen] = useState(false);
  const [variantTaskId, setVariantTaskId] = useState<number | null>(null);
  const [editingVariant, setEditingVariant] = useState<Variant | null>(null);
  const [variantName, setVariantName] = useState("");
  const createMutation = trpc.operations.catalog.create.useMutation();
  const updateMutation = trpc.operations.catalog.update.useMutation();
  const activeMutation = trpc.operations.catalog.setActive.useMutation();
  const createVariant = trpc.operations.catalog.createVariant.useMutation();
  const updateVariant = trpc.operations.catalog.updateVariant.useMutation();
  const activeVariant = trpc.operations.catalog.setVariantActive.useMutation();

  function openForm(item?: CatalogItem) {
    setEditing(item ?? null); setName(item?.name ?? ""); setArea(item?.area ?? "produccion"); setUnit(item?.unit ?? "unidades"); setUsesQuantity(item?.usesQuantity ?? true); setHasVariants(item?.hasVariants ?? false); setDialogOpen(true);
  }
  function openVariant(taskId: number, variant?: Variant) {
    setVariantTaskId(taskId); setEditingVariant(variant ?? null); setVariantName(variant?.name ?? ""); setVariantDialogOpen(true);
  }
  async function refresh() { await utils.operations.catalog.invalidate(); }
  async function save(event: React.FormEvent) {
    event.preventDefault();
    try {
      const input = { name, area, unit, usesQuantity, hasVariants };
      if (editing) await updateMutation.mutateAsync({ id: editing.id, ...input }); else await createMutation.mutateAsync(input);
      await refresh(); toast.success(editing ? "Tarea actualizada" : "Tarea agregada"); setDialogOpen(false);
    } catch (error) { toast.error(error instanceof Error ? error.message : "No fue posible guardar."); }
  }
  async function toggleItem(item: CatalogItem) {
    try { await activeMutation.mutateAsync({ id: item.id, isActive: !item.isActive }); await refresh(); } catch { toast.error("No fue posible cambiar el estado."); }
  }
  async function saveVariant(event: React.FormEvent) {
    event.preventDefault(); if (!variantTaskId) return;
    try {
      if (editingVariant) await updateVariant.mutateAsync({ id: editingVariant.id, name: variantName }); else await createVariant.mutateAsync({ taskCatalogId: variantTaskId, name: variantName });
      await refresh(); toast.success(editingVariant ? "Variante actualizada" : "Variante agregada"); setVariantDialogOpen(false);
    } catch (error) { toast.error(error instanceof Error ? error.message : "No fue posible guardar la variante."); }
  }
  async function toggleVariant(variant: Variant) {
    try { await activeVariant.mutateAsync({ id: variant.id, isActive: !variant.isActive }); await refresh(); } catch { toast.error("No fue posible cambiar la variante."); }
  }

  return (
    <div className="min-h-screen px-4 py-6 sm:px-7 sm:py-8 lg:px-10">
      <div className="mx-auto max-w-[1200px] space-y-7">
        <PageHeader eyebrow="Configuración operativa" title="Catálogo de tareas" description="Edita los procesos, sus unidades de medida y las variantes disponibles para cada asignación." actions={<Button size="lg" onClick={() => openForm()}><Plus className="h-4 w-4" />Agregar tarea</Button>} />
        {query.isLoading ? <LoadingState label="Consultando catálogo…" /> : query.isError ? <ErrorState /> : items.length ? (
          <div className="space-y-4">{items.map(item => (
            <Card key={item.id} className={`border-0 shadow-[0_12px_35px_rgba(36,62,54,0.06)] ${!item.isActive ? "opacity-55" : ""}`}><CardContent className="p-5"><div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between"><div className="flex items-start gap-4"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-secondary text-secondary-foreground"><Boxes className="h-5 w-5" /></div><div><div className="flex flex-wrap items-center gap-2"><h3 className="font-extrabold">{item.name}</h3><AreaBadge area={item.area} /><Badge variant="secondary">{item.unit}</Badge></div><p className="mt-2 text-xs text-muted-foreground">{item.usesQuantity ? "Registra cantidades" : "Sin cantidad"}{item.hasVariants ? " · Admite variantes" : ""}</p>{item.hasVariants ? <div className="mt-3 flex flex-wrap gap-2">{item.variants.map(variant => <button key={variant.id} onClick={() => openVariant(item.id, variant)} className={`rounded-full border px-3 py-1 text-xs font-bold ${variant.isActive ? "bg-emerald-50 text-emerald-700" : "bg-muted text-muted-foreground line-through"}`}>{variant.name}</button>)}<Button variant="ghost" size="sm" onClick={() => openVariant(item.id)}><Plus className="h-3.5 w-3.5" />Variante</Button></div> : null}</div></div><div className="flex items-center justify-between gap-3 lg:justify-end"><div className="flex items-center gap-2"><span className="text-xs font-bold text-muted-foreground">{item.isActive ? "Activo" : "Inactivo"}</span><Switch checked={item.isActive} onCheckedChange={() => toggleItem(item)} /></div><Button variant="outline" size="sm" onClick={() => openForm(item)}><Pencil className="h-4 w-4" />Editar</Button></div></div></CardContent></Card>
          ))}</div>
        ) : <EmptyState title="Catálogo sin procesos" description="Agrega la primera tarea para comenzar a organizar las asignaciones diarias." action={<Button onClick={() => openForm()}><Plus className="h-4 w-4" />Agregar tarea</Button>} />}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}><DialogContent><DialogHeader><DialogTitle>{editing ? "Editar tarea del catálogo" : "Agregar tarea al catálogo"}</DialogTitle><DialogDescription>Configura cómo se medirá esta actividad.</DialogDescription></DialogHeader><form onSubmit={save} className="space-y-5"><div className="space-y-2"><Label>Nombre</Label><Input value={name} onChange={event => setName(event.target.value)} required /></div><div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label>Área sugerida</Label><Select value={area} onValueChange={value => setArea(value as Area)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="produccion">Producción</SelectItem><SelectItem value="ventas">Ventas</SelectItem><SelectItem value="administracion">Administración</SelectItem></SelectContent></Select></div><div className="space-y-2"><Label>Unidad de medida</Label><Input value={unit} onChange={event => setUnit(event.target.value)} required /></div></div><div className="flex items-center justify-between rounded-xl border p-4"><div><p className="text-sm font-bold">Registrar cantidades</p><p className="text-xs text-muted-foreground">Objetivo y resultado completado.</p></div><Switch checked={usesQuantity} onCheckedChange={setUsesQuantity} /></div><div className="flex items-center justify-between rounded-xl border p-4"><div><p className="text-sm font-bold">Usar variantes</p><p className="text-xs text-muted-foreground">Ej. Dólaro, JP, Alaskan o GT.</p></div><Switch checked={hasVariants} onCheckedChange={setHasVariants} /></div><DialogFooter><Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button><Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>Guardar</Button></DialogFooter></form></DialogContent></Dialog>
      <Dialog open={variantDialogOpen} onOpenChange={setVariantDialogOpen}><DialogContent><DialogHeader><DialogTitle>{editingVariant ? "Editar variante" : "Agregar variante"}</DialogTitle><DialogDescription>Las variantes permiten especificar el material o tipo del proceso.</DialogDescription></DialogHeader><form onSubmit={saveVariant} className="space-y-5"><div className="space-y-2"><Label>Nombre de la variante</Label><Input value={variantName} onChange={event => setVariantName(event.target.value)} required /></div>{editingVariant ? <div className="flex items-center justify-between rounded-xl border p-4"><div><p className="text-sm font-bold">Variante activa</p><p className="text-xs text-muted-foreground">Disponible para nuevas asignaciones.</p></div><Switch checked={editingVariant.isActive} onCheckedChange={() => toggleVariant(editingVariant)} /></div> : null}<DialogFooter><Button type="button" variant="outline" onClick={() => setVariantDialogOpen(false)}>Cancelar</Button><Button type="submit" disabled={createVariant.isPending || updateVariant.isPending}><Tags className="h-4 w-4" />Guardar</Button></DialogFooter></form></DialogContent></Dialog>
    </div>
  );
}
