import { createFileRoute, Link } from "@tanstack/react-router";
import { APP_NAME } from "@/lib/brand";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useVehicules } from "@/lib/queries";
import { Car, Search } from "lucide-react";
import { useDebouncedValue } from "@/lib/utils";
import { PermissionGate } from "@/components/permission-gate";
import { PageContainer, PageHeader } from "@/components/page-layout";

export const Route = createFileRoute("/_app/vehicules/")({
  head: () => ({ meta: [{ title: `Véhicules — ${APP_NAME}` }] }),
  component: () => (
    <PermissionGate perm="vehicules">
      <VehiculesList />
    </PermissionGate>
  ),
});

function VehiculesList() {
  const [q, setQ] = useState("");
  const debouncedQ = useDebouncedValue(q, 300);
  const { data: vehicules = [], isLoading } = useVehicules();

  const term = debouncedQ.trim().toLowerCase();
  const filtered = term
    ? vehicules.filter((v) =>
        [v.marque, v.modele, v.immatriculation, v.dimension_pneus, v.client?.raison_sociale]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(term),
      )
    : vehicules;

  return (
    <PageContainer>
      <PageHeader
        title="Véhicules"
        subtitle="Tous les véhicules enregistrés, tous clients confondus."
      />

      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Marque, modèle, immatriculation, client…"
              className="h-11 pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center px-6 py-12 text-center">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary">
              <Car className="h-5 w-5" />
            </span>
            <h2 className="mt-4 font-semibold">
              {term ? "Aucun résultat" : "Aucun véhicule pour le moment"}
            </h2>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">
              Les véhicules s'ajoutent depuis la fiche de chaque client.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((v) => (
            <Link key={v.id} to="/clients/$id" params={{ id: v.client_id ?? "" }} className="block">
              <Card className="hover:border-primary/30">
                <CardContent className="flex items-center gap-3 p-4">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                    <Car className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">
                      {v.marque} {v.modele}
                    </div>
                    <div className="mt-0.5 truncate text-xs text-muted-foreground">
                      {v.client?.raison_sociale ?? "Sans client"}
                    </div>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      {[v.immatriculation, v.dimension_pneus].filter(Boolean).join(" · ") || "—"}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </PageContainer>
  );
}
