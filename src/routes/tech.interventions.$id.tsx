import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { APP_NAME } from "@/lib/brand";
import { useState } from "react";
import { useIntervention, useMyVanStock, logStockMovement } from "@/lib/queries";
import { statutInterventionLabel, statutInterventionColor, TYPES_PRESTATION } from "@/lib/schemas";
import { uploadInterventionPhotos, uploadSignature, type PhotoFile } from "@/lib/photos";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Camera, MapPin, Navigation, Phone, Plus, Trash2, X } from "lucide-react";
import { SignatureCanvas } from "@/components/signature-canvas";
import { db } from "@/lib/db";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/tech/interventions/$id")({
  head: () => ({ meta: [{ title: `Mission — ${APP_NAME}` }] }),
  component: MissionDetail,
});

const NEXT_STATUT: Record<string, { next: string; label: string } | undefined> = {
  affectee: { next: "en_route", label: "Démarrer" },
  en_route: { next: "sur_place", label: "Arrivé sur place" },
  sur_place: { next: "en_cours", label: "Commencer l'intervention" },
};

function typePrestationLabel(v: string) {
  return TYPES_PRESTATION.find((t) => t.value === v)?.label ?? v;
}

type PneuUtilise = { product_id: string; nom: string; quantite: number };

function MissionDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: inv, isLoading, isError } = useIntervention(id);
  const { data: vanStock = [] } = useMyVanStock();

  const [observations, setObservations] = useState("");
  const [photos, setPhotos] = useState<PhotoFile[]>([]);
  const [signatureBlob, setSignatureBlob] = useState<Blob | null>(null);
  const [pneusUtilises, setPneusUtilises] = useState<PneuUtilise[]>([]);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function avancerStatut(next: string) {
    const { error } = await db.from("interventions").update({ statut: next }).eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    qc.invalidateQueries({ queryKey: ["intervention", id] });
    qc.invalidateQueries({ queryKey: ["mes_interventions"] });
    toast.success("Statut mis à jour");
  }

  function handlePhotoCapture(files: FileList | null) {
    if (!files) return;
    const next = [...photos];
    for (const file of Array.from(files)) {
      next.push({ file, preview: URL.createObjectURL(file) });
    }
    setPhotos(next);
  }

  function removePhoto(i: number) {
    setPhotos((prev) => prev.filter((_, idx) => idx !== i));
  }

  function ajouterPneu() {
    const p = vanStock.find((l) => l.product_id === selectedProductId);
    if (!p?.product) return;
    setPneusUtilises((prev) => [...prev, { product_id: p.product_id, nom: p.product!.nom, quantite: 1 }]);
    setSelectedProductId("");
  }

  function retirerPneu(i: number) {
    setPneusUtilises((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function handleTerminer() {
    if (!signatureBlob) {
      toast.error("La signature du client est requise");
      return;
    }
    setSubmitting(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Non connecté");
        return;
      }

      const photoUrls = await uploadInterventionPhotos(photos, user.id);
      const signatureUrl = await uploadSignature(signatureBlob, user.id);

      // Décrément automatique du stock camion pour chaque pneu utilisé.
      for (const p of pneusUtilises) {
        await logStockMovement({
          product_id: p.product_id,
          type: "consommation",
          quantite: p.quantite,
          technicien_id: user.id,
          note: `Intervention ${id}`,
        });
      }

      const { error } = await db
        .from("interventions")
        .update({
          statut: "terminee",
          observations: observations || null,
          photos_apres: photoUrls,
          signature_client: signatureUrl,
          pneus_utilises: pneusUtilises,
          heure_fin: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) {
        toast.error(error.message);
        return;
      }

      qc.invalidateQueries({ queryKey: ["intervention", id] });
      qc.invalidateQueries({ queryKey: ["mes_interventions"] });
      qc.invalidateQueries({ queryKey: ["my_van_stock"] });
      toast.success("Intervention terminée");
      navigate({ to: "/tech/interventions" });
    } finally {
      setSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  if (isError || !inv) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          Mission introuvable.
        </CardContent>
      </Card>
    );
  }

  const mapsHref = inv.adresse
    ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(inv.adresse)}`
    : null;
  const action = NEXT_STATUT[inv.statut];
  const pretPourFinalisation = inv.statut === "en_cours";

  return (
    <div className="space-y-4">
      <Link to="/tech/interventions" className="inline-flex items-center gap-2 text-sm text-muted-foreground">
        <ArrowLeft className="h-4 w-4" />
        Mes missions
      </Link>

      <div className="rounded-2xl border bg-card p-4 shadow-sm sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl font-bold">{inv.client?.raison_sociale ?? "—"}</h1>
            <p className="text-sm text-muted-foreground">
              {typePrestationLabel(inv.type_prestation)}
              {inv.heure_prevue ? ` · ${inv.heure_prevue}` : ""}
            </p>
          </div>
          <span
            className={cn(
              "shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold uppercase",
              statutInterventionColor(inv.statut),
            )}
          >
            {statutInterventionLabel(inv.statut)}
          </span>
        </div>
        {inv.adresse && (
          <div className="mt-3 flex items-start gap-2 text-sm text-muted-foreground">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{inv.adresse}</span>
          </div>
        )}
        <div className="mt-4 grid grid-cols-2 gap-2">
          {mapsHref && (
            <Button asChild variant="outline" size="lg" className="min-h-12">
              <a href={mapsHref} target="_blank" rel="noopener noreferrer">
                <Navigation className="h-5 w-5" /> Navigation
              </a>
            </Button>
          )}
          {inv.client?.telephone && (
            <Button asChild variant="outline" size="lg" className="min-h-12">
              <a href={`tel:${inv.client.telephone}`}>
                <Phone className="h-5 w-5" /> Appeler
              </a>
            </Button>
          )}
        </div>
      </div>

      {action && (
        <Button size="lg" className="min-h-14 w-full text-base" onClick={() => avancerStatut(action.next)}>
          {action.label}
        </Button>
      )}

      {pretPourFinalisation && (
        <>
          <Card>
            <CardContent className="space-y-3 p-4 sm:p-5">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Pneus utilisés
              </h2>
              {pneusUtilises.length > 0 && (
                <ul className="space-y-2">
                  {pneusUtilises.map((p, i) => (
                    <li key={i} className="flex items-center justify-between gap-2 rounded-lg border border-border p-2 text-sm">
                      <span className="truncate">{p.nom}</span>
                      <button type="button" onClick={() => retirerPneu(i)} className="text-destructive shrink-0">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <div className="flex gap-2">
                <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                  <SelectTrigger className="h-11 flex-1">
                    <SelectValue placeholder="Choisir un pneu du camion…" />
                  </SelectTrigger>
                  <SelectContent>
                    {vanStock
                      .filter((l) => l.product && l.quantite > 0)
                      .map((l) => (
                        <SelectItem key={l.product_id} value={l.product_id}>
                          {l.product?.nom} ({l.quantite} dispo)
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <Button type="button" variant="outline" size="icon" className="h-11 w-11 shrink-0" onClick={ajouterPneu} disabled={!selectedProductId}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-3 p-4 sm:p-5">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Photos
              </h2>
              {photos.length > 0 && (
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {photos.map((p, i) => (
                    <div key={i} className="relative aspect-square">
                      <img src={p.preview} alt="" className="h-full w-full rounded-lg object-cover" />
                      <button
                        type="button"
                        onClick={() => removePhoto(i)}
                        className="absolute -right-1.5 -top-1.5 grid h-6 w-6 place-items-center rounded-full bg-destructive text-destructive-foreground"
                        aria-label="Retirer"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <Label className="flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-border text-sm text-muted-foreground hover:border-primary/40">
                <Camera className="h-4 w-4" />
                Prendre une photo
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    handlePhotoCapture(e.target.files);
                    e.target.value = "";
                  }}
                />
              </Label>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-3 p-4 sm:p-5">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Observations
              </h2>
              <Textarea
                rows={3}
                value={observations}
                onChange={(e) => setObservations(e.target.value)}
                placeholder="Détails de l'intervention…"
              />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-3 p-4 sm:p-5">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Signature du client *
              </h2>
              <SignatureCanvas onSave={setSignatureBlob} />
              {signatureBlob && (
                <p className="text-xs font-medium text-success">Signature enregistrée ✓</p>
              )}
            </CardContent>
          </Card>

          <Button
            size="lg"
            className="min-h-14 w-full text-base"
            onClick={handleTerminer}
            disabled={submitting || !signatureBlob}
          >
            {submitting ? "Envoi…" : "Terminer l'intervention"}
          </Button>
        </>
      )}
    </div>
  );
}
