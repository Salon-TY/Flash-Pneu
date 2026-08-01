import { createFileRoute } from "@tanstack/react-router";
import { APP_NAME } from "@/lib/brand";
import { useMemo } from "react";
import { useMonthlyStats, useInterventions, useStockProducts } from "@/lib/queries";
import { formatEUR, statutInterventionLabel, TYPES_PRESTATION } from "@/lib/schemas";
import { Card, CardContent } from "@/components/ui/card";
import { BarChart3, Euro, TrendingDown, TrendingUp, Minus } from "lucide-react";
import { PermissionGate } from "@/components/permission-gate";
import { PageContainer, PageHeader } from "@/components/page-layout";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_app/analytique")({
  head: () => ({ meta: [{ title: `Analytique — ${APP_NAME}` }] }),
  component: () => (
    <PermissionGate perm="analytique">
      <AnalytiquePage />
    </PermissionGate>
  ),
});

function typePrestationLabel(v: string) {
  return TYPES_PRESTATION.find((t) => t.value === v)?.label ?? v;
}

function AnalytiquePage() {
  const { data: monthly, isLoading: monthlyLoading } = useMonthlyStats();
  const { data: interventionsData, isLoading: intLoading } = useInterventions({ pageSize: 500, page: 0 });
  const { data: stockProducts = [], isLoading: stockLoading } = useStockProducts();

  const interventions = ((interventionsData as any)?.rows ?? []) as any[];

  const parStatut = useMemo(() => {
    const counts = new Map<string, number>();
    for (const i of interventions) counts.set(i.statut, (counts.get(i.statut) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [interventions]);

  const parPrestation = useMemo(() => {
    const totals = new Map<string, { count: number; ca: number }>();
    for (const i of interventions) {
      const prev = totals.get(i.type_prestation) ?? { count: 0, ca: 0 };
      totals.set(i.type_prestation, {
        count: prev.count + 1,
        ca: prev.ca + Number(i.montant_total ?? 0),
      });
    }
    return [...totals.entries()].sort((a, b) => b[1].ca - a[1].ca);
  }, [interventions]);

  const valeurStock = useMemo(
    () => stockProducts.reduce((s, p) => s + p.prix_achat_ht * p.quantite, 0),
    [stockProducts],
  );

  const caEvo = monthly?.caEvolution;
  const caTrend = caEvo == null ? "flat" : caEvo > 0 ? "up" : caEvo < 0 ? "down" : "flat";
  const TrendIcon = caTrend === "up" ? TrendingUp : caTrend === "down" ? TrendingDown : Minus;

  return (
    <PageContainer>
      <PageHeader
        title="Analytique"
        subtitle="Répartition de l'activité et valorisation du stock."
      />

      {monthlyLoading ? (
        <Skeleton className="h-24 rounded-2xl" />
      ) : (
        <Card>
          <CardContent className="flex items-center gap-4 p-4 sm:p-6">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
              <Euro className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">CA du mois</div>
              <div className="text-2xl font-bold tabular-nums">{formatEUR(monthly?.caMonth)}</div>
              {caEvo != null && (
                <div
                  className={
                    caTrend === "up"
                      ? "flex items-center gap-1 text-xs text-success"
                      : caTrend === "down"
                        ? "flex items-center gap-1 text-xs text-destructive"
                        : "flex items-center gap-1 text-xs text-muted-foreground"
                  }
                >
                  <TrendIcon className="h-3 w-3" />
                  {caEvo > 0 ? "+" : ""}
                  {caEvo.toFixed(1)}% vs mois dernier
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardContent className="space-y-3 p-4 sm:p-6">
            <h2 className="flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              <BarChart3 className="h-4 w-4 text-accent" /> CA par prestation
            </h2>
            {intLoading ? (
              <Skeleton className="h-32 rounded-xl" />
            ) : parPrestation.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune intervention facturée.</p>
            ) : (
              <div className="space-y-2">
                {parPrestation.map(([type, v]) => (
                  <div key={type} className="flex items-center justify-between text-sm">
                    <span>
                      {typePrestationLabel(type)}{" "}
                      <span className="text-muted-foreground">({v.count})</span>
                    </span>
                    <span className="font-semibold tabular-nums">{formatEUR(v.ca)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-3 p-4 sm:p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Interventions par statut
            </h2>
            {intLoading ? (
              <Skeleton className="h-32 rounded-xl" />
            ) : parStatut.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune intervention.</p>
            ) : (
              <div className="space-y-2">
                {parStatut.map(([statut, count]) => (
                  <div key={statut} className="flex items-center justify-between text-sm">
                    <span>{statutInterventionLabel(statut)}</span>
                    <span className="font-semibold tabular-nums">{count}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-4 sm:p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Valeur du stock (coût d'achat)
          </h2>
          {stockLoading ? (
            <Skeleton className="mt-2 h-8 w-40" />
          ) : (
            <div className="mt-2 text-2xl font-bold tabular-nums">{formatEUR(valeurStock)}</div>
          )}
          <p className="mt-1 text-xs text-muted-foreground">
            Somme des quantités en stock × prix d'achat HT, tous emplacements confondus.
          </p>
        </CardContent>
      </Card>
    </PageContainer>
  );
}
