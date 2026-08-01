import { z } from "zod";

export const STATUTS_FACTURE = [
  { value: "brouillon", label: "Brouillon" },
  { value: "envoyee", label: "Envoyée" },
  { value: "payee", label: "Payée" },
  { value: "retard", label: "En retard" },
] as const;

export const TYPES_CLIENT = [
  { value: "particulier", label: "Particulier" },
  { value: "taxi", label: "Taxi" },
  { value: "vtc", label: "VTC" },
  { value: "artisan", label: "Artisan" },
  { value: "flotte", label: "Flotte" },
] as const;

export const clientSchema = z.object({
  raison_sociale: z.string().trim().min(1, "Requis").max(200),
  adresse_site: z.string().max(500).default(""),
  telephone: z.string().max(50).default(""),
  email: z.string().email("Email invalide").or(z.literal("")).default(""),
  siret: z.string().max(50).default(""),
  siren: z.string().max(50).default(""),
  rcs: z.string().max(100).default(""),
  forme_juridique: z.string().max(100).default(""),
  type_client: z.string().default("particulier"),
  notes: z.string().max(2000).default(""),
});
export type ClientForm = z.infer<typeof clientSchema>;

export const invoiceLineSchema = z.object({
  description: z.string().trim().min(1, "Description requise").max(500),
  quantite: z.coerce.number().min(0).max(10000),
  prix_unitaire_ht: z.coerce.number().min(0).max(1000000),
});
export type InvoiceLineForm = z.infer<typeof invoiceLineSchema>;

export const invoiceSchema = z.object({
  client_id: z.string().uuid("Client requis"),
  date_facture: z.string().min(1, "Requis"),
  echeance: z.string().optional().nullable(),
  adresse_site: z.string().max(500).default(""),
  statut: z.string().default("brouillon"),
  tva_taux: z.coerce.number().min(0).max(100).default(20),
  notes: z.string().max(2000).default(""),
  lines: z.array(invoiceLineSchema).min(1, "Au moins une ligne"),
});
export type InvoiceForm = z.infer<typeof invoiceSchema>;

export const settingsSchema = z.object({
  nom: z.string().trim().min(1, "Requis").max(200),
  adresse: z.string().max(500).default(""),
  siret: z.string().max(50).default(""),
  tva_number: z.string().max(50).default(""),
  telephone: z.string().max(50).default(""),
  email: z.string().email("Email invalide").or(z.literal("")).default(""),
  iban: z.string().max(50).default(""),
  bic: z.string().max(50).default(""),
  objectif_ca_mensuel: z.coerce.number().min(0).max(10000000).default(3000),
});
export type SettingsForm = z.infer<typeof settingsSchema>;

export const onboardingSchema = z.object({
  nom: z.string().trim().min(1, "Requis").max(200),
  siret: z.string().max(50).default(""),
  tva_number: z.string().max(50).default(""),
  telephone: z.string().max(50).default(""),
  adresse: z.string().max(500).default(""),
  email: z.string().email("Email invalide").or(z.literal("")).default(""),
});
export type OnboardingForm = z.infer<typeof onboardingSchema>;

export const STATUTS_DEVIS = [
  { value: "brouillon", label: "Brouillon" },
  { value: "envoye", label: "Envoyé" },
  { value: "accepte", label: "Accepté" },
  { value: "refuse", label: "Refusé" },
  { value: "converti", label: "Converti" },
] as const;

export const quoteLineSchema = z.object({
  description: z.string().trim().min(1, "Description requise").max(500),
  quantite: z.coerce.number().min(0).max(10000),
  prix_unitaire_ht: z.coerce.number().min(0).max(1000000),
});
export type QuoteLineForm = z.infer<typeof quoteLineSchema>;

export const quoteSchema = z.object({
  client_id: z.string().uuid("Client requis"),
  date_devis: z.string().min(1, "Requis"),
  date_validite: z.string().min(1, "Requis"),
  statut: z.string().default("brouillon"),
  tva_taux: z.coerce.number().min(0).max(100).default(20),
  notes: z.string().max(2000).default(""),
  lines: z.array(quoteLineSchema).min(1, "Au moins une ligne"),
});
export type QuoteForm = z.infer<typeof quoteSchema>;

export const UNITES_STOCK = ["kg", "L", "ml", "boîte", "unité", "sachet"] as const;
export const UNITES_VOLUME = ["L", "ml"] as const;
export const UNITES_UNITE = ["kg", "boîte", "unité", "sachet"] as const;

export const SAISONS_PNEU = [
  { value: "ete", label: "Été" },
  { value: "hiver", label: "Hiver" },
  { value: "4saisons", label: "4 saisons" },
] as const;

export const ETATS_PNEU = [
  { value: "neuf", label: "Neuf" },
  { value: "occasion", label: "Occasion" },
] as const;

