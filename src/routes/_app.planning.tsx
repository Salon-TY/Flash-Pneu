import { createFileRoute, Link } from "@tanstack/react-router";
import { APP_NAME } from "@/lib/brand";
import { useInterventions, useAssignableMembers, resolveTechnicianName } from "@/lib/queries";
import { statutInterventionColor, statutInterventionLabel, TYPES_PRESTATION } from "@/lib/schemas";
import { Card, CardContent } from "@/components/ui/card";
import { CalendarDays } from "lucide-react";
import { PermissionGate } from "@/components/permission-gate";
import { PageContainer, PageHeader } from "@/components/page-layout";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/planning")({
  head: () => ({ meta: [{ title: `Planning — ${APP_NAME}` }] }),
  component: () => (
    <PermissionGate perm="planning">
      <PlanningPage />
    </PermissionGate>
  ),
});

function typePrestationLabel(v: string) {
  return TYPES_PRESTATION.find((t) => t.value === v)?.label ?? v;
}

function localDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function PlanningPage() {
  const today = new Date();
  const jours = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    return d;
  });
  const dateDebut = localDateStr(jours[0]);
  const dateFin = localDateStr(jours[jours.length - 1]);

  const { data, isLoading } = useInterventions({ date_debut: dateDebut, date_fin: dateFin, pageSize: 500, page: 0 });
  const { data: members = [] } = useAssignableMembers();
  const interventions = (data as any)?.rows ?? [];

  return (
    <PageContainer>
      <PageHeader title="Planning" subtitle="Les 7 prochains jours d'interventions." />

      {isLoading ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">Chargement…</CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {jours.map((jour) => {
            const iso = localDateStr(jour);
            const duJour = interventions
              .filter((i: any) => i.date === iso)
              .sort((a: any, b: any) => (a.heure_prevue ?? "").localeCompare(b.heure_prevue ?? ""));
            const label = jour.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
            return (
              <div key={iso}>
                <h2 className="mb-2 text-sm font-semibold capitalize text-muted-foreground">{label}</h2>
                {duJour.length === 0 ? (
                  <Card>
                    <CardContent className="py-4 text-center text-xs text-muted-foreground">
                      Aucune intervention planifiée.
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-2">
                    {duJour.map((inv: any) => (
                      <Link key={inv.id} to="/interventions/$id" params={{ id: inv.id }} className="block">
                        <Card className="hover:border-primary/30">
                          <CardContent className="flex items-center gap-3 p-3">
                            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary text-xs font-semibold tabular-nums">
                              {inv.heure_prevue || "—"}
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="truncate text-sm font-medium">{inv.client?.raison_sociale ?? "—"}</div>
                              <div className="text-xs text-muted-foreground">
                                {typePrestationLabel(inv.type_prestation)} ·{" "}
                                {resolveTechnicianName(members, inv.technicien_id) ?? "Non affecté"}
                              </div>
                            </div>
                            <span
                              className={cn(
                                "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase",
                                statutInterventionColor(inv.statut),
                              )}
                            >
                              {statutInterventionLabel(inv.statut)}
                            </span>
                          </CardContent>
                        </Card>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {!isLoading && interventions.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center px-6 py-12 text-center">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary">
              <CalendarDays className="h-5 w-5" />
            </span>
            <h2 className="mt-4 font-semibold">Aucune intervention planifiée</h2>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">
              Créez des interventions pour les voir apparaître dans le planning.
            </p>
          </CardContent>
        </Card>
      )}
    </PageContainer>
  );
}
