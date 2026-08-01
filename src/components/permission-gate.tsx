// Wraps a protected page. If the current user may not see it, redirects to
// l'accueil — accordé par défaut à tout compte bureau (cf. PRESET_BUREAU).
// Contrairement au socle derat-saas d'origine, il n'existe plus de page
// "toujours visible" non gatée (c'était /interventions) : si un patron
// retire explicitement la permission "accueil" à un employé qui n'a que
// d'autres permissions, cette redirection peut boucler. Cas limite laissé
// tel quel pour l'instant — la couche métier pourra réintroduire une page
// toujours visible si besoin.
import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { useMyAccess } from "@/lib/queries";
import type { PermissionKey } from "@/lib/permissions";
import { FALLBACK_ROUTE } from "@/lib/brand";

export function PermissionGate({ perm, children }: { perm: PermissionKey; children: React.ReactNode }) {
  const { can, loading } = useMyAccess();
  const navigate = useNavigate();
  const allowed = can(perm);
  useEffect(() => {
    if (!loading && !allowed) {
      toast.error("Accès non autorisé.");
      navigate({ to: FALLBACK_ROUTE as any, replace: true });
    }
  }, [loading, allowed, navigate]);
  if (loading || !allowed) return null;
  return <>{children}</>;
}
