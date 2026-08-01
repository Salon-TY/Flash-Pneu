-- ═══════════════════════════════════════════════════════════════════════
-- Flash Pneu — Migration Lot 1+2
-- À exécuter manuellement dans Supabase > SQL Editor.
-- ═══════════════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────────────
-- PARTIE 0 — Nettoyage du schéma hérité de derat-saas
-- ───────────────────────────────────────────────────────────────────────
-- schema.sql (copié tel quel depuis le socle-pme, jamais nettoyé côté DB en
-- Phase 1 du socle — chirurgie strictement "code-only") contient encore les
-- tables/colonnes spécifiques dératisation : `contracts`, `produits_biocides`,
-- une table `interventions` avec des colonnes dératisation (type_nuisible,
-- type_intervention DEFAULT 'Dératisation'...), et des colonnes orphelines
-- (`clients.type_nuisible`, `company_settings.numero_certibiocide` /
-- `nom_technicien`, `invoices.intervention_id`, `stock_movements.intervention_id`)
-- déjà retirées du code applicatif Flash Pneu/socle mais encore présentes en base.
--
-- Sans ce nettoyage, le "CREATE TABLE public.interventions" de la Partie 3
-- échouerait (la table existe déjà, avec le mauvais schéma) et les nouveaux
-- comptes hériteraient de presets de service "Dératisation standard" /
-- "Traitement punaises de lit" absurdes pour un pneumaticien.

DROP TABLE IF EXISTS public.produits_biocides CASCADE;
DROP TABLE IF EXISTS public.interventions CASCADE; -- CASCADE supprime aussi les FK invoices/stock_movements → interventions et l'index contract_id
DROP TABLE IF EXISTS public.contracts CASCADE;

ALTER TABLE public.invoices DROP COLUMN IF EXISTS intervention_id;
ALTER TABLE public.stock_movements DROP COLUMN IF EXISTS intervention_id;
ALTER TABLE public.clients DROP COLUMN IF EXISTS type_nuisible;
ALTER TABLE public.company_settings DROP COLUMN IF EXISTS numero_certibiocide;
ALTER TABLE public.company_settings DROP COLUMN IF EXISTS nom_technicien;

-- Presets de service par défaut à l'inscription : remplace les presets
-- dératisation par des presets Flash Pneu (mêmes montants que
-- PRESTATIONS_ADDITIONNELLES dans src/lib/schemas.ts, pour cohérence).
CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  INSERT INTO public.company_settings (user_id, nom)
    VALUES (NEW.id, '')
    ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.service_presets (user_id, label, description, prix_unitaire_ht, ordre) VALUES
    (NEW.id, 'Montage pneu (forfait)', 'Montage + équilibrage inclus', 70.00, 1),
    (NEW.id, 'Équilibrage (par roue)', '', 15.00, 2),
    (NEW.id, 'Réparation crevaison', '', 40.00, 3),
    (NEW.id, 'Dépannage batterie', '', 80.00, 4)
    ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

-- ───────────────────────────────────────────────────────────────────────
-- PARTIE 1 — Colonnes pneu sur stock_products
-- ───────────────────────────────────────────────────────────────────────

ALTER TABLE public.stock_products
  ADD COLUMN IF NOT EXISTS dimension TEXT,
  ADD COLUMN IF NOT EXISTS marque TEXT,
  ADD COLUMN IF NOT EXISTS modele TEXT,
  ADD COLUMN IF NOT EXISTS saison TEXT DEFAULT 'ete',
  ADD COLUMN IF NOT EXISTS indice_charge TEXT,
  ADD COLUMN IF NOT EXISTS indice_vitesse TEXT,
  ADD COLUMN IF NOT EXISTS dot TEXT,
  ADD COLUMN IF NOT EXISTS etat TEXT DEFAULT 'neuf',
  ADD COLUMN IF NOT EXISTS diametre_pouce INTEGER,
  ADD COLUMN IF NOT EXISTS photo_url TEXT,
  ADD COLUMN IF NOT EXISTS emplacement TEXT;

CREATE INDEX IF NOT EXISTS idx_stock_products_dimension ON public.stock_products(dimension);
CREATE INDEX IF NOT EXISTS idx_stock_products_marque ON public.stock_products(marque);
CREATE INDEX IF NOT EXISTS idx_stock_products_saison ON public.stock_products(saison);

-- ───────────────────────────────────────────────────────────────────────
-- PARTIE 2 — Enrichissement clients
-- ───────────────────────────────────────────────────────────────────────

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS type_client TEXT DEFAULT 'particulier',
  ADD COLUMN IF NOT EXISTS canal_origine TEXT,
  ADD COLUMN IF NOT EXISTS tarifs_negocies JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS etiquettes TEXT[] DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_clients_type ON public.clients(type_client);

-- ───────────────────────────────────────────────────────────────────────
-- PARTIE 3 — Table véhicules
-- ───────────────────────────────────────────────────────────────────────

CREATE TABLE public.vehicules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL DEFAULT auth.uid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  marque TEXT NOT NULL,
  modele TEXT,
  immatriculation TEXT,
  dimension_pneus TEXT,
  kilometrage INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.vehicules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "account_access" ON public.vehicules
  FOR ALL
  USING (user_id = public.account_owner())
  WITH CHECK (user_id = public.account_owner());

CREATE TRIGGER set_vehicules_owner
  BEFORE INSERT ON public.vehicules
  FOR EACH ROW EXECUTE FUNCTION public.set_account_owner();

CREATE INDEX IF NOT EXISTS idx_vehicules_client ON public.vehicules(client_id);
CREATE INDEX IF NOT EXISTS idx_vehicules_immat ON public.vehicules(immatriculation);

-- ───────────────────────────────────────────────────────────────────────
-- PARTIE 4 — Table interventions (Flash Pneu)
-- ───────────────────────────────────────────────────────────────────────

CREATE TABLE public.interventions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL DEFAULT auth.uid(),
  client_id UUID REFERENCES public.clients(id),
  vehicule_id UUID REFERENCES public.vehicules(id),
  technicien_id UUID REFERENCES auth.users,
  devis_id UUID REFERENCES public.devis(id),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  heure_prevue TEXT,
  adresse TEXT,
  statut TEXT DEFAULT 'a_affecter',
  type_prestation TEXT DEFAULT 'montage',
  pneus_prevus JSONB DEFAULT '[]'::jsonb,
  pneus_utilises JSONB DEFAULT '[]'::jsonb,
  observations TEXT,
  photos_avant TEXT[] DEFAULT '{}',
  photos_apres TEXT[] DEFAULT '{}',
  signature_client TEXT,
  heure_debut TIMESTAMPTZ,
  heure_fin TIMESTAMPTZ,
  urgence BOOLEAN DEFAULT false,
  majoration TEXT,
  montant_total NUMERIC(10,2),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.interventions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "account_access" ON public.interventions
  FOR ALL
  USING (user_id = public.account_owner())
  WITH CHECK (user_id = public.account_owner());

CREATE TRIGGER set_interventions_owner
  BEFORE INSERT ON public.interventions
  FOR EACH ROW EXECUTE FUNCTION public.set_account_owner();

CREATE INDEX IF NOT EXISTS idx_interventions_date ON public.interventions(date);
CREATE INDEX IF NOT EXISTS idx_interventions_statut ON public.interventions(statut);
CREATE INDEX IF NOT EXISTS idx_interventions_client ON public.interventions(client_id);
CREATE INDEX IF NOT EXISTS idx_interventions_technicien ON public.interventions(technicien_id);
