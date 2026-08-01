// Shell dédié aux techniciens — indépendant de app-shell.tsx.
// Volontairement minimal : 2 entrées de navigation, aucun accès aux pages
// admin (recherche, menu "Plus", paramètres, factures…).
// Toujours en navigation du bas, y compris sur grand écran : outil de terrain
// dédié, pas de sidebar (cf. décision d'architecture Phase B).
import { useNavigate } from "@tanstack/react-router";
import { LayoutDashboard, Truck, Wrench } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useSettings } from "@/lib/queries";
import { Header } from "@/components/header";
import { BottomNav } from "@/components/bottom-nav";
import { TECH_TAGLINE, TECH_NAV_LABELS } from "@/lib/brand";

const techNavItems: { to: string; label: string; icon: typeof LayoutDashboard; exact?: boolean }[] =
  [
    { to: "/tech", label: TECH_NAV_LABELS.home, icon: LayoutDashboard, exact: true },
    { to: "/tech/interventions", label: "Missions", icon: Wrench },
    { to: "/tech/camion", label: TECH_NAV_LABELS.stock, icon: Truck },
  ];

export function TechShell({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: settings } = useSettings();

  async function handleSignOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut({ scope: "local" });
    toast.success("Déconnecté");
    navigate({ to: "/auth", replace: true });
  }

  const navItems = techNavItems;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header settings={settings} tagline={TECH_TAGLINE} onSignOut={handleSignOut} />

      <main className="flex-1 pb-[calc(6rem+env(safe-area-inset-bottom))]">
        <div className="mx-auto max-w-5xl px-3 py-4 sm:px-4 sm:py-6 animate-in-up">{children}</div>
      </main>

      <BottomNav items={navItems} />
    </div>
  );
}
