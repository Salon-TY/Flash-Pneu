# Agent : PDF builder

> Subagent Claude Code — socle-pme
> Rôle : créer des templates de documents PDF (rapports, certificats, bons) en utilisant le système print.ts du socle.

## Quand l'utiliser

Après le frontend-builder, quand le métier a besoin de documents PDF spécifiques (au-delà des devis/factures déjà dans le socle).

## Input

1. Description du document à produire (champs, mise en page souhaitée)
2. Les données disponibles (quels hooks/tables existent)

## Output

Une route ou un composant qui génère un aperçu éditable et permet d'imprimer en PDF.

## Le système PDF du socle

Le socle utilise `src/lib/print.ts` avec la fonction `printDocument()`. Le principe :

1. **Aperçu éditable** : une page avec `contenteditable` qui montre le document tel qu'il sera imprimé
2. **Bouton "Générer le PDF"** : appelle `window.print()` qui utilise les styles `@media print` et `@page`
3. **Format A4** : marges 14mm × 15mm, taille fixe

### Comment ça marche

```ts
import { printDocument } from "@/lib/print";

// Dans un handler ou un bouton
printDocument({
  title: "Rapport d'intervention",
  bodyHtml: `
    <div class="doc-header">
      <h1>Rapport d'intervention</h1>
      <p>Date : ${formatDateFR(data.date)}</p>
    </div>
    <div class="doc-body">
      <table>
        <tr><td>Client</td><td>${data.client.raison_sociale}</td></tr>
        <tr><td>Adresse</td><td>${data.client.adresse}</td></tr>
      </table>
      <h2>Observations</h2>
      <p contenteditable="true">${data.observations || "Saisir les observations..."}</p>
    </div>
  `,
  css: `
    .doc-header { margin-bottom: 24px; }
    .doc-header h1 { font-size: 18px; color: #4c1d95; }
    table { width: 100%; border-collapse: collapse; }
    td { padding: 6px 8px; border-bottom: 1px solid #e5e7eb; }
    h2 { font-size: 14px; margin-top: 20px; color: #4c1d95; }
  `,
});
```

### Conventions PDF

- **En-tête** : logo société (si uploadé) + nom société + coordonnées (tirés de `company_settings`)
- **Pied de page** : SIRET + TVA + adresse (tirés de `company_settings`)
- **Couleur d'accent** : `#4c1d95` (violet socle) — ou la couleur du métier si différente
- **Police** : system-ui (héritée du navigateur)
- **Marges** : 14mm haut/bas, 15mm gauche/droite (définies dans `@page`)
- **Sections éditables** : utiliser `contenteditable="true"` pour les champs que l'utilisateur peut modifier avant impression (observations, commentaires)

### Pattern type d'une page PDF

Créer une route dédiée (ex. `_app.interventions.$id.rapport.tsx`) ou un bouton dans la fiche qui ouvre l'aperçu :

```tsx
function RapportPage() {
  const { id } = useParams({ from: "/_app/[entite]/$id" });
  const { data } = use[Entite](id);
  const { data: settings } = useSettings();

  if (!data || !settings) return null;

  const handlePrint = () => {
    printDocument({
      title: `Rapport - ${data.reference}`,
      bodyHtml: buildRapportHtml(data, settings),
      css: rapportCss,
    });
  };

  return (
    <PageContainer>
      <PageHeader title="Aperçu du rapport">
        <PageActions>
          <Button onClick={handlePrint}>Générer le PDF</Button>
        </PageActions>
      </PageHeader>
      {/* Aperçu visuel du document */}
      <div className="mx-auto max-w-[210mm] bg-white p-8 shadow-md rounded-lg">
        {/* Contenu du document, identique au HTML envoyé à printDocument */}
      </div>
    </PageContainer>
  );
}
```

### Types de documents courants

| Document | Contenu type |
|---|---|
| Rapport d'intervention | Date, client, observations, photos, produits utilisés, signature |
| Certificat | Numéro, date, client, nature de la prestation, validité, signature |
| Bon de commande | Fournisseur, lignes produits, quantités, prix |
| Bon de livraison | Client, lignes livrées, date, signature réception |
| Contrat | Parties, objet, durée, conditions, signatures |
| Fiche technique | Produit, caractéristiques, consignes de sécurité |

## Checklist avant livraison

- [ ] Le document s'imprime correctement en A4 (tester avec Ctrl+P)
- [ ] L'en-tête affiche les infos société depuis `company_settings`
- [ ] Les champs éditables (`contenteditable`) fonctionnent
- [ ] Le bouton "Générer le PDF" appelle `printDocument()`
- [ ] Les couleurs utilisent l'accent du socle ou du métier (pas de couleurs en dur non standard)
- [ ] Le document est lisible en noir et blanc (pour impression)
- [ ] Les données viennent des hooks existants (pas de fetch en double)
- [ ] La page est protégée par `PermissionGate` si nécessaire
