import { createFileRoute, Link } from "@tanstack/react-router";
import { APP_NAME } from "@/lib/brand";
import {
  useDashboardStats,
  useSettings,
  useRelances,
  useMyAccess,
  usePendingStockRequestsCount,
  useDevisEnAttente,
  useInterventionsJour,
  useInterventionsCountByStatut,
  useAssignableMembers,
  resolveTechnicianName,
} from "@/lib/queries";
import { formatEUR, statutInterventionColor, statutInterventionLabel, TYPES_PRESTATION } from "@/lib/schemas";
import {
  Plus,
  UserPlus,
  FileCheck,
  AlertTriangle,
  Package,
  Bell,
  PackagePlus,
  Wrench,
  ClipboardList,
  MapPin,
} from "lucide-react";
import { useMemo } from "react";
import { PermissionGate } from "@/components/permission-gate";
import { PageContainer, PageHeader, PageSection } from "@/components/page-layout";
import { DashboardHero } from "@/components/dashboard-hero";
import { StatCard } from "@/components/stat-card";
import { AlertCard } from "@/components/alert-card";
import { QuickActionCard } from "@/components/quick-action-card";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/")({
  head: () => ({ meta: [{ title: `Tableau de bord — ${APP_NAME}` }] }),
  component: () => (
    <PermissionGate perm="accueil">
      <Dashboard />
    </PermissionGate>
  ),
});

function typePrestationLabel(v: string) {
  return TYPES_PRESTATION.find((t) => t.value === v)?.label ?? v;
}

