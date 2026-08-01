# MODULES.md — Comment ajouter un métier au socle

> Guide pas-à-pas pour transformer le socle en application de gestion pour un métier spécifique.
> Chaque section correspond à une étape du workflow. L'ordre est important.

## Étape 0 : Fork + personnalisation de base

```bash
# Créer le nouveau repo depuis le socle
git clone git@github.com:Salon-TY/socle-pme.git mon-projet-metier
cd mon-projet-metier
git remote set-url origin git@github.com:Salon-TY/mon-projet-metier.git
```

Modifier `src/lib/brand.ts` :
```ts
export const APP_NAME = "Nom de l'app";
export const APP_TAGLINE = "Sous-titre métier";
export const EMPLOYEE_EMAIL_DOMAIN = "team.app.local";
```

Modifier les tokens de couleur dans `src/styles.css` (section `:root`) si le client a une charte graphique différente. Le socle utilise un thème violet/gris neutre par défaut.

## Étape 1 : Cadrage métier

Avant d'écrire du code, faire un cadrage complet avec l'agent `cadrage-metier` ou manuellement. Le livrable est un document structuré qui répond à :

1. **Entités** : quelles "choses" le métier gère ? (ex. dératisation → interventions, contrats ; coiffure → rendez-vous, prestations ; pneus → commandes, véhicules)
2. **Statuts/workflow** : quels états traversent ces entités ? (ex. planifiée → en cours → terminée → vérifiée)
3. **Rôles terrain** : est-ce qu'il y a des opérateurs sur le terrain ? Que voient-ils ? Que peuvent-ils faire ?
4. **Documents PDF** : quels documents faut-il générer ? (ex. devis, facture, rapport, certificat, bon de commande)
5. **Vocabulaire** : comment le client appelle chaque concept ? (ex. "intervention" vs "chantier" vs "rendez-vous" vs "commande")
6. **Permissions** : quels modules doivent être contrôlables par permission ?

## Étape 2 : Base de données (tables métier)

Créer les tables dans Supabase SQL Editor. Chaque table métier DOIT suivre ce pattern :

```sql
-- Exemple : table "missions" pour un métier de service
CREATE TABLE public.missions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL DEFAULT auth.uid(),
  -- colonnes métier
  client_id UUID REFERENCES public.clients(id),
  date DATE NOT NULL,
  statut TEXT DEFAULT 'planifiee',
  -- ... autres colonnes spécifiques
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS obligatoire (copier-coller, changer le nom de la table)
ALTER TABLE public.missions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "account members full access" ON public.missions
  USING (user_id = public.account_owner())
  WITH CHECK (user_id = public.account_owner());

-- Trigger set_account_owner obligatoire
CREATE TRIGGER set_missions_owner
  BEFORE INSERT ON public.missions
  FOR EACH ROW EXECUTE FUNCTION public.set_account_owner();
```

Mettre à jour `src/integrations/supabase/types.ts` avec les types des nouvelles tables.

## Étape 3 : Permissions

Ajouter les nouvelles clés dans `src/lib/permissions.ts` :

```ts
export type PermissionKey =
  // Clés du socle (ne pas toucher)
  | "accueil" | "clients" | "devis" | "factures"
  | "stock" | "reappro" | "tresorerie" | "stats" | "parametres" | "export"
  // Clés métier (ajouter ici)
  | "missions" | "planning";

export const PERMISSION_LABELS: Record<PermissionKey, string> = {
  // Socle (garder tel quel)
  accueil: "Accueil / Tableau de bord",
  clients: "Clients",
  // ...
  // Métier (ajouter ici)
  missions: "Missions",
  planning: "Planning",
};
```

## Étape 4 : Routes

Créer les fichiers de route dans `src/routes/`. Convention de nommage :

- Route admin : `_app.missions.index.tsx`, `_app.missions.$id.tsx`, `_app.missions.new.tsx`
- Route terrain : `tech.missions.index.tsx`, `tech.missions.$id.tsx`

