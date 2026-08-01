import { createFileRoute } from "@tanstack/react-router";
import { APP_NAME } from "@/lib/brand";
import { useMesInterventions } from "@/lib/queries";
import { Card, CardContent } from "@/components/ui/card";
import { Wrench } from "lucide-react";
import { db } from "@/lib/db";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { MissionCard } from "@/components/mission-card";

export const Route = createFileRoute("/tech/interventions/")({
  head: () => ({ meta: [{ title: `Mes missions — ${APP_NAME}` }] }),
  component: MesMissions,
});

function MesMissions() {
  const { data: interventions = [], isLoading, isError } = useMesInterventions();
  const qc = useQueryClient();

  async function avancerStatut(id: string, next: string) {
    const { error } = await db.from("interventions").update({ statut: next }).eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    qc.invalidateQueries({ queryKey: ["mes_interventions"] });
    qc.invalidateQueries({ queryKey: ["interventions"] });
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border bg-card p-4 shadow-sm sm:p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Terrain</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">Mes missions</h1>
        <p className="mt-1 text-sm text-muted-foreground">Vos interventions du jour.</p>
      </div>

      {isLoading ? (
        <div className="grid gap-2 md:grid-cols-2">
          {[0, 1, 2].map((i) => (
            <Card key={i}>
              <CardContent className="space-y-3 p-4">
                <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
                <div className="h-3 w-full animate-pulse rounded bg-muted" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : isError ? (
        <Card className="border-destructive/30">
          <CardContent className="py-10 text-center text-sm text-destructive">
            Impossible de charger vos missions.
          </CardContent>
        </Card>
      ) : interventions.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center px-6 py-12 text-center">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-muted text-muted-foreground">
              <Wrench className="h-4 w-4" />
            </span>
            <p className="mt-3 text-sm font-medium">Aucune mission aujourd'hui</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {interventions.map((inv) => (
            <MissionCard key={inv.id} inv={inv} onAvancer={avancerStatut} />
          ))}
        </div>
      )}
    </div>
  );
}
