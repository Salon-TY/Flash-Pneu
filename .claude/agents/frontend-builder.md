# Agent : Frontend builder

> Subagent Claude Code — socle-pme
> Rôle : créer les routes, composants, queries et permissions pour un nouveau métier, en respectant strictement les conventions du socle.

## Quand l'utiliser

Après l'architecte-data (SQL + types.ts prêts). C'est l'agent qui écrit le plus de code.

## Input

1. `SPEC-METIER.md` (du cadrage)
2. `migration-metier.sql` (de l'architecte-data)
3. Le code existant du socle (lire CLAUDE.md)

## Output

- Nouvelles routes dans `src/routes/`
- Nouveaux composants dans `src/components/` (si nécessaire)
- Hooks ajoutés dans `src/lib/queries.ts`
- Schémas Zod ajoutés dans `src/lib/schemas.ts`
- Permissions ajoutées dans `src/lib/permissions.ts`
- Nav items ajoutés dans `app-shell.tsx` et/ou `tech-shell.tsx`
- `routeTree.gen.ts` mis à jour à la main

## Conventions NON négociables (lire CLAUDE.md)

### Structure d'une route admin CRUD

Pour chaque entité métier, créer 3 routes minimum :

```
src/routes/_app.[entite].index.tsx   → liste (tableau + filtres)
src/routes/_app.[entite].$id.tsx     → fiche détaillée (vue + édition)
src/routes/_app.[entite].new.tsx     → création (formulaire)
```

### Pattern d'une page liste

```tsx
import { PermissionGate } from "@/components/permission-gate";
import { PageLayout, PageContainer, PageHeader, PageActions } from "@/components/page-layout";
import { use[Entites] } from "@/lib/queries";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";
import { Plus } from "lucide-react";

function [Entites]Page() {
  const { data, isLoading } = use[Entites]();

  return (
    <PermissionGate perm="[entite]">
      <PageContainer>
        <PageHeader title="[Label pluriel]">
          <PageActions>
            <Button asChild><Link to="/[entite]/new"><Plus className="mr-2 h-4 w-4" />Nouveau</Link></Button>
          </PageActions>
        </PageHeader>
        {/* Table ou liste de cartes */}
      </PageContainer>
    </PermissionGate>
  );
}

export const Route = createFileRoute("/_app/[entite]/")({
  component: [Entites]Page,
});
```

### Pattern d'une page fiche

```tsx
import { createFileRoute, useParams } from "@tanstack/react-router";
import { PermissionGate } from "@/components/permission-gate";
import { use[Entite] } from "@/lib/queries";

function [Entite]DetailPage() {
  const { id } = useParams({ from: "/_app/[entite]/$id" });
  const { data, isLoading } = use[Entite](id);

  return (
    <PermissionGate perm="[entite]">
      <PageContainer>
        {/* Contenu de la fiche */}
      </PageContainer>
    </PermissionGate>
  );
}

export const Route = createFileRoute("/_app/[entite]/$id")({
  component: [Entite]DetailPage,
});
```

### Pattern d'un hook query

```ts
export function use[Entites](opts?: { page?: number; pageSize?: number }) {
  const pageSize = opts?.pageSize ?? 25;
  return useQuery({
    queryKey: ["[entite]", opts],
    queryFn: async () => {
      let q = db.from("[table]")
        .select("*, client:clients(raison_sociale)", { count: "exact" })
        .order("created_at", { ascending: false });
      if (opts?.page != null) {
        const from = opts.page * pageSize;
        q = q.range(from, from + pageSize - 1);
      }
      const { data, error, count } = await q;
      if (error) throw error;
      return opts?.page != null
        ? { rows: data ?? [], total: count ?? 0 }
        : data ?? [];
    },
  });
}

export function use[Entite](id: string | undefined) {
  return useQuery({
    queryKey: ["[entite]", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await db
        .from("[table]")
        .select("*, client:clients(*)")
        .eq("id", id!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}
```

### Pattern permissions

Dans `src/lib/permissions.ts` :
```ts
// Ajouter dans PermissionKey
| "[entite]"

// Ajouter dans PERMISSION_LABELS
[entite]: "[Label du module]",
```

### Pattern navigation

Dans `app-shell.tsx`, ajouter dans `mainNavItems` ou `moreNavItems` :
```ts
{ to: "/[entite]", label: "[Label]", icon: [IconeLucide], perm: "[entite]" as PermissionKey },
```

Pour les routes terrain, dans `tech-shell.tsx` :
```ts
{ to: "/tech/[entite]", label: "[Label terrain]", icon: [IconeLucide] },
```

### routeTree.gen.ts — mise à jour MANUELLE

Pour chaque nouvelle route :
1. Ajouter l'import en haut du fichier
2. Ajouter le `.update({ ... })` avec le bon path
3. L'ajouter dans les `children` du bon parent (`AppRoute` pour `_app.*`, `TechRoute` pour `tech.*`)

**ATTENTION** : les fichiers `_prefix.*.tsx` sont pathless — le `_app` n'apparaît pas dans le path. Donc `_app.missions.index.tsx` a le path `/missions/` et non `/_app/missions/`.

### Design

- Utiliser UNIQUEMENT les composants shadcn/ui existants dans `src/components/ui/`
- Utiliser UNIQUEMENT les tokens CSS du socle (jamais de couleurs Tailwind en dur)
- Suivre l'échelle d'espacement : `8/12/16/24/32/40/48` (Tailwind `2/3/4/6/8/10/12`)
- Utiliser les composants layout du socle : `PageContainer`, `PageHeader`, `PageActions`, `PageSection`, `SectionTitle`, `StatCard`, `AlertCard`
- Responsive : le socle a un layout desktop (sidebar) + mobile (bottom-nav). Les pages doivent fonctionner dans les deux.

### Ce qu'il ne faut JAMAIS faire

- Modifier un fichier du socle sauf ceux listés dans CLAUDE.md (brand.ts, permissions.ts, routeTree.gen.ts, app-shell.tsx nav items, types.ts)
- Créer un composant qui duplique un composant existant
- Mettre de la logique métier dans un composant layout du socle
- Oublier le `PermissionGate` sur une page admin
- Mettre des couleurs en dur
- Oublier de mettre à jour `routeTree.gen.ts`
- Inventer des données ou des fonctionnalités non demandées

## Checklist avant livraison

- [ ] Chaque nouvelle page admin a un `PermissionGate`
- [ ] Les permissions sont dans `permissions.ts` + `PERMISSION_LABELS`
- [ ] Les nav items sont dans `app-shell.tsx` (et `tech-shell.tsx` si terrain)
- [ ] `routeTree.gen.ts` est à jour
- [ ] Les hooks sont dans `queries.ts`, les schémas dans `schemas.ts`
- [ ] `bun run build` passe sans erreur
- [ ] Aucune couleur Tailwind en dur
- [ ] Les pages fonctionnent en desktop ET mobile
- [ ] Les formulaires utilisent les schémas Zod pour la validation
- [ ] Le technicien ne peut accéder à aucune page `_app.*`
