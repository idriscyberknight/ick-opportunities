/**
 * A1.5 schema-derived interim types, verified from actual ICK Opportunities
 * Lovable Cloud PRODUCTION information_schema on 2026-10-25.
 *
 * Important: the separately connected Supabase project "ICk technologies"
 * is NOT the Lovable Cloud database. Do not generate from that project.
 * This additive type bridge deliberately leaves Lovable-generated types.ts
 * untouched. Replace it with types genuinely regenerated from the correct
 * backend once that generation path is available and migration history is
 * reconciled. This file defines types ONLY; it grants no DB privileges.
 */
import type { Database } from "@/integrations/supabase/types";

export type UniversityRegistryTables = {
  universities: {
    Row: {
      id: string;
      slug: string;
      official_name: string;
      country_code: string;
      city: string | null;
      official_website: string | null;
      summary: string | null;
      ror_id: string | null;
      verification_status: string;
      publication_status: string;
      reviewed_by: string | null;
      reviewed_at: string | null;
      published_at: string | null;
      created_by: string | null;
      created_at: string;
      updated_at: string;
    };
    Insert: {
      id?: string;
      slug: string;
      official_name: string;
      country_code: string;
      city?: string | null;
      official_website?: string | null;
      summary?: string | null;
      ror_id?: string | null;
      verification_status?: string;
      publication_status?: string;
      reviewed_by?: string | null;
      reviewed_at?: string | null;
      published_at?: string | null;
      created_by?: string | null;
      created_at?: string;
      updated_at?: string;
    };
    Update: {
      id?: string;
      slug?: string;
      official_name?: string;
      country_code?: string;
      city?: string | null;
      official_website?: string | null;
      summary?: string | null;
      ror_id?: string | null;
      verification_status?: string;
      publication_status?: string;
      reviewed_by?: string | null;
      reviewed_at?: string | null;
      published_at?: string | null;
      created_by?: string | null;
      created_at?: string;
      updated_at?: string;
    };
    Relationships: [];
  };
  university_aliases: {
    Row: {
      id: string;
      university_id: string;
      alias: string;
      language_code: string | null;
      script_code: string | null;
      created_at: string;
    };
    Insert: {
      id?: string;
      university_id: string;
      alias: string;
      language_code?: string | null;
      script_code?: string | null;
      created_at?: string;
    };
    Update: {
      id?: string;
      university_id?: string;
      alias?: string;
      language_code?: string | null;
      script_code?: string | null;
      created_at?: string;
    };
    Relationships: [
      {
        foreignKeyName: "university_aliases_university_id_fkey";
        columns: ["university_id"];
        isOneToOne: false;
        referencedRelation: "universities";
        referencedColumns: ["id"];
      },
    ];
  };
  university_classifications: {
    Row: {
      id: string;
      university_id: string;
      classification_key: string;
      evidence_id: string;
      review_status: string;
      created_at: string;
      updated_at: string;
    };
    Insert: {
      id?: string;
      university_id: string;
      classification_key: string;
      evidence_id: string;
      review_status?: string;
      created_at?: string;
      updated_at?: string;
    };
    Update: {
      id?: string;
      university_id?: string;
      classification_key?: string;
      evidence_id?: string;
      review_status?: string;
      created_at?: string;
      updated_at?: string;
    };
    Relationships: [
      {
        foreignKeyName: "university_classifications_university_id_fkey";
        columns: ["university_id"];
        isOneToOne: false;
        referencedRelation: "universities";
        referencedColumns: ["id"];
      },
      {
        foreignKeyName: "university_classifications_same_university_evidence";
        columns: ["evidence_id", "university_id"];
        isOneToOne: false;
        referencedRelation: "university_evidence";
        referencedColumns: ["id", "university_id"];
      },
    ];
  };
  university_evidence: {
    Row: {
      id: string;
      university_id: string;
      claim_type: string;
      source_url: string;
      source_title: string | null;
      checked_at: string | null;
      checked_by: string | null;
      review_status: string;
      visibility: string;
      created_at: string;
    };
    Insert: {
      id?: string;
      university_id: string;
      claim_type: string;
      source_url: string;
      source_title?: string | null;
      checked_at?: string | null;
      checked_by?: string | null;
      review_status?: string;
      visibility?: string;
      created_at?: string;
    };
    Update: {
      id?: string;
      university_id?: string;
      claim_type?: string;
      source_url?: string;
      source_title?: string | null;
      checked_at?: string | null;
      checked_by?: string | null;
      review_status?: string;
      visibility?: string;
      created_at?: string;
    };
    Relationships: [
      {
        foreignKeyName: "university_evidence_university_id_fkey";
        columns: ["university_id"];
        isOneToOne: false;
        referencedRelation: "universities";
        referencedColumns: ["id"];
      },
    ];
  };
};

/** Extend the existing schema without losing types for existing tables. */
export type UniversityRegistryDatabase = Omit<Database, "public"> & {
  public: Omit<Database["public"], "Tables"> & {
    Tables: Database["public"]["Tables"] & UniversityRegistryTables;
  };
};
