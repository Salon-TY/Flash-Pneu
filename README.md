# socle-pme

Template SaaS multi-tenant de gestion pour PME et commerces de proximité.

## Stack

- **Frontend** : TanStack Start + React 19 + shadcn/ui + Tailwind
- **Backend** : Supabase (Auth, Database, Storage, RLS)
- **Déploiement** : Netlify (auto-deploy sur push `main`)
- **Runtime** : bun

## Démarrage rapide

1. Forker ce repo
2. Créer un projet Supabase et exécuter `schema.sql`
3. Configurer les variables d'environnement Netlify :
   - `SUPABASE_URL`
   - `SUPABASE_PUBLISHABLE_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
4. Personnaliser `src/lib/brand.ts` (nom, tagline, icône)
5. `bun install && bun run dev`

## Personnaliser pour un métier

Voir [MODULES.md](./MODULES.md) pour le guide complet.

Les 5 fichiers à modifier en priorité :
1. `src/lib/brand.ts` — nom, tagline, icône, labels
2. `src/lib/permissions.ts` — ajouter les permissions métier
3. `src/routes/` — ajouter les pages métier
4. `src/components/app-shell.tsx` — ajouter les nav items
5. `schema.sql` — ajouter les tables métier (même pattern RLS)

## Modules inclus

- Auth multi-tenant (inscription, connexion, équipe)
- Dashboard (CA, alertes, actions rapides)
- Clients (CRUD, fiche détaillée)
- Facturation (CRUD, PDF, statuts)
- Devis (CRUD, PDF, conversion en facture)
- Stock (catalogue, niveaux garage/camion, mouvements, réappro)
- Équipe (membres, permissions par module)
- Paramètres (infos société)
- Trésorerie (vue financière)
- Statistiques (CA, clients, produits)
- Interface terrain (technicien/opérateur)

## Architecture

Voir [CLAUDE.md](./CLAUDE.md) pour la documentation technique complète.
