import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { APP_NAME } from "@/lib/brand";
import { useClient, useVehicules, type Vehicule } from "@/lib/queries";
import { ClientForm } from "@/components/client-form";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertTriangle,
  ArrowLeft,
  Car,
  Hash,
  Mail,
  MapPin,
  Phone,
  Plus,
  Trash2,
} from "lucide-react";
import { db } from "@/lib/db";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { ClientForm as ClientFormType } from "@/lib/schemas";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { PermissionGate } from "@/components/permission-gate";
import { PageActions, PageContainer, PageHeader, PageSection } from "@/components/page-layout";

export const Route = createFileRoute("/_app/clients/$id")({
  head: () => ({ meta: [{ title: `Fiche client — ${APP_NAME}` }] }),
  component: () => (
    <PermissionGate perm="clients">
      <ClientDetail />
    </PermissionGate>
  ),
});

function ClientDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: client, isLoading, isError } = useClient(id);
  const { data: vehicules = [] } = useVehicules(id);
  const [vehiculeDialogOpen, setVehiculeDialogOpen] = useState(false);
  const [editingVehicule, setEditingVehicule] = useState<Vehicule | null>(null);

  function openNewVehicule() {
    setEditingVehicule(null);
    setVehiculeDialogOpen(true);
  }
  function openEditVehicule(v: Vehicule) {
    setEditingVehicule(v);
    setVehiculeDialogOpen(true);
  }

  async function handleUpdate(values: ClientFormType) {
    const { error } = await db.from("clients").update(values).eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    qc.invalidateQueries({ queryKey: ["clients"] });
    qc.invalidateQueries({ queryKey: ["client", id] });
    toast.success("Client mis à jour");
  }

  async function handleDelete() {
    const { error } = await db.from("clients").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    qc.invalidateQueries({ queryKey: ["clients"] });
    toast.success("Client supprimé");
    navigate({ to: "/clients" });
  }

  if (isLoading) return <ClientDetailLoading />;

  if (isError || !client) {
    return (
      <PageContainer>
        <Link
          to="/clients"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour aux clients
        </Link>
        <Card className="hover:translate-y-0 hover:shadow-soft">
          <CardContent className="flex flex-col items-center px-6 py-12 text-center">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary">
              <Car className="h-5 w-5" />
            </span>
            <h1 className="mt-4 font-semibold">
              {isError ? "Impossible de charger ce client" : "Client introuvable"}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {isError
                ? "Une erreur est survenue pendant le chargement."
                : "Cette fiche n’existe pas ou n’est plus disponible."}
            </p>
          </CardContent>
        </Card>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <Link
        to="/clients"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Retour aux clients
      </Link>

      <PageHeader
        title={client.raison_sociale}
        subtitle="Fiche client"
        actions={
          <PageActions className="w-full sm:w-auto">
            {client.telephone && (
              <Button asChild variant="outline" className="flex-1 sm:flex-none">
                <a href={`tel:${client.telephone}`}>
                  <Phone className="h-4 w-4" />
                  Appeler
                </a>
              </Button>
            )}
            {client.email && (
              <Button asChild variant="outline" className="flex-1 sm:flex-none">
                <a href={`mailto:${client.email}`}>
                  <Mail className="h-4 w-4" />
                  Écrire
                </a>
              </Button>
            )}
          </PageActions>
        }
      />

      {!client.email && (
        <div className="flex flex-col gap-3 rounded-2xl border border-warning/50 bg-warning/10 p-4 text-sm sm:flex-row sm:items-center">
          <AlertTriangle className="h-5 w-5 shrink-0 text-warning" />
          <span className="flex-1 text-foreground">
            Email manquant — requis pour l’envoi des documents.
          </span>
          <a
            href="#modifier"
            className="shrink-0 text-xs font-semibold text-primary hover:underline"
          >
            Corriger
          </a>
        </div>
      )}

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0 space-y-6">
          <PageSection
            title="Véhicules"
            actions={
              <Button size="sm" variant="outline" onClick={openNewVehicule}>
                <Plus className="h-4 w-4" />
                Ajouter un véhicule
              </Button>
            }
          >
            {vehicules.length === 0 ? (
              <Card className="hover:translate-y-0 hover:shadow-soft">
                <CardContent className="flex flex-col items-center px-6 py-10 text-center">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
                    <Car className="h-4 w-4" />
                  </span>
                  <p className="mt-4 text-sm font-medium">Aucun véhicule</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Ajoutez les véhicules de ce client pour préparer les interventions.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {vehicules.map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => openEditVehicule(v)}
                    className="text-left"
                  >
                    <Card className="hover:border-primary/30">
                      <CardContent className="flex items-center gap-3 p-4">
                        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                          <Car className="h-4 w-4" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="truncate font-medium">
                            {v.marque} {v.modele}
                          </div>
                          <div className="mt-0.5 text-xs text-muted-foreground">
                            {[v.immatriculation, v.dimension_pneus].filter(Boolean).join(" · ") || "—"}
                          </div>
                          {v.kilometrage != null && (
                            <div className="mt-0.5 text-xs text-muted-foreground">
                              {v.kilometrage.toLocaleString("fr-FR")} km
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </button>
                ))}
              </div>
            )}
          </PageSection>
        </div>

        <aside className="space-y-6 xl:sticky xl:top-24">
          <PageSection title="Coordonnées">
            <Card className="hover:translate-y-0 hover:shadow-soft">
              <CardContent className="divide-y divide-border/50 p-0">
                {client.adresse_site && (
                  <ContactRow icon={MapPin} label="Adresse">
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(client.adresse_site)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="break-words text-primary hover:underline"
                    >
                      {client.adresse_site}
                    </a>
                  </ContactRow>
                )}
                {client.telephone && (
                  <ContactRow icon={Phone} label="Téléphone">
                    <a href={`tel:${client.telephone}`} className="text-primary hover:underline">
                      {client.telephone}
                    </a>
                  </ContactRow>
                )}
                {client.email && (
                  <ContactRow icon={Mail} label="Email">
                    <a
                      href={`mailto:${client.email}`}
                      className="break-all text-primary hover:underline"
                    >
                      {client.email}
                    </a>
                  </ContactRow>
                )}
                {client.siret && (
                  <ContactRow icon={Hash} label="SIRET">
                    <span className="break-all">{client.siret}</span>
                  </ContactRow>
                )}
                {!client.adresse_site && !client.telephone && !client.email && !client.siret && (
                  <p className="p-4 text-sm text-muted-foreground">Aucune coordonnée renseignée.</p>
                )}
              </CardContent>
            </Card>
          </PageSection>
        </aside>
      </div>

      <PageSection title="Modifier la fiche" className="scroll-mt-24">
        <Card id="modifier" className="hover:translate-y-0 hover:shadow-soft">
          <CardContent className="p-4 sm:p-6">
            <ClientForm
              defaultValues={client}
              onSubmit={handleUpdate}
              submitLabel="Enregistrer les modifications"
            />
          </CardContent>
        </Card>
      </PageSection>

      <PageSection title="Zone sensible">
        <Card className="border-destructive/30 hover:translate-y-0 hover:shadow-soft">
          <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div>
              <p className="text-sm font-semibold">Supprimer ce client</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Cette action est définitive.
              </p>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  className="border-destructive/40 text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                  Supprimer
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Supprimer ce client ?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Cette action est irréversible.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} className="bg-destructive">
                    Supprimer
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      </PageSection>

      <VehiculeDialog
        open={vehiculeDialogOpen}
        onOpenChange={setVehiculeDialogOpen}
        clientId={id}
        vehicule={editingVehicule}
      />
    </PageContainer>
  );
}

