import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { APP_NAME } from "@/lib/brand";
import { zodValidator } from "@tanstack/zod-adapter";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { interventionSchema, type InterventionForm, TYPES_PRESTATION } from "@/lib/schemas";
import { useClients, useVehicules, useAssignableMembers, useQuote } from "@/lib/queries";
import { db } from "@/lib/db";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";
import { PermissionGate } from "@/components/permission-gate";
import { PageContainer, PageHeader } from "@/components/page-layout";

const searchSchema = z.object({
  client_id: z.string().optional(),
  devis_id: z.string().optional(),
});

export const Route = createFileRoute("/_app/interventions/new")({
  head: () => ({ meta: [{ title: `Nouvelle intervention — ${APP_NAME}` }] }),
  validateSearch: zodValidator(searchSchema),
  component: () => (
    <PermissionGate perm="interventions">
      <NouvelleIntervention />
    </PermissionGate>
  ),
});

function NouvelleIntervention() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { client_id: prefilledClientId, devis_id: prefilledDevisId } = Route.useSearch();
  const { data: clients = [] } = useClients();
  const { data: members = [] } = useAssignableMembers();
  const { data: devis } = useQuote(prefilledDevisId);

  const today = new Date().toISOString().slice(0, 10);

  const form = useForm<InterventionForm>({
    resolver: zodResolver(interventionSchema) as any,
    defaultValues: {
      client_id: prefilledClientId ?? "",
      vehicule_id: undefined,
      technicien_id: undefined,
      devis_id: prefilledDevisId ?? undefined,
      date: today,
      heure_prevue: "",
      adresse: "",
      type_prestation: "montage",
      urgence: false,
      majoration: undefined,
      observations: "",
    },
  });

  const clientId = form.watch("client_id");
  const { data: vehicules = [] } = useVehicules(clientId || undefined);

  // Pré-remplissage depuis un devis (client + adresse du client si connue).
  useEffect(() => {
    if (!devis) return;
    if (!form.getValues("client_id")) form.setValue("client_id", devis.client_id);
  }, [devis]);

  useEffect(() => {
    if (!clientId) return;
    const c = clients.find((x) => x.id === clientId);
    if (c?.adresse_site && !form.getValues("adresse")) {
      form.setValue("adresse", c.adresse_site);
    }
  }, [clientId, clients]);

  async function onSubmit(values: InterventionForm) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Non connecté");
      return;
    }

    const { data: inv, error } = await db
      .from("interventions")
      .insert({
        user_id: user.id,
        client_id: values.client_id,
        vehicule_id: values.vehicule_id || null,
        technicien_id: values.technicien_id || null,
        devis_id: values.devis_id || null,
        date: values.date,
        heure_prevue: values.heure_prevue || null,
        adresse: values.adresse,
        type_prestation: values.type_prestation,
        urgence: values.urgence,
        majoration: values.majoration || null,
        observations: values.observations || null,
        statut: values.technicien_id ? "affectee" : "a_affecter",
      })
      .select()
      .single();

    if (error) {
      toast.error(error.message);
      return;
    }

    qc.invalidateQueries({ queryKey: ["interventions"] });
    qc.invalidateQueries({ queryKey: ["dashboard"] });
    toast.success("Intervention créée");
    navigate({ to: "/interventions/$id", params: { id: inv.id } });
  }

  return (
    <PageContainer>
      <Link
        to="/interventions"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Retour aux interventions
      </Link>

      <PageHeader title="Nouvelle intervention" subtitle="Planifier un montage, une réparation ou un dépannage." />

      <Card>
        <CardContent className="p-4 sm:p-6">
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Client *" error={(form.formState.errors as any).client_id?.message}>
                <Select
                  value={form.watch("client_id")}
                  onValueChange={(v) => {
                    form.setValue("client_id", v, { shouldValidate: true });
                    form.setValue("vehicule_id", undefined);
                  }}
                >
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Sélectionner un client…" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.raison_sociale}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field label="Véhicule">
                <Select
                  value={form.watch("vehicule_id") ?? ""}
                  onValueChange={(v) => form.setValue("vehicule_id", v || undefined)}
                  disabled={!clientId}
                >
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder={clientId ? "Aucun véhicule sélectionné" : "Choisir un client d'abord"} />
                  </SelectTrigger>
                  <SelectContent>
                    {vehicules.map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.marque} {v.modele} {v.immatriculation ? `— ${v.immatriculation}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field label="Date *" error={(form.formState.errors as any).date?.message}>
                <Input type="date" {...form.register("date")} className="h-11" />
              </Field>

              <Field label="Heure prévue">
                <Input type="time" {...form.register("heure_prevue")} className="h-11" />
              </Field>

              <div className="sm:col-span-2">
                <Field label="Adresse *" error={(form.formState.errors as any).adresse?.message}>
                  <Input {...form.register("adresse")} className="h-11" placeholder="Adresse d'intervention" />
                </Field>
              </div>

              <Field label="Type de prestation">
                <Select
                  value={form.watch("type_prestation")}
                  onValueChange={(v) => form.setValue("type_prestation", v)}
                >
                  <SelectTrigger className="h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TYPES_PRESTATION.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field label="Technicien">
                <Select
                  value={form.watch("technicien_id") ?? ""}
                  onValueChange={(v) => form.setValue("technicien_id", v || undefined)}
                >
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Non affecté" />
                  </SelectTrigger>
                  <SelectContent>
                    {members.map((m) => (
                      <SelectItem key={m.user_id} value={m.user_id}>
                        {m.display_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="urgence"
                checked={form.watch("urgence")}
                onCheckedChange={(v) => form.setValue("urgence", v === true)}
              />
              <Label htmlFor="urgence" className="cursor-pointer text-sm font-normal">
                Intervention urgente
              </Label>
            </div>

            <Button
              type="submit"
              className="min-h-11 w-full sm:w-auto sm:min-w-48"
              disabled={form.formState.isSubmitting}
            >
              {form.formState.isSubmitting ? "Création…" : "Créer l'intervention"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </PageContainer>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
