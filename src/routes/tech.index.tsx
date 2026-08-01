import { createFileRoute, Link } from "@tanstack/react-router";
import { APP_NAME, TECH_TAGLINE } from "@/lib/brand";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { db } from "@/lib/db";
import { useMyVanStock, useSettings, useMesInterventions } from "@/lib/queries";
import { Card, CardContent } from "@/components/ui/card";
import { Package, ClipboardList } from "lucide-react";
import { toast } from "sonner";
import { MissionCard } from "@/components/mission-card";

export const Route = createFileRoute("/tech/")({
  head: () => ({ meta: [{ title: `Ma journée — ${APP_NAME}` }] }),
  component: TechToday,
});

// Nom affiché dans le message d'accueil : la propre fiche équipe du
// technicien connecté (display_name ou identifiant), sans dépendre de la
// vue "équipe" (owner-only) ni du poste bureau.
function useMyDisplayName() {
  return useQuery({
    queryKey: ["tech_my_display_name"],
    queryFn: async (): Promise<string | null> => {
      const {
        data: { user },
      } = await db.auth.getUser();
      if (!user) return null;
      const { data } = await db
        .from("team_members")
        .select("display_name, username")
        .eq("user_id", user.id)
        .maybeSingle();
      return data?.display_name || data?.username || null;
    },
  });
}

function TechToday() {
  const { data: vanLevels = [], isLoading } = useMyVanStock();
  const { data: settings } = useSettings();
  const { data: myName } = useMyDisplayName();
  const { data: missions = [], isLoading: missionsLoading } = useMesInterventions();
  const qc = useQueryClient();
  const lowStock = vanLevels.filter((l) => l.product && l.quantite <= l.product.seuil_alerte);

  async function avancerStatut(id: string, next: string) {
    const { error } = await db.from("interventions").update({ statut: next }).eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    qc.invalidateQueries({ queryKey: ["mes_interventions"] });
    qc.invalidateQueries({ queryKey: ["interventions"] });
  }

  const displayName = myName ?? settings?.nom ?? null;
  const todayLabel = new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border bg-card p-4 shadow-sm sm:p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
          {TECH_TAGLINE}
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
          {displayName ? `Bonjour ${displayName} 👋` : "Bonjour 👋"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {todayLabel.charAt(0).toUpperCase() + todayLabel.slice(1)}
        </p>
      </div>

      {lowStock.length > 0 && (
        <Link to="/tech/camion" className="block">
          <Card className="border-destructive/35 bg-destructive/5 hover:border-destructive/55 transition-colors">
            <CardContent className="p-3 flex items-start gap-2">
              <Package className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
              <div className="min-w-0 text-sm">
                <span className="font-semibold text-destructive">
                  {lowStock.length} produit{lowStock.length > 1 ? "s" : ""} bas sur mon camion
                </span>
                <ul className="mt-1 space-y-0.5">
                  {lowStock.map((l) => (
                    <li key={l.id} className="break-words text-xs text-destructive/85">
                      {l.product?.nom} — {l.quantite} {l.product?.unite}
                    </li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>
        </Link>
      )}

      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Mon stock
        </h2>
        <Link to="/tech/camion" className="block">
          <Card className="hover:border-primary/40 transition-colors">
            <CardContent className="flex items-center gap-3 p-4">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                <Package className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold">
                  {isLoading ? "…" : vanLevels.length} produit{vanLevels.length > 1 ? "s" : ""} sur
                  mon camion
                </div>
                <div className="text-xs text-muted-foreground">
                  {lowStock.length > 0
                    ? `${lowStock.length} sous le seuil d'alerte`
                    : "Aucune alerte de stock"}
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Mes missions du jour
        </h2>
        {missionsLoading ? (
          <Card>
            <CardContent className="space-y-3 p-4">
              <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
              <div className="h-3 w-full animate-pulse rounded bg-muted" />
            </CardContent>
          </Card>
        ) : missions.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center px-6 py-10 text-center">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-muted text-muted-foreground">
                <ClipboardList className="h-4 w-4" />
              </span>
              <p className="mt-3 text-sm font-medium">Aucune tâche assignée</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Les missions du jour apparaîtront ici une fois affectées.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {missions.map((inv) => (
              <MissionCard key={inv.id} inv={inv} onAvancer={avancerStatut} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
