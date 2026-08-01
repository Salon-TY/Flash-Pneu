import { useQuery } from "@tanstack/react-query";
import { db } from "./db";
import type { PermissionKey } from "./permissions";

function localDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export type Client = {
  id: string;
  user_id: string;
  raison_sociale: string;
  adresse_site: string;
  telephone: string;
  email: string;
  siret: string;
  siren?: string | null;
  rcs?: string | null;
  forme_juridique?: string | null;
  notes: string;
  created_at: string;
  updated_at: string;
};

export type InvoiceLine = {
  id: string;
  invoice_id: string;
  user_id: string;
  description: string;
  quantite: number;
  prix_unitaire_ht: number;
  total_ht: number;
  ordre: number;
};

export type Invoice = {
  id: string;
  user_id: string;
  client_id: string;
  numero: number;
  date_facture: string;
  echeance: string | null;
  adresse_site: string;
  statut: string;
  total_ht: number;
  tva: number;
  total_ttc: number;
  tva_taux: number;
  notes: string;
  client?: Client | null;
  lines?: InvoiceLine[];
};

export type Settings = {
  user_id: string;
  nom: string;
  adresse: string;
  siret: string;
  tva_number: string;
  telephone: string;
  email: string;
  iban: string;
  bic: string;
  next_invoice_number: number;
  objectif_ca_mensuel: number;
  logo_url?: string | null;
  relance_delai_n1?: number | null;
  relance_delai_n2?: number | null;
  relance_delai_n3?: number | null;
  relance_signature?: string | null;
};

export type Relance = {
  id: string;
  user_id: string;
  facture_id: string;
  niveau: 1 | 2 | 3;
  date_envoi: string;
  notes: string;
  created_at: string;
};

export function useRelances() {
  return useQuery({
    queryKey: ["relances"],
    queryFn: async (): Promise<Relance[]> => {
      const { data, error } = await db.from("relances").select("*").order("created_at", { ascending: false }).limit(200);
      if (error) throw error;
      return (data ?? []).map((r: any) => ({ ...r, niveau: Number(r.niveau) as 1 | 2 | 3 }));
    },
  });
}

export function useRelancesForInvoice(factureId: string | undefined) {
  return useQuery({
    queryKey: ["relances", factureId],
    enabled: !!factureId,
    queryFn: async (): Promise<Relance[]> => {
      const { data, error } = await db.from("relances").select("*").eq("facture_id", factureId!).order("created_at", { ascending: false }).limit(50);
      if (error) throw error;
      return (data ?? []).map((r: any) => ({ ...r, niveau: Number(r.niveau) as 1 | 2 | 3 }));
    },
  });
}

export type QuoteLine = {
  id: string;
  devis_id: string;
  user_id: string;
  description: string;
  quantite: number;
  prix_unitaire_ht: number;
  total_ht: number;
  ordre: number;
};

export type Quote = {
  id: string;
  user_id: string;
  client_id: string;
  numero: string;
  date_devis: string;
  date_validite: string;
  statut: string;
  total_ht: number;
  tva: number;
  tva_taux: number;
  total_ttc: number;
  notes: string;
  created_at: string;
  updated_at: string;
  client?: Client | null;
  lines?: QuoteLine[];
};

export type Preset = {
  id: string;
  user_id: string;
  label: string;
  description: string;
  prix_unitaire_ht: number;
  ordre: number;
};

export type StockProduct = {
  id: string;
  user_id: string;
  nom: string;
  type_gestion: "unite" | "volume";
  unite: string;
  quantite: number;
  seuil_alerte: number;
  prix_achat_ht: number;
  created_at: string;
  updated_at: string;
};

export function useStockProducts() {
  return useQuery({
    queryKey: ["stock_products"],
    queryFn: async (): Promise<StockProduct[]> => {
      const { data, error } = await db.from("stock_products").select("*").order("nom").limit(200);
      if (error) throw error;
      return (data ?? []).map((p: any) => ({
        ...p,
        type_gestion: p.type_gestion ?? "unite",
        quantite: Number(p.quantite),
        seuil_alerte: Number(p.seuil_alerte),
        prix_achat_ht: Number(p.prix_achat_ht),
      }));
    },
  });
}

export type StockLevel = {
  id: string;
  product_id: string;
  technicien_id: string | null;
  quantite: number;
  user_id: string;
  created_at: string;
  updated_at: string;
  product?: { nom: string; unite: string; seuil_alerte: number } | null;
};

function mapStockLevel(l: any): StockLevel {
  return { ...l, quantite: Number(l.quantite) };
}

