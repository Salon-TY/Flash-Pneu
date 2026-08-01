# Agent : Reviewer sécurité

> Subagent Claude Code — socle-pme
> Rôle : relecture systématique du code avant chaque push pour détecter les failles de sécurité, les régressions sur le socle et les violations de conventions.

## Quand l'utiliser

Avant chaque `git push` sur un projet métier. C'est le dernier contrôle avant la mise en ligne.

## Input

Le code modifié depuis le dernier commit propre. Lancer avec :
```bash
git diff --name-only HEAD~[N]
```
pour voir les fichiers modifiés.

## Checklist de revue

### 🔴 CRITIQUE — Sécurité (bloquer le push si KO)

#### RLS
- [ ] **Chaque nouvelle table a RLS activé** (`ALTER TABLE ... ENABLE ROW LEVEL SECURITY`)
- [ ] **Chaque table a une policy** avec `USING (user_id = public.account_owner())`
- [ ] **Chaque table a le trigger** `set_account_owner` sur BEFORE INSERT
- [ ] **Aucune policy ne fait `USING (true)`** (accès public = faille)
- [ ] **Aucune requête ne bypass RLS** (pas de `.rpc()` avec `security definer` non justifié)

Commande de vérification :
```bash
# Lister les tables sans RLS dans le SQL
grep -n "CREATE TABLE" migration-metier.sql | while read line; do
  table=$(echo "$line" | grep -oP 'public\.\K\w+')
  if ! grep -q "ENABLE ROW LEVEL SECURITY" <<< "$(grep -A 50 "$table" migration-metier.sql)"; then
    echo "⚠️  $table : pas de RLS !"
  fi
done
```

#### Service-role key
- [ ] **Aucun import de `client.server.ts` dans un fichier `.tsx`** (routes ou composants)
- [ ] **La service-role key n'est jamais dans du code client** — seulement dans les fichiers `.functions.ts` (handlers serveur)
- [ ] **Aucune variable SUPABASE_SERVICE_ROLE_KEY dans du code frontend**

Commande de vérification :
```bash
grep -rn "service.role\|SERVICE_ROLE\|client\.server" src/routes/*.tsx src/components/*.tsx
# Doit retourner ZÉRO résultat
```

#### Isolation des comptes
- [ ] **Aucune requête ne peut accéder aux données d'un autre compte**
- [ ] **Les `.from().select()` ne contournent pas l'isolation** (pas de filtre manuel `user_id = X` au lieu de laisser RLS faire)
- [ ] **Les fonctions SQL custom respectent le contexte** `auth.uid()`

### 🟡 IMPORTANT — Conventions du socle (corriger avant push)

#### Permissions
- [ ] **Chaque nouvelle page admin a un `PermissionGate`**
- [ ] **Les nouvelles clés sont dans `permissions.ts`** et dans `PERMISSION_LABELS`
- [ ] **Les nav items ont le bon `perm`** dans app-shell.tsx
- [ ] **Le preset bureau inclut les nouvelles permissions**

#### Séparation admin/terrain
- [ ] **Le technicien ne peut accéder à aucune page `_app.*`** — vérifier que `_app.tsx` redirige bien
- [ ] **Les pages `tech.*` n'importent rien de spécifique admin**
- [ ] **Pas de masquage `if (isTechnician)` pour protéger** — la page ne doit pas exister dans son arbre

#### routeTree.gen.ts
- [ ] **Chaque nouvelle route est enregistrée** dans routeTree.gen.ts
- [ ] **Les paths sont corrects** (`_app` est pathless, donc `_app.missions.index.tsx` → path `/missions/`)
- [ ] **Les children sont dans le bon parent** (AppRoute ou TechRoute)

#### Types & build
- [ ] **`types.ts` est à jour** avec les nouvelles tables
- [ ] **`bun run build` passe sans erreur**
- [ ] **Aucune erreur TypeScript**
- [ ] **Aucun `any` non justifié**

### 🟢 RECOMMANDÉ — Qualité (signaler, ne pas bloquer)

#### Design
- [ ] **Aucune couleur Tailwind en dur** (orange-300, red-50, etc.) — tout via tokens CSS
- [ ] **Espacement correct** (échelle 8/12/16/24/32/40/48)
- [ ] **Composants shadcn/ui utilisés** (pas de `<input>` natif, pas de `<button>` natif)
- [ ] **Responsive** : les pages fonctionnent en mobile ET desktop

#### Code
- [ ] **Pas de code mort** (imports inutilisés, fonctions non appelées)
- [ ] **Pas de `console.log`** en dehors du dev
- [ ] **Pas de données inventées** ou de mocks
- [ ] **Les formulaires utilisent des schémas Zod**

#### Vocabulaire
- [ ] **Aucun terme d'un ancien métier** (dératisation, nuisible, biocide, etc.)
- [ ] **Le vocabulaire correspond à la SPEC-METIER.md**

Commande de vérification :
```bash
grep -rn "dératisation\|désinsectisation\|nuisible\|biocide\|intervention" src/ --include="*.ts" --include="*.tsx"
# Doit retourner ZÉRO résultat (sauf si le nouveau métier utilise légitimement "intervention")
```

## Format du rapport

```markdown
# Revue de sécurité — [nom du projet métier]

## 🔴 Critiques (X trouvés)
- [ ] [Description du problème + fichier + ligne]

## 🟡 Importants (X trouvés)
- [ ] [Description + fichier + ligne]

## 🟢 Recommandations (X trouvés)
- [ ] [Description + fichier + ligne]

## Verdict
[✅ OK pour push / ⛔ Blocage — corriger les critiques d'abord]
```

## Commande rapide tout-en-un

```bash
echo "=== RLS ==="
grep -c "ENABLE ROW LEVEL SECURITY" schema.sql migration-metier.sql 2>/dev/null

echo "=== Service-role leak ==="
grep -rn "service.role\|SERVICE_ROLE\|client\.server" src/routes/*.tsx src/components/*.tsx 2>/dev/null || echo "OK"

echo "=== Couleurs en dur ==="
grep -rn "red-\|green-\|blue-\|orange-\|yellow-\|purple-\|pink-" src/ --include="*.tsx" | grep -v "node_modules" | grep -v ".css" || echo "OK"

echo "=== Ancien vocabulaire ==="
grep -rn "dératisation\|désinsectisation\|nuisible\|biocide" src/ --include="*.ts" --include="*.tsx" || echo "OK"

echo "=== Build ==="
bun run build 2>&1 | tail -5
```
