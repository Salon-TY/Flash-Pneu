// Carte "mission terrain" — réutilisée par tech.index.tsx (Ma journée) et
// tech.interventions.index.tsx (Missions), pour éviter de dupliquer la
// logique d'avancement de statut et les actions Navigation/Appeler.
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, Navigation, Phone } from "lucide-react";
import { statutInterventionColor, statutInterventionLabel, TYPES_PRESTATION } from "@/lib/schemas";
import type { Intervention } from "@/lib/queries";
import { cn } from "@/lib/utils";

export const NEXT_STATUT: Record<string, { next: string; label: string } | undefined> = {
  affectee: { next: "en_route", label: "Démarrer" },
  en_route: { next: "sur_place", label: "Arrivé sur place" },
  sur_place: { next: "en_cours", label: "Commencer l'intervention" },
};

function typePrestationLabel(v: string) {
  return TYPES_PRESTATION.find((t) => t.value === v)?.label ?? v;
}

export function MissionCard({
  inv,
  onAvancer,
}: {
  inv: Intervention;
  onAvancer: (id: string, next: string) => void;
}) {
  const mapsHref = inv.adresse
    ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(inv.adresse)}`
    : null;
  const action = NEXT_STATUT[inv.statut];

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="text-sm font-semibold">{inv.heure_prevue || "Heure libre"}</div>
            <div className="truncate text-base font-medium">{inv.client?.raison_sociale ?? "—"}</div>
            <div className="text-xs text-muted-foreground">{typePrestationLabel(inv.type_prestation)}</div>
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

        {inv.adresse && (
          <div className="flex items-start gap-1.5 text-xs text-muted-foreground">
            <MapPin className="mt-0.5 h-3 w-3 shrink-0" />
            <span>{inv.adresse}</span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          {mapsHref && (
            <Button asChild variant="outline" size="sm" className="min-h-11">
              <a href={mapsHref} target="_blank" rel="noopener noreferrer">
                <Navigation className="h-4 w-4" /> Navigation
              </a>
            </Button>
          )}
          {inv.client?.telephone && (
            <Button asChild variant="outline" size="sm" className="min-h-11">
              <a href={`tel:${inv.client.telephone}`}>
                <Phone className="h-4 w-4" /> Appeler
              </a>
            </Button>
          )}
        </div>

        {action ? (
          <Button size="sm" className="min-h-11 w-full" onClick={() => onAvancer(inv.id, action.next)}>
            {action.label}
          </Button>
        ) : inv.statut === "en_cours" ? (
          <Button asChild size="sm" className="min-h-11 w-full">
            <Link to="/tech/interventions/$id" params={{ id: inv.id }}>
              Terminer l'intervention
            </Link>
          </Button>
        ) : (
          <Button asChild size="sm" variant="outline" className="min-h-11 w-full">
            <Link to="/tech/interventions/$id" params={{ id: inv.id }}>
              Voir le détail
            </Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
