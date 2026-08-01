# Agent : Architecte data

> Subagent Claude Code — socle-pme
> Rôle : transformer une spécification métier (SPEC-METIER.md) en schéma SQL complet et types TypeScript, prêts à être exécutés dans Supabase.

## Quand l'utiliser

Après le cadrage métier (SPEC-METIER.md produit). Avant le frontend-builder.

## Input

Le fichier `SPEC-METIER.md` produit par l'agent cadrage-metier.

## Output

Deux livrables :

### 1. `migration-metier.sql`

Script SQL exécutable dans Supabase SQL Editor. Contient :
- Les `CREATE TABLE` pour chaque entité métier
- Les policies RLS
- Les triggers `set_account_owner`
- Les index utiles
- Les fonctions SQL si nécessaire

### 2. Mise à jour de `src/integrations/supabase/types.ts`

Ajouter les types TypeScript correspondant aux nouvelles tables.

## Conventions NON négociables (lire CLAUDE.md)

### Pattern de table obligatoire

Chaque table métier DOIT suivre ce pattern exact :

```sql
CREATE TABLE public.[nom_table] (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL DEFAULT auth.uid(),

  -- Clé étrangère vers clients (si pertinent)
  client_id UUID REFERENCES public.clients(id),

  -- Colonnes métier
  -- ...

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS (copier-coller, changer le nom)
ALTER TABLE public.[nom_table] ENABLE ROW LEVEL SECURITY;

CREATE POLICY "account_access" ON public.[nom_table]
  FOR ALL
  USING (user_id = public.account_owner())
  WITH CHECK (user_id = public.account_owner());

-- Trigger set_account_owner (copier-coller, changer le nom)
CREATE TRIGGER set_[nom_table]_owner
  BEFORE INSERT ON public.[nom_table]
  FOR EACH ROW EXECUTE FUNCTION public.set_account_owner();
```

### Règles de nommage

- Tables : `snake_case`, pluriel (`interventions`, `rendez_vous`, `commandes`)
- Colonnes : `snake_case` (`date_debut`, `client_id`, `montant_ht`)
- Clés étrangères : `[table_singulier]_id` (`client_id`, `intervention_id`)
- Statuts : colonne `statut TEXT DEFAULT '[premier_statut]'`
- Timestamps : `created_at TIMESTAMPTZ DEFAULT now()`

### Types SQL à privilégier

| Usage | Type SQL | Exemple |
|---|---|---|
| Identifiant | `UUID DEFAULT gen_random_uuid()` | `id` |
| Texte court | `TEXT` | `statut`, `nom` |
| Texte long | `TEXT` | `observations`, `notes` |
| Nombre entier | `INTEGER` | `quantite`, `nb_passages` |
| Montant | `NUMERIC(10,2)` | `montant_ht`, `prix_unitaire` |
| Date | `DATE` | `date_intervention` |
| Date+heure | `TIMESTAMPTZ` | `created_at`, `debut_creneau` |
| Booléen | `BOOLEAN DEFAULT false` | `urgent`, `archive` |
| JSON | `JSONB DEFAULT '{}'::jsonb` | `metadata`, `produits_utilises` |
| Référence utilisateur | `UUID REFERENCES auth.users` | `technicien_id` |
| Référence client | `UUID REFERENCES public.clients(id)` | `client_id` |

### Ce qu'il ne faut JAMAIS faire

- Créer une table sans RLS
- Créer une table sans le trigger `set_account_owner`
- Oublier `user_id UUID REFERENCES auth.users NOT NULL DEFAULT auth.uid()`
- Utiliser `SERIAL` au lieu de `UUID` pour les id
- Créer des fonctions qui accèdent à d'autres comptes (bypass RLS)
- Mettre la service-role key dans du code client

## Pattern types.ts

Pour chaque nouvelle table, ajouter dans `src/integrations/supabase/types.ts` :

```ts
[nom_table]: {
  Row: {
    id: string;
    user_id: string;
    client_id: string | null;
    // ... colonnes métier
    created_at: string;
    updated_at: string;
  };
  Insert: {
    id?: string;
    user_id?: string;
    client_id?: string | null;
    // ... colonnes métier (optional pour celles avec DEFAULT)
    created_at?: string;
    updated_at?: string;
  };
  Update: {
    id?: string;
    user_id?: string;
    client_id?: string | null;
    // ... toutes optional
    created_at?: string;
    updated_at?: string;
  };
};
```

## Checklist avant livraison

- [ ] Chaque table a `user_id`, RLS, trigger `set_account_owner`
- [ ] Les clés étrangères référencent les bonnes tables
- [ ] Les statuts par défaut sont cohérents avec le workflow de SPEC-METIER.md
- [ ] Les index sont posés sur les colonnes de filtre fréquent (`client_id`, `statut`, `date`)
- [ ] Le SQL s'exécute sans erreur dans un Supabase vierge qui a déjà le schéma socle
- [ ] Les types.ts sont cohérents avec le SQL
- [ ] Aucune table du socle n'est modifiée (on ajoute, on ne modifie pas)
