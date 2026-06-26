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
      bookings: {
        Row: {
          address: string | null
          cancellation_fee: number
          cancelled_at: string | null
          cancelled_by: string | null
          assigned_at: string | null
          completed_at: string | null
          created_at: string
          duration_hours: number
          frequency: string
          id: string
          notes: string | null
          original_zooter_id: string | null
          price: number
          reassignment_acknowledged: boolean
          replacement_offered: boolean
          replacement_count: number
          scheduled_at: string
          service: Database["public"]["Enums"]["service_category"]
          status: Database["public"]["Enums"]["booking_status"]
          payment_confirmed_at: string | null
          sensitive_data_revoked_at: string | null
          updated_at: string
          user_id: string
          was_reassigned: boolean
          zooter_id: string | null
        }
        Insert: {
          address?: string | null
          cancellation_fee?: number
          cancelled_at?: string | null
          cancelled_by?: string | null
          assigned_at?: string | null
          completed_at?: string | null
          created_at?: string
          duration_hours?: number
          frequency?: string
          id?: string
          notes?: string | null
          original_zooter_id?: string | null
          price: number
          reassignment_acknowledged?: boolean
          replacement_offered?: boolean
          replacement_count?: number
          scheduled_at: string
          service: Database["public"]["Enums"]["service_category"]
          status?: Database["public"]["Enums"]["booking_status"]
          payment_confirmed_at?: string | null
          sensitive_data_revoked_at?: string | null
          updated_at?: string
          user_id: string
          was_reassigned?: boolean
          zooter_id?: string | null
        }
        Update: {
          address?: string | null
          cancellation_fee?: number
          cancelled_at?: string | null
          cancelled_by?: string | null
          assigned_at?: string | null
          completed_at?: string | null
          created_at?: string
          duration_hours?: number
          frequency?: string
          id?: string
          notes?: string | null
          original_zooter_id?: string | null
          price?: number
          reassignment_acknowledged?: boolean
          replacement_offered?: boolean
          replacement_count?: number
          scheduled_at?: string
          service?: Database["public"]["Enums"]["service_category"]
          status?: Database["public"]["Enums"]["booking_status"]
          payment_confirmed_at?: string | null
          sensitive_data_revoked_at?: string | null
          updated_at?: string
          user_id?: string
          was_reassigned?: boolean
          zooter_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_original_zooter_id_fkey"
            columns: ["original_zooter_id"]
            isOneToOne: false
            referencedRelation: "zooters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_zooter_id_fkey"
            columns: ["zooter_id"]
            isOneToOne: false
            referencedRelation: "zooters"
            referencedColumns: ["id"]
          },
        ]
      }
      care_plus_applications: {
        Row: {
          address: string
          admin_fee_paid: boolean
          created_at: string
          daily_end_time: string | null
          daily_pay_rate: number | null
          daily_start_time: string | null
          days_of_week: string[] | null
          email: string
          first_name: string
          id: string
          ideal_personality: string | null
          job_description: string | null
          last_name: string
          other_qualities: string | null
          overtime: string | null
          pets: string[] | null
          phone: string
          preferred_language: string | null
          preferred_start_date: string | null
          required_skills: string[] | null
          reviewed_at: string | null
          reviewer_notes: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          address: string
          admin_fee_paid?: boolean
          created_at?: string
          daily_end_time?: string | null
          daily_pay_rate?: number | null
          daily_start_time?: string | null
          days_of_week?: string[] | null
          email: string
          first_name: string
          id?: string
          ideal_personality?: string | null
          job_description?: string | null
          last_name: string
          other_qualities?: string | null
          overtime?: string | null
          pets?: string[] | null
          phone: string
          preferred_language?: string | null
          preferred_start_date?: string | null
          required_skills?: string[] | null
          reviewed_at?: string | null
          reviewer_notes?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string
          admin_fee_paid?: boolean
          created_at?: string
          daily_end_time?: string | null
          daily_pay_rate?: number | null
          daily_start_time?: string | null
          days_of_week?: string[] | null
          email?: string
          first_name?: string
          id?: string
          ideal_personality?: string | null
          job_description?: string | null
          last_name?: string
          other_qualities?: string | null
          overtime?: string | null
          pets?: string[] | null
          phone?: string
          preferred_language?: string | null
          preferred_start_date?: string | null
          required_skills?: string[] | null
          reviewed_at?: string | null
          reviewer_notes?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      favorites: {
        Row: {
          created_at: string
          user_id: string
          zooter_id: string
        }
        Insert: {
          created_at?: string
          user_id: string
          zooter_id: string
        }
        Update: {
          created_at?: string
          user_id?: string
          zooter_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_zooter_id_fkey"
            columns: ["zooter_id"]
            isOneToOne: false
            referencedRelation: "zooters"
            referencedColumns: ["id"]
          },
        ]
      }
      gamification_progress: {
        Row: {
          free_bookings_earned: number
          free_bookings_redeemed: number
          positive_reviews_count: number
          successful_referrals_count: number
          updated_at: string
          user_id: string
        }
        Insert: {
          free_bookings_earned?: number
          free_bookings_redeemed?: number
          positive_reviews_count?: number
          successful_referrals_count?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          free_bookings_earned?: number
          free_bookings_redeemed?: number
          positive_reviews_count?: number
          successful_referrals_count?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      loyalty_points: {
        Row: {
          free_credits: number
          points: number
          total_bookings: number
          updated_at: string
          user_id: string
        }
        Insert: {
          free_credits?: number
          points?: number
          total_bookings?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          free_credits?: number
          points?: number
          total_bookings?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          body: string
          booking_id: string
          created_at: string
          id: string
          sender_type: string
        }
        Insert: {
          body: string
          booking_id: string
          created_at?: string
          id?: string
          sender_type: string
        }
        Update: {
          body?: string
          booking_id?: string
          created_at?: string
          id?: string
          sender_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          kind: string
          link: string | null
          read: boolean
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          kind: string
          link?: string | null
          read?: boolean
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          kind?: string
          link?: string | null
          read?: boolean
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          address: string | null
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      referral_redemptions: {
        Row: {
          created_at: string
          id: string
          referred_user_id: string
          referrer_user_id: string
          rewarded: boolean
          rewarded_at: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          referred_user_id: string
          referrer_user_id: string
          rewarded?: boolean
          rewarded_at?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          referred_user_id?: string
          referrer_user_id?: string
          rewarded?: boolean
          rewarded_at?: string | null
        }
        Relationships: []
      }
      referrals: {
        Row: {
          code: string
          created_at: string
          total_invited: number
          total_rewarded: number
          user_id: string
        }
        Insert: {
          code: string
          created_at?: string
          total_invited?: number
          total_rewarded?: number
          user_id: string
        }
        Update: {
          code?: string
          created_at?: string
          total_invited?: number
          total_rewarded?: number
          user_id?: string
        }
        Relationships: []
      }
      saved_addresses: {
        Row: {
          address: string
          city: string | null
          created_at: string
          id: string
          is_default: boolean
          label: string
          postal_code: string | null
          user_id: string
        }
        Insert: {
          address: string
          city?: string | null
          created_at?: string
          id?: string
          is_default?: boolean
          label: string
          postal_code?: string | null
          user_id: string
        }
        Update: {
          address?: string
          city?: string | null
          created_at?: string
          id?: string
          is_default?: boolean
          label?: string
          postal_code?: string | null
          user_id?: string
        }
        Relationships: []
      }
      subscription_cancellation_requests: {
        Row: {
          confirmed: boolean
          confirmed_at: string | null
          created_at: string
          expires_at: string
          id: string
          reason: string | null
          subscription_id: string
          token: string
          user_id: string
        }
        Insert: {
          confirmed?: boolean
          confirmed_at?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          reason?: string | null
          subscription_id: string
          token: string
          user_id: string
        }
        Update: {
          confirmed?: boolean
          confirmed_at?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          reason?: string | null
          subscription_id?: string
          token?: string
          user_id?: string
        }
        Relationships: []
      }
      subscription_plans: {
        Row: {
          cadence: string
          discount_pct: number
          hours_per_visit: number
          id: string
          monthly_price: number
          name: string
          perks: string[]
          popular: boolean
          savings_pct: number
        }
        Insert: {
          cadence: string
          discount_pct?: number
          hours_per_visit: number
          id?: string
          monthly_price: number
          name: string
          perks?: string[]
          popular?: boolean
          savings_pct?: number
        }
        Update: {
          cadence?: string
          discount_pct?: number
          hours_per_visit?: number
          id?: string
          monthly_price?: number
          name?: string
          perks?: string[]
          popular?: boolean
          savings_pct?: number
        }
        Relationships: []
      }
      support_tickets: {
        Row: {
          ai_response: string | null
          body: string
          created_at: string
          id: string
          status: string
          subject: string
          user_id: string
        }
        Insert: {
          ai_response?: string | null
          body: string
          created_at?: string
          id?: string
          status?: string
          subject: string
          user_id: string
        }
        Update: {
          ai_response?: string | null
          body?: string
          created_at?: string
          id?: string
          status?: string
          subject?: string
          user_id?: string
        }
        Relationships: []
      }
      training_modules: {
        Row: {
          badge_label: string | null
          badge_color: string
          category: string
          description: string
          duration_min: number
          id: string
          pass_score: number
          quiz_questions: Json
          rank_points: number
          required: boolean
          title: string
        }
        Insert: {
          badge_label?: string | null
          badge_color?: string
          category: string
          description: string
          duration_min: number
          id?: string
          pass_score?: number
          quiz_questions?: Json
          rank_points?: number
          required?: boolean
          title: string
        }
        Update: {
          badge_label?: string | null
          badge_color?: string
          category?: string
          description?: string
          duration_min?: number
          id?: string
          pass_score?: number
          quiz_questions?: Json
          rank_points?: number
          required?: boolean
          title?: string
        }
        Relationships: []
      }
      user_reassignment_state: {
        Row: {
          show_modal: boolean
          successful_bookings_since_last: number
          total_reassignments: number
          updated_at: string
          user_id: string
        }
        Insert: {
          show_modal?: boolean
          successful_bookings_since_last?: number
          total_reassignments?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          show_modal?: boolean
          successful_bookings_since_last?: number
          total_reassignments?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_subscriptions: {
        Row: {
          id: string
          next_billing_at: string
          plan_id: string
          started_at: string
          status: Database["public"]["Enums"]["subscription_status"]
          user_id: string
        }
        Insert: {
          id?: string
          next_billing_at?: string
          plan_id: string
          started_at?: string
          status?: Database["public"]["Enums"]["subscription_status"]
          user_id: string
        }
        Update: {
          id?: string
          next_billing_at?: string
          plan_id?: string
          started_at?: string
          status?: Database["public"]["Enums"]["subscription_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      zootcred_ledger: {
        Row: {
          amount: number
          created_at: string
          id: string
          meta: Json | null
          reason: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          meta?: Json | null
          reason: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          meta?: Json | null
          reason?: string
          user_id?: string
        }
        Relationships: []
      }
      zootcred_wallets: {
        Row: {
          balance: number
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      zooter_applications: {
        Row: {
          address: string | null
          background_check_consent: boolean
          background_check_status: string
          bank_account_number: string | null
          bank_branch_code: string | null
          bank_name: string | null
          bio: string | null
          city: string | null
          created_at: string
          date_of_birth: string | null
          email: string | null
          full_name: string
          id: string
          id_number: string | null
          phone: string | null
          postal_code: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          reviewer_notes: string | null
          service_category:
            | Database["public"]["Enums"]["service_category"]
            | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          background_check_consent?: boolean
          background_check_status?: string
          bank_account_number?: string | null
          bank_branch_code?: string | null
          bank_name?: string | null
          bio?: string | null
          city?: string | null
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          full_name: string
          id?: string
          id_number?: string | null
          phone?: string | null
          postal_code?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_notes?: string | null
          service_category?:
            | Database["public"]["Enums"]["service_category"]
            | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          background_check_consent?: boolean
          background_check_status?: string
          bank_account_number?: string | null
          bank_branch_code?: string | null
          bank_name?: string | null
          bio?: string | null
          city?: string | null
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          full_name?: string
          id?: string
          id_number?: string | null
          phone?: string | null
          postal_code?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_notes?: string | null
          service_category?:
            | Database["public"]["Enums"]["service_category"]
            | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      zooter_documents: {
        Row: {
          application_id: string | null
          created_at: string
          doc_type: string
          id: string
          rejected_reason: string | null
          status: string
          storage_path: string
          user_id: string
        }
        Insert: {
          application_id?: string | null
          created_at?: string
          doc_type: string
          id?: string
          rejected_reason?: string | null
          status?: string
          storage_path: string
          user_id: string
        }
        Update: {
          application_id?: string | null
          created_at?: string
          doc_type?: string
          id?: string
          rejected_reason?: string | null
          status?: string
          storage_path?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "zooter_documents_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "zooter_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      zooter_earnings: {
        Row: {
          booking_id: string
          commission_rate: number
          created_at: string
          gross_amount: number
          id: string
          net_amount: number
          status: string
          zooter_id: string
        }
        Insert: {
          booking_id: string
          commission_rate: number
          created_at?: string
          gross_amount: number
          id?: string
          net_amount: number
          status?: string
          zooter_id: string
        }
        Update: {
          booking_id?: string
          commission_rate?: number
          created_at?: string
          gross_amount?: number
          id?: string
          net_amount?: number
          status?: string
          zooter_id?: string
        }
        Relationships: []
      }
      zooter_jobs: {
        Row: {
          booking_id: string
          decline_reason: string | null
          id: string
          offered_at: string
          responded_at: string | null
          state: string
          zooter_id: string
        }
        Insert: {
          booking_id: string
          decline_reason?: string | null
          id?: string
          offered_at?: string
          responded_at?: string | null
          state?: string
          zooter_id: string
        }
        Update: {
          booking_id?: string
          decline_reason?: string | null
          id?: string
          offered_at?: string
          responded_at?: string | null
          state?: string
          zooter_id?: string
        }
        Relationships: []
      }
      zooter_training_completions: {
        Row: {
          completed_at: string
          id: string
          module_id: string
          passed: boolean
          score: number
          user_id: string
        }
        Insert: {
          completed_at?: string
          id?: string
          module_id: string
          passed?: boolean
          score?: number
          user_id: string
        }
        Update: {
          completed_at?: string
          id?: string
          module_id?: string
          passed?: boolean
          score?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "zooter_training_completions_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "training_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      zooter_training_progress: {
        Row: {
          completed: boolean
          completed_at: string | null
          id: string
          module_id: string
          zooter_id: string
        }
        Insert: {
          completed?: boolean
          completed_at?: string | null
          id?: string
          module_id: string
          zooter_id: string
        }
        Update: {
          completed?: boolean
          completed_at?: string | null
          id?: string
          module_id?: string
          zooter_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "zooter_training_progress_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "training_modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "zooter_training_progress_zooter_id_fkey"
            columns: ["zooter_id"]
            isOneToOne: false
            referencedRelation: "zooters"
            referencedColumns: ["id"]
          },
        ]
      }
      zooters: {
        Row: {
          active: boolean
          bio: string | null
          commission_rate: number
          created_at: string
          distance_mi: number
          hourly_rate: number
          id: string
          is_zotm: boolean
          jobs_completed: number
          name: string
          photo_url: string | null
          rating: number
          role: Database["public"]["Enums"]["service_category"]
          tags: string[]
          tier: string
          user_id: string | null
          verified: boolean
        }
        Insert: {
          active?: boolean
          bio?: string | null
          commission_rate?: number
          created_at?: string
          distance_mi?: number
          hourly_rate: number
          id?: string
          is_zotm?: boolean
          jobs_completed?: number
          name: string
          photo_url?: string | null
          rating?: number
          role: Database["public"]["Enums"]["service_category"]
          tags?: string[]
          tier?: string
          user_id?: string | null
          verified?: boolean
        }
        Update: {
          active?: boolean
          bio?: string | null
          commission_rate?: number
          created_at?: string
          distance_mi?: number
          hourly_rate?: number
          id?: string
          is_zotm?: boolean
          jobs_completed?: number
          name?: string
          photo_url?: string | null
          rating?: number
          role?: Database["public"]["Enums"]["service_category"]
          tags?: string[]
          tier?: string
          user_id?: string | null
          verified?: boolean
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      gen_referral_code: { Args: never; Returns: string }
      get_accepted_zooter_job_destinations: {
        Args: { p_job_ids: string[] }
        Returns: {
          job_id: string
          booking_id: string
          address: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user" | "zooter"
      booking_status:
        | "draft"
        | "pending_payment"
        | "payment_confirmed"
        | "awaiting_assignment"
        | "assigned"
        | "contractor_accepted"
        | "en_route"
        | "rated"
        | "replacement_required"
        | "replacement_offered"
        | "pending"
        | "confirmed"
        | "enroute"
        | "in_progress"
        | "completed"
        | "cancelled"
        | "reassigned"
      service_category:
        | "cleaning"
        | "gardening"
        | "childcare"
        | "handyman"
        | "babysitting"
        | "petcare"
        | "maintenance"
      subscription_status: "active" | "paused" | "cancelled" | "pending_payment" | "past_due"
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
    Enums: {
      app_role: ["admin", "user", "zooter"],
      booking_status: [
        "draft",
        "pending_payment",
        "payment_confirmed",
        "awaiting_assignment",
        "assigned",
        "contractor_accepted",
        "en_route",
        "rated",
        "replacement_required",
        "replacement_offered",
        "pending",
        "confirmed",
        "enroute",
        "in_progress",
        "completed",
        "cancelled",
        "reassigned",
      ],
      service_category: [
        "cleaning",
        "gardening",
        "childcare",
        "handyman",
        "babysitting",
        "petcare",
        "maintenance",
      ],
      subscription_status: ["active", "paused", "cancelled", "pending_payment", "past_due"],
    },
  },
} as const
