/* eslint-disable @typescript-eslint/no-explicit-any */
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Users,
  FileText,
  FileCheck,
  Settings,
  Package,
  Search,
  X,
  TrendingUp,
  MoreHorizontal,
  BarChart2,
  BarChart3,
  UserCog,
  PackagePlus,
  Wrench,
  Car,
  CalendarDays,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useState, useEffect, useRef } from "react";
import { db } from "@/lib/db";
import { formatEUR, formatDateFR, ressembleADimensionPneu } from "@/lib/schemas";
import { APP_TAGLINE } from "@/lib/brand";
import {
  useSettings,
  useMyAccess,
  useCurrentRole,
  useMyPoste,
} from "@/lib/queries";
import type { PermissionKey } from "@/lib/permissions";
import { Header } from "@/components/header";
import { Sidebar } from "@/components/sidebar";
import { BottomNav } from "@/components/bottom-nav";

const mainNavItems: {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  exact?: boolean;
  perm?: PermissionKey;
}[] = [
  { to: "/", label: "Accueil", icon: LayoutDashboard, exact: true, perm: "accueil" },
  { to: "/interventions", label: "Interventions", icon: Wrench, perm: "interventions" },
  { to: "/stock", label: "Pneus", icon: Package, perm: "stock" },
  { to: "/clients", label: "Clients", icon: Users, perm: "clients" },
];

const moreNavItems: {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  perm?: PermissionKey;
}[] = [
  { to: "/devis", label: "Devis", icon: FileCheck, perm: "devis" },
  { to: "/factures", label: "Factures", icon: FileText, perm: "factures" },
  { to: "/vehicules", label: "Véhicules", icon: Car, perm: "vehicules" },
  { to: "/planning", label: "Planning", icon: CalendarDays, perm: "planning" },
  { to: "/tresorerie", label: "Trésorerie", icon: TrendingUp, perm: "tresorerie" },
  { to: "/reappro", label: "Réappro", icon: PackagePlus, perm: "reappro" },
  { to: "/stats", label: "Statistiques", icon: BarChart2, perm: "stats" },
  { to: "/analytique", label: "Analytique", icon: BarChart3, perm: "analytique" },
  { to: "/parametres", label: "Paramètres", icon: Settings, perm: "parametres" },
];

type SearchResult = {
  type: "client" | "facture" | "pneu" | "intervention";
  id: string;
  label: string;
  sub: string;
  href: string;
};

