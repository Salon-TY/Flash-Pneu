/* eslint-disable @typescript-eslint/no-explicit-any -- typage historique du formulaire, logique inchangée */
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { APP_NAME } from "@/lib/brand";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  quoteSchema,
  type QuoteForm,
  formatEUR,
  GRILLE_MONTAGE,
  MAJORATIONS,
  FORFAIT_ZONE,
  PRESTATIONS_ADDITIONNELLES,
} from "@/lib/schemas";
import { useClients, usePresets, useStockProducts, useMyAccess } from "@/lib/queries";
import { db } from "@/lib/db";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Calculator, MessageCircle, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { PermissionGate } from "@/components/permission-gate";
import { PageContainer, PageHeader } from "@/components/page-layout";

export const Route = createFileRoute("/_app/devis/new")({
  head: () => ({ meta: [{ title: `Nouveau devis — ${APP_NAME}` }] }),
  component: () => (
    <PermissionGate perm="devis">
      <NewDevisPage />
    </PermissionGate>
  ),
});

function localDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function NewDevisPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: clients = [] } = useClients();
  const { data: presets = [] } = usePresets();
  const { data: stockProducts = [] } = useStockProducts();
  const { can } = useMyAccess();

  const today = localDateStr(new Date());
  const validite = localDateStr(addDays(new Date(), 30));

  const form = useForm<QuoteForm>({
    resolver: zodResolver(quoteSchema) as any,
    defaultValues: {
      client_id: "",
      date_devis: today,
      date_validite: validite,
      statut: "brouillon",
      tva_taux: 20,
      notes: "",
      lines: [{ description: "", quantite: 1, prix_unitaire_ht: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control: form.control, name: "lines" });

  const lines = form.watch("lines");
  const tvaTaux = form.watch("tva_taux");
  const totalHT = lines.reduce(
    (s, l) => s + (Number(l.quantite) || 0) * (Number(l.prix_unitaire_ht) || 0),
    0,
  );
  const tva = totalHT * (Number(tvaTaux) / 100);
  const totalTTC = totalHT + tva;

  // ─── Calculateur Flash Pneu ────────────────────────────────────────────────
  const [nbPneus, setNbPneus] = useState(4);
  const [diametre, setDiametre] = useState<number>(16);
  const [prestationsSelected, setPrestationsSelected] = useState<string[]>([]);
  const [majorationsSelected, setMajorationsSelected] = useState<string[]>([]);
  const [selectedPneuId, setSelectedPneuId] = useState("");
  const [prixVentePneu, setPrixVentePneu] = useState("");

  const prixMontage = (GRILLE_MONTAGE[diametre] ?? 0) * nbPneus;
  const pneusStock = stockProducts.filter((p) => p.dimension);
  const pneuSelectionne = pneusStock.find((p) => p.id === selectedPneuId);
  const margePneu =
    pneuSelectionne && prixVentePneu
      ? Number(prixVentePneu) - pneuSelectionne.prix_achat_ht
      : null;

  function ajouterMontage() {
    if (!prixMontage) return;
    append({
      description: `Montage ${nbPneus} pneu${nbPneus > 1 ? "s" : ""} — ${diametre}"`,
      quantite: 1,
      prix_unitaire_ht: prixMontage,
    });
  }

  function togglePrestation(id: string) {
    setPrestationsSelected((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));
  }

  function ajouterPrestations() {
    for (const p of PRESTATIONS_ADDITIONNELLES) {
      if (!prestationsSelected.includes(p.id)) continue;
      const quantite = p.id === "equilibrage" ? nbPneus : 1;
      append({ description: p.label, quantite, prix_unitaire_ht: p.prix });
    }
    setPrestationsSelected([]);
  }

  function toggleMajoration(id: string) {
    setMajorationsSelected((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));
  }

  function ajouterMajorations() {
    const base = totalHT;
    if (majorationsSelected.includes("urgence")) {
      append({ description: "Majoration urgence (+30%)", quantite: 1, prix_unitaire_ht: base * MAJORATIONS.urgence });
    }
    if (majorationsSelected.includes("nuit")) {
      append({ description: "Majoration nuit (+50%)", quantite: 1, prix_unitaire_ht: base * MAJORATIONS.nuit });
    }
    if (majorationsSelected.includes("weekend")) {
      append({ description: "Majoration week-end (+20%)", quantite: 1, prix_unitaire_ht: base * MAJORATIONS.weekend });
    }
    if (majorationsSelected.includes("zone")) {
      append({ description: "Forfait zone (hors Paris intra-muros)", quantite: 1, prix_unitaire_ht: FORFAIT_ZONE });
    }
    setMajorationsSelected([]);
  }

  function ajouterPneuStock() {
    if (!pneuSelectionne) return;
    const prixVente = prixVentePneu ? Number(prixVentePneu) : pneuSelectionne.prix_achat_ht;
    const label = [pneuSelectionne.marque, pneuSelectionne.modele, pneuSelectionne.dimension]
      .filter(Boolean)
      .join(" ") || pneuSelectionne.nom;
    append({ description: label, quantite: 1, prix_unitaire_ht: prixVente });
    setSelectedPneuId("");
    setPrixVentePneu("");
  }

  function envoyerWhatsApp() {
    const client = clients.find((c) => c.id === form.getValues("client_id"));
    const linesText = lines
      .filter((l) => l.description)
      .map((l) => `• ${l.description} — ${formatEUR((Number(l.quantite) || 0) * (Number(l.prix_unitaire_ht) || 0))}`)
      .join("\n");
    const text = `Devis Flash Pneu${client ? ` — ${client.raison_sociale}` : ""}\n\n${linesText}\n\nTotal TTC : ${formatEUR(totalTTC)}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
  }

  async function onSubmit(values: QuoteForm) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    // Generate numero DEV-YYYY-NNN
    const year = new Date().getFullYear();
    const { count } = await db
      .from("devis")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id);
    const n = (count ?? 0) + 1;
    const numero = `DEV-${year}-${String(n).padStart(3, "0")}`;

    const linesData = values.lines.map((l, i) => ({
      description: l.description,
      quantite: Number(l.quantite),
      prix_unitaire_ht: Number(l.prix_unitaire_ht),
      total_ht: Number(l.quantite) * Number(l.prix_unitaire_ht),
      ordre: i,
    }));

    const th = linesData.reduce((s, l) => s + l.total_ht, 0);
    const tv = th * (Number(values.tva_taux) / 100);

    const { data: devis, error } = await db
      .from("devis")
      .insert({
        user_id: user.id,
        client_id: values.client_id,
        numero,
        date_devis: values.date_devis,
        date_validite: values.date_validite,
        statut: values.statut,
        tva_taux: Number(values.tva_taux),
        total_ht: th,
        tva: tv,
        total_ttc: th + tv,
        notes: values.notes,
      })
      .select()
      .single();

    if (error) {
      toast.error(error.message);
      return;
    }

    const lineInserts = linesData.map((l) => ({ ...l, devis_id: devis.id, user_id: user.id }));
    const { error: e2 } = await db.from("devis_lines").insert(lineInserts);
    if (e2) {
      toast.error(e2.message);
      return;
    }

    qc.invalidateQueries({ queryKey: ["devis"] });
    toast.success(`Devis ${numero} créé`);
    navigate({ to: "/devis/$id", params: { id: devis.id } });
  }

  return (
    <PageContainer>
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate({ to: "/devis" })}
          className="grid h-11 w-11 place-items-center rounded-xl border border-border transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Retour aux devis"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
      </div>
      <PageHeader
        title="Nouveau devis"
        subtitle="Préparez le document, ses prestations et ses conditions."
      />

      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-4 lg:grid lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start lg:gap-4 lg:space-y-0"
      >
        <div className="space-y-4">
          <Card>
            <CardContent className="space-y-4 p-4 sm:p-6">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Informations
              </h2>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Client *
                </Label>
                <select
                  {...form.register("client_id")}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent"
                >
                  <option value="">Sélectionner un client…</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.raison_sociale}
                    </option>
                  ))}
                </select>
                {form.formState.errors.client_id && (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.client_id.message}
                  </p>
                )}
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Date devis
                  </Label>
                  <Input type="date" {...form.register("date_devis")} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Date validité
                  </Label>
                  <Input type="date" {...form.register("date_validite")} />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    TVA (%)
                  </Label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    step={0.1}
                    {...form.register("tva_taux")}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Statut
                  </Label>
                  <select
                    {...form.register("statut")}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none"
                  >
                    <option value="brouillon">Brouillon</option>
                    <option value="envoye">Envoyé</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-4 p-4 sm:p-6">
              <h2 className="flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                <Calculator className="h-4 w-4 text-accent" /> Calculateur
              </h2>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label className="text-[10px] uppercase text-muted-foreground">Nb. pneus</Label>
                  <Input
                    type="number"
                    min={1}
                    max={8}
                    value={nbPneus}
                    onChange={(e) => setNbPneus(Number(e.target.value) || 1)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] uppercase text-muted-foreground">Diamètre</Label>
                  <Select value={String(diametre)} onValueChange={(v) => setDiametre(Number(v))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.keys(GRILLE_MONTAGE).map((d) => (
                        <SelectItem key={d} value={d}>
                          {d}"
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] uppercase text-muted-foreground">Montage</Label>
                  <div className="flex h-10 items-center rounded-lg border border-border bg-muted/30 px-3 text-sm font-medium">
                    {formatEUR(prixMontage)}
                  </div>
                </div>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={ajouterMontage}>
                <Plus className="mr-1 h-4 w-4" /> Ajouter le montage
              </Button>

              <div className="border-t border-border/50 pt-3">
                <Label className="text-[10px] uppercase text-muted-foreground">
                  Prestations additionnelles
                </Label>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  {PRESTATIONS_ADDITIONNELLES.map((p) => (
                    <label key={p.id} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={prestationsSelected.includes(p.id)}
                        onCheckedChange={() => togglePrestation(p.id)}
                      />
                      {p.label} ({formatEUR(p.prix)})
                    </label>
                  ))}
                </div>
                {prestationsSelected.length > 0 && (
                  <Button type="button" variant="outline" size="sm" className="mt-2" onClick={ajouterPrestations}>
                    <Plus className="mr-1 h-4 w-4" /> Ajouter les prestations
                  </Button>
                )}
              </div>

              <div className="border-t border-border/50 pt-3">
                <Label className="text-[10px] uppercase text-muted-foreground">Majorations</Label>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={majorationsSelected.includes("urgence")}
                      onCheckedChange={() => toggleMajoration("urgence")}
                    />
                    Urgence (+{MAJORATIONS.urgence * 100}%)
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={majorationsSelected.includes("nuit")}
                      onCheckedChange={() => toggleMajoration("nuit")}
                    />
                    Nuit (+{MAJORATIONS.nuit * 100}%)
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={majorationsSelected.includes("weekend")}
                      onCheckedChange={() => toggleMajoration("weekend")}
                    />
                    Week-end (+{MAJORATIONS.weekend * 100}%)
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={majorationsSelected.includes("zone")}
                      onCheckedChange={() => toggleMajoration("zone")}
                    />
                    Zone éloignée (forfait {formatEUR(FORFAIT_ZONE)})
                  </label>
                </div>
                {majorationsSelected.length > 0 && (
                  <Button type="button" variant="outline" size="sm" className="mt-2" onClick={ajouterMajorations}>
                    <Plus className="mr-1 h-4 w-4" /> Appliquer les majorations
                  </Button>
                )}
              </div>

              {pneusStock.length > 0 && (
                <div className="border-t border-border/50 pt-3 space-y-2">
                  <Label className="text-[10px] uppercase text-muted-foreground">
                    Pneu depuis le stock (optionnel)
                  </Label>
                  <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_8rem]">
                    <Select value={selectedPneuId} onValueChange={setSelectedPneuId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner un pneu…" />
                      </SelectTrigger>
                      <SelectContent>
                        {pneusStock.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {[p.marque, p.modele, p.dimension].filter(Boolean).join(" ") || p.nom} ({p.quantite} en stock)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      type="number"
                      min={0}
                      step={0.01}
                      placeholder="Prix vente HT"
                      value={prixVentePneu}
                      onChange={(e) => setPrixVentePneu(e.target.value)}
                    />
                  </div>
                  {pneuSelectionne && (
                    <p className="text-xs text-muted-foreground">
                      Coût d'achat : {formatEUR(pneuSelectionne.prix_achat_ht)}
                      {can("analytique") && margePneu != null && (
                        <> · Marge : <span className={margePneu >= 0 ? "text-success" : "text-destructive"}>{formatEUR(margePneu)}</span></>
                      )}
                    </p>
                  )}
                  <Button type="button" variant="outline" size="sm" onClick={ajouterPneuStock} disabled={!selectedPneuId}>
                    <Plus className="mr-1 h-4 w-4" /> Ajouter ce pneu
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 space-y-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Prestations
              </h2>

              {presets.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {presets.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() =>
                        append({
                          description: p.description,
                          quantite: 1,
                          prix_unitaire_ht: p.prix_unitaire_ht,
                        })
                      }
                      className="rounded-full border border-accent/40 px-2.5 py-1 text-xs text-accent hover:bg-accent/10 transition-colors"
                    >
                      + {p.label}
                    </button>
                  ))}
                </div>
              )}

              {fields.map((field, i) => (
                <div key={field.id} className="rounded-xl border border-border p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-muted-foreground">
                      Ligne {i + 1}
                    </span>
                    {fields.length > 1 && (
                      <button
                        type="button"
                        onClick={() => remove(i)}
                        className="text-destructive hover:text-destructive/80"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  <Textarea
                    rows={2}
                    placeholder="Description de la prestation…"
                    {...form.register(`lines.${i}.description`)}
                  />
                  {(form.formState.errors.lines as any)?.[i]?.description && (
                    <p className="text-xs text-destructive">
                      {(form.formState.errors.lines as any)[i].description.message}
                    </p>
                  )}
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="space-y-1">
                      <Label className="text-[10px] uppercase text-muted-foreground">Qté</Label>
                      <Input
                        type="number"
                        min={0}
                        step={0.01}
                        {...form.register(`lines.${i}.quantite`)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] uppercase text-muted-foreground">
                        PU HT (€)
                      </Label>
                      <Input
                        type="number"
                        min={0}
                        step={0.01}
                        {...form.register(`lines.${i}.prix_unitaire_ht`)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] uppercase text-muted-foreground">
                        Total HT
                      </Label>
                      <div className="flex h-10 items-center rounded-lg border border-border bg-muted/30 px-3 text-sm font-medium">
                        {formatEUR(
                          (Number(lines[i]?.quantite) || 0) *
                            (Number(lines[i]?.prix_unitaire_ht) || 0),
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => append({ description: "", quantite: 1, prix_unitaire_ht: 0 })}
              >
                <Plus className="mr-1 h-4 w-4" /> Ajouter une ligne
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-2 p-4 sm:p-6">
              <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Notes
              </Label>
              <Textarea
                rows={3}
                placeholder="Notes internes ou conditions particulières…"
                {...form.register("notes")}
              />
            </CardContent>
          </Card>
        </div>
        <div className="space-y-4 lg:sticky lg:top-6">
          <Card>
            <CardContent className="space-y-1 p-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total HT</span>
                <span>{formatEUR(totalHT)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">TVA</span>
                <span>{formatEUR(tva)}</span>
              </div>
              <div className="flex justify-between border-t pt-2 text-lg font-bold">
                <span>Total TTC</span>
                <span>{formatEUR(totalTTC)}</span>
              </div>
            </CardContent>
          </Card>
          <Button type="submit" className="min-h-11 w-full" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "Création…" : "Créer le devis"}
          </Button>
          <Button type="button" variant="outline" className="min-h-11 w-full" onClick={envoyerWhatsApp}>
            <MessageCircle className="h-4 w-4" />
            Envoyer par WhatsApp
          </Button>
        </div>
      </form>
    </PageContainer>
  );
}
