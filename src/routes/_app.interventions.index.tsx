import { createFileRoute, Link } from "@tanstack/react-router";
import { APP_NAME } from "@/lib/brand";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useInterventions, useAssignableMembers, resolveTechnicianName, type Intervention } from "@/lib/queries";
import {
  STATUTS_INTERVENTION,
  TYPES_PRESTATION,
  statutInterventionLabel,
  statutInterventionColor,
  formatEUR,
  formatDateFR,
} from "@/lib/schemas";
import { ChevronRight, MapPin, Plus, Wrench, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { PermissionGate } from "@/components/permission-gate";
import { Pager } from "@/components/pager";
import { PageContainer, PageHeader } from "@/components/page-layout";

const PAGE_SIZE = 50;

export const Route = createFileRoute("/_app/interventions/")({
  head: () => ({ meta: [{ title: `Interventions — ${APP_NAME}` }] }),
  component: () => (
    <PermissionGate perm="interventions">
      <InterventionsList />
    </PermissionGate>
  ),
});

function typePrestationLabel(v: string) {
  return TYPES_PRESTATION.find((t) => t.value === v)?.label ?? v;
}

function InterventionsList() {
  const [statutFilter, setStatutFilter] = useState("all");
  const [technicienFilter, setTechnicienFilter] = useState("all");
  const [page, setPage] = useState(0);

  const { data: members = [] } = useAssignableMembers();
  const { data, isLoading, isError } = useInterventions({
    statut: statutFilter !== "all" ? statutFilter : undefined,
    technicien_id: technicienFilter !== "all" ? technicienFilter : undefined,
    page,
    pageSize: PAGE_SIZE,
  });
  const result = data as { rows: Intervention[]; total: number } | undefined;
  const interventions = result?.rows ?? [];
  const total = result?.total ?? 0;

  function changeStatut(v: string) {
    setStatutFilter(v);
    setPage(0);
  }
  function changeTechnicien(v: string) {
    setTechnicienFilter(v);
    setPage(0);
  }

  return (
    <PageContainer>
      <PageHeader
        title="Interventions"
        subtitle="Montages, dépannages et réparations planifiés ou en cours."
        actions={
          <Button asChild className="w-full sm:w-auto">
            <Link to="/interventions/new">
              <Plus className="h-4 w-4" />
              Nouvelle intervention
            </Link>
          </Button>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex flex-wrap gap-2">
          <FilterChip active={statutFilter === "all"} onClick={() => changeStatut("all")}>
            Tous
          </FilterChip>
          {STATUTS_INTERVENTION.map((s) => (
            <FilterChip key={s.value} active={statutFilter === s.value} onClick={() => changeStatut(s.value)}>
              {s.label}
            </FilterChip>
          ))}
        </div>
        <Select value={technicienFilter} onValueChange={changeTechnicien}>
          <SelectTrigger className="h-10 w-full sm:ml-auto sm:w-48">
            <SelectValue placeholder="Technicien" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les techniciens</SelectItem>
            {members.map((m) => (
              <SelectItem key={m.user_id} value={m.user_id}>
                {m.display_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <InterventionsLoading />
      ) : isError ? (
        <StateCard
          title="Impossible de charger les interventions"
          description="Une erreur est survenue pendant le chargement. Réessayez dans quelques instants."
        />
      ) : interventions.length === 0 ? (
        <StateCard
          title="Aucune intervention"
          description="Créez votre première intervention pour commencer à organiser le planning."
          action={
            <Button asChild>
              <Link to="/interventions/new">
                <Plus className="h-4 w-4" />
                Nouvelle intervention
              </Link>
            </Button>
          }
        />
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold tabular-nums text-foreground">{total}</span> intervention
            {total > 1 ? "s" : ""}
          </p>

          <div className="hidden lg:block">
            <InterventionsTable interventions={interventions} members={members} />
          </div>

          <div className="grid gap-3 lg:hidden">
            {interventions.map((inv) => (
              <InterventionMobileCard key={inv.id} inv={inv} members={members} />
            ))}
          </div>

          <Pager page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />
        </div>
      )}
    </PageContainer>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

function InterventionsTable({
  interventions,
  members,
}: {
  interventions: Intervention[];
  members: ReturnType<typeof useAssignableMembers>["data"];
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead>Date</TableHead>
          <TableHead>Client</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Technicien</TableHead>
          <TableHead>Statut</TableHead>
          <TableHead className="text-right">Montant</TableHead>
          <TableHead className="w-12">
            <span className="sr-only">Ouvrir</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {interventions.map((inv) => (
          <TableRow key={inv.id} className="group">
            <TableCell className="whitespace-nowrap">
              <div className="text-sm font-medium">{formatDateFR(inv.date)}</div>
              {inv.heure_prevue && <div className="text-xs text-muted-foreground">{inv.heure_prevue}</div>}
            </TableCell>
            <TableCell className="max-w-56">
              <Link to="/interventions/$id" params={{ id: inv.id }} className="group-hover:text-primary">
                <span className="truncate font-medium">{inv.client?.raison_sociale ?? "—"}</span>
              </Link>
              {inv.adresse && (
                <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3 shrink-0" />
                  <span className="truncate">{inv.adresse}</span>
                </div>
              )}
            </TableCell>
            <TableCell className="text-sm">
              {typePrestationLabel(inv.type_prestation)}
              {inv.urgence && (
                <span className="ml-1.5 inline-flex items-center gap-1 text-[10px] font-semibold uppercase text-destructive">
                  <AlertTriangle className="h-3 w-3" /> Urgent
                </span>
              )}
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">
              {resolveTechnicianName(members, inv.technicien_id) ?? "Non affecté"}
            </TableCell>
            <TableCell>
              <span
                className={cn(
                  "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase",
                  statutInterventionColor(inv.statut),
                )}
              >
                {statutInterventionLabel(inv.statut)}
              </span>
            </TableCell>
            <TableCell className="text-right text-sm font-medium tabular-nums">
              {inv.montant_total != null ? formatEUR(inv.montant_total) : "—"}
            </TableCell>
            <TableCell>
              <Button asChild variant="ghost" size="icon" aria-label="Ouvrir">
                <Link to="/interventions/$id" params={{ id: inv.id }}>
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function InterventionMobileCard({
  inv,
  members,
}: {
  inv: Intervention;
  members: ReturnType<typeof useAssignableMembers>["data"];
}) {
  return (
    <Link to="/interventions/$id" params={{ id: inv.id }} className="block">
      <Card className="hover:border-primary/30">
        <CardContent className="space-y-2 p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="truncate font-semibold">{inv.client?.raison_sociale ?? "—"}</div>
              <div className="text-xs text-muted-foreground">
                {formatDateFR(inv.date)}
                {inv.heure_prevue ? ` · ${inv.heure_prevue}` : ""} · {typePrestationLabel(inv.type_prestation)}
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
          </div>
          {inv.adresse && (
            <div className="flex items-start gap-1.5 text-xs text-muted-foreground">
              <MapPin className="mt-0.5 h-3 w-3 shrink-0" />
              <span className="line-clamp-1">{inv.adresse}</span>
            </div>
          )}
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">
              {resolveTechnicianName(members, inv.technicien_id) ?? "Non affecté"}
            </span>
            {inv.montant_total != null && (
              <span className="font-semibold tabular-nums">{formatEUR(inv.montant_total)}</span>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function InterventionsLoading() {
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {Array.from({ length: 4 }).map((_, index) => (
        <Card key={index}>
          <CardContent className="space-y-3 p-4">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-6 w-24" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function StateCard({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <Card className="hover:translate-y-0 hover:shadow-soft">
      <CardContent className="flex flex-col items-center px-6 py-12 text-center">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary">
          <Wrench className="h-5 w-5" />
        </span>
        <h2 className="mt-4 font-semibold">{title}</h2>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">{description}</p>
        {action && <div className="mt-6">{action}</div>}
      </CardContent>
    </Card>
  );
}
