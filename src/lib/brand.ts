// src/lib/brand.ts
// ─────────────────────────────────────────────
// FICHIER DE PERSONNALISATION UNIQUE
// Modifier ce fichier pour adapter l'app à un métier/client.
// C'est le SEUL fichier à modifier pour le branding de base.
// ─────────────────────────────────────────────

/** Nom de l'application — affiché dans le header, les onglets, les PDF. */
export const APP_NAME = "Flash Pneu";

/** Sous-titre du header mobile — décrit le métier en quelques mots. */
export const APP_TAGLINE = "Vente • Montage • Dépannage 24/7";

/** Sous-titre affiché dans le header du TechShell (interface terrain). */
export const TECH_TAGLINE = "Espace technicien";

/** Icône par défaut dans le header quand il n'y a pas de logo uploadé.
 *  Importer depuis lucide-react. Exemples : Bug, Scissors, Car, Wrench, Store.
 *  Flash Pneu utilise Wrench (montage/dépannage). */
export { Wrench as DefaultIcon } from "lucide-react";

/** Domaine email pour les comptes employés internes (Supabase Auth).
 *  Ne pas changer sauf raison technique. */
export const EMPLOYEE_EMAIL_DOMAIN = "team.app.local";

/** Route de repli quand un employé n'a pas accès à une page.
 *  Le socle redirige vers "/" (dashboard). Un métier peut changer. */
export const FALLBACK_ROUTE = "/";

/** Labels personnalisables pour la navigation terrain (TechShell).
 *  Les routes restent les mêmes, seuls les labels changent.
 *  Exemples : "Mon camion" → "Mon stock", "Ma journée" → "Mes missions". */
export const TECH_NAV_LABELS = {
  home: "Ma journée",
  stock: "Mon camion",
} as const;