function GlobalSearch({ onClose }: { onClose: () => void }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { can, loading: accessLoading } = useMyAccess();

  const accessResolved = !accessLoading;
  const canClients = accessResolved && can("clients");
  const canFactures = accessResolved && can("factures");
  const canStock = accessResolved && can("stock");
  const canInterventions = accessResolved && can("interventions");

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!q.trim()) {
      setResults([]);
      return;
    }
    // Tant que l'accès n'est pas résolu, on n'interroge rien pour éviter de
    // fuiter des résultats non autorisés le temps que l'accès se résolve.
    if (!accessResolved) return;
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const term = q.trim().toLowerCase();
        // Une saisie qui ressemble à une dimension pneu (ex. "205/55R16")
        // cherche exclusivement dans le stock par dimension — sinon on
        // cherche partout (clients, pneus par marque/modèle, interventions).
        const isDimension = ressembleADimensionPneu(term);

        const [clients, factures, facturesClient, pneus, interventions] = await Promise.all([
          canClients && !isDimension
            ? db
                .from("clients")
                .select("id, raison_sociale, adresse_site, telephone")
                .ilike("raison_sociale", `%${term}%`)
                .limit(5)
            : Promise.resolve({ data: [] as any[] }),
          canFactures && !isDimension
            ? db
                .from("invoices")
                .select("id, numero, total_ttc, statut, client:clients(raison_sociale)")
                .or(`numero.eq.${Number(term) || 0}`)
                .limit(5)
            : Promise.resolve({ data: [] as any[] }),
          // Also search factures by client name
          canFactures && !isDimension
            ? db
                .from("invoices")
                .select("id, numero, total_ttc, statut, client:clients(raison_sociale)")
                .limit(5)
            : Promise.resolve({ data: [] as any[] }),
          canStock
            ? (isDimension
                ? db
                    .from("stock_products")
                    .select("id, nom, dimension, marque, modele, quantite, unite")
                    .ilike("dimension", `%${term}%`)
                    .limit(8)
                : db
                    .from("stock_products")
                    .select("id, nom, dimension, marque, modele, quantite, unite")
                    .or(`dimension.ilike.%${term}%,marque.ilike.%${term}%,modele.ilike.%${term}%,nom.ilike.%${term}%`)
                    .limit(5))
            : Promise.resolve({ data: [] as any[] }),
          canInterventions && !isDimension
            ? db
                .from("interventions")
                .select("id, date, adresse, statut, client:clients(raison_sociale)")
                .ilike("adresse", `%${term}%`)
                .limit(5)
            : Promise.resolve({ data: [] as any[] }),
        ]);

        const out: SearchResult[] = [];

        for (const c of clients.data ?? []) {
          out.push({
            type: "client",
            id: c.id,
            label: c.raison_sociale,
            sub: c.adresse_site ?? c.telephone ?? "",
            href: `/clients/${c.id}`,
          });
        }

        const seenFac = new Set<string>();
        for (const f of [...(factures.data ?? []), ...(facturesClient.data ?? [])]) {
          if (seenFac.has(f.id)) continue;
          const clientName = (f.client as any)?.raison_sociale ?? "";
          if (!clientName.toLowerCase().includes(term) && !String(f.numero).includes(term))
            continue;
          seenFac.add(f.id);
          out.push({
            type: "facture",
            id: f.id,
            label: `Facture N°${f.numero} — ${formatEUR(f.total_ttc)}`,
            sub: clientName,
            href: `/factures/${f.id}`,
          });
        }

        for (const p of pneus.data ?? []) {
          out.push({
            type: "pneu",
            id: p.id,
            label: [p.marque, p.modele, p.dimension].filter(Boolean).join(" ") || p.nom,
            sub: `${p.quantite} ${p.unite} en stock`,
            href: "/stock",
          });
        }

        for (const i of interventions.data ?? []) {
          out.push({
            type: "intervention",
            id: i.id,
            label: (i.client as any)?.raison_sociale ?? i.adresse ?? "—",
            sub: `${formatDateFR(i.date)}${i.adresse ? ` · ${i.adresse}` : ""}`,
            href: `/interventions/${i.id}`,
          });
        }

        setResults(out.slice(0, 20));
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [q, accessResolved, canClients, canFactures, canStock, canInterventions]);

  function go(href: string) {
    navigate({ to: href as any });
    onClose();
  }

  const TYPE_ICON: Record<string, string> = {
    client: "👤",
    facture: "🧾",
    pneu: "🛞",
    intervention: "🔧",
  };

  const TYPE_LABEL: Record<string, string> = {
    client: "Clients",
    facture: "Factures",
    pneu: "Pneus",
    intervention: "Interventions",
  };

  const groups = ["client", "facture", "pneu", "intervention"] as const;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex flex-col items-center pt-16 px-4"
      onClick={onClose}
    >
      <div className="w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
        <div className="rounded-2xl bg-card shadow-2xl overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b">
            <Search className="h-4 w-4 text-muted-foreground shrink-0" />
            <input
              ref={inputRef}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Client, dimension pneu, facture, intervention…"
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              onKeyDown={(e) => e.key === "Escape" && onClose()}
            />
            {q && (
              <button
                onClick={() => setQ("")}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="max-h-[60vh] overflow-y-auto">
            {loading && (
              <div className="py-6 text-center text-sm text-muted-foreground">Recherche…</div>
            )}
            {!loading && q.trim() && results.length === 0 && (
              <div className="py-6 text-center text-sm text-muted-foreground">
                Aucun résultat pour « {q} »
              </div>
            )}
            {!loading && !q.trim() && (
              <div className="py-6 text-center text-sm text-muted-foreground">
                Tapez pour chercher…
              </div>
            )}
            {!loading && results.length > 0 && (
              <div className="py-2">
                {groups.map((type) => {
                  const items = results.filter((r) => r.type === type);
                  if (!items.length) return null;
                  return (
                    <div key={type}>
                      <div className="px-4 py-1.5 text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">
                        {TYPE_LABEL[type]}
                      </div>
                      {items.map((r) => (
                        <button
                          key={r.id}
                          onClick={() => go(r.href)}
                          className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted transition-colors text-left"
                        >
                          <span className="text-base">{TYPE_ICON[r.type]}</span>
                          <div className="min-w-0">
                            <div className="text-sm font-medium truncate">{r.label}</div>
                            {r.sub && (
                              <div className="text-xs text-muted-foreground truncate">{r.sub}</div>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
        <div className="mt-2 text-center text-xs text-white/60">Échap pour fermer</div>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [searchOpen, setSearchOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const { data: settings } = useSettings();
  const { can, loading: accessLoading } = useMyAccess();

  // Tant que l'accès n'est pas résolu, on masque les onglets à permission
  // pour éviter un flash "tout est affiché".
  const mainItems = mainNavItems.filter((item) => !item.perm || (!accessLoading && can(item.perm)));
  const filteredMore = moreNavItems.filter(
    (item) => !item.perm || (!accessLoading && can(item.perm)),
  );
  const moreItems =
    !accessLoading && can("equipe")
      ? [...filteredMore, { to: "/equipe", label: "Équipe", icon: UserCog }]
      : filteredMore;
  // Sur mobile, quatre accès directs (Accueil/Interventions/Pneus/Clients) +
  // "Plus" gardent une barre lisible à une main.
  const mobileMainItems = mainItems;
  const mobileMoreItems = moreItems;
  const hasMore = mobileMoreItems.length > 0;

  const searchAllowed =
    !accessLoading && (can("clients") || can("factures") || can("stock") || can("interventions"));

  async function handleSignOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut({ scope: "local" });
    toast.success("Déconnecté");
    navigate({ to: "/auth", replace: true });
  }

  const mobileMoreActive = mobileMoreItems.some(
    (item) => location.pathname === item.to || location.pathname.startsWith(item.to + "/"),
  );
  const bottomNavItems = mobileMainItems;

  return (
    <div className="flex min-h-screen bg-background">
      {searchOpen && <GlobalSearch onClose={() => setSearchOpen(false)} />}

      {/* Sidebar — desktop uniquement (≥ lg). Toutes les entrées sont visibles
          directement : contrairement à la bottom nav mobile, l'espace vertical
          ne nécessite pas de menu "Plus". */}
      <Sidebar
        primaryItems={mainItems}
        secondaryItems={moreItems}
        brandName={settings?.nom}
        logoUrl={settings?.logo_url}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <Header
          settings={settings}
          tagline={APP_TAGLINE}
          brandHref="/"
          onSearchClick={searchAllowed ? () => setSearchOpen(true) : undefined}
          showSettingsLink
          onSignOut={handleSignOut}
        />

        {/* Contenu de la page */}
        <main className="flex-1 bg-muted/20 pb-[calc(7rem+env(safe-area-inset-bottom))] lg:pb-12">
          <div className="mx-auto max-w-3xl px-4 py-5 animate-in-up lg:max-w-7xl lg:px-8 lg:py-6">
            {children}
          </div>
        </main>

        {/* Menu "Plus" — drawer depuis le bas, mobile uniquement (rendu seulement s'il reste des onglets en trop) */}
        {hasMore && moreOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
            onClick={() => setMoreOpen(false)}
          >
            <div
              className="absolute inset-x-0 bottom-0 overflow-hidden rounded-t-2xl bg-card shadow-elevated"
              style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b px-6 py-4">
                <span className="text-sm font-semibold">Plus</span>
                <button
                  onClick={() => setMoreOpen(false)}
                  className="grid h-11 w-11 place-items-center rounded-xl transition-all duration-200 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label="Fermer le menu Plus"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="grid grid-cols-3 gap-0 p-2">
                {mobileMoreItems.map((item) => {
                  const Icon = item.icon;
                  const active =
                    location.pathname === item.to || location.pathname.startsWith(item.to + "/");
                  return (
                    <Link
                      key={item.to}
                      to={item.to as any}
                      onClick={() => setMoreOpen(false)}
                      className={`flex flex-col items-center gap-2 rounded-xl px-3 py-4 transition-all duration-200 ${
                        active
                          ? "bg-accent/10 text-accent"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      }`}
                    >
                      <div
                        className={`grid h-10 w-10 place-items-center rounded-xl ${active ? "bg-accent/15" : "bg-muted"}`}
                      >
                        <Icon className={`h-5 w-5 ${active ? "stroke-[2.2]" : "stroke-[1.8]"}`} />
                      </div>
                      <span className={`text-xs font-medium ${active ? "font-bold" : ""}`}>
                        {item.label}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Bottom navigation — mobile uniquement ; onglets principaux + Plus (si des onglets débordent) */}
        <div className="lg:hidden">
          <BottomNav
            items={bottomNavItems}
            trailing={
              hasMore ? (
                <button
                  onClick={() => setMoreOpen((v) => !v)}
                  className={`relative flex flex-col items-center justify-center gap-2 py-3 text-[9px] font-medium transition-all duration-200 ${
                    mobileMoreActive || moreOpen
                      ? "text-accent"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <div
                    className={`grid h-8 w-8 place-items-center rounded-xl transition-all duration-200 ${mobileMoreActive || moreOpen ? "scale-105 bg-accent/12" : ""}`}
                  >
                    <MoreHorizontal
                      className={`h-[18px] w-[18px] transition-all duration-200 ${mobileMoreActive || moreOpen ? "stroke-[2.5]" : "stroke-[1.8]"}`}
                    />
                  </div>
                  <span className={mobileMoreActive || moreOpen ? "font-bold" : ""}>Plus</span>
                </button>
              ) : undefined
            }
          />
        </div>
      </div>
    </div>
  );
}
