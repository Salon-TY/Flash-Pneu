# CLAUDE.md — Flash Pneu (gestion pneumaticien mobile Paris/IDF)

> Document de contexte pour Claude Code. À la racine du repo, il est lu automatiquement à chaque session. Tenir à jour au fil des évolutions.
>
> Ce repo est l'application de gestion **de production** pour Flash Pneu, pneumaticien mobile intervenant à domicile et en entreprise en Paris / Île-de-France (vente, montage, dépannage 24/7). Ce n'est plus un template : c'est un projet client fini, en exploitation.

## Le projet

Application de gestion pour Flash Pneu : interventions terrain (montage, dépannage), véhicules clients, stock de pneus (garage + camions techniciens), devis/factures, trésorerie, statistiques, et une interface dédiée pour les techniciens mobiles. Chaque compte est isolé par RLS (`account_owner()`).
- **Repo GitHub** : github.com/Salon-TY/Flash-Pneu (privé) — push sur `main` uniquement après validation.
- **Stack** : TanStack Start + React 19 + shadcn/ui + Supabase + Netlify + bun.
- **Design** : tokens OKLCH dans `src/styles.css`, couleur d'accent configurable via `brand.ts`, style premium inspiré Linear/Stripe/Fady (fond gris clair, cartes blanches arrondies, ombres douces, accent parcimonieux).

## Origine et lien avec le socle

