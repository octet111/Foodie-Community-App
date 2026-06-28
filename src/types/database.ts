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
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      comments: {
        Row: {
          body: string
          created_at: string
          event_id: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          event_id: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          event_id?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      community_settings: {
        Row: {
          email_reminder_body_template: string | null
          email_reminder_subject_template: string | null
          id: string
          logo_path: string | null
          name: string
          reminder_day_before_time: string
          reminder_day_of_time: string
          transfer_info: string | null
          updated_at: string
        }
        Insert: {
          email_reminder_body_template?: string | null
          email_reminder_subject_template?: string | null
          id?: string
          logo_path?: string | null
          name: string
          reminder_day_before_time?: string
          reminder_day_of_time?: string
          transfer_info?: string | null
          updated_at?: string
        }
        Update: {
          email_reminder_body_template?: string | null
          email_reminder_subject_template?: string | null
          id?: string
          logo_path?: string | null
          name?: string
          reminder_day_before_time?: string
          reminder_day_of_time?: string
          transfer_info?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      draft_shop_candidates: {
        Row: {
          draft_id: string
          id: string
          reason: string | null
          shop_id: string
          sort_order: number
        }
        Insert: {
          draft_id: string
          id?: string
          reason?: string | null
          shop_id: string
          sort_order?: number
        }
        Update: {
          draft_id?: string
          id?: string
          reason?: string | null
          shop_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "draft_shop_candidates_draft_id_fkey"
            columns: ["draft_id"]
            isOneToOne: false
            referencedRelation: "event_drafts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "draft_shop_candidates_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      event_drafts: {
        Row: {
          adopted_event_id: string | null
          concept_options: Json
          created_at: string
          created_by: string
          description: string | null
          generation_phase: string
          id: string
          input_params: Json
          model: string | null
          parts: Json
          raw_response: Json | null
          selected_concept: Json | null
          shop_id: string | null
          status: Database["public"]["Enums"]["draft_status"]
          title: string | null
          updated_at: string
        }
        Insert: {
          adopted_event_id?: string | null
          concept_options?: Json
          created_at?: string
          created_by: string
          description?: string | null
          generation_phase?: string
          id?: string
          input_params?: Json
          model?: string | null
          parts?: Json
          raw_response?: Json | null
          selected_concept?: Json | null
          shop_id?: string | null
          status?: Database["public"]["Enums"]["draft_status"]
          title?: string | null
          updated_at?: string
        }
        Update: {
          adopted_event_id?: string | null
          concept_options?: Json
          created_at?: string
          created_by?: string
          description?: string | null
          generation_phase?: string
          id?: string
          input_params?: Json
          model?: string | null
          parts?: Json
          raw_response?: Json | null
          selected_concept?: Json | null
          shop_id?: string | null
          status?: Database["public"]["Enums"]["draft_status"]
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_drafts_adopted_event_id_fkey"
            columns: ["adopted_event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_drafts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_drafts_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      event_parts: {
        Row: {
          capacity: number
          event_id: string
          fee_estimate: number
          id: string
          name: string
          sort_order: number
        }
        Insert: {
          capacity: number
          event_id: string
          fee_estimate?: number
          id?: string
          name: string
          sort_order?: number
        }
        Update: {
          capacity?: number
          event_id?: string
          fee_estimate?: number
          id?: string
          name?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "event_parts_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          created_at: string
          deleted_at: string | null
          description: string | null
          held_at: string
          id: string
          location: string | null
          organizer_id: string
          shop_id: string
          status: Database["public"]["Enums"]["event_status"]
          title: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          held_at: string
          id?: string
          location?: string | null
          organizer_id: string
          shop_id: string
          status?: Database["public"]["Enums"]["event_status"]
          title: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          held_at?: string
          id?: string
          location?: string | null
          organizer_id?: string
          shop_id?: string
          status?: Database["public"]["Enums"]["event_status"]
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_organizer_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string
          created_at: string
          event_id: string | null
          id: string
          read_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          event_id?: string | null
          id?: string
          read_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          event_id?: string | null
          id?: string
          read_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      participations: {
        Row: {
          event_part_id: string
          id: string
          joined_at: string
          status: Database["public"]["Enums"]["participation_status"]
          user_id: string
        }
        Insert: {
          event_part_id: string
          id?: string
          joined_at?: string
          status?: Database["public"]["Enums"]["participation_status"]
          user_id: string
        }
        Update: {
          event_part_id?: string
          id?: string
          joined_at?: string
          status?: Database["public"]["Enums"]["participation_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "participations_event_part_id_fkey"
            columns: ["event_part_id"]
            isOneToOne: false
            referencedRelation: "event_parts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "participations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      photos: {
        Row: {
          created_at: string
          event_id: string
          id: string
          storage_path: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          storage_path: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          storage_path?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "photos_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "photos_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_path: string | null
          created_at: string
          id: string
          nickname: string
          role: Database["public"]["Enums"]["user_role"]
        }
        Insert: {
          avatar_path?: string | null
          created_at?: string
          id: string
          nickname: string
          role?: Database["public"]["Enums"]["user_role"]
        }
        Update: {
          avatar_path?: string | null
          created_at?: string
          id?: string
          nickname?: string
          role?: Database["public"]["Enums"]["user_role"]
        }
        Relationships: []
      }
      reminders: {
        Row: {
          channel: Database["public"]["Enums"]["reminder_channel"]
          event_id: string
          id: string
          remind_at: string
          sent_at: string | null
        }
        Insert: {
          channel: Database["public"]["Enums"]["reminder_channel"]
          event_id: string
          id?: string
          remind_at: string
          sent_at?: string | null
        }
        Update: {
          channel?: Database["public"]["Enums"]["reminder_channel"]
          event_id?: string
          id?: string
          remind_at?: string
          sent_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reminders_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      secure_claims: {
        Row: {
          claim_type: Database["public"]["Enums"]["claim_type"]
          created_at: string
          id: string
          note: string | null
          shop_id: string
          user_id: string
        }
        Insert: {
          claim_type?: Database["public"]["Enums"]["claim_type"]
          created_at?: string
          id?: string
          note?: string | null
          shop_id: string
          user_id: string
        }
        Update: {
          claim_type?: Database["public"]["Enums"]["claim_type"]
          created_at?: string
          id?: string
          note?: string | null
          shop_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "secure_claims_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "secure_claims_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      settlement_items: {
        Row: {
          adjusted_by: string | null
          amount: number
          id: string
          paid: boolean
          paid_at: string | null
          settlement_id: string
          user_id: string
        }
        Insert: {
          adjusted_by?: string | null
          amount: number
          id?: string
          paid?: boolean
          paid_at?: string | null
          settlement_id: string
          user_id: string
        }
        Update: {
          adjusted_by?: string | null
          amount?: number
          id?: string
          paid?: boolean
          paid_at?: string | null
          settlement_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "settlement_items_adjusted_by_fkey"
            columns: ["adjusted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "settlement_items_settlement_id_fkey"
            columns: ["settlement_id"]
            isOneToOne: false
            referencedRelation: "settlements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "settlement_items_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      settlements: {
        Row: {
          actual_amount: number
          created_at: string
          event_id: string
          finalized_by: string | null
          id: string
          part_actuals: Json
          status: Database["public"]["Enums"]["settlement_status"]
          surplus: number | null
          total_collected: number
        }
        Insert: {
          actual_amount?: number
          created_at?: string
          event_id: string
          finalized_by?: string | null
          id?: string
          part_actuals?: Json
          status?: Database["public"]["Enums"]["settlement_status"]
          surplus?: number | null
          total_collected?: number
        }
        Update: {
          actual_amount?: number
          created_at?: string
          event_id?: string
          finalized_by?: string | null
          id?: string
          part_actuals?: Json
          status?: Database["public"]["Enums"]["settlement_status"]
          surplus?: number | null
          total_collected?: number
        }
        Relationships: [
          {
            foreignKeyName: "settlements_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: true
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "settlements_finalized_by_fkey"
            columns: ["finalized_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      shops: {
        Row: {
          area: string | null
          created_at: string
          created_by: string
          id: string
          image_path: string | null
          name: string
          ogp_description: string | null
          ogp_image_url: string | null
          rarity: Database["public"]["Enums"]["shop_rarity"]
          url: string | null
        }
        Insert: {
          area?: string | null
          created_at?: string
          created_by: string
          id?: string
          image_path?: string | null
          name: string
          ogp_description?: string | null
          ogp_image_url?: string | null
          rarity?: Database["public"]["Enums"]["shop_rarity"]
          url?: string | null
        }
        Update: {
          area?: string | null
          created_at?: string
          created_by?: string
          id?: string
          image_path?: string | null
          name?: string
          ogp_description?: string | null
          ogp_image_url?: string | null
          rarity?: Database["public"]["Enums"]["shop_rarity"]
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shops_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      stocks: {
        Row: {
          created_at: string
          id: string
          is_private: boolean
          memo: string | null
          shop_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_private?: boolean
          memo?: string | null
          shop_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_private?: boolean
          memo?: string | null
          shop_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stocks_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stocks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      adopt_event_draft: {
        Args: { p_draft_id: string; p_held_at: string }
        Returns: string
      }
      create_event_reminders: {
        Args: { p_event_id: string }
        Returns: undefined
      }
      ensure_settlement: {
        Args: { p_event_id: string }
        Returns: {
          actual_amount: number
          created_at: string
          event_id: string
          finalized_by: string | null
          id: string
          part_actuals: Json
          status: Database["public"]["Enums"]["settlement_status"]
          surplus: number | null
          total_collected: number
        }
        SetofOptions: {
          from: "*"
          to: "settlements"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      get_my_settlement_for_event: {
        Args: { p_event_id: string }
        Returns: Json
      }
      get_my_unpaid_items: { Args: never; Returns: Json }
      is_admin: { Args: never; Returns: boolean }
      is_event_manager: { Args: { eid: string }; Returns: boolean }
      is_finalizer: { Args: { eid: string }; Returns: boolean }
      is_organizer: { Args: { eid: string }; Returns: boolean }
      set_event_finalizer: {
        Args: { p_event_id: string; p_finalizer_id: string }
        Returns: {
          actual_amount: number
          created_at: string
          event_id: string
          finalized_by: string | null
          id: string
          part_actuals: Json
          status: Database["public"]["Enums"]["settlement_status"]
          surplus: number | null
          total_collected: number
        }
        SetofOptions: {
          from: "*"
          to: "settlements"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      claim_type:
        | "regular"
        | "acquaintance"
        | "referral"
        | "membership"
        | "other"
      draft_status: "generated" | "adopted" | "discarded"
      event_status: "open" | "closed" | "held" | "archived"
      participation_status: "joined" | "cancelled"
      reminder_channel: "in_app" | "email"
      settlement_status: "collecting" | "finalized"
      shop_rarity:
        | "walk_in"
        | "reservable"
        | "referral_only"
        | "months_wait"
        | "members_only"
      user_role: "member" | "admin"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      claim_type: [
        "regular",
        "acquaintance",
        "referral",
        "membership",
        "other",
      ],
      draft_status: ["generated", "adopted", "discarded"],
      event_status: ["open", "closed", "held", "archived"],
      participation_status: ["joined", "cancelled"],
      reminder_channel: ["in_app", "email"],
      settlement_status: ["collecting", "finalized"],
      shop_rarity: [
        "walk_in",
        "reservable",
        "referral_only",
        "months_wait",
        "members_only",
      ],
      user_role: ["member", "admin"],
    },
  },
} as const
