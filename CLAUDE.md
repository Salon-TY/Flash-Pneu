# CLAUDE.md — socle-pme (template SaaS multi-tenant pour PME)

> Document de contexte pour Claude Code. À la racine du repo, il est lu automatiquement à chaque session. Tenir à jour au fil des évolutions.
>
> Ce repo est un **template réutilisable** (le « socle ») à partir duquel on crée des applications de gestion sur-mesure pour des PME et commerces de proximité. Chaque nouveau projet métier est un fork de ce socle auquel on ajoute une **couche métier** spécifique (tables, routes, composants, vocabulaire).

## Origine

Extrait de `derat-saas` (app de gestion pour dératiseurs), en retirant tout le code spécifique au métier (interventions, contrats, produits biocides, certificats, workflow terrain dératisation) et en ne gardant que l'infrastructure générique. Le socle n'est PAS une app fonctionnelle en soi — c'est un squelette prêt à recevoir n'importe quel métier.

## Le projet

Template SaaS multi-tenant de gestion pour PME. Chaque compte est isolé par RLS (`account_owner()`). Pas encore en production — en phase de construction et validation.
- **Repo GitHub** : github.com/Salon-TY/socle-pme (privé) — push sur `main` uniquement après validation.
- **Stack** : TanStack Start + React 19 + shadcn/ui + Supabase + Netlify + bun.
- **Design** : tokens OKLCH dans `src/styles.css`, couleur d'accent configurable via `brand.ts`, style premium inspiré Linear/Stripe/Fady (fond gris clair, cartes blanches arrondies, ombres douces, accent parcimonieux).

## Architecture en 2 couches

```
┌─────────────────────────────────────────────┐
│  COUCHE MÉTIER (spécifique à un commerce)   │
│  Tables métier, routes métier, vocabulaire, │
│  PDF spécifiques, workflow terrain           │
├─────────────────────────────────────────────┤
│  SOCLE (ce repo)                            │
│  Auth multi-tenant, permissions, 2 shells,  │
│  design system, facturation, devis, stock,  │
│  clients, trésorerie, stats, PDF engine     │
└─────────────────────────────────────────────┘
```

**Règle d'or** : la couche métier **ajoute** du code au socle, elle ne le **modifie** jamais. Les seuls fichiers du socle qu'un projet métier modifie sont :
1. `src/lib/brand.ts` — identité visuelle et labels
2. `src/lib/permissions.ts` — ajout de nouvelles clés de permission (jamais supprimer les existantes)
3. `src/routes/` — ajout de nouvelles routes (+ mise à jour manuelle de `routeTree.gen.ts`)
4. `src/components/app-shell.tsx` — ajout de nav items pour les nouvelles routes
5. `schema.sql` — ajout de tables métier (jamais modifier les tables socle)
6. `src/integrations/supabase/types.ts` — ajout des types pour les nouvelles tables

**Règle des 3 demandes** : quand 3 projets métier différents ont besoin du même module (ex. réservation en ligne, chatbot IA, fidélité), on le descend dans le socle. Avant ça, c'est du code métier.

## Configuration — brand.ts

Fichier unique de personnalisation pour un projet métier :
```ts
// src/lib/brand.ts
export const APP_NAME = "Mon App";              // Titre de l'app
export const APP_TAGLINE = "Gestion simplifiée"; // Sous-titre dans le header mobile
export const EMPLOYEE_EMAIL_DOMAIN = "team.app.local"; // Domaine des emails employés internes
```

À terme, ce fichier s'enrichira (couleur primaire, gradient header, labels de navigation, etc.) mais il reste le SEUL point d'entrée de personnalisation non-code.

## Conventions NON négociables

### Architecture & sécurité

- **RÈGLE STRUCTURELLE — séparation des interfaces.** Deux shells coexistent :
  - `AppShell` (`src/components/app-shell.tsx`) = interface bureau (owner + employés bureau). Sidebar desktop + bottom nav mobile + menu "Plus".
  - `TechShell` (`src/components/tech-shell.tsx`) = interface terrain (techniciens/opérateurs). Bottom nav uniquement, jamais de sidebar — outil de terrain dédié.
  - Un technicien (`poste === 'technicien'`, non-owner) ne rend JAMAIS un composant `_app.*`. `_app.tsx` le redirige vers `/tech` avant de monter AppShell. `tech.tsx` redirige symétriquement tout non-technicien vers `/`.
  - Ne JAMAIS compter sur un masquage `can(...)` ou `if (isTechnician)` pour protéger un technicien — la page ne doit tout simplement pas exister dans son arbre de rendu.