function Dashboard() {
  const { data: stats, isLoading } = useDashboardStats();
  const { data: settings } = useSettings();
  const { data: devisEnAttente = 0 } = useDevisEnAttente();
  const { data: relances = [] } = useRelances();
  const { can, loading: accessLoading } = useMyAccess();
  const { data: pendingReapproCount = 0 } = usePendingStockRequestsCount();
  const { data: interventionsJour = [], isLoading: interventionsLoading } = useInterventionsJour();
  const { data: aAffecterCount = 0 } = useInterventionsCountByStatut("a_affecter");
  const { data: members = [] } = useAssignableMembers();

  const delaiN3 = settings?.relance_delai_n3 ?? 31;
  // Factures overdue >= N3 days without a niveau 3 relance sent
  const relancesN3Set = useMemo(() => {
    const s = new Set<string>();
    for (const r of relances) if (r.niveau === 3) s.add(r.facture_id);
    return s;
  }, [relances]);
  const miseEnDemeure = useMemo(() => {
    return (stats?.overdueInvoices ?? []).filter(
      (inv: any) => inv.daysLate >= delaiN3 && !relancesN3Set.has(inv.id),
    );
  }, [stats, delaiN3, relancesN3Set]);

  const objectif = settings?.objectif_ca_mensuel ?? 3000;
  const caMonth = stats?.caMonth ?? 0;
  const caProgress = objectif > 0 ? Math.min(100, (caMonth / objectif) * 100) : 0;

  const caDiff = caMonth - (stats?.caPrevMonth ?? 0);
  const caTrend: "up" | "down" | "flat" = caDiff > 0 ? "up" : caDiff < 0 ? "down" : "flat";

  const hasAlerts =
    !isLoading &&
    !accessLoading &&
    ((can("factures") && (miseEnDemeure.length > 0 || (stats?.overdueInvoices?.length ?? 0) > 0)) ||
      (can("devis") && devisEnAttente > 0) ||
      (can("stock") && (stats?.stockAlerts?.length ?? 0) > 0) ||
      (can("reappro") && pendingReapproCount > 0));

  const todayLabel = new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());

  return (
    <PageContainer className="space-y-4 lg:space-y-6">
      <PageHeader
        title="Bonjour 👋"
        subtitle={todayLabel.charAt(0).toUpperCase() + todayLabel.slice(1)}
        className="pb-1"
      />

      {/* 1. Comment va mon entreprise ? */}
      {!accessLoading && can("tresorerie") && (
        <div className="hidden lg:block">
          <DashboardHero
            label="CA du mois"
            value={isLoading ? "…" : formatEUR(caMonth)}
            href="/tresorerie"
            trend={
              !isLoading && stats?.caPrevMonth !== undefined
                ? { direction: caTrend, label: `vs mois dernier : ${formatEUR(stats.caPrevMonth)}` }
                : undefined
            }
            objectiveLabel={
              !isLoading && objectif > 0
                ? `${Math.round(caProgress)}% — ${formatEUR(objectif)}`
                : undefined
            }
            objectiveProgress={!isLoading && objectif > 0 ? caProgress : undefined}
          />
        </div>
      )}

      {/* 2. Vue d'ensemble */}
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4 lg:gap-4">
        {!accessLoading && can("interventions") && (
          <StatCard
            icon={Wrench}
            label="Interventions aujourd'hui"
            value={interventionsLoading ? "…" : interventionsJour.length}
            href="/interventions"
          />
        )}
        {!accessLoading && can("interventions") && (
          <StatCard
            icon={ClipboardList}
            label="À affecter"
            value={aAffecterCount}
            href="/interventions"
          />
        )}
        {!accessLoading && can("devis") && (
          <StatCard
            icon={FileCheck}
            label="Devis en attente"
            value={devisEnAttente}
            href="/devis"
          />
        )}
        {!accessLoading && can("stock") && (
          <StatCard
            icon={Package}
            label="Alertes stock"
            value={isLoading ? "…" : (stats?.stockAlerts?.length ?? 0)}
            href="/stock"
          />
        )}
      </div>

      {!accessLoading && can("interventions") && interventionsJour.length > 0 && (
        <PageSection title="Interventions du jour">
          <div className="space-y-2">
            {interventionsJour.map((inv) => (
              <Link key={inv.id} to="/interventions/$id" params={{ id: inv.id }} className="block">
                <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 transition-colors hover:border-primary/40">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary text-xs font-semibold tabular-nums">
                    {inv.heure_prevue || "—"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{inv.client?.raison_sociale ?? "—"}</div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <span>{typePrestationLabel(inv.type_prestation)}</span>
                      <span className="opacity-50">·</span>
                      <span>{resolveTechnicianName(members, inv.technicien_id) ?? "Non affecté"}</span>
                    </div>
                    {inv.adresse && (
                      <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3 shrink-0" />
                        <span className="truncate">{inv.adresse}</span>
                      </div>
                    )}
                  </div>
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase",
                      statutInterventionColor(inv.statut),
                    )}
                  >
                    {statutInterventionLabel(inv.statut)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </PageSection>
      )}

      <PageSection title="Actions rapides">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          {!accessLoading && can("interventions") && (
            <QuickActionCard
              icon={Wrench}
              label="Nouvelle intervention"
              description="Planifier une mission"
              href="/interventions/new"
            />
          )}
          {!accessLoading && can("devis") && (
            <QuickActionCard
              icon={Plus}
              label="Nouveau devis"
              description="Créer un devis"
              href="/devis/new"
            />
          )}
          {!accessLoading && can("clients") && (
            <QuickActionCard
              icon={UserPlus}
              label="Nouveau client"
              description="Ajouter une fiche"
              href="/clients/new"
            />
          )}
        </div>
      </PageSection>

      {/* 3. Y a-t-il un problème ? */}
      {hasAlerts && (
        <PageSection title="Alertes">
          <div className="space-y-3">
            {!isLoading && !accessLoading && can("factures") && miseEnDemeure.length > 0 && (
              <AlertCard icon={Bell} tone="destructive">
                <span className="font-semibold text-destructive">
                  {miseEnDemeure.length} facture{miseEnDemeure.length > 1 ? "s" : ""} nécessite
                  {miseEnDemeure.length > 1 ? "nt" : ""} une mise en demeure
                </span>
                <p className="mt-2 text-xs text-destructive/80">
                  Plus de {delaiN3} jours de retard sans relance niveau 3.
                </p>
                <ul className="mt-2 space-y-2">
                  {miseEnDemeure.map((inv: any) => (
                    <li key={inv.id} className="flex items-center justify-between gap-2">
                      <span className="truncate text-xs text-destructive/80">
                        {(inv.client as any)?.raison_sociale ?? "—"} — {formatEUR(inv.total_ttc)} (
                        {inv.daysLate}j)
                      </span>
                      <Link
                        to="/factures/$id"
                        params={{ id: inv.id }}
                        className="shrink-0 text-[10px] font-semibold text-destructive underline"
                      >
                        Envoyer maintenant
                      </Link>
                    </li>
                  ))}
                </ul>
              </AlertCard>
            )}

            {!isLoading &&
              !accessLoading &&
              can("factures") &&
              (stats?.overdueInvoices?.length ?? 0) > 0 && (
                <AlertCard icon={AlertTriangle} tone="destructive">
                  <span className="font-semibold text-destructive">
                    {stats!.overdueInvoices.length} facture
                    {stats!.overdueInvoices.length > 1 ? "s" : ""} en retard depuis plus de 7 jours
                  </span>
                  <p className="mt-2 text-xs text-destructive/80">
                    {stats!.overdueInvoices.length} affichée
                    {stats!.overdueInvoices.length > 1 ? "s" : ""} sur {stats?.unpaidCount ?? 0}{" "}
                    facture{(stats?.unpaidCount ?? 0) > 1 ? "s" : ""} impayée
                    {(stats?.unpaidCount ?? 0) > 1 ? "s" : ""} au total
                  </p>
                  <ul className="mt-2 space-y-2">
                    {stats!.overdueInvoices.map((inv: any) => (
                      <li key={inv.id} className="flex items-center justify-between gap-2">
                        <span className="truncate text-xs text-destructive/80">
                          {(inv.client as any)?.raison_sociale ?? "—"} — {formatEUR(inv.total_ttc)}{" "}
                          ({inv.daysLate}j de retard)
                        </span>
                        <Link
                          to="/factures/$id"
                          params={{ id: inv.id }}
                          className="shrink-0 text-[10px] font-medium text-destructive underline"
                        >
                          Voir
                        </Link>
                      </li>
                    ))}
                  </ul>
                </AlertCard>
              )}

            {/* Devis en attente — conditionné à > 0 comme les autres alertes,
            plutôt qu'un vrai KPI permanent. */}
            {!accessLoading && can("devis") && devisEnAttente > 0 && (
              <AlertCard icon={FileCheck} tone="warning" href="/devis">
                <span className="font-semibold">{devisEnAttente} devis en attente</span>
              </AlertCard>
            )}

            {!isLoading &&
              !accessLoading &&
              can("stock") &&
              (stats?.stockAlerts?.length ?? 0) > 0 && (
                <AlertCard icon={Package} tone="destructive" href="/stock">
                  <span className="font-semibold text-destructive">
                    {stats!.stockAlerts.length} emplacement
                    {stats!.stockAlerts.length > 1 ? "s" : ""} en stock bas
                  </span>
                  <ul className="mt-2 space-y-1">
                    {stats!.stockAlerts.map((a: any) => (
                      <li
                        key={`${a.product_id}-${a.technicien_id ?? "garage"}`}
                        className="text-xs text-destructive/80"
                      >
                        {a.label}
                      </li>
                    ))}
                  </ul>
                </AlertCard>
              )}

            {!isLoading && !accessLoading && can("reappro") && pendingReapproCount > 0 && (
              <AlertCard icon={PackagePlus} tone="warning" href="/reappro">
                <span className="font-semibold">
                  {pendingReapproCount} demande{pendingReapproCount > 1 ? "s" : ""} de réappro en
                  attente
                </span>
              </AlertCard>
            )}
          </div>
        </PageSection>
      )}
    </PageContainer>
  );
}