export function useStockLevels() {
  return useQuery({
    queryKey: ["stock_levels"],
    queryFn: async (): Promise<StockLevel[]> => {
      const { data, error } = await db
        .from("stock_levels")
        .select("*, product:stock_products(nom, unite, seuil_alerte)")
        .order("created_at")
        .limit(200);
      if (error) throw error;
      return (data ?? []).map(mapStockLevel);
    },
  });
}

export function useMyVanStock() {
  return useQuery({
    queryKey: ["my_van_stock"],
    queryFn: async (): Promise<StockLevel[]> => {
      const { data: { user } } = await db.auth.getUser();
      if (!user) return [];
      const { data, error } = await db
        .from("stock_levels")
        .select("*, product:stock_products(nom, unite, seuil_alerte)")
        .eq("technicien_id", user.id)
        .order("created_at")
        .limit(200);
      if (error) throw error;
      return (data ?? []).map(mapStockLevel);
    },
  });
}

export function getGarageLevel(levels: StockLevel[] | undefined, productId: string): StockLevel | undefined {
  return levels?.find((l) => l.product_id === productId && l.technicien_id === null);
}

export function getVanLevel(
  levels: StockLevel[] | undefined,
  productId: string,
  technicienId: string | null | undefined
): StockLevel | undefined {
  if (!technicienId) return undefined;
  return levels?.find((l) => l.product_id === productId && l.technicien_id === technicienId);
}

export type StockMovementType = "entree" | "transfert" | "consommation" | "ajustement";

export type StockMovement = {
  id: string;
  product_id: string;
  type: StockMovementType;
  quantite: number;
  technicien_id: string | null;
  note: string | null;
  created_by: string;
  user_id: string;
  created_at: string;
  product?: { nom: string; unite: string } | null;
};

export function useStockMovements(filters?: {
  product_id?: string;
  technicien_id?: string | null;
  type?: StockMovementType;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
}) {
  const paginated = filters?.page !== undefined;
  return useQuery({
    queryKey: ["stock_movements", filters ?? null],
    queryFn: async (): Promise<StockMovement[] | PaginatedResult<StockMovement>> => {
      let q = db.from("stock_movements").select("*, product:stock_products(nom, unite)", paginated ? { count: "exact" } : undefined).order("created_at", { ascending: false });
      if (filters?.product_id) q = q.eq("product_id", filters.product_id);
      if (filters && "technicien_id" in filters && filters.technicien_id !== undefined) {
        q = filters.technicien_id === null ? q.is("technicien_id", null) : q.eq("technicien_id", filters.technicien_id);
      }
      if (filters?.type) q = q.eq("type", filters.type);
      if (filters?.dateFrom) q = q.gte("created_at", filters.dateFrom);
      if (filters?.dateTo) q = q.lte("created_at", filters.dateTo);
      if (paginated) {
        const page = filters!.page!;
        const pageSize = filters!.pageSize ?? 50;
        q = q.range(page * pageSize, page * pageSize + pageSize - 1);
      } else {
        q = q.limit(200);
      }
      const { data, error, count } = await q;
      if (error) throw error;
      const mapped = (data ?? []).map((m: any) => ({ ...m, quantite: Number(m.quantite) }));
      if (paginated) return { rows: mapped, total: count ?? 0 };
      return mapped;
    },
  });
}

export function useMyVanMovements() {
  return useQuery({
    queryKey: ["my_van_movements"],
    queryFn: async (): Promise<StockMovement[]> => {
      const { data: { user } } = await db.auth.getUser();
      if (!user) return [];
      const { data, error } = await db
        .from("stock_movements")
        .select("*, product:stock_products(nom, unite)")
        .eq("technicien_id", user.id)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []).map((m: any) => ({ ...m, quantite: Number(m.quantite) }));
    },
  });
}

// Best-effort : un échec de journalisation ne doit jamais faire échouer
// l'opération de stock elle-même (déjà appliquée à ce stade).
export async function logStockMovement(params: {
  product_id: string;
  type: StockMovementType;
  quantite: number;
  technicien_id?: string | null;
  note?: string | null;
}): Promise<void> {
  try {
    const { data: { user } } = await db.auth.getUser();
    const { error } = await db.from("stock_movements").insert({
      product_id: params.product_id,
      type: params.type,
      quantite: params.quantite,
      technicien_id: params.technicien_id ?? null,
      note: params.note ?? null,
      created_by: user?.id,
    });
    if (error) console.error("[stock_movements] insert failed:", error);
  } catch (e) {
    console.error("[stock_movements] insert failed:", e);
  }
}

// ─── Demandes de réapprovisionnement (technicien → admin/bureau) ────────────

export type StockRequestStatut = "en_attente" | "servie" | "refusee";