**NE PAS OUBLIER** : ajouter chaque route dans `src/routeTree.gen.ts` à la main.

Chaque route admin protégée par permission :
```tsx
import { PermissionGate } from "@/components/permission-gate";

function MissionsPage() {
  return (
    <PermissionGate perm="missions">
      {/* contenu de la page */}
    </PermissionGate>
  );
}
```

## Étape 5 : Navigation

Ajouter les entrées de navigation dans `src/components/app-shell.tsx` :

```ts
// Dans mainNavItems ou moreNavItems, selon l'importance
const moreNavItems = [
  // ... items existants
  { to: "/missions", label: "Missions", icon: ClipboardList, perm: "missions" },
  { to: "/planning", label: "Planning", icon: CalendarDays, perm: "planning" },
];
```

Pour le TechShell (si le métier a des opérateurs terrain), ajouter dans `src/components/tech-shell.tsx` :
```ts
const techNavItems = [
  { to: "/tech", label: "Ma journée", icon: LayoutDashboard, exact: true },
  { to: "/tech/missions", label: "Mes missions", icon: ClipboardList },
  { to: "/tech/camion", label: "Mon stock", icon: Truck },
];
```

## Étape 6 : Queries & schemas

Ajouter les hooks dans `src/lib/queries.ts` (suivre le pattern existant) :
```ts
export function useMissions(options?: { page?: number; pageSize?: number }) {
  return useQuery({
    queryKey: ["missions", options],
    queryFn: async () => {
      let q = db.from("missions").select("*, client:clients(raison_sociale)", { count: "exact" })
        .order("date", { ascending: false });
      // ... pagination si options fournies
      const { data, error, count } = await q;
      if (error) throw error;
      return options?.page != null ? { rows: data ?? [], total: count ?? 0 } : data ?? [];
    },
  });
}
```

Ajouter les schémas Zod dans `src/lib/schemas.ts` :
```ts
export const STATUTS_MISSION = [
  { value: "planifiee", label: "À faire" },
  { value: "en_cours", label: "En cours" },
  { value: "terminee", label: "Terminée" },
] as const;

export const missionSchema = z.object({
  client_id: z.string().uuid("Client requis"),
  date: z.string().min(1, "Date requise"),
  statut: z.string().default("planifiee"),
  // ...
});
```

## Étape 7 : PDF (si nécessaire)

Utiliser `src/lib/print.ts` pour les documents :
```ts
import { printDocument } from "@/lib/print";

printDocument({
  title: "Rapport de mission",
  bodyHtml: `<div>...</div>`,
  css: `/* CSS spécifique au document */`,
});
```

Le format est toujours : aperçu éditable (`contenteditable`) → bouton "Générer le PDF" → `window.print()` → impression/sauvegarde en PDF. Format A4, marges 14mm×15mm.

## Étape 8 : Dashboard

Enrichir le dashboard (`src/routes/_app.index.tsx`) avec des données métier :
- Ajouter des `StatCard` pour les métriques clés
- Ajouter des `AlertCard` pour les alertes métier
- Ajouter des `TaskCard` pour les tâches du jour

Le DashboardHero (CA du mois) fonctionne déjà via les factures du socle.

## Check-list finale

- [ ] `bun run build` passe sans erreur
- [ ] brand.ts personnalisé (nom, tagline)
- [ ] Toutes les nouvelles tables ont RLS + trigger set_account_owner
- [ ] Toutes les nouvelles routes sont dans routeTree.gen.ts
- [ ] Toutes les nouvelles permissions sont dans permissions.ts + PERMISSION_LABELS
- [ ] Chaque page admin est protégée par PermissionGate
- [ ] Le technicien ne peut accéder à aucune page _app.*
- [ ] types.ts à jour avec les nouvelles tables
- [ ] Aucune couleur Tailwind en dur (tout via tokens CSS)
- [ ] Aucune valeur codée en dur de l'ancien métier ne subsiste
- [ ] Test en local avec `bun run dev` validé visuellement
