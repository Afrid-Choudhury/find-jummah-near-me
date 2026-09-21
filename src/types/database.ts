/**
 * Hand-written types mirroring supabase/migrations/*.sql.
 *
 * Once the schema is live, replace this file with generated types:
 *   npx supabase gen types typescript --project-id <ref> > src/types/database.ts
 * Domain code imports from "@/types", so swapping this file requires no
 * changes elsewhere.
 */

export interface Database {
  public: {
    Tables: {
      masjids: {
        Row: {
          id: string;
          name: string;
          slug: string;
          address: string;
          borough: string;
          neighborhood: string | null;
          latitude: number;
          longitude: number;
          phone: string | null;
          website: string | null;
          capacity: number | null;
          has_womens_section: boolean;
          is_verified: boolean;
          last_reviewed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          address: string;
          borough: string;
          neighborhood?: string | null;
          latitude: number;
          longitude: number;
          phone?: string | null;
          website?: string | null;
          capacity?: number | null;
          has_womens_section?: boolean;
          is_verified?: boolean;
          last_reviewed_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["masjids"]["Insert"]>;
        Relationships: [];
      };
      jummah_times: {
        Row: {
          id: string;
          masjid_id: string;
          khutbah_number: number;
          khutbah_time: string; // Postgres time, e.g. "13:15:00"
          iqamah_time: string | null;
          language: string;
          notes: string | null;
          last_verified_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          masjid_id: string;
          khutbah_number: number;
          khutbah_time: string;
          iqamah_time?: string | null;
          language?: string;
          notes?: string | null;
          last_verified_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["jummah_times"]["Insert"]>;
        Relationships: [];
      };
      masjid_confirmations: {
        Row: { id: string; masjid_id: string; created_at: string };
        Insert: { id?: string; masjid_id: string };
        Update: never;
        Relationships: [];
      };
      masjid_reports: {
        Row: { id: string; masjid_id: string; created_at: string };
        Insert: { id?: string; masjid_id: string };
        Update: never;
        Relationships: [];
      };
      admin_users: {
        Row: { user_id: string; created_at: string };
        Insert: { user_id: string };
        Update: never;
        Relationships: [];
      };
      time_suggestions: {
        Row: {
          id: string;
          masjid_id: string;
          user_id: string | null;
          submitted_by: string | null;
          khutbah_number: number;
          khutbah_time: string;
          iqamah_time: string | null;
          language: string;
          notes: string | null;
          status: "pending" | "approved" | "rejected";
          created_at: string;
          reviewed_at: string | null;
        };
        Insert: {
          id?: string;
          masjid_id: string;
          user_id?: string | null;
          submitted_by?: string | null;
          khutbah_number: number;
          khutbah_time: string;
          iqamah_time?: string | null;
          language?: string;
          notes?: string | null;
          status?: "pending" | "approved" | "rejected";
          reviewed_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["time_suggestions"]["Insert"]>;
        Relationships: [];
      };
      favorites: {
        Row: { user_id: string; masjid_id: string; created_at: string };
        Insert: { user_id: string; masjid_id: string };
        Update: never;
        Relationships: [];
      };
      masjid_editors: {
        Row: { user_id: string; masjid_id: string; created_at: string };
        Insert: { user_id: string; masjid_id: string };
        Update: never;
        Relationships: [];
      };
    };
    Views: {
      masjid_confidence: {
        Row: { masjid_id: string; confirmations: number; reports: number };
        Relationships: [];
      };
    };
    Functions: {
      is_admin: { Args: Record<string, never>; Returns: boolean };
      is_masjid_editor: { Args: { target_masjid_id: string }; Returns: boolean };
      grant_masjid_editor: {
        Args: { editor_email: string; target_masjid_id: string };
        Returns: void;
      };
      list_masjid_editors: {
        Args: { target_masjid_id: string };
        Returns: { user_id: string; email: string; created_at: string }[];
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

export type MasjidRow = Database["public"]["Tables"]["masjids"]["Row"];
export type JummahTimeRow = Database["public"]["Tables"]["jummah_times"]["Row"];
export type MasjidInsert = Database["public"]["Tables"]["masjids"]["Insert"];
export type MasjidUpdate = Database["public"]["Tables"]["masjids"]["Update"];
export type JummahTimeInsert = Database["public"]["Tables"]["jummah_times"]["Insert"];
export type ConfidenceRow = Database["public"]["Views"]["masjid_confidence"]["Row"];
export type TimeSuggestionRow = Database["public"]["Tables"]["time_suggestions"]["Row"];
export type TimeSuggestionInsert = Database["public"]["Tables"]["time_suggestions"]["Insert"];
