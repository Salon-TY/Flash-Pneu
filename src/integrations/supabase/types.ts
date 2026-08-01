export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      clients: {
        Row: {
          adresse_site: string | null
          canal_origine: string | null
          created_at: string
          email: string | null
          etiquettes: string[]
          forme_juridique: string | null
          id: string
          notes: string | null
          raison_sociale: string
          rcs: string | null
          siren: string | null
          siret: string | null
          tarifs_negocies: Json
          telephone: string | null
          type_client: string
          updated_at: string
          user_id: string
        }
        Insert: {
          adresse_site?: string | null
          canal_origine?: string | null
          created_at?: string
          email?: string | null
          etiquettes?: string[]
          forme_juridique?: string | null
          id?: string
          notes?: string | null
          raison_sociale: string
          rcs?: string | null
          siren?: string | null
          siret?: string | null
          tarifs_negocies?: Json
          telephone?: string | null
          type_client?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          adresse_site?: string | null
          canal_origine?: string | null
          created_at?: string
          email?: string | null
          etiquettes?: string[]
          forme_juridique?: string | null
          id?: string
          notes?: string | null
          raison_sociale?: string
          rcs?: string | null
          siren?: string | null
          siret?: string | null
          tarifs_negocies?: Json
          telephone?: string | null
          type_client?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      company_settings: {
        Row: {
          adresse: string | null
          bic: string | null
          created_at: string
          email: string | null
          iban: string | null
          next_invoice_number: number
          nom: string
          siret: string | null
          telephone: string | null
          tva_number: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          adresse?: string | null
          bic?: string | null
          created_at?: string
          email?: string | null
          iban?: string | null
          next_invoice_number?: number
          nom?: string
          siret?: string | null
          telephone?: string | null
          tva_number?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          adresse?: string | null
          bic?: string | null
          created_at?: string
          email?: string | null
          iban?: string | null
          next_invoice_number?: number
          nom?: string
          siret?: string | null
          telephone?: string | null
          tva_number?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      vehicules: {
        Row: {
          client_id: string | null
          created_at: string
          dimension_pneus: string | null
          id: string
          immatriculation: string | null
          kilometrage: number | null
          marque: string
          modele: string | null
          notes: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          dimension_pneus?: string | null
          id?: string
          immatriculation?: string | null
          kilometrage?: number | null
          marque: string
          modele?: string | null
          notes?: string | null
          updated_at?: string
          user_id?: string
        }
        Update: {
          client_id?: string | null
          created_at?: string
          dimension_pneus?: string | null
          id?: string
          immatriculation?: string | null
          kilometrage?: number | null
          marque?: string
          modele?: string | null
          notes?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicules_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      interventions: {
        Row: {
          adresse: string | null
          client_id: string | null
          created_at: string
          date: string
          devis_id: string | null
          heure_debut: string | null
          heure_fin: string | null
          heure_prevue: string | null
          id: string
          majoration: string | null
          montant_total: number | null
          observations: string | null
          photos_apres: string[]
          photos_avant: string[]
          pneus_prevus: Json
          pneus_utilises: Json
          signature_client: string | null
          statut: string
          technicien_id: string | null
          type_prestation: string
          updated_at: string
          urgence: boolean
          user_id: string
          vehicule_id: string | null
        }
        Insert: {
          adresse?: string | null
          client_id?: string | null
          created_at?: string
          date?: string
          devis_id?: string | null
          heure_debut?: string | null
          heure_fin?: string | null
          heure_prevue?: string | null
          id?: string
          majoration?: string | null
          montant_total?: number | null
          observations?: string | null
          photos_apres?: string[]
          photos_avant?: string[]
          pneus_prevus?: Json
          pneus_utilises?: Json
          signature_client?: string | null
          statut?: string
          technicien_id?: string | null
          type_prestation?: string
          updated_at?: string
          urgence?: boolean
          user_id?: string
          vehicule_id?: string | null
        }
        Update: {
          adresse?: string | null
          client_id?: string | null
          created_at?: string
          date?: string
          devis_id?: string | null
          heure_debut?: string | null
          heure_fin?: string | null
          heure_prevue?: string | null
          id?: string
          majoration?: string | null
          montant_total?: number | null
          observations?: string | null
          photos_apres?: string[]
          photos_avant?: string[]
          pneus_prevus?: Json
          pneus_utilises?: Json
          signature_client?: string | null
          statut?: string
          technicien_id?: string | null
          type_prestation?: string
          updated_at?: string
          urgence?: boolean
          user_id?: string
          vehicule_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "interventions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interventions_vehicule_id_fkey"
            columns: ["vehicule_id"]
            isOneToOne: false
            referencedRelation: "vehicules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interventions_devis_id_fkey"
            columns: ["devis_id"]
            isOneToOne: false
            referencedRelation: "devis"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_lines: {
        Row: {
          created_at: string
          description: string
          id: string
          invoice_id: string
          ordre: number
          prix_unitaire_ht: number
          quantite: number
          total_ht: number
          user_id: string
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          invoice_id: string
          ordre?: number
          prix_unitaire_ht?: number
          quantite?: number
          total_ht?: number
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          invoice_id?: string
          ordre?: number
          prix_unitaire_ht?: number
          quantite?: number
          total_ht?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoice_lines_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          adresse_site: string | null
          client_id: string
          created_at: string
          date_facture: string
          echeance: string | null
          id: string
          notes: string | null
          numero: number
          statut: string
          total_ht: number
          total_ttc: number
          tva: number
          tva_taux: number
          updated_at: string
          user_id: string
        }
        Insert: {
          adresse_site?: string | null
          client_id: string
          created_at?: string
          date_facture?: string
          echeance?: string | null
          id?: string
          notes?: string | null
          numero: number
          statut?: string
          total_ht?: number
          total_ttc?: number
          tva?: number
          tva_taux?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          adresse_site?: string | null
          client_id?: string
          created_at?: string
          date_facture?: string
          echeance?: string | null
          id?: string
          notes?: string | null
          numero?: number
          statut?: string
          total_ht?: number
          total_ttc?: number
          tva?: number
          tva_taux?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      service_presets: {
        Row: {
          created_at: string
          description: string
          id: string
          label: string
          ordre: number
          prix_unitaire_ht: number
          user_id: string
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          label: string
          ordre?: number
          prix_unitaire_ht?: number
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          label?: string
          ordre?: number
          prix_unitaire_ht?: number
          user_id?: string
        }
        Relationships: []
      }
      stock_movements: {
        Row: {
          id: string
          product_id: string
          type: string
          quantite: number
          technicien_id: string | null
          note: string | null
          created_by: string
          user_id: string
          created_at: string
        }
        Insert: {
          id?: string
          product_id: string
          type: string
          quantite: number
          technicien_id?: string | null
          note?: string | null
          created_by: string
          user_id: string
          created_at?: string
        }
        Update: {
          id?: string
          product_id?: string
          type?: string
          quantite?: number
          technicien_id?: string | null
          note?: string | null
          created_by?: string
          user_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "stock_products"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_levels: {
        Row: {
          id: string
          product_id: string
          technicien_id: string | null
          quantite: number
          user_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          product_id: string
          technicien_id?: string | null
          quantite?: number
          user_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          product_id?: string
          technicien_id?: string | null
          quantite?: number
          user_id?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_levels_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "stock_products"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_products: {
        Row: {
          created_at: string
          diametre_pouce: number | null
          dimension: string | null
          dot: string | null
          emplacement: string | null
          etat: string
          id: string
          indice_charge: string | null
          indice_vitesse: string | null
          marque: string | null
          modele: string | null
          nom: string
          photo_url: string | null
          prix_achat_ht: number
          quantite: number
          saison: string
          seuil_alerte: number
          unite: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          diametre_pouce?: number | null
          dimension?: string | null
          dot?: string | null
          emplacement?: string | null
          etat?: string
          id?: string
          indice_charge?: string | null
          indice_vitesse?: string | null
          marque?: string | null
          modele?: string | null
          nom: string
          photo_url?: string | null
          prix_achat_ht?: number
          quantite?: number
          saison?: string
          seuil_alerte?: number
          unite?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          diametre_pouce?: number | null
          dimension?: string | null
          dot?: string | null
          emplacement?: string | null
          etat?: string
          id?: string
          indice_charge?: string | null
          indice_vitesse?: string | null
          marque?: string | null
          modele?: string | null
          nom?: string
          photo_url?: string | null
          prix_achat_ht?: number
          quantite?: number
          saison?: string
          seuil_alerte?: number
          unite?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      stock_requests: {
        Row: {
          id: string
          product_id: string
          technicien_id: string
          quantite: number
          note: string | null
          statut: string
          traite_par: string | null
          traite_at: string | null
          user_id: string
          created_at: string
        }
        Insert: {
          id?: string
          product_id: string
          technicien_id: string
          quantite: number
          note?: string | null
          statut?: string
          traite_par?: string | null
          traite_at?: string | null
          user_id: string
          created_at?: string
        }
        Update: {
          id?: string
          product_id?: string
          technicien_id?: string
          quantite?: number
          note?: string | null
          statut?: string
          traite_par?: string | null
          traite_at?: string | null
          user_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_requests_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "stock_products"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          id: string
          owner_id: string
          user_id: string
          email: string
          username: string | null
          display_name: string | null
          role: string
          active: boolean
          permissions: Json
          poste: string
          created_at: string
        }
        Insert: {
          id?: string
          owner_id: string
          user_id: string
          email: string
          username?: string | null
          display_name?: string | null
          role?: string
          active?: boolean
          permissions?: Json
          poste?: string
          created_at?: string
        }
        Update: {
          id?: string
          owner_id?: string
          user_id?: string
          email?: string
          username?: string | null
          display_name?: string | null
          role?: string
          active?: boolean
          permissions?: Json
          poste?: string
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      next_invoice_number: { Args: never; Returns: number }
      current_user_role: { Args: never; Returns: string }
      account_owner: { Args: never; Returns: string }
      dashboard_money_stats: {
        Args: { p_month_start: string; p_prev_month_start: string; p_prev_month_end: string }
        Returns: { ca_month: number; ca_prev_month: number; unpaid_total: number; unpaid_count: number }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