export const stockProductSchema = z.object({
  nom: z.string().trim().min(1, "Requis").max(200),
  type_gestion: z.enum(["unite", "volume"]).default("unite"),
  unite: z.enum(UNITES_STOCK).default("unité"),
  quantite: z.coerce.number().min(0).max(1000000).default(0),
  seuil_alerte: z.coerce.number().min(0).max(1000000).default(0),
  prix_achat_ht: z.coerce.number().min(0).max(1000000).default(0),
  // Champs pneu — optionnels : le stock peut aussi contenir des consommables
  // (valves, produits d'équilibrage...) sans dimension/marque.
  dimension: z.string().max(50).optional(),
  marque: z.string().max(100).optional(),
  modele: z.string().max(100).optional(),
  saison: z.string().default("ete"),
  indice_charge: z.string().max(10).optional(),
  indice_vitesse: z.string().max(10).optional(),
  dot: z.string().max(20).optional(),
  etat: z.string().default("neuf"),
  diametre_pouce: z.coerce.number().int().min(10).max(30).optional(),
  photo_url: z.string().max(1000).optional(),
  emplacement: z.string().max(100).optional(),
});
export type StockProductForm = z.infer<typeof stockProductSchema>;

// ─── Interventions (Flash Pneu) ─────────────────────────────────────────────

// Statuts intervention
export const STATUTS_INTERVENTION = [
  { value: "a_affecter", label: "À affecter", color: "bg-muted text-muted-foreground" },
  { value: "affectee", label: "Affectée", color: "bg-blue-100 text-blue-800" },
  { value: "en_route", label: "En route", color: "bg-amber-100 text-amber-800" },
  { value: "sur_place", label: "Sur place", color: "bg-orange-100 text-orange-800" },
  { value: "en_cours", label: "En cours", color: "bg-purple-100 text-purple-800" },
  { value: "terminee", label: "Terminée", color: "bg-green-100 text-green-800" },
  { value: "facturee", label: "Facturée", color: "bg-gray-100 text-gray-800" },
] as const;

// EXCEPTION COULEURS : les badges de statut utilisent des couleurs Tailwind en dur
// car ce sont des indicateurs sémantiques (bleu=info, vert=succès, etc.) qui ne
// changent pas avec le thème. C'est la seule exception acceptée.

export function statutInterventionLabel(v: string): string {
  return STATUTS_INTERVENTION.find((s) => s.value === v)?.label ?? v;
}

export function statutInterventionColor(v: string): string {
  return STATUTS_INTERVENTION.find((s) => s.value === v)?.color ?? "bg-muted text-muted-foreground";
}

export const TYPES_PRESTATION = [
  { value: "montage", label: "Montage" },
  { value: "reparation", label: "Réparation" },
  { value: "depannage", label: "Dépannage" },
  { value: "equilibrage", label: "Équilibrage" },
  { value: "batterie", label: "Batterie" },
] as const;

// Schéma véhicule
export const vehiculeSchema = z.object({
  client_id: z.string().uuid("Client requis"),
  marque: z.string().min(1, "Marque requise"),
  modele: z.string().optional(),
  immatriculation: z.string().optional(),
  dimension_pneus: z.string().optional(),
  kilometrage: z.coerce.number().int().nonnegative().optional(),
  notes: z.string().optional(),
});
export type VehiculeForm = z.infer<typeof vehiculeSchema>;

// Schéma intervention
export const interventionSchema = z.object({
  client_id: z.string().uuid("Client requis"),
  vehicule_id: z.string().uuid().optional().nullable(),
  technicien_id: z.string().uuid().optional().nullable(),
  devis_id: z.string().uuid().optional().nullable(),
  date: z.string().min(1, "Date requise"),
  heure_prevue: z.string().optional(),
  adresse: z.string().min(1, "Adresse requise"),
  type_prestation: z.string().default("montage"),
  urgence: z.boolean().default(false),
  majoration: z.string().optional().nullable(),
  observations: z.string().optional(),
});
export type InterventionForm = z.infer<typeof interventionSchema>;

// Grille tarifaire montage (par diamètre en pouces)
export const GRILLE_MONTAGE: Record<number, number> = {
  13: 60, 14: 60, 15: 60,
  16: 70,
  17: 80,
  18: 90,
  19: 100,
  20: 130, 21: 130, 22: 130,
};

export const MAJORATIONS = {
  urgence: 0.30,    // +30%
  nuit: 0.50,       // +50%
  weekend: 0.20,    // +20%
} as const;

export const FORFAIT_ZONE = 20; // € forfait hors Paris intra

export const PRESTATIONS_ADDITIONNELLES = [
  { id: "equilibrage", label: "Équilibrage (par roue)", prix: 15 },
  { id: "valve_standard", label: "Valve standard", prix: 5 },
  { id: "valve_tpms", label: "Valve TPMS", prix: 25 },
  { id: "reparation", label: "Réparation crevaison", prix: 40 },
  { id: "batterie", label: "Dépannage batterie", prix: 80 },
] as const;

/** Extrait le diamètre en pouces d'une dimension pneu (ex. "205/55 R16" → 16). */
export function extraireDiametrePouce(dimension: string): number | null {
  const match = dimension.match(/R\s*(\d{2})/i);
  if (!match) return null;
  const n = Number(match[1]);
  return Number.isFinite(n) ? n : null;
}

/** Une saisie ressemble-t-elle à une dimension de pneu ? (ex. "205/55R16", "16 pouces") */
export function ressembleADimensionPneu(input: string): boolean {
  return /\d.*[Rr]\s*\d|\d{2,3}\s*\/\s*\d{2}/.test(input);
}

export function formatEUR(n: number | null | undefined): string {
  const v = Number(n ?? 0);
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(v);
}

export function formatDateFR(d: string | Date | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  if (isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("fr-FR");
}