export type StockRequest = {
  id: string;
  product_id: string;
  technicien_id: string;
  quantite: number;
  note: string | null;
  statut: StockRequestStatut;
  traite_par: string | null;
  traite_at: string | null;
  user_id: string;
  created_at: string;
  product?: { nom: string; unite: string } | null;
};

function mapStockRequest(r: any): StockRequest {
  return { ...r, quantite: Number(r.quantite) };
}

// Vue "handler" (owner / can("reappro")) : toutes les demandes, filtrables par statut.
export function useStockRequests(statut?: StockRequestStatut) {
  return useQuery({
    queryKey: ["stock_requests", statut ?? "all"],
    queryFn: async (): Promise<StockRequest[]> => {
      let q = db.from("stock_requests").select("*, product:stock_products(nom, unite)").order("created_at", { ascending: false }).limit(200);
      if (statut) q = q.eq("statut", statut);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []).map(mapStockRequest);
    },
  });
}

// Vue technicien : ses propres demandes.
export function useMyStockRequests() {
  return useQuery({
    queryKey: ["my_stock_requests"],
    queryFn: async (): Promise<StockRequest[]> => {
      const { data: { user } } = await db.auth.getUser();
      if (!user) return [];
      const { data, error } = await db
        .from("stock_requests")
        .select("*, product:stock_products(nom, unite)")
        .eq("technicien_id", user.id)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []).map(mapStockRequest);
    },
  });
}

export function usePendingStockRequestsCount() {
  return useQuery({
    queryKey: ["stock_requests_pending_count"],
    queryFn: async (): Promise<number> => {
      const { count, error } = await db.from("stock_requests").select("*", { count: "exact", head: true }).eq("statut", "en_attente");
      if (error) throw error;
      return count ?? 0;
    },
  });
}

// Placeholder socle : pas de table de tâches génériques pour l'instant — la
// couche métier redéfinira ce hook une fois son propre concept de "tâche"
// (rendez-vous, commande, dossier…) en place.
export function useMyTodoCount() {
  return useQuery({
    queryKey: ["my_todo_count"],
    queryFn: async (): Promise<number> => 0,
  });
}

export type ProductStat = {
  id: string;
  nom: string;
  unite: string;
  prix_achat_ht: number;
  total_qty: number;
  cout_total: number;
};

// Consommation produits sur 30 jours, basée sur stock_movements (type
// "consommation") — générique, ne dépend d'aucune table métier.
export function useProductStats() {
  return useQuery({
    queryKey: ["product_stats"],
    queryFn: async (): Promise<ProductStat[]> => {
      const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const [stockRes, movementsRes] = await Promise.all([
        db.from("stock_products").select("id, nom, unite, prix_achat_ht").order("nom").limit(500),
        // Bornée par la fenêtre de 30 jours (gte "since"), pas de .limit() ajouté ici :
        // une troncature silencieuse fausserait la conso produits comme le ferait
        // un .limit() sur une somme financière — le filtre de date suffit déjà à
        // borner ce volume pour un usage réaliste.
        db.from("stock_movements").select("product_id, quantite").eq("type", "consommation").gte("created_at", since),
      ]);
      const stockMap = new Map<string, { nom: string; unite: string; prix: number }>();
      for (const p of stockRes.data ?? []) {
        stockMap.set(p.id, { nom: p.nom, unite: p.unite, prix: Number(p.prix_achat_ht) });
      }
      const totals = new Map<string, number>();
      for (const mv of movementsRes.data ?? []) {
        totals.set(mv.product_id, (totals.get(mv.product_id) ?? 0) + Number(mv.quantite));
      }
      const results: ProductStat[] = [];
      for (const [id, qty] of totals.entries()) {
        const p = stockMap.get(id);
        if (!p) continue;
        results.push({ id, nom: p.nom, unite: p.unite, prix_achat_ht: p.prix, total_qty: qty, cout_total: qty * p.prix });
      }
      return results.sort((a, b) => b.cout_total - a.cout_total);
    },
  });
}

export type PaginatedResult<T> = { rows: T[]; total: number };

// Options de pagination facultatives : quand `page` est fourni, la requête
// utilise .range()+{count:"exact"} et le hook renvoie { rows, total } au lieu
// d'un simple tableau. Sans pagination, comportement inchangé (tableau borné) —
// tous les autres appelants (sélecteurs client, recherche globale…) ne passent
// jamais ces options et ne sont donc pas affectés.
export function useClients(opts?: {
  search?: string;
  page?: number;
  pageSize?: number;
}) {
  const paginated = opts?.page !== undefined;
  return useQuery({
    queryKey: ["clients", opts ?? null],
    queryFn: async (): Promise<Client[] | PaginatedResult<Client>> => {
      let q = db.from("clients").select("*", paginated ? { count: "exact" } : undefined).order("raison_sociale");
      const term = opts?.search?.trim().replace(/[,()%]/g, " ").trim();
      if (term) q = q.or(`raison_sociale.ilike.%${term}%,adresse_site.ilike.%${term}%,telephone.ilike.%${term}%,email.ilike.%${term}%`);
      if (paginated) {
        const page = opts!.page!;
        const pageSize = opts!.pageSize ?? 50;
        q = q.range(page * pageSize, page * pageSize + pageSize - 1);
      } else {
        q = q.limit(200);
      }
      const { data, error, count } = await q;
      if (error) throw error;
      if (paginated) return { rows: data ?? [], total: count ?? 0 };
      return data ?? [];
    },
  });
}