- **RÈGLE PERMANENTE — permissions par module** : tout nouveau module admin (bureau/owner) doit venir avec :
  1. Sa clé dans `src/lib/permissions.ts` → `PermissionKey` + `PERMISSION_LABELS`
  2. Son filtrage dans la nav via `useMyAccess().can(...)`
  3. Sa protection par `PermissionGate` dans la route
  4. Sa case cochable dans la page Équipe (uniquement pour poste bureau — pour un technicien la section est désactivée avec une note explicative)

- **RLS multi-tenant** : chaque table de données a une policy `USING (user_id = account_owner())`. Le trigger `set_account_owner()` force `user_id = account_owner()` sur chaque INSERT. Les permissions applicatives (PermissionKey) sont des garde-fous UI côté client — la RLS ne les reflète pas (choix accepté pour la cible PME de confiance, documenté dans SAAS-TODO.md).

- **Service-role key** : JAMAIS côté client. Importer dynamiquement depuis `src/integrations/supabase/client.server.ts` DANS le handler serveur (jamais au niveau module d'un `.functions.ts`).

### Tooling & build

- **bun uniquement** (jamais npm). Build : `bun run build`. Publish dir : `dist/client`.
- **`src/routeTree.gen.ts` est géré À LA MAIN.** Le plugin TanStack Router ne le génère pas. Toute nouvelle route doit y être ajoutée manuellement. Piège : les fichiers `_prefix.*.tsx` (underscore) sont pathless — voir CLAUDE.md de derat-saas pour les détails du conflit de paths.
- **`src/integrations/supabase/types.ts` est géré À LA MAIN** — mettre à jour à chaque changement de schéma DB.
- Les migrations SQL sont exécutées manuellement dans **Supabase > SQL Editor** (pas de `supabase db push`).
- Variables Netlify (serveur) : `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`.

### Design & UI

- **Aucune couleur en dur** : uniquement les tokens OKLCH de `src/styles.css` (`--primary`, `--accent`, `--success`, `--warning`, `--destructive`, etc.). Toute couleur Tailwind littérale (orange-300, red-50) est un bug à corriger.
- **Échelle d'espacement stricte** : `8/12/16/24/32/40/48` (Tailwind `2/3/4/6/8/10/12`). Pas de valeur arbitraire sauf nécessité justifiée.
- **Zéro donnée inventée / fonctionnalité simulée** : pas de notifications (n'existe pas), pas d'avatar-photo (initiales uniquement), pas de graphique basé sur des données absentes.
- Avant de créer un composant : vérifier qu'aucun composant existant (ou shadcn natif) ne joue déjà ce rôle. Enrichir l'existant plutôt que dupliquer.

### Méthode de travail

Un assistant « planificateur » (côté chat Claude) produit : (a) le SQL à exécuter dans Supabase, (b) des prompts précis pour Claude Code. Claude Code applique dans le repo, build avec bun. Vérification via `bun run build`, puis test manuel par l'utilisateur (`bun run dev` en local).

**Commit/push** : ne jamais commiter ni pusher sans validation de l'utilisateur — Netlify redéploie automatiquement au moindre push sur `main`.

## Architecture base de données — multi-comptes

Le modèle : chaque donnée appartient à un **compte** (le patron), pas à un utilisateur isolé.

- **Fonctions SQL** :
  - `account_owner()` → l'id du compte patron de l'utilisateur courant (patron → son id ; employé actif → id du patron).
  - `current_user_role()` → `'owner'` | `'employe'` | `'disabled'`.
  - `set_account_owner()` → trigger BEFORE INSERT sur toutes les tables : force `user_id = account_owner()`.
  - `handle_new_user()` → trigger sur `auth.users` : crée `company_settings` à l'inscription.
- **`team_members`** : `id, owner_id, user_id, email, role ('owner'|'employe'), active, username, display_name, poste ('bureau'|'technicien'), permissions (jsonb), created_at`.
- **`company_settings`** : infos légales de la société (nom, SIRET, TVA, adresse, téléphone, email, IBAN/BIC, objectif CA). Lecture pour tout le compte, écriture owner uniquement.

## Tables du socle

Tables génériques incluses dans le template (toutes protégées par RLS `account_owner()`) :

| Table | Rôle | Notes |
|---|---|---|
| `company_settings` | Infos société | 1 ligne par compte |
| `team_members` | Équipe | owner/employé, poste bureau/technicien, permissions JSONB |
| `clients` | Fichier clients | Raison sociale, adresse, téléphone, email, SIRET, notes |
| `invoices` + `invoice_lines` | Facturation | Numéro auto-incrémenté, statuts brouillon/envoyée/payée/retard, TVA |
| `devis` + `devis_lines` | Devis | Statuts brouillon/envoyé/accepté/refusé/converti, TVA |
| `stock_products` | Catalogue stock | Nom, unité, seuil d'alerte, prix d'achat |
| `stock_levels` | Niveaux de stock | Par emplacement (garage=NULL, camion=technicien_id) |
| `stock_movements` | Historique stock | Types : entrée, transfert, consommation, ajustement |
| `stock_requests` | Demandes de réappro | Technicien → bureau, workflow servir/refuser |

La couche métier ajoute ses propres tables (ex. `interventions`, `contracts`, `reservations`...) en suivant le même pattern : `user_id UUID REFERENCES auth.users DEFAULT auth.uid()`, trigger `set_account_owner`, policy RLS `account_owner()`.

## Modules du socle (routes incluses)

| Module | Route(s) | Permission | Notes |
|---|---|---|---|
| Dashboard | `_app.index` | `accueil` | CA du mois, alertes, actions rapides |
| Clients | `_app.clients.*` | `clients` | CRUD + fiche détaillée |
| Factures | `_app.factures.*` | `factures` | CRUD + PDF aperçu éditable |
| Devis | `_app.devis.*` | `devis` | CRUD + PDF aperçu éditable |
| Stock | `_app.stock.*` | `stock` | Catalogue + niveaux garage/camions |
| Réappro | `_app.reappro.*` | `reappro` | Demandes technicien → bureau |
| Trésorerie | `_app.tresorerie` | `tresorerie` | Vue financière |
| Statistiques | `_app.stats` | `stats` | Stats par technicien, CA |
| Équipe | `_app.equipe.*` | `equipe` (owner-only) | Gestion membres + permissions |
| Paramètres | `_app.parametres` | `parametres` | Infos société, presets, export |
| Auth | `auth` | — | Connexion identifiant/email + inscription owner |
| Onboarding | `_app.onboarding` | — | Saisie initiale infos société |
| Terrain | `tech.*` | — | Interface technicien (Ma journée, Mon stock) |

## Composants partagés du socle

Composants de présentation pure (aucun n'appelle Supabase ni ne contient de logique métier) :

- **Layout** : `Header`, `Sidebar`, `BottomNav`, `PageLayout` (PageContainer, PageHeader, PageActions, PageSection, SectionTitle)
- **Cards** : `StatCard` (métrique cliquable), `AlertCard` (bannière tonalité), `TaskCard` (ligne tâche du jour), `QuickActionCard` (tuile action rapide), `DashboardHero` (carte CA dominante)
- **Fonctionnel** : `PermissionGate` (redirection si non autorisé), `SignatureCanvas` (saisie signature tactile), `Pager` (pagination)
- **Shells** : `AppShell` (bureau), `TechShell` (terrain)
- **PDF** : `print.ts` (aperçu éditable + `window.print()`, format A4)
- **ui/** : tous les primitives shadcn (Button, Card, Input, Badge, Table, Dialog, Sheet, Tabs, Select, etc.)

## Hooks & fichiers clés

- `src/lib/queries.ts` : `useCurrentRole`, `useMyAccess`, `useMyPoste`, `useTeamMembers`, `useAssignableMembers`, `useSettings`, `useDashboardStats`, `useClients`, `useInvoices`, `useQuotes`, `useStockLevels`, `useStockMovements`, `useStockRequests`, `useMyTodoCount`, `resolveTechnicianName`.
- `src/lib/schemas.ts` : schémas Zod (clientSchema, invoiceSchema, quoteSchema, settingsSchema, stockProductSchema), helpers (formatEUR, formatDateFR), statuts facture/devis.
- `src/lib/permissions.ts` : `PermissionKey`, `PERMISSION_LABELS`, `PRESET_BUREAU`, `presetToPermissions`.
- `src/lib/brand.ts` : APP_NAME, APP_TAGLINE, EMPLOYEE_EMAIL_DOMAIN.
- `src/lib/team.ts` : normalizeUsername, usernameToEmail, USERNAME_RE.
- `src/lib/print.ts` : printDocument (PDF aperçu éditable).
- `src/lib/photos.ts` : upload/suppression dans Supabase Storage.

## Comment ajouter un métier (guide couche métier)

Voir `MODULES.md` pour le guide complet. En résumé :

1. **Forker** ce repo → nouveau repo pour le client/métier
2. **brand.ts** : changer APP_NAME, APP_TAGLINE, couleurs
3. **SQL** : ajouter les tables métier dans Supabase (même pattern RLS)
4. **types.ts** : ajouter les types des nouvelles tables
5. **permissions.ts** : ajouter les clés pour les nouveaux modules
6. **Routes** : créer les fichiers `.tsx` + les enregistrer dans `routeTree.gen.ts`
7. **app-shell.tsx** : ajouter les nav items pour les nouvelles routes
8. **queries.ts** : ajouter les hooks pour les nouvelles tables
9. **schemas.ts** : ajouter les schémas Zod + constantes métier
10. **Build** : `bun run build` doit être vert avant tout commit

## Subagents Claude Code

Specs dans `.claude/agents/` (chaque fichier = un prompt spécialisé) :

| Agent | Rôle | Input → Output |
|---|---|---|
| `cadrage-metier` | Conversation de découverte | Description métier → spec structurée (entités, statuts, workflow, vocabulaire) |
| `architecte-data` | Conception base de données | Spec métier → SQL (tables, RLS, triggers) + types.ts |
| `frontend-builder` | Développement UI | Spec + SQL → routes, composants, queries, permissions |
| `pdf-builder` | Templates de documents | Modèle de document → template PDF via print.ts |
| `reviewer-secu` | Relecture sécurité | Code complet → check-list RLS/permissions/fuites |

Workflow séquentiel : cadrage → data → frontend → PDF → review. Robbie fait le lien entre les agents (copier-coller des outputs). Les agents ne communiquent pas entre eux.

## Pièges connus

Bugs déjà rencontrés et corrigés en prod — documentés pour ne pas les réintroduire. **Règle : à chaque bug corrigé, l'ajouter ici sans qu'on ait besoin de le demander.**

### Trigger `handle_new_user` jamais attaché à `auth.users`
- **Symptôme** : après inscription, `company_settings` reste vide pour le compte — l'onboarding ne peut rien mettre à jour (le bouton "Enregistrer" ne fait rien, en silence).
- **Cause** : `handle_new_user()` est bien définie dans `schema.sql`/`migration-lot1.sql`, mais aucun `CREATE TRIGGER ... AFTER INSERT ON auth.users` ne l'attache réellement en base — elle n'était jamais exécutée à l'inscription.
- **Règle** : après toute migration touchant un trigger sur `auth.users`, vérifier son attachement réel en base (pas juste sa définition dans le SQL versionné) ; côté code, ne jamais supposer qu'une ligne dépendante d'un trigger existe déjà — upsert plutôt qu'update nu.

### Fonction RPC `dashboard_money_stats` absente du SQL versionné
- **Symptôme** : 404 sur `/rest/v1/rpc/dashboard_money_stats` au chargement du dashboard, y compris avec la service role key (donc pas un problème de droits).
- **Cause** : la fonction est référencée dans `queries.ts` et déclarée dans `types.ts`, mais n'a jamais été créée par un `CREATE FUNCTION` dans `schema.sql` ni `migration-lot1.sql` — créée un jour à la main dans le SQL Editor, jamais versionnée.
- **Règle** : toute fonction/RPC créée à la main dans Supabase SQL Editor doit être copiée immédiatement dans un fichier de migration versionné, sinon elle disparaît des schémas de référence sans que personne ne puisse la recréer.

## Phase actuelle

🚧 **Phase 1 : Chirurgie** — retrait de tout le code spécifique dératisation (tables, routes, composants, vocabulaire, couleurs). Objectif : build vert avec un squelette fonctionnel mais vide de métier.