Flash Pneu est un fork de [`socle-pme`](https://github.com/Salon-TY/socle-pme) (template SaaS multi-tenant générique), lui-même extrait de `derat-saas` (app de gestion pour dératiseurs) en retirant le code spécifique à ce premier métier. La couche métier Flash Pneu (interventions pneus, véhicules, stock pneus, vocabulaire) a été ajoutée par-dessus l'infrastructure générique du socle (auth multi-tenant, permissions, 2 shells, design system, facturation, devis, stock, clients, trésorerie, stats, PDF engine).

Cette généalogie reste pertinente même pour un projet fini : si un bug est découvert ici et qu'il vient du socle (pas de la couche métier Flash Pneu), il doit être corrigé **aussi** dans `socle-pme` — voir la règle « Capitalisation des bugs venant du socle » ci-dessous.

```
┌─────────────────────────────────────────────┐
│  COUCHE MÉTIER (Flash Pneu)                 │
│  interventions (montage/dépannage),         │
│  véhicules clients, stock pneus, PDF pneus  │
├─────────────────────────────────────────────┤
│  SOCLE (hérité de socle-pme)                │
│  Auth multi-tenant, permissions, 2 shells,  │
│  design system, facturation, devis, stock,  │
│  clients, trésorerie, stats, PDF engine     │
└─────────────────────────────────────────────┘
```

Fichiers modifiés par la couche métier Flash Pneu par rapport au socle nu : `src/lib/brand.ts`, `src/lib/permissions.ts`, `src/routes/` (routes interventions/véhicules/planning/analytique), `src/components/app-shell.tsx`, `schema.sql` + `migration-lot1.sql`, `src/integrations/supabase/types.ts`.

> Section héritée du socle, **non applicable ici** : la « Règle des 3 demandes » (descendre un module dans le socle quand 3 métiers différents en ont besoin) concerne l'arbitrage entre plusieurs projets métier — elle se pilote côté `socle-pme`, pas ici.

## Configuration — brand.ts

Personnalisation actuelle de Flash Pneu (`src/lib/brand.ts`) :
```ts
export const APP_NAME = "Flash Pneu";
export const APP_TAGLINE = "Vente • Montage • Dépannage 24/7";
export const TECH_TAGLINE = "Espace technicien";
export { Wrench as DefaultIcon } from "lucide-react";
export const EMPLOYEE_EMAIL_DOMAIN = "team.app.local";
export const FALLBACK_ROUTE = "/";
export const TECH_NAV_LABELS = { home: "Ma journée", stock: "Mon camion" };
```
Ce fichier reste le point d'entrée pour tout changement d'identité visuelle (nom, tagline, icône), mais il n'y a pas de nouveau métier à cadrer ici — Flash Pneu est le seul client de ce repo.

## Conventions NON négociables

### Architecture & sécurité

- **RÈGLE STRUCTURELLE — séparation des interfaces.** Deux shells coexistent :
  - `AppShell` (`src/components/app-shell.tsx`) = interface bureau (owner + employés bureau). Sidebar desktop + bottom nav mobile + menu "Plus".
  - `TechShell` (`src/components/tech-shell.tsx`) = interface terrain (techniciens). Bottom nav uniquement, jamais de sidebar — outil de terrain dédié.
  - Un technicien (`poste === 'technicien'`, non-owner) ne rend JAMAIS un composant `_app.*`. `_app.tsx` le redirige vers `/tech` avant de monter AppShell. `tech.tsx` redirige symétriquement tout non-technicien vers `/`.
  - Ne JAMAIS compter sur un masquage `can(...)` ou `if (isTechnician)` pour protéger un technicien — la page ne doit tout simplement pas exister dans son arbre de rendu.

- **RÈGLE PERMANENTE — permissions par module** : tout nouveau module admin (bureau/owner) doit venir avec :
  1. Sa clé dans `src/lib/permissions.ts` → `PermissionKey` + `PERMISSION_LABELS`
  2. Son filtrage dans la nav via `useMyAccess().can(...)`
  3. Sa protection par `PermissionGate` dans la route
  4. Sa case cochable dans la page Équipe (uniquement pour poste bureau — pour un technicien la section est désactivée avec une note explicative)

- **RLS multi-tenant** : chaque table de données a une policy `USING (user_id = account_owner())`. Le trigger `set_account_owner()` force `user_id = account_owner()` sur chaque INSERT. Les permissions applicatives (PermissionKey) sont des garde-fous UI côté client — la RLS ne les reflète pas (choix accepté pour la cible PME de confiance, documenté dans SAAS-TODO.md).

- **Service-role key** : JAMAIS côté client. Importer dynamiquement depuis `src/integrations/supabase/client.server.ts` DANS le handler serveur (jamais au niveau module d'un `.functions.ts`).

### Cohérence code↔base

- **RÈGLE PERMANENTE** : toute fonction/trigger référencé par le code DOIT avoir son `CREATE` dans un script SQL versionné (`schema.sql` ou `migration-lot1.sql`). Vérifier la cohérence code↔base à chaque livraison, jamais code-only.

### Capitalisation des bugs venant du socle

- **RÈGLE PERMANENTE** : quand un bug ou un piège est découvert sur ce projet, évaluer s'il vient du socle (`socle-pme`) ou de la couche métier Flash Pneu. Si le bug vient du socle : corriger la cause dans `socle-pme` (code + SQL versionné) ET documenter la leçon dans le CLAUDE.md de `socle-pme`, en plus de la correction ici. Une erreur corrigée uniquement ici mais pas dans le socle sera réhéritée par tous les futurs forks.

### Tooling & build

- **bun uniquement** (jamais npm). Build : `bun run build`. Publish dir : `dist/client`.
- **`src/routeTree.gen.ts` est géré À LA MAIN.** Le plugin TanStack Router ne le génère pas. Toute nouvelle route doit y être ajoutée manuellement. Piège : les fichiers `_prefix.*.tsx` (underscore) sont pathless.
- **`src/integrations/supabase/types.ts` est géré À LA MAIN** — mettre à jour à chaque changement de schéma DB.
- Les migrations SQL sont exécutées manuellement dans **Supabase > SQL Editor** (pas de `supabase db push`). Deux fichiers versionnés : `schema.sql` (base héritée du socle) + `migration-lot1.sql` (couche métier Flash Pneu : véhicules, interventions pneus, etc.).
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

## Tables de la base de données

Tables héritées du socle (`schema.sql`, toutes protégées par RLS `account_owner()`) :

| Table | Rôle | Notes |
|---|---|---|
| `company_settings` | Infos société | 1 ligne par compte |
| `team_members` | Équipe | owner/employé, poste bureau/technicien, permissions JSONB |
| `clients` | Fichier clients | Raison sociale, adresse, téléphone, email, SIRET, notes |
| `invoices` + `invoice_lines` | Facturation | Numéro auto-incrémenté, statuts brouillon/envoyée/payée/retard, TVA |
| `devis` + `devis_lines` | Devis | Statuts brouillon/envoyé/accepté/refusé/converti, TVA |
| `stock_products` | Catalogue stock (pneus) | Nom, unité, seuil d'alerte, prix d'achat |
| `stock_levels` | Niveaux de stock | Par emplacement (garage=NULL, camion=technicien_id) |
| `stock_movements` | Historique stock | Types : entrée, transfert, consommation, ajustement |
| `stock_requests` | Demandes de réappro | Technicien → bureau, workflow servir/refuser |

Tables ajoutées par la couche métier Flash Pneu (`migration-lot1.sql`) :

| Table | Rôle | Notes |
|---|---|---|
| `vehicules` | Véhicules clients | Marque, modèle, immatriculation, dimension pneus, kilométrage — liés à `clients` |
| `interventions` | Interventions terrain | Montage/dépannage — liées à `clients`, `vehicules`, `technicien_id`, `devis_id` |

> ⚠️ Note technique : `schema.sql` contient encore une ancienne définition de `interventions` (colonnes dératisation, `IF NOT EXISTS`) héritée de `derat-saas` — la définition réellement utilisée en base est celle de `migration-lot1.sql`. Ne pas se fier aux colonnes de `interventions` dans `schema.sql` pour ce projet.

Tables résiduelles de `derat-saas` présentes dans `schema.sql` mais **non utilisées** par Flash Pneu : `contracts`, `produits_biocides`, `relances`. À ne pas référencer dans du nouveau code.

## Modules & routes

| Module | Route(s) | Permission | Notes |
|---|---|---|---|
| Dashboard | `_app.index` | `accueil` | CA du mois, alertes, actions rapides |
| Clients | `_app.clients.*` | `clients` | CRUD + fiche détaillée |
| Véhicules | `_app.vehicules.*` | `vehicules` | Véhicules clients (marque, modèle, immat, dimension pneus) |
| Interventions | `_app.interventions.*` | `interventions` | Montage/dépannage, création + suivi |
| Planning | `_app.planning` | `planning` | Planification des interventions |
| Factures | `_app.factures.*` | `factures` | CRUD + PDF aperçu éditable |
| Devis | `_app.devis.*` | `devis` | CRUD + PDF aperçu éditable |
| Stock | `_app.stock.*` | `stock` | Catalogue pneus + niveaux garage/camions |
| Réappro | `_app.reappro.*` | `reappro` | Demandes technicien → bureau |
| Trésorerie | `_app.tresorerie` | `tresorerie` | Vue financière |
| Statistiques | `_app.stats` | `stats` | Stats par technicien, CA |
| Analytique | `_app.analytique` | `analytique` | Analyse approfondie |
| Équipe | `_app.equipe.*` | `equipe` (owner-only) | Gestion membres + permissions |
| Paramètres | `_app.parametres` | `parametres` | Infos société, presets, export |
| Auth | `auth` | — | Connexion identifiant/email + inscription owner |
| Onboarding | `_app.onboarding` | — | Saisie initiale infos société |
| Terrain | `tech.*` | — | Interface technicien (Ma journée, Mon camion, interventions) |

## Composants partagés

Composants de présentation pure (aucun n'appelle Supabase ni ne contient de logique métier), hérités du socle :

- **Layout** : `Header`, `Sidebar`, `BottomNav`, `PageLayout` (PageContainer, PageHeader, PageActions, PageSection, SectionTitle)
- **Cards** : `StatCard` (métrique cliquable), `AlertCard` (bannière tonalité), `TaskCard` (ligne tâche du jour), `QuickActionCard` (tuile action rapide), `DashboardHero` (carte CA dominante)
- **Fonctionnel** : `PermissionGate` (redirection si non autorisé), `SignatureCanvas` (saisie signature tactile), `Pager` (pagination)
- **Shells** : `AppShell` (bureau), `TechShell` (terrain)
- **PDF** : `print.ts` (aperçu éditable + `window.print()`, format A4)
- **ui/** : tous les primitives shadcn (Button, Card, Input, Badge, Table, Dialog, Sheet, Tabs, Select, etc.)

## Hooks & fichiers clés

- `src/lib/queries.ts` : `useCurrentRole`, `useMyAccess`, `useMyPoste`, `useTeamMembers`, `useAssignableMembers`, `useSettings`, `useDashboardStats`, `useClients`, `useInvoices`, `useQuotes`, `useStockLevels`, `useStockMovements`, `useStockRequests`, `useMyTodoCount`, `resolveTechnicianName`.
- `src/lib/schemas.ts` : schémas Zod (clientSchema, invoiceSchema, quoteSchema, settingsSchema, stockProductSchema), helpers (formatEUR, formatDateFR), statuts facture/devis.
- `src/lib/permissions.ts` : `PermissionKey` (dont `interventions`, `planning`, `vehicules`, `analytique`), `PERMISSION_LABELS`, `PRESET_BUREAU`, `presetToPermissions`.
- `src/lib/brand.ts` : APP_NAME, APP_TAGLINE, TECH_TAGLINE, EMPLOYEE_EMAIL_DOMAIN, FALLBACK_ROUTE, TECH_NAV_LABELS.
- `src/lib/team.ts` : normalizeUsername, usernameToEmail, USERNAME_RE.
- `src/lib/print.ts` : printDocument (PDF aperçu éditable).
- `src/lib/photos.ts` : upload/suppression dans Supabase Storage.

> Section héritée du socle, **non applicable ici** : le guide « Comment ajouter un métier » (fork du socle vers un nouveau client) vivait auparavant dans ce document et dans `MODULES.md`. Flash Pneu est un projet client fini — ce guide n'a plus d'usage ici. Pour forker vers un nouveau métier, se référer au CLAUDE.md de `socle-pme`.

## Subagents Claude Code

Specs dans `.claude/agents/` (chaque fichier = un prompt spécialisé) :

| Agent | Rôle | Input → Output |
|---|---|---|
| `cadrage-metier` | Conversation de découverte | Description métier → spec structurée (entités, statuts, workflow, vocabulaire) |
| `architecte-data` | Conception base de données | Spec métier → SQL (tables, RLS, triggers) + types.ts |
| `frontend-builder` | Développement UI | Spec + SQL → routes, composants, queries, permissions |
| `pdf-builder` | Templates de documents | Modèle de document → template PDF via print.ts |
| `reviewer-secu` | Relecture sécurité | Code complet → check-list RLS/permissions/fuites |

Robbie fait le lien entre les agents (copier-coller des outputs). Les agents ne communiquent pas entre eux.

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

✅ **Opérationnel** — Lot 1+2 livrés : stock, devis, interventions, interface terrain. Maintenance et évolutions au fil des besoins client.