export function useClient(id: string | undefined) {
  return useQuery({
    queryKey: ["client", id],
    enabled: !!id,
    queryFn: async (): Promise<Client | null> => {
      const { data, error } = await db.from("clients").select("*").eq("id", id!).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

// ─── VÉHICULES ───────────────────────────────────────────────────────────────

export type Vehicule = {
  id: string;
  user_id: string;
  client_id: string | null;
  marque: string;
  modele: string | null;
  immatriculation: string | null;
  dimension_pneus: string | null;
  kilometrage: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  client?: Client | null;
};

export function useVehicules(clientId?: string) {
  return useQuery({
    queryKey: ["vehicules", clientId ?? null],
    queryFn: async (): Promise<Vehicule[]> => {
      let q = db
        .from("vehicules")
        .select("*, client:clients(raison_sociale)")
        .order("created_at", { ascending: false })
        .limit(200);
      if (clientId) q = q.eq("client_id", clientId);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useVehicule(id: string | undefined) {
  return useQuery({
    queryKey: ["vehicule", id],
    enabled: !!id,
    queryFn: async (): Promise<Vehicule | null> => {
      const { data, error } = await db.from("vehicules").select("*, client:clients(*)").eq("id", id!).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

// ─── INTERVENTIONS ───────────────────────────────────────────────────────────

export type Intervention = {
  id: string;
  user_id: string;
  client_id: string | null;
  vehicule_id: string | null;
  technicien_id: string | null;
  devis_id: string | null;
  date: string;
  heure_prevue: string | null;
  adresse: string | null;
  statut: string;
  type_prestation: string;
  pneus_prevus: any[];
  pneus_utilises: any[];
  observations: string | null;
  photos_avant: string[];
  photos_apres: string[];
  signature_client: string | null;
  heure_debut: string | null;
  heure_fin: string | null;
  urgence: boolean;
  majoration: string | null;
  montant_total: number | null;
  created_at: string;
  updated_at: string;
  client?: Client | null;
  vehicule?: Vehicule | null;
};

const INTERVENTION_SELECT = "*, client:clients(raison_sociale, telephone, adresse_site), vehicule:vehicules(marque, modele, immatriculation)";

export function useInterventions(filters?: {
  statut?: string;
  technicien_id?: string;
  date_debut?: string;
  date_fin?: string;
  page?: number;
  pageSize?: number;
}) {
  const paginated = filters?.page !== undefined;
  return useQuery({
    queryKey: ["interventions", filters ?? null],
    queryFn: async (): Promise<Intervention[] | PaginatedResult<Intervention>> => {
      let q = db
        .from("interventions")
        .select(INTERVENTION_SELECT, paginated ? { count: "exact" } : undefined)
        .order("date", { ascending: false });
      if (filters?.statut) q = q.eq("statut", filters.statut);
      if (filters?.technicien_id) q = q.eq("technicien_id", filters.technicien_id);
      if (filters?.date_debut) q = q.gte("date", filters.date_debut);
      if (filters?.date_fin) q = q.lte("date", filters.date_fin);
      if (paginated) {
        const page = filters!.page!;
        const pageSize = filters!.pageSize ?? 50;
        q = q.range(page * pageSize, page * pageSize + pageSize - 1);
      } else {
        q = q.limit(200);
      }
      const { data, error, count } = await q;
      if (error) throw error;
      if (paginated) return { rows: data ?? [], total: count ?? 0 };
      return data ?? [];
    },
  });
}

export function useIntervention(id: string | undefined) {
  return useQuery({
    queryKey: ["intervention", id],
    enabled: !!id,
    queryFn: async (): Promise<Intervention | null> => {
      const { data, error } = await db
        .from("interventions")
        .select("*, client:clients(*), vehicule:vehicules(*)")
        .eq("id", id!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

// Interventions du jour, triées par heure — pour le dashboard et le planning.
export function useInterventionsJour(date?: string) {
  const d = date ?? new Date().toISOString().slice(0, 10);
  return useQuery({
    queryKey: ["interventions_jour", d],
    queryFn: async (): Promise<Intervention[]> => {
      const { data, error } = await db
        .from("interventions")
        .select(INTERVENTION_SELECT)
        .eq("date", d)
        .order("heure_prevue", { ascending: true })
        .limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });
}

// Pour le technicien : ses interventions du jour (filtré par technicien_id = auth.uid()).
export function useMesInterventions() {
  return useQuery({
    queryKey: ["mes_interventions"],
    queryFn: async (): Promise<Intervention[]> => {
      const {
        data: { user },
      } = await db.auth.getUser();
      if (!user) return [];
      const today = new Date().toISOString().slice(0, 10);
      const { data, error } = await db
        .from("interventions")
        .select(INTERVENTION_SELECT)
        .eq("technicien_id", user.id)
        .eq("date", today)
        .order("heure_prevue", { ascending: true })
        .limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });
}

// Compteur par statut — pour les badges (ex. "À affecter (3)").
export function useInterventionsCountByStatut(statut: string) {
  return useQuery({
    queryKey: ["interventions_count", statut],
    queryFn: async (): Promise<number> => {
      const { count, error } = await db
        .from("interventions")
        .select("*", { count: "exact", head: true })
        .eq("statut", statut);
      if (error) throw error;
      return count ?? 0;
    },
  });
}

export function useInvoices(opts?: {
  statut?: string;
  client_id?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  sortField?: "date" | "montant";
  sortDir?: "asc" | "desc";
  page?: number;
  pageSize?: number;
}) {
  const paginated = opts?.page !== undefined;
  return useQuery({
    queryKey: ["invoices", opts ?? null],
    queryFn: async (): Promise<Invoice[] | PaginatedResult<Invoice>> => {
      let q = db.from("invoices").select("*, client:clients(*)", paginated ? { count: "exact" } : undefined);
      if (opts?.statut) q = q.eq("statut", opts.statut);
      if (opts?.client_id) q = q.eq("client_id", opts.client_id);
      if (opts?.dateFrom) q = q.gte("date_facture", opts.dateFrom);
      if (opts?.dateTo) q = q.lte("date_facture", opts.dateTo);
      const term = opts?.search?.trim();
      if (term) {
        const normalized = term.replace(",", ".");
        const asNumber = Number(normalized);
        // Recherche poussée côté serveur : uniquement un match exact de N° de
        // facture quand le terme est numérique. Le nom du client (colonne
        // jointe) et le montant formaté ne sont pas cherchés côté serveur.
        if (normalized !== "" && Number.isFinite(asNumber)) q = q.eq("numero", asNumber);
      }
      if (paginated) {
        const sortField = opts?.sortField ?? "date";
        const ascending = opts?.sortDir === "asc";
        q = sortField === "montant" ? q.order("total_ttc", { ascending }) : q.order("date_facture", { ascending });
        const page = opts!.page!;
        const pageSize = opts!.pageSize ?? 50;
        q = q.range(page * pageSize, page * pageSize + pageSize - 1);
      } else {
        q = q.order("numero", { ascending: false }).limit(200);
      }
      const { data, error, count } = await q;
      if (error) throw error;
      if (paginated) return { rows: data ?? [], total: count ?? 0 };
      return data ?? [];
    },
  });
}

// Compte de factures par statut — pour les puces "Toutes / Brouillon / …",
// indépendamment de la page courante d'une liste paginée. count:"exact" sur
// une requête head:true est calculé côté base, jamais tronqué à 1000 lignes.
export function useInvoicesStatutCounts() {
  return useQuery({
    queryKey: ["invoices_statut_counts"],
    queryFn: async (): Promise<Record<string, number>> => {
      const statuts = ["brouillon", "envoyee", "payee", "retard"];
      const [totalRes, ...perStatutRes] = await Promise.all([
        db.from("invoices").select("*", { count: "exact", head: true }),
        ...statuts.map((s) => db.from("invoices").select("*", { count: "exact", head: true }).eq("statut", s)),
      ]);
      const counts: Record<string, number> = { all: totalRes.count ?? 0 };
      statuts.forEach((s, i) => { counts[s] = perStatutRes[i].count ?? 0; });
      return counts;
    },
  });
}

export function useInvoice(id: string | undefined) {
  return useQuery({
    queryKey: ["invoice", id],
    enabled: !!id,
    queryFn: async (): Promise<Invoice | null> => {
      const { data: invoice, error } = await db.from("invoices").select("*, client:clients(*)").eq("id", id!).maybeSingle();
      if (error) throw error;
      if (!invoice) return null;
      const { data: lines, error: e2 } = await db.from("invoice_lines").select("*").eq("invoice_id", id!).order("ordre");
      if (e2) throw e2;
      return { ...invoice, lines: lines ?? [] };
    },
  });
}

export type TeamMember = {
  id: string;
  owner_id: string;
  user_id: string;
  email: string;
  username: string | null;
  display_name: string | null;
  role: string;
  active: boolean;
  permissions?: Record<string, boolean> | null;
  poste: "bureau" | "technicien";
  created_at: string;
};

export function useCurrentRole() {
  return useQuery({
    queryKey: ["current_role"],
    queryFn: async (): Promise<"owner" | "employe" | "disabled"> => {
      const { data, error } = await db.rpc("current_user_role");
      if (error) throw error;
      return data as "owner" | "employe" | "disabled";
    },
  });
}

// Poste (bureau/technicien) de l'utilisateur courant — utilisé pour distinguer
// un employé de terrain (workflow technicien) d'un employé de bureau.
export function useMyPoste() {
  return useQuery({
    queryKey: ["my_poste"],
    queryFn: async (): Promise<"bureau" | "technicien" | null> => {
      const { data: { user } } = await db.auth.getUser();
      if (!user) return null;
      const { data, error } = await db.from("team_members").select("poste").eq("user_id", user.id).maybeSingle();
      if (error) throw error;
      return (data?.poste as "bureau" | "technicien" | undefined) ?? null;
    },
  });
}

export function useTeamMembers() {
  return useQuery({
    queryKey: ["team_members"],
    queryFn: async (): Promise<TeamMember[]> => {
      const { data, error } = await db.from("team_members").select("*").eq("role", "employe").order("created_at", { ascending: false }).limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });
}

// Membres d'équipe actifs (hors patron) — pour le StatCard "Équipe" du dashboard.
export function useActiveTeamCount() {
  return useQuery({
    queryKey: ["active_team_count"],
    queryFn: async (): Promise<number> => {
      const { count, error } = await db
        .from("team_members")
        .select("*", { count: "exact", head: true })
        .eq("role", "employe")
        .eq("active", true);
      if (error) throw error;
      return count ?? 0;
    },
  });
}

export type AssignableMember = {
  user_id: string;
  display_name: string;
  role: string;
  username: string | null;
  poste: "bureau" | "technicien";
};

// Uniquement les personnes de terrain : le propriétaire (toujours assignable)
// + les employés au poste "technicien". Le personnel de bureau est exclu.
export function useAssignableMembers() {
  return useQuery({
    queryKey: ["assignable_members"],
    queryFn: async (): Promise<AssignableMember[]> => {
      const { data, error } = await db
        .from("team_members")
        .select("user_id, display_name, role, username, poste")
        .eq("active", true)
        .or("role.eq.owner,poste.eq.technicien")
        .order("display_name")
        .limit(200);
      if (error) throw error;
      return (data ?? []).map((m: any) => ({
        user_id: m.user_id,
        display_name: m.display_name || m.username || "Sans nom",
        role: m.role,
        username: m.username,
        poste: m.poste,
      }));
    },
  });
}

// Charge de travail approximative par technicien — à redéfinir par la couche
// métier une fois son propre concept d'affectation en place (rendez-vous,
// commandes, dossiers…). Retourne un objet vide côté socle.
export function useTechnicianWorkload() {
  return useQuery({
    queryKey: ["technician_workload"],
    queryFn: async (): Promise<Record<string, number>> => ({}),
  });
}

export function resolveTechnicianName(
  members: AssignableMember[] | undefined,
  technicienId: string | null | undefined
): string | null {
  if (!technicienId || !members) return null;
  return members.find((m) => m.user_id === technicienId)?.display_name ?? null;
}

export function useMyAccess() {
  const { data: role, isLoading: roleLoading } = useCurrentRole();
  const permQuery = useQuery({
    queryKey: ["my_permissions"],
    queryFn: async (): Promise<Record<string, boolean>> => {
      const { data: { user } } = await db.auth.getUser();
      if (!user) return {};
      const { data, error } = await db.from("team_members").select("permissions").eq("user_id", user.id).maybeSingle();
      if (error) throw error;
      return (data?.permissions as Record<string, boolean>) ?? {};
    },
  });

  const loading = roleLoading || permQuery.isLoading;

  function can(key: PermissionKey | "terrain" | "equipe"): boolean {
    if (key === "terrain") return true;
    if (role === "owner") return true;
    if (key === "equipe") return false;
    return permQuery.data?.[key] === true;
  }

  return { role, loading, can };
}

export function useSettings() {
  return useQuery({
    queryKey: ["settings"],
    queryFn: async (): Promise<Settings | null> => {
      const { data, error } = await db.from("company_settings").select("*").maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function usePresets() {
  return useQuery({
    queryKey: ["presets"],
    queryFn: async (): Promise<Preset[]> => {
      const { data, error } = await db.from("service_presets").select("*").order("ordre").limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });
}


export function useDashboardStats() {
  return useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const _now = new Date();
      const today = localDate(_now);
      const monthStart = today.slice(0, 7) + "-01";
      const prevMonthStart = localDate(new Date(_now.getFullYear(), _now.getMonth() - 1, 1));
      const prevMonthEnd = localDate(new Date(_now.getFullYear(), _now.getMonth(), 0));

      const [moneyStatsRes, unpaidListRes, stockLevelsRes, teamRes, roleRes, userRes] = await Promise.all([
        db.rpc("dashboard_money_stats", {
          p_month_start: monthStart,
          p_prev_month_start: prevMonthStart,
          p_prev_month_end: prevMonthEnd,
        }),
        // Liste affichée uniquement (quelques factures en retard) : jamais la
        // source du total, qui vient de dashboard_money_stats.unpaid_count.
        db.from("invoices").select("id, total_ttc, statut, echeance, client:clients(raison_sociale)").in("statut", ["envoyee", "retard"]).order("echeance", { ascending: true }).limit(20),
        db.from("stock_levels").select("product_id, technicien_id, quantite, product:stock_products(nom, unite, seuil_alerte)").order("quantite", { ascending: true }).limit(200),
        db.from("team_members").select("user_id, display_name, username").limit(200),
        db.rpc("current_user_role"),
        db.auth.getUser(),
      ]);

      if (moneyStatsRes.error) throw moneyStatsRes.error;
      const moneyStats = (moneyStatsRes.data as any[])?.[0] ?? { ca_month: 0, ca_prev_month: 0, unpaid_total: 0, unpaid_count: 0 };
      const ca = Number(moneyStats.ca_month ?? 0);
      const caPrevMonth = Number(moneyStats.ca_prev_month ?? 0);
      const unpaidCount = Number(moneyStats.unpaid_count ?? 0);
      const unpaidTotal = Number(moneyStats.unpaid_total ?? 0);

      const impayes = unpaidListRes.data ?? [];

      const now = new Date();

      const overdueInvoices = impayes
        .filter((i: any) => i.statut === "retard" && i.echeance)
        .map((i: any) => {
          const daysLate = Math.floor((now.getTime() - new Date(i.echeance + "T00:00:00").getTime()) / (1000 * 60 * 60 * 24));
          return { ...i, daysLate };
        })
        .filter((i: any) => i.daysLate > 7)
        .sort((a: any, b: any) => b.daysLate - a.daysLate);

      // Alertes par emplacement : chaque ligne garage/camion à ou sous son seuil.
      // Le propriétaire/bureau voit tout ; un employé ne voit que son propre camion.
      const memberNameById = new Map<string, string>();
      for (const m of teamRes.data ?? []) {
        memberNameById.set(m.user_id, m.display_name || m.username || "Sans nom");
      }
      const role = roleRes.data as string | null;
      const currentUserId = userRes.data.user?.id ?? null;

      let stockAlerts = (stockLevelsRes.data ?? [])
        .map((l: any) => {
          const nom = l.product?.nom ?? "";
          const unite = l.product?.unite ?? "";
          const seuil = Number(l.product?.seuil_alerte ?? 0);
          const quantite = Number(l.quantite ?? 0);
          const locationLabel = l.technicien_id ? `Camion de ${memberNameById.get(l.technicien_id) ?? "technicien"}` : "Garage";
          return {
            product_id: l.product_id,
            technicien_id: l.technicien_id as string | null,
            nom,
            unite,
            quantite,
            seuil,
            label: `${locationLabel} : ${nom} (${quantite})`,
          };
        })
        .filter((l) => l.quantite <= l.seuil);

      if (role !== "owner") {
        stockAlerts = stockAlerts.filter((l) => l.technicien_id === currentUserId);
      }

      return {
        caMonth: ca,
        caPrevMonth,
        unpaidCount,
        unpaidTotal,
        overdueInvoices,
        stockAlerts,
        lowStockCount: stockAlerts.length,
      };
    },
  });
}

export function useQuotes() {
  return useQuery({
    queryKey: ["devis"],
    queryFn: async (): Promise<Quote[]> => {
      const { data, error } = await db.from("devis").select("*, client:clients(*)").order("created_at", { ascending: false }).limit(200);
      if (error) throw error;
      return (data ?? []).map((q: any) => ({
        ...q,
        total_ht: Number(q.total_ht),
        tva: Number(q.tva),
        tva_taux: Number(q.tva_taux),
        total_ttc: Number(q.total_ttc),
      }));
    },
  });
}

export function useQuote(id: string | undefined) {
  return useQuery({
    queryKey: ["devis", id],
    enabled: !!id,
    queryFn: async (): Promise<Quote | null> => {
      const { data: quote, error } = await db.from("devis").select("*, client:clients(*)").eq("id", id!).maybeSingle();
      if (error) throw error;
      if (!quote) return null;
      const { data: lines, error: e2 } = await db.from("devis_lines").select("*").eq("devis_id", id!).order("ordre");
      if (e2) throw e2;
      return {
        ...quote,
        total_ht: Number(quote.total_ht),
        tva: Number(quote.tva),
        tva_taux: Number(quote.tva_taux),
        total_ttc: Number(quote.total_ttc),
        lines: (lines ?? []).map((l: any) => ({
          ...l,
          quantite: Number(l.quantite),
          prix_unitaire_ht: Number(l.prix_unitaire_ht),
          total_ht: Number(l.total_ht),
        })),
      };
    },
  });
}

// Devis envoyés en attente de réponse — pour le StatCard "Devis en attente" du dashboard.
export function useDevisEnAttente() {
  return useQuery({
    queryKey: ["devis_en_attente_count"],
    queryFn: async (): Promise<number> => {
      const { count, error } = await db
        .from("devis")
        .select("*", { count: "exact", head: true })
        .eq("statut", "envoye");
      if (error) throw error;
      return count ?? 0;
    },
  });
}

export function useMonthlyStats() {
  return useQuery({
    queryKey: ["monthly_stats"],
    queryFn: async () => {
      const now = new Date();
      const today = now.toISOString().slice(0, 10);
      const monthStart = today.slice(0, 7) + "-01";
      const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 10);
      const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().slice(0, 10);
      const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1).toISOString().slice(0, 10);

      // ⚠️ Pas de .limit() sur invoicesMonth/invoicesPrev/invoices12m : ce sont
      // des sommes/comptes (CA du mois, top 5 clients, courbe 6 mois) — un
      // bornage client fausserait silencieusement ces chiffres. Mériterait à
      // terme la même agrégation SQL que dashboard_money_stats.
      const [invoicesMonth, invoicesPrev, invoices12m, clientsMonth] = await Promise.all([
        db.from("invoices").select("total_ttc, statut").gte("date_facture", monthStart),
        db.from("invoices").select("total_ttc, statut").gte("date_facture", prevMonthStart).lte("date_facture", prevMonthEnd),
        db.from("invoices").select("total_ttc, statut, client_id, date_facture, client:clients(raison_sociale)").gte("date_facture", twelveMonthsAgo),
        db.from("clients").select("id", { count: "exact", head: true }).gte("created_at", monthStart),
      ]);

      const PAID = ["payee", "envoyee", "retard"];
      const caMonth = (invoicesMonth.data ?? []).filter((i: any) => PAID.includes(i.statut)).reduce((s: number, i: any) => s + Number(i.total_ttc ?? 0), 0);
      const caPrev = (invoicesPrev.data ?? []).filter((i: any) => PAID.includes(i.statut)).reduce((s: number, i: any) => s + Number(i.total_ttc ?? 0), 0);
      const caEvolution = caPrev === 0 ? null : ((caMonth - caPrev) / caPrev) * 100;

      // Top 5 clients by CA last 12 months
      const clientMap = new Map<string, { nom: string; ca: number }>();
      for (const inv of (invoices12m.data ?? [])) {
        if (!PAID.includes(inv.statut)) continue;
        const id = inv.client_id;
        const nom = (inv.client as any)?.raison_sociale ?? "—";
        const prev = clientMap.get(id) ?? { nom, ca: 0 };
        clientMap.set(id, { nom, ca: prev.ca + Number(inv.total_ttc ?? 0) });
      }
      const top5 = [...clientMap.entries()]
        .sort((a, b) => b[1].ca - a[1].ca)
        .slice(0, 5)
        .map(([id, v]) => ({ id, nom: v.nom, ca: v.ca }));

      // CA des 6 derniers mois (barres)
      const months6: { label: string; ca: number }[] = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = d.toISOString().slice(0, 7);
        const label = d.toLocaleDateString("fr-FR", { month: "short", year: "2-digit" });
        const ca = (invoices12m.data ?? [])
          .filter((inv: any) => PAID.includes(inv.statut) && inv.date_facture?.startsWith(key))
          .reduce((s: number, inv: any) => s + Number(inv.total_ttc ?? 0), 0);
        months6.push({ label, ca });
      }

      return {
        caMonth,
        caPrev,
        caEvolution,
        top5,
        newClients: clientsMonth.count ?? 0,
        months6,
      };
    },
  });
}
