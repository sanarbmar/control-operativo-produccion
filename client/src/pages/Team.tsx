import { AreaBadge, EmptyState, ErrorState, LoadingState, PageHeader } from "@/components/OperationsUI";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Area } from "@/lib/operations";
import { trpc } from "@/lib/trpc";
import { Pencil, Plus, UsersRound } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type Employee = { id: number; name: string; area: Area; isActive: boolean };

export default function Team() {
  const [area, setArea] = useState<Area | "all">("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [name, setName] = useState("");
  const [formArea, setFormArea] = useState<Area>("produccion");
  const query = trpc.operations.employees.list.useQuery({ includeInactive: true });
  const employees = (query.data ?? []).filter(person => area === "all" || person.area === area) as Employee[];
  const utils = trpc.useUtils();
  const createMutation = trpc.operations.employees.create.useMutation();
  const updateMutation = trpc.operations.employees.update.useMutation();
  const activeMutation = trpc.operations.employees.setActive.useMutation();

  function openForm(person?: Employee) {
    setEditing(person ?? null);
    setName(person?.name ?? "");
    setFormArea(person?.area ?? "produccion");
    setDialogOpen(true);
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    try {
      if (editing) await updateMutation.mutateAsync({ id: editing.id, name, area: formArea });
      else await createMutation.mutateAsync({ name, area: formArea });
      await utils.operations.employees.invalidate();
      toast.success(editing ? "Persona actualizada" : "Persona agregada");
      setDialogOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No fue posible guardar.");
    }
  }

  async function toggle(person: Employee) {
    try {
      await activeMutation.mutateAsync({ id: person.id, isActive: !person.isActive });
      await utils.operations.employees.invalidate();
      toast.success(person.isActive ? "Persona desactivada" : "Persona activada");
    } catch {
      toast.error("No fue posible cambiar el estado.");
    }
  }

  return (
    <div className="min-h-screen px-4 py-6 sm:px-7 sm:py-8 lg:px-10">
      <div className="mx-auto max-w-[1200px] space-y-7">
        <PageHeader eyebrow="Organización" title="Equipo" description="Administra las personas responsables y el área operativa a la que pertenecen." actions={<Button size="lg" onClick={() => openForm()}><Plus className="h-4 w-4" />Agregar persona</Button>} />
        <div className="flex items-center gap-3">
          <Select value={area} onValueChange={value => setArea(value as Area | "all")}><SelectTrigger className="w-full max-w-xs bg-card"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todas las áreas</SelectItem><SelectItem value="produccion">Producción</SelectItem><SelectItem value="ventas">Ventas</SelectItem><SelectItem value="administracion">Administración</SelectItem></SelectContent></Select>
          <span className="text-sm text-muted-foreground">{employees.length} personas</span>
        </div>
        {query.isLoading ? <LoadingState label="Consultando equipo…" /> : query.isError ? <ErrorState /> : employees.length ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {employees.map(person => (
              <Card key={person.id} className={`border-0 shadow-[0_12px_35px_rgba(36,62,54,0.06)] ${!person.isActive ? "opacity-55" : ""}`}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-4"><div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent text-accent-foreground"><UsersRound className="h-5 w-5" /></div><div><p className="font-extrabold">{person.name}</p><div className="mt-1"><AreaBadge area={person.area} /></div></div></div><Button variant="ghost" size="icon" onClick={() => openForm(person)} aria-label={`Editar a ${person.name}`}><Pencil className="h-4 w-4" /></Button></div>
                  <div className="mt-5 flex items-center justify-between border-t pt-4"><span className="text-xs font-bold text-muted-foreground">{person.isActive ? "Disponible para asignaciones" : "No disponible"}</span><Switch checked={person.isActive} onCheckedChange={() => toggle(person)} /></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : <EmptyState title="Sin personas en esta área" description="Agrega una persona o cambia el filtro para consultar otro equipo." action={<Button onClick={() => openForm()}><Plus className="h-4 w-4" />Agregar persona</Button>} />}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent><DialogHeader><DialogTitle>{editing ? "Editar persona" : "Agregar persona"}</DialogTitle><DialogDescription>Define el nombre y el área de responsabilidad.</DialogDescription></DialogHeader><form onSubmit={save} className="space-y-5"><div className="space-y-2"><Label>Nombre</Label><Input value={name} onChange={event => setName(event.target.value)} required minLength={2} /></div><div className="space-y-2"><Label>Área</Label><Select value={formArea} onValueChange={value => setFormArea(value as Area)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="produccion">Producción</SelectItem><SelectItem value="ventas">Ventas</SelectItem><SelectItem value="administracion">Administración</SelectItem></SelectContent></Select></div><DialogFooter><Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button><Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>Guardar</Button></DialogFooter></form></DialogContent>
      </Dialog>
    </div>
  );
}