function VehiculeDialog({
  open,
  onOpenChange,
  clientId,
  vehicule,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  clientId: string;
  vehicule: Vehicule | null;
}) {
  const qc = useQueryClient();
  const [marque, setMarque] = useState(vehicule?.marque ?? "");
  const [modele, setModele] = useState(vehicule?.modele ?? "");
  const [immatriculation, setImmatriculation] = useState(vehicule?.immatriculation ?? "");
  const [dimensionPneus, setDimensionPneus] = useState(vehicule?.dimension_pneus ?? "");
  const [kilometrage, setKilometrage] = useState(vehicule?.kilometrage?.toString() ?? "");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Réinitialise les champs à chaque ouverture (nouveau véhicule ou édition).
  function resetFields() {
    setMarque(vehicule?.marque ?? "");
    setModele(vehicule?.modele ?? "");
    setImmatriculation(vehicule?.immatriculation ?? "");
    setDimensionPneus(vehicule?.dimension_pneus ?? "");
    setKilometrage(vehicule?.kilometrage?.toString() ?? "");
  }

  async function handleSave() {
    if (!marque.trim()) {
      toast.error("La marque est requise");
      return;
    }
    setSaving(true);
    const payload = {
      marque: marque.trim(),
      modele: modele.trim() || null,
      immatriculation: immatriculation.trim() || null,
      dimension_pneus: dimensionPneus.trim() || null,
      kilometrage: kilometrage.trim() ? Number(kilometrage) : null,
    };
    if (vehicule) {
      const { error } = await db.from("vehicules").update(payload).eq("id", vehicule.id);
      setSaving(false);
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success("Véhicule mis à jour");
    } else {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { error } = await db.from("vehicules").insert({
        ...payload,
        client_id: clientId,
        user_id: user?.id,
      });
      setSaving(false);
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success("Véhicule ajouté");
    }
    qc.invalidateQueries({ queryKey: ["vehicules"] });
    onOpenChange(false);
  }

  async function handleDelete() {
    if (!vehicule) return;
    setDeleting(true);
    const { error } = await db.from("vehicules").delete().eq("id", vehicule.id);
    setDeleting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    qc.invalidateQueries({ queryKey: ["vehicules"] });
    toast.success("Véhicule supprimé");
    onOpenChange(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (v) resetFields();
      }}
    >
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{vehicule ? "Modifier le véhicule" : "Ajouter un véhicule"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Marque *
            </Label>
            <Input value={marque} onChange={(e) => setMarque(e.target.value)} className="h-11" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Modèle
            </Label>
            <Input value={modele} onChange={(e) => setModele(e.target.value)} className="h-11" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Immatriculation
            </Label>
            <Input
              value={immatriculation}
              onChange={(e) => setImmatriculation(e.target.value)}
              className="h-11"
              placeholder="AA-123-AA"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Dimension des pneus
            </Label>
            <Input
              value={dimensionPneus}
              onChange={(e) => setDimensionPneus(e.target.value)}
              className="h-11"
              placeholder="205/55 R16"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Kilométrage
            </Label>
            <Input
              type="number"
              min="0"
              value={kilometrage}
              onChange={(e) => setKilometrage(e.target.value)}
              className="h-11"
            />
          </div>
          <div className="flex gap-2 pt-2">
            {vehicule && (
              <Button
                type="button"
                variant="outline"
                className="min-h-11 text-destructive hover:text-destructive"
                onClick={handleDelete}
                disabled={deleting || saving}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
            <Button type="button" className="min-h-11 flex-1" onClick={handleSave} disabled={saving}>
              {saving ? "Enregistrement…" : "Enregistrer"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ContactRow({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof MapPin;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-3 p-4">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </div>
        <div className="mt-1 text-sm">{children}</div>
      </div>
    </div>
  );
}

function ClientDetailLoading() {
  return (
    <PageContainer>
      <Skeleton className="h-5 w-32" />
      <div className="space-y-3">
        <Skeleton className="h-8 w-72 max-w-full" />
        <Skeleton className="h-5 w-24" />
      </div>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-6">
          <div className="grid gap-3 sm:grid-cols-2">
            <Skeleton className="h-24 rounded-2xl" />
            <Skeleton className="h-24 rounded-2xl" />
          </div>
          <Skeleton className="h-64 rounded-2xl" />
        </div>
        <Skeleton className="h-72 rounded-2xl" />
      </div>
    </PageContainer>
  );
}
