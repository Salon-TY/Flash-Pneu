import { createFileRoute, Link } from "@tanstack/react-router";
import { APP_NAME } from "@/lib/brand";
import { useIntervention, useAssignableMembers, resolveTechnicianName } from "@/lib/queries";
import {
  STATUTS_INTERVENTION,
  TYPES_PRESTATION,
  statutInterventionLabel,
  statutInterventionColor,
  formatEUR,
  formatDateFR,
} from "@/lib/schemas";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Users,
  Car,
  Check,
  FileText,
  MapPin,
  Navigation,
  Phone,
  User,
} from "lucide-react";
import { db } from "@/lib/db";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { PermissionGate } from "@/components/permission-gate";
import { PageContainer, PageHeader, PageSection } from "@/components/page-layout";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/interventions/$id")({
  head: () => ({ meta: [{ title: `Intervention — ${APP_NAME}` }] }),
  component: () => (
    <PermissionGate perm="interventions">
      <InterventionDetail />
    </PermissionGate>
  ),
});

function typePrestationLabel(v: string) {
  return TYPES_PRESTATION.find((t) => t.value === v)?.label ?? v;
}

function InterventionDetail() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const { data: inv, isLoading, isError } = useIntervention(id);
  const { data: members = [] } = useAssignableMembers();

  async function handleStatutChange(statut: string) {
    const { error } = await db.from("interventions").update({ statut }).eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    qc.invalidateQueries({ queryKey: ["intervention", id] });
    qc.invalidateQueries({ queryKey: ["interventions"] });
    toast.success("Statut mis à jour");
  }

  if (isLoading) return <InterventionDetailLoading />;

  if (isError || !inv) {
    return (
      <PageContainer>
        <Link
          to="/interventions"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour aux interventions
        </Link>
        <Card>
          <CardContent className="flex flex-col items-center px-6 py-12 text-center">
            <h1 className="mt-4 font-semibold">
              {isError ? "Impossible de charger cette intervention" : "Intervention introuvable"}
            </h1>
          </CardContent>
        </Card>
      </PageContainer>
    );
  }

  const statutIndex = STATUTS_INTERVENTION.findIndex((s) => s.value === inv.statut);
  const mapsHref = inv.adresse
    ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(inv.adresse)}`
    : null;

  return (
    <PageContainer>
      <Link
        to="/interventions"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Retour aux interventions
      </Link>

      <PageHeader
        title={inv.client?.raison_sociale ?? "Intervention"}
        subtitle={`${typePrestationLabel(inv.type_prestation)} — ${formatDateFR(inv.date)}${inv.heure_prevue ? ` à ${inv.heure_prevue}` : ""}`}
        actions={
          <Select value={inv.statut} onValueChange={handleStatutChange}>
            <SelectTrigger className="h-10 w-full sm:w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUTS_INTERVENTION.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />

      {/* Timeline simplifiée — pas d'historique horodaté en base, juste la
          position du statut courant dans le workflow. */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1">
        {STATUTS_INTERVENTION.map((s, i) => (
          <div key={s.value} className="flex shrink-0 items-center gap-1">
            <span
              className={cn(
                "flex h-7 items-center gap-1 rounded-full px-2.5 text-[10px] font-semibold uppercase",
                i <= statutIndex ? statutInterventionColor(s.value) : "bg-muted text-muted-foreground/60",
              )}
            >
              {i < statutIndex && <Check className="h-3 w-3" />}
              {s.label}
            </span>
            {i < STATUTS_INTERVENTION.length - 1 && (
              <span className="h-px w-3 shrink-0 bg-border" />
            )}
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {mapsHref && (
          <Button asChild variant="outline">
            <a href={mapsHref} target="_blank" rel="noopener noreferrer">
              <Navigation className="h-4 w-4" />
              Lancer la navigation
            </a>
          </Button>
        )}
        {inv.statut === "terminee" && (
          <Button asChild>
            <Link
              to="/factures/new"
              search={{ client_id: inv.client_id ?? undefined, adresse_site: inv.adresse ?? undefined }}
            >
              <FileText className="h-4 w-4" />
              Créer la facture
            </Link>
          </Button>
        )}
      </div>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0 space-y-6">
          <PageSection title="Pneus">
            <Card>
              <CardContent className="space-y-4 p-4 sm:p-6">
                <PneuListe titre="Prévus" items={inv.pneus_prevus} />
                <PneuListe titre="Utilisés" items={inv.pneus_utilises} />
                {(!inv.pneus_prevus || inv.pneus_prevus.length === 0) &&
                  (!inv.pneus_utilises || inv.pneus_utilises.length === 0) && (
                    <p className="text-sm text-muted-foreground">Aucun pneu renseigné.</p>
                  )}
              </CardContent>
            </Card>
          </PageSection>

          {(inv.photos_avant?.length > 0 || inv.photos_apres?.length > 0) && (
            <PageSection title="Photos">
              <div className="space-y-4">
                <PhotoGrid titre="Avant" urls={inv.photos_avant} />
                <PhotoGrid titre="Après" urls={inv.photos_apres} />
              </div>
            </PageSection>
          )}

          {inv.signature_client && (
            <PageSection title="Signature client">
              <Card>
                <CardContent className="p-4">
                  <img
                    src={inv.signature_client}
                    alt="Signature du client"
                    className="h-32 w-full max-w-sm rounded-lg border border-border bg-white object-contain"
                  />
                </CardContent>
              </Card>
            </PageSection>
          )}

          {inv.observations && (
            <PageSection title="Observations">
              <Card>
                <CardContent className="p-4 text-sm whitespace-pre-wrap">{inv.observations}</CardContent>
              </Card>
            </PageSection>
          )}
        </div>

        <aside className="space-y-6 xl:sticky xl:top-24">
          <PageSection title="Client">
            <Card>
              <CardContent className="space-y-3 p-4">
                {inv.client ? (
                  <Link
                    to="/clients/$id"
                    params={{ id: inv.client_id! }}
                    className="flex items-center gap-3 hover:text-primary"
                  >
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                      <Users className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 truncate font-medium">{inv.client.raison_sociale}</span>
                  </Link>
                ) : (
                  <p className="text-sm text-muted-foreground">Aucun client lié.</p>
                )}
                {inv.client?.telephone && (
                  <a
                    href={`tel:${inv.client.telephone}`}
                    className="flex items-center gap-2 text-sm text-primary hover:underline"
                  >
                    <Phone className="h-3.5 w-3.5 shrink-0" />
                    {inv.client.telephone}
                  </a>
                )}
                {inv.adresse && (
                  <div className="flex items-start gap-2 text-sm text-muted-foreground">
                    <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <span>{inv.adresse}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </PageSection>

          <PageSection title="Véhicule">
            <Card>
              <CardContent className="p-4">
                {inv.vehicule ? (
                  <div className="flex items-center gap-3">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                      <Car className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <div className="truncate font-medium">
                        {inv.vehicule.marque} {inv.vehicule.modele}
                      </div>
                      {inv.vehicule.immatriculation && (
                        <div className="text-xs text-muted-foreground">{inv.vehicule.immatriculation}</div>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Aucun véhicule lié.</p>
                )}
              </CardContent>
            </Card>
          </PageSection>

          <PageSection title="Technicien">
            <Card>
              <CardContent className="flex items-center gap-3 p-4">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                  <User className="h-4 w-4" />
                </span>
                <span className="text-sm font-medium">
                  {resolveTechnicianName(members, inv.technicien_id) ?? "Non affecté"}
                </span>
              </CardContent>
            </Card>
          </PageSection>

          {inv.montant_total != null && (
            <PageSection title="Montant">
              <Card>
                <CardContent className="p-4">
                  <div className="text-2xl font-bold tabular-nums">{formatEUR(inv.montant_total)}</div>
                  {inv.majoration && (
                    <div className="mt-1 text-xs text-muted-foreground">Majoration : {inv.majoration}</div>
                  )}
                </CardContent>
              </Card>
            </PageSection>
          )}
        </aside>
      </div>
    </PageContainer>
  );
}

function PneuListe({ titre, items }: { titre: string; items: any[] }) {
  if (!items || items.length === 0) return null;
  return (
    <div>
      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {titre}
      </div>
      <ul className="space-y-1">
        {items.map((p, i) => (
          <li key={i} className="text-sm">
            {typeof p === "string" ? p : [p.marque, p.modele, p.dimension, p.quantite ? `×${p.quantite}` : ""].filter(Boolean).join(" ")}
          </li>
        ))}
      </ul>
    </div>
  );
}

function PhotoGrid({ titre, urls }: { titre: string; urls: string[] }) {
  if (!urls || urls.length === 0) return null;
  return (
    <div>
      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {titre}
      </div>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {urls.map((url, i) => (
          <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="block">
            <img
              src={url}
              alt={`${titre} ${i + 1}`}
              className="aspect-square w-full rounded-lg border border-border object-cover"
            />
          </a>
        ))}
      </div>
    </div>
  );
}

function InterventionDetailLoading() {
  return (
    <PageContainer>
      <Skeleton className="h-5 w-32" />
      <div className="space-y-3">
        <Skeleton className="h-8 w-72 max-w-full" />
        <Skeleton className="h-5 w-48" />
      </div>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <Skeleton className="h-64 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    </PageContainer>
  );
}
