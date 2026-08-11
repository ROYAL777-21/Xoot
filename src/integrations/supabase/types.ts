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
      admin_audit_log: {
        Row: {
          action: string
          admin_id: string
          changes: Json | null
          created_at: string
          id: string
          ip_address: string | null
          reason: string | null
          target_id: string | null
          target_table: string
        }
        Insert: {
          action: string
          admin_id: string
          changes?: Json | null
          created_at?: string
          id?: string
          ip_address?: string | null
          reason?: string | null
          target_id?: string | null
          target_table: string
        }
        Update: {
          action?: string
          admin_id?: string
          changes?: Json | null
          created_at?: string
          id?: string
          ip_address?: string | null
          reason?: string | null
          target_id?: string | null
          target_table?: string
        }
        Relationships: []
      }
      admin_review_queue: {
        Row: {
          assigned_to: string | null
          booking_id: string | null
          created_at: string
          id: string
          priority: string
          queue_type: string
          resolution_notes: string | null
          resolved_at: string | null
          status: string
          subject_id: string | null
          subject_table: string
          summary: string
          user_id: string | null
          zooter_id: string | null
        }
        Insert: {
          assigned_to?: string | null
          booking_id?: string | null
          created_at?: string
          id?: string
          priority?: string
          queue_type: string
          resolution_notes?: string | null
          resolved_at?: string | null
          status?: string
          subject_id?: string | null
          subject_table: string
          summary: string
          user_id?: string | null
          zooter_id?: string | null
        }
        Update: {
          assigned_to?: string | null
          booking_id?: string | null
          created_at?: string
          id?: string
          priority?: string
          queue_type?: string
          resolution_notes?: string | null
          resolved_at?: string | null
          status?: string
          subject_id?: string | null
          subject_table?: string
          summary?: string
          user_id?: string | null
          zooter_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_review_queue_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "booking_sensitive_access"
            referencedColumns: ["booking_id"]
          },
          {
            foreignKeyName: "admin_review_queue_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "booking_zooter_profiles"
            referencedColumns: ["booking_id"]
          },
          {
            foreignKeyName: "admin_review_queue_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_review_queue_zooter_id_fkey"
            columns: ["zooter_id"]
            isOneToOne: false
            referencedRelation: "analytics_contractor_quality"
            referencedColumns: ["zooter_id"]
          },
          {
            foreignKeyName: "admin_review_queue_zooter_id_fkey"
            columns: ["zooter_id"]
            isOneToOne: false
            referencedRelation: "booking_zooter_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_review_queue_zooter_id_fkey"
            columns: ["zooter_id"]
            isOneToOne: false
            referencedRelation: "zooters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_review_queue_zooter_id_fkey"
            columns: ["zooter_id"]
            isOneToOne: false
            referencedRelation: "zooters_public"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_action_contracts: {
        Row: {
          action_key: string
          active: boolean
          agent_key: string
          allowed_operations: string[]
          approval_request_id: string | null
          created_at: string
          data_boundaries: string
          id: string
          owner: string
          prohibited_operations: string[]
          requires_human_approval: boolean
          risk_level: string
          updated_at: string
          version: number
        }
        Insert: {
          action_key: string
          active?: boolean
          agent_key: string
          allowed_operations?: string[]
          approval_request_id?: string | null
          created_at?: string
          data_boundaries: string
          id?: string
          owner: string
          prohibited_operations?: string[]
          requires_human_approval?: boolean
          risk_level?: string
          updated_at?: string
          version?: number
        }
        Update: {
          action_key?: string
          active?: boolean
          agent_key?: string
          allowed_operations?: string[]
          approval_request_id?: string | null
          created_at?: string
          data_boundaries?: string
          id?: string
          owner?: string
          prohibited_operations?: string[]
          requires_human_approval?: boolean
          risk_level?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "agent_action_contracts_approval_request_id_fkey"
            columns: ["approval_request_id"]
            isOneToOne: false
            referencedRelation: "approval_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      analytics_event_contracts: {
        Row: {
          allowed_properties: string[]
          approval_request_id: string | null
          created_at: string
          destination: string
          event_name: string
          id: string
          owner: string
          pii_allowed: boolean
          prohibited_properties: string[]
          purpose: string
          retention_days: number
          status: string
          updated_at: string
        }
        Insert: {
          allowed_properties?: string[]
          approval_request_id?: string | null
          created_at?: string
          destination?: string
          event_name: string
          id?: string
          owner: string
          pii_allowed?: boolean
          prohibited_properties?: string[]
          purpose: string
          retention_days?: number
          status?: string
          updated_at?: string
        }
        Update: {
          allowed_properties?: string[]
          approval_request_id?: string | null
          created_at?: string
          destination?: string
          event_name?: string
          id?: string
          owner?: string
          pii_allowed?: boolean
          prohibited_properties?: string[]
          purpose?: string
          retention_days?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "analytics_event_contracts_approval_request_id_fkey"
            columns: ["approval_request_id"]
            isOneToOne: false
            referencedRelation: "approval_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      analytics_events: {
        Row: {
          area: string
          created_at: string
          id: string
          metadata: Json
          name: string
          user_id: string | null
        }
        Insert: {
          area: string
          created_at?: string
          id?: string
          metadata?: Json
          name: string
          user_id?: string | null
        }
        Update: {
          area?: string
          created_at?: string
          id?: string
          metadata?: Json
          name?: string
          user_id?: string | null
        }
        Relationships: []
      }
      approval_requests: {
        Row: {
          control_key: string | null
          created_at: string
          decided_at: string | null
          decided_by: string | null
          evidence: Json
          expires_at: string | null
          id: string
          reason: string
          request_type: string
          requested_by: string | null
          risk_level: string
          status: string
          target_id: string | null
          target_table: string | null
          title: string
          updated_at: string
        }
        Insert: {
          control_key?: string | null
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          evidence?: Json
          expires_at?: string | null
          id?: string
          reason: string
          request_type: string
          requested_by?: string | null
          risk_level?: string
          status?: string
          target_id?: string | null
          target_table?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          control_key?: string | null
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          evidence?: Json
          expires_at?: string | null
          id?: string
          reason?: string
          request_type?: string
          requested_by?: string | null
          risk_level?: string
          status?: string
          target_id?: string | null
          target_table?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      automation_skills: {
        Row: {
          action: string
          active: boolean
          approval_gate: string
          created_at: string
          data_used: string
          failure_mode: string
          id: string
          name: string
          owner: string
          stack_tool: string
          trigger_event: string
        }
        Insert: {
          action: string
          active?: boolean
          approval_gate: string
          created_at?: string
          data_used: string
          failure_mode: string
          id?: string
          name: string
          owner: string
          stack_tool: string
          trigger_event: string
        }
        Update: {
          action?: string
          active?: boolean
          approval_gate?: string
          created_at?: string
          data_used?: string
          failure_mode?: string
          id?: string
          name?: string
          owner?: string
          stack_tool?: string
          trigger_event?: string
        }
        Relationships: []
      }
      booking_chat_typing_indicators: {
        Row: {
          booking_id: string
          is_typing: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          booking_id: string
          is_typing?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          booking_id?: string
          is_typing?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_chat_typing_indicators_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "booking_sensitive_access"
            referencedColumns: ["booking_id"]
          },
          {
            foreignKeyName: "booking_chat_typing_indicators_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "booking_zooter_profiles"
            referencedColumns: ["booking_id"]
          },
          {
            foreignKeyName: "booking_chat_typing_indicators_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_completion_photos: {
        Row: {
          booking_id: string
          created_at: string
          id: string
          photo_type: string
          storage_path: string
          zooter_id: string
        }
        Insert: {
          booking_id: string
          created_at?: string
          id?: string
          photo_type: string
          storage_path: string
          zooter_id: string
        }
        Update: {
          booking_id?: string
          created_at?: string
          id?: string
          photo_type?: string
          storage_path?: string
          zooter_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_completion_photos_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "booking_sensitive_access"
            referencedColumns: ["booking_id"]
          },
          {
            foreignKeyName: "booking_completion_photos_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "booking_zooter_profiles"
            referencedColumns: ["booking_id"]
          },
          {
            foreignKeyName: "booking_completion_photos_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_completion_photos_zooter_id_fkey"
            columns: ["zooter_id"]
            isOneToOne: false
            referencedRelation: "analytics_contractor_quality"
            referencedColumns: ["zooter_id"]
          },
          {
            foreignKeyName: "booking_completion_photos_zooter_id_fkey"
            columns: ["zooter_id"]
            isOneToOne: false
            referencedRelation: "booking_zooter_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_completion_photos_zooter_id_fkey"
            columns: ["zooter_id"]
            isOneToOne: false
            referencedRelation: "zooters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_completion_photos_zooter_id_fkey"
            columns: ["zooter_id"]
            isOneToOne: false
            referencedRelation: "zooters_public"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_invoices: {
        Row: {
          booking_id: string
          created_at: string
          currency: string
          failure_mode: string | null
          generated_at: string | null
          id: string
          invoice_number: string
          legal_entity_name: string
          legal_entity_registration: string | null
          line_items: Json
          payment_record_id: string | null
          pdf_bucket: string
          pdf_path: string | null
          sent_at: string | null
          snapshot: Json
          status: string
          subtotal_amount: number
          total_amount: number
          updated_at: string
          user_id: string
          vat_amount: number
          vat_number: string | null
          vat_rate: number
        }
        Insert: {
          booking_id: string
          created_at?: string
          currency?: string
          failure_mode?: string | null
          generated_at?: string | null
          id?: string
          invoice_number: string
          legal_entity_name: string
          legal_entity_registration?: string | null
          line_items?: Json
          payment_record_id?: string | null
          pdf_bucket?: string
          pdf_path?: string | null
          sent_at?: string | null
          snapshot?: Json
          status?: string
          subtotal_amount: number
          total_amount: number
          updated_at?: string
          user_id: string
          vat_amount?: number
          vat_number?: string | null
          vat_rate?: number
        }
        Update: {
          booking_id?: string
          created_at?: string
          currency?: string
          failure_mode?: string | null
          generated_at?: string | null
          id?: string
          invoice_number?: string
          legal_entity_name?: string
          legal_entity_registration?: string | null
          line_items?: Json
          payment_record_id?: string | null
          pdf_bucket?: string
          pdf_path?: string | null
          sent_at?: string | null
          snapshot?: Json
          status?: string
          subtotal_amount?: number
          total_amount?: number
          updated_at?: string
          user_id?: string
          vat_amount?: number
          vat_number?: string | null
          vat_rate?: number
        }
        Relationships: [
          {
            foreignKeyName: "booking_invoices_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "booking_sensitive_access"
            referencedColumns: ["booking_id"]
          },
          {
            foreignKeyName: "booking_invoices_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "booking_zooter_profiles"
            referencedColumns: ["booking_id"]
          },
          {
            foreignKeyName: "booking_invoices_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_invoices_payment_record_id_fkey"
            columns: ["payment_record_id"]
            isOneToOne: false
            referencedRelation: "payment_records"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_message_read_receipts: {
        Row: {
          booking_id: string
          message_id: string
          read_at: string
          user_id: string
        }
        Insert: {
          booking_id: string
          message_id: string
          read_at?: string
          user_id: string
        }
        Update: {
          booking_id?: string
          message_id?: string
          read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_message_read_receipts_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "booking_sensitive_access"
            referencedColumns: ["booking_id"]
          },
          {
            foreignKeyName: "booking_message_read_receipts_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "booking_zooter_profiles"
            referencedColumns: ["booking_id"]
          },
          {
            foreignKeyName: "booking_message_read_receipts_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_message_read_receipts_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_message_reports: {
        Row: {
          booking_id: string
          created_at: string
          details: string | null
          id: string
          message_id: string
          reason: string
          reporter_id: string
          resolved_at: string | null
          resolved_by: string | null
          status: string
        }
        Insert: {
          booking_id: string
          created_at?: string
          details?: string | null
          id?: string
          message_id: string
          reason: string
          reporter_id: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
        }
        Update: {
          booking_id?: string
          created_at?: string
          details?: string | null
          id?: string
          message_id?: string
          reason?: string
          reporter_id?: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_message_reports_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "booking_sensitive_access"
            referencedColumns: ["booking_id"]
          },
          {
            foreignKeyName: "booking_message_reports_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "booking_zooter_profiles"
            referencedColumns: ["booking_id"]
          },
          {
            foreignKeyName: "booking_message_reports_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_message_reports_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_service_line_items: {
        Row: {
          booking_id: string
          created_at: string
          currency: string
          id: string
          item_key: string
          label: string
          metadata: Json
          quantity: number
          source: string
          total_amount: number
          unit_amount: number
        }
        Insert: {
          booking_id: string
          created_at?: string
          currency?: string
          id?: string
          item_key: string
          label: string
          metadata?: Json
          quantity?: number
          source?: string
          total_amount: number
          unit_amount: number
        }
        Update: {
          booking_id?: string
          created_at?: string
          currency?: string
          id?: string
          item_key?: string
          label?: string
          metadata?: Json
          quantity?: number
          source?: string
          total_amount?: number
          unit_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "booking_service_line_items_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "booking_sensitive_access"
            referencedColumns: ["booking_id"]
          },
          {
            foreignKeyName: "booking_service_line_items_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "booking_zooter_profiles"
            referencedColumns: ["booking_id"]
          },
          {
            foreignKeyName: "booking_service_line_items_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_status_events: {
        Row: {
          actor_id: string | null
          booking_id: string
          created_at: string
          id: string
          label: string
          meta: Json
          status: string
        }
        Insert: {
          actor_id?: string | null
          booking_id: string
          created_at?: string
          id?: string
          label: string
          meta?: Json
          status: string
        }
        Update: {
          actor_id?: string | null
          booking_id?: string
          created_at?: string
          id?: string
          label?: string
          meta?: Json
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_status_events_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "booking_sensitive_access"
            referencedColumns: ["booking_id"]
          },
          {
            foreignKeyName: "booking_status_events_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "booking_zooter_profiles"
            referencedColumns: ["booking_id"]
          },
          {
            foreignKeyName: "booking_status_events_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_fare_splits: {
        Row: {
          accepted_at: string | null
          amount_cents: number
          booking_id: string
          created_at: string
          id: string
          invited_by: string
          invited_email: string
          payer_user_id: string | null
          payment_record_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          amount_cents: number
          booking_id: string
          created_at?: string
          id?: string
          invited_by: string
          invited_email: string
          payer_user_id?: string | null
          payment_record_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          amount_cents?: number
          booking_id?: string
          created_at?: string
          id?: string
          invited_by?: string
          invited_email?: string
          payer_user_id?: string | null
          payment_record_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_fare_splits_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "booking_sensitive_access"
            referencedColumns: ["booking_id"]
          },
          {
            foreignKeyName: "booking_fare_splits_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "booking_zooter_profiles"
            referencedColumns: ["booking_id"]
          },
          {
            foreignKeyName: "booking_fare_splits_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_fare_splits_payment_record_id_fkey"
            columns: ["payment_record_id"]
            isOneToOne: false
            referencedRelation: "payment_records"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_tips: {
        Row: {
          amount_cents: number
          booking_id: string
          created_at: string
          settled_at: string | null
          updated_at: string
          user_id: string
          zooter_id: string | null
        }
        Insert: {
          amount_cents: number
          booking_id: string
          created_at?: string
          settled_at?: string | null
          updated_at?: string
          user_id: string
          zooter_id?: string | null
        }
        Update: {
          amount_cents?: number
          booking_id?: string
          created_at?: string
          settled_at?: string | null
          updated_at?: string
          user_id?: string
          zooter_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "booking_tips_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "booking_sensitive_access"
            referencedColumns: ["booking_id"]
          },
          {
            foreignKeyName: "booking_tips_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "booking_zooter_profiles"
            referencedColumns: ["booking_id"]
          },
          {
            foreignKeyName: "booking_tips_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_tips_zooter_id_fkey"
            columns: ["zooter_id"]
            isOneToOne: false
            referencedRelation: "analytics_contractor_quality"
            referencedColumns: ["zooter_id"]
          },
          {
            foreignKeyName: "booking_tips_zooter_id_fkey"
            columns: ["zooter_id"]
            isOneToOne: false
            referencedRelation: "booking_zooter_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_tips_zooter_id_fkey"
            columns: ["zooter_id"]
            isOneToOne: false
            referencedRelation: "zooters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_tips_zooter_id_fkey"
            columns: ["zooter_id"]
            isOneToOne: false
            referencedRelation: "zooters_public"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          address: string | null
          arrived_at: string | null
          assigned_at: string | null
          at_risk: boolean
          booking_cover_amount: number
          cancellation_fee: number
          cancelled_at: string | null
          cancelled_by: string | null
          commission_rate_bps: number | null
          completed_at: string | null
          completion_photo_required: boolean
          created_at: string
          duration_hours: number
          frequency: string
          high_demand_premium: number
          household_profile_id: string | null
          id: string
          job_completed_at: string | null
          job_started_at: string | null
          launch_region: string | null
          notes: string | null
          original_zooter_id: string | null
          payment_confirmed_at: string | null
          payment_status: string
          price: number
          property_account_id: string | null
          reassignment_acknowledged: boolean
          replacement_count: number
          replacement_offered: boolean
          replacement_status: string | null
          scheduled_at: string
          sensitive_access_available_notified_at: string | null
          sensitive_data_revoked_at: string | null
          service: string
          service_fee: number
          service_type: string
          status: Database["public"]["Enums"]["booking_status"]
          updated_at: string
          user_id: string
          was_reassigned: boolean
          zoot_black_certificate_id: string | null
          zoot_black_line_item_amount: number | null
          zoot_black_requested: boolean
          zooter_id: string | null
        }
        Insert: {
          address?: string | null
          arrived_at?: string | null
          assigned_at?: string | null
          at_risk?: boolean
          booking_cover_amount?: number
          cancellation_fee?: number
          cancelled_at?: string | null
          cancelled_by?: string | null
          commission_rate_bps?: number | null
          completed_at?: string | null
          completion_photo_required?: boolean
          created_at?: string
          duration_hours?: number
          frequency?: string
          high_demand_premium?: number
          household_profile_id?: string | null
          id?: string
          job_completed_at?: string | null
          job_started_at?: string | null
          launch_region?: string | null
          notes?: string | null
          original_zooter_id?: string | null
          payment_confirmed_at?: string | null
          payment_status?: string
          price?: number
          property_account_id?: string | null
          reassignment_acknowledged?: boolean
          replacement_count?: number
          replacement_offered?: boolean
          replacement_status?: string | null
          scheduled_at: string
          sensitive_access_available_notified_at?: string | null
          sensitive_data_revoked_at?: string | null
          service?: string
          service_fee?: number
          service_type?: string
          status?: Database["public"]["Enums"]["booking_status"]
          updated_at?: string
          user_id: string
          was_reassigned?: boolean
          zoot_black_certificate_id?: string | null
          zoot_black_line_item_amount?: number | null
          zoot_black_requested?: boolean
          zooter_id?: string | null
        }
        Update: {
          address?: string | null
          arrived_at?: string | null
          assigned_at?: string | null
          at_risk?: boolean
          booking_cover_amount?: number
          cancellation_fee?: number
          cancelled_at?: string | null
          cancelled_by?: string | null
          commission_rate_bps?: number | null
          completed_at?: string | null
          completion_photo_required?: boolean
          created_at?: string
          duration_hours?: number
          frequency?: string
          high_demand_premium?: number
          household_profile_id?: string | null
          id?: string
          job_completed_at?: string | null
          job_started_at?: string | null
          launch_region?: string | null
          notes?: string | null
          original_zooter_id?: string | null
          payment_confirmed_at?: string | null
          payment_status?: string
          price?: number
          property_account_id?: string | null
          reassignment_acknowledged?: boolean
          replacement_count?: number
          replacement_offered?: boolean
          replacement_status?: string | null
          scheduled_at?: string
          sensitive_access_available_notified_at?: string | null
          sensitive_data_revoked_at?: string | null
          service?: string
          service_fee?: number
          service_type?: string
          status?: Database["public"]["Enums"]["booking_status"]
          updated_at?: string
          user_id?: string
          was_reassigned?: boolean
          zoot_black_certificate_id?: string | null
          zoot_black_line_item_amount?: number | null
          zoot_black_requested?: boolean
          zooter_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_household_profile_id_fkey"
            columns: ["household_profile_id"]
            isOneToOne: false
            referencedRelation: "household_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_original_zooter_id_fkey"
            columns: ["original_zooter_id"]
            isOneToOne: false
            referencedRelation: "analytics_contractor_quality"
            referencedColumns: ["zooter_id"]
          },
          {
            foreignKeyName: "bookings_original_zooter_id_fkey"
            columns: ["original_zooter_id"]
            isOneToOne: false
            referencedRelation: "booking_zooter_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_original_zooter_id_fkey"
            columns: ["original_zooter_id"]
            isOneToOne: false
            referencedRelation: "zooters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_original_zooter_id_fkey"
            columns: ["original_zooter_id"]
            isOneToOne: false
            referencedRelation: "zooters_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_property_account_id_fkey"
            columns: ["property_account_id"]
            isOneToOne: false
            referencedRelation: "property_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_zoot_black_certificate_fk"
            columns: ["zoot_black_certificate_id"]
            isOneToOne: false
            referencedRelation: "zoot_black_completion_certificates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_zooter_id_fkey"
            columns: ["zooter_id"]
            isOneToOne: false
            referencedRelation: "analytics_contractor_quality"
            referencedColumns: ["zooter_id"]
          },
          {
            foreignKeyName: "bookings_zooter_id_fkey"
            columns: ["zooter_id"]
            isOneToOne: false
            referencedRelation: "booking_zooter_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_zooter_id_fkey"
            columns: ["zooter_id"]
            isOneToOne: false
            referencedRelation: "zooters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_zooter_id_fkey"
            columns: ["zooter_id"]
            isOneToOne: false
            referencedRelation: "zooters_public"
            referencedColumns: ["id"]
          },
        ]
      }
      care_plus_applications: {
        Row: {
          address: string | null
          admin_fee_paid: boolean
          created_at: string
          daily_end_time: string | null
          daily_pay_rate: number | null
          daily_start_time: string | null
          days_of_week: string[] | null
          email: string | null
          first_name: string | null
          household_goal: string | null
          id: string
          ideal_personality: string | null
          job_description: string | null
          last_name: string | null
          notes: string | null
          other_qualities: string | null
          overtime: string | null
          pets: string[] | null
          phone: string | null
          preferred_language: string | null
          preferred_start: string | null
          preferred_start_date: string | null
          required_skills: string[] | null
          reviewed_at: string | null
          reviewer_notes: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          admin_fee_paid?: boolean
          created_at?: string
          daily_end_time?: string | null
          daily_pay_rate?: number | null
          daily_start_time?: string | null
          days_of_week?: string[] | null
          email?: string | null
          first_name?: string | null
          household_goal?: string | null
          id?: string
          ideal_personality?: string | null
          job_description?: string | null
          last_name?: string | null
          notes?: string | null
          other_qualities?: string | null
          overtime?: string | null
          pets?: string[] | null
          phone?: string | null
          preferred_language?: string | null
          preferred_start?: string | null
          preferred_start_date?: string | null
          required_skills?: string[] | null
          reviewed_at?: string | null
          reviewer_notes?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          admin_fee_paid?: boolean
          created_at?: string
          daily_end_time?: string | null
          daily_pay_rate?: number | null
          daily_start_time?: string | null
          days_of_week?: string[] | null
          email?: string | null
          first_name?: string | null
          household_goal?: string | null
          id?: string
          ideal_personality?: string | null
          job_description?: string | null
          last_name?: string | null
          notes?: string | null
          other_qualities?: string | null
          overtime?: string | null
          pets?: string[] | null
          phone?: string | null
          preferred_language?: string | null
          preferred_start?: string | null
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
      contractor_screening_questions: {
        Row: {
          active: boolean
          category: string
          created_at: string
          expected_signal: string
          id: string
          question: string
        }
        Insert: {
          active?: boolean
          category: string
          created_at?: string
          expected_signal: string
          id?: string
          question: string
        }
        Update: {
          active?: boolean
          category?: string
          created_at?: string
          expected_signal?: string
          id?: string
          question?: string
        }
        Relationships: []
      }
      experiment_registry: {
        Row: {
          approval_request_id: string | null
          created_at: string
          data_collected: string[]
          ended_at: string | null
          experiment_key: string
          hypothesis: string
          id: string
          metadata: Json
          metric_owner: string
          owner: string
          pii_allowed: boolean
          primary_metric: string
          started_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          approval_request_id?: string | null
          created_at?: string
          data_collected?: string[]
          ended_at?: string | null
          experiment_key: string
          hypothesis: string
          id?: string
          metadata?: Json
          metric_owner: string
          owner: string
          pii_allowed?: boolean
          primary_metric: string
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          approval_request_id?: string | null
          created_at?: string
          data_collected?: string[]
          ended_at?: string | null
          experiment_key?: string
          hypothesis?: string
          id?: string
          metadata?: Json
          metric_owner?: string
          owner?: string
          pii_allowed?: boolean
          primary_metric?: string
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "experiment_registry_approval_request_id_fkey"
            columns: ["approval_request_id"]
            isOneToOne: false
            referencedRelation: "approval_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      favorites: {
        Row: {
          created_at: string
          favorite_type: string
          notes: string | null
          recurring_locked: boolean
          repeat_count: number
          user_id: string
          zooter_id: string
        }
        Insert: {
          created_at?: string
          favorite_type?: string
          notes?: string | null
          recurring_locked?: boolean
          repeat_count?: number
          user_id: string
          zooter_id: string
        }
        Update: {
          created_at?: string
          favorite_type?: string
          notes?: string | null
          recurring_locked?: boolean
          repeat_count?: number
          user_id?: string
          zooter_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_zooter_id_fkey"
            columns: ["zooter_id"]
            isOneToOne: false
            referencedRelation: "analytics_contractor_quality"
            referencedColumns: ["zooter_id"]
          },
          {
            foreignKeyName: "favorites_zooter_id_fkey"
            columns: ["zooter_id"]
            isOneToOne: false
            referencedRelation: "booking_zooter_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favorites_zooter_id_fkey"
            columns: ["zooter_id"]
            isOneToOne: false
            referencedRelation: "zooters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favorites_zooter_id_fkey"
            columns: ["zooter_id"]
            isOneToOne: false
            referencedRelation: "zooters_public"
            referencedColumns: ["id"]
          },
        ]
      }
      gamification_progress: {
        Row: {
          care_plus_started: boolean
          favorite_saved: boolean
          household_profile_complete: boolean
          recurring_set: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          care_plus_started?: boolean
          favorite_saved?: boolean
          household_profile_complete?: boolean
          recurring_set?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          care_plus_started?: boolean
          favorite_saved?: boolean
          household_profile_complete?: boolean
          recurring_set?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      gift_clean_orders: {
        Row: {
          amount: number
          created_at: string
          id: string
          message: string | null
          occasion: string | null
          payment_record_id: string | null
          purchaser_user_id: string
          recipient_email: string | null
          recipient_name: string
          recipient_phone: string | null
          redeemed_at: string | null
          service_type: string
          status: string
        }
        Insert: {
          amount?: number
          created_at?: string
          id?: string
          message?: string | null
          occasion?: string | null
          payment_record_id?: string | null
          purchaser_user_id: string
          recipient_email?: string | null
          recipient_name: string
          recipient_phone?: string | null
          redeemed_at?: string | null
          service_type?: string
          status?: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          message?: string | null
          occasion?: string | null
          payment_record_id?: string | null
          purchaser_user_id?: string
          recipient_email?: string | null
          recipient_name?: string
          recipient_phone?: string | null
          redeemed_at?: string | null
          service_type?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "gift_clean_orders_payment_record_id_fkey"
            columns: ["payment_record_id"]
            isOneToOne: false
            referencedRelation: "payment_records"
            referencedColumns: ["id"]
          },
        ]
      }
      household_profiles: {
        Row: {
          access_instructions: string | null
          access_notes: string | null
          address: string | null
          alarm_code: string | null
          cleaning_preferences: string | null
          created_at: string
          favourite_products: string | null
          fragile_areas: string | null
          gate_code: string | null
          id: string
          is_default: boolean
          label: string
          parking_instructions: string | null
          pet_notes: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          access_instructions?: string | null
          access_notes?: string | null
          address?: string | null
          alarm_code?: string | null
          cleaning_preferences?: string | null
          created_at?: string
          favourite_products?: string | null
          fragile_areas?: string | null
          gate_code?: string | null
          id?: string
          is_default?: boolean
          label?: string
          parking_instructions?: string | null
          pet_notes?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          access_instructions?: string | null
          access_notes?: string | null
          address?: string | null
          alarm_code?: string | null
          cleaning_preferences?: string | null
          created_at?: string
          favourite_products?: string | null
          fragile_areas?: string | null
          gate_code?: string | null
          id?: string
          is_default?: boolean
          label?: string
          parking_instructions?: string | null
          pet_notes?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      integration_outbox: {
        Row: {
          approval_required: boolean
          approved_at: string | null
          approved_by: string | null
          channel: string
          created_at: string
          created_by: string | null
          event_type: string
          failure_mode: string | null
          id: string
          owner: string
          payload: Json
          processed_at: string | null
          scheduled_at: string | null
          source_id: string | null
          source_table: string | null
          stack_tool: string
          status: string
        }
        Insert: {
          approval_required?: boolean
          approved_at?: string | null
          approved_by?: string | null
          channel: string
          created_at?: string
          created_by?: string | null
          event_type: string
          failure_mode?: string | null
          id?: string
          owner: string
          payload?: Json
          processed_at?: string | null
          scheduled_at?: string | null
          source_id?: string | null
          source_table?: string | null
          stack_tool: string
          status?: string
        }
        Update: {
          approval_required?: boolean
          approved_at?: string | null
          approved_by?: string | null
          channel?: string
          created_at?: string
          created_by?: string | null
          event_type?: string
          failure_mode?: string | null
          id?: string
          owner?: string
          payload?: Json
          processed_at?: string | null
          scheduled_at?: string | null
          source_id?: string | null
          source_table?: string | null
          stack_tool?: string
          status?: string
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
      masked_call_sessions: {
        Row: {
          booking_id: string
          callee_role: string
          caller_id: string
          consent_recorded_at: string | null
          created_at: string
          duration_seconds: number | null
          eligibility_checked_at: string | null
          eligible_until: string | null
          ended_at: string | null
          failure_reason: string | null
          id: string
          provider: string
          provider_call_sid: string | null
          provider_conference_sid: string | null
          provider_parent_call_sid: string | null
          provider_session_reference: string | null
          provider_status: Json
          recording_consent: boolean
          started_at: string | null
          status: string
          status_callback_payload: Json
        }
        Insert: {
          booking_id: string
          callee_role: string
          caller_id: string
          consent_recorded_at?: string | null
          created_at?: string
          duration_seconds?: number | null
          eligibility_checked_at?: string | null
          eligible_until?: string | null
          ended_at?: string | null
          failure_reason?: string | null
          id?: string
          provider?: string
          provider_call_sid?: string | null
          provider_conference_sid?: string | null
          provider_parent_call_sid?: string | null
          provider_session_reference?: string | null
          provider_status?: Json
          recording_consent?: boolean
          started_at?: string | null
          status?: string
          status_callback_payload?: Json
        }
        Update: {
          booking_id?: string
          callee_role?: string
          caller_id?: string
          consent_recorded_at?: string | null
          created_at?: string
          duration_seconds?: number | null
          eligibility_checked_at?: string | null
          eligible_until?: string | null
          ended_at?: string | null
          failure_reason?: string | null
          id?: string
          provider?: string
          provider_call_sid?: string | null
          provider_conference_sid?: string | null
          provider_parent_call_sid?: string | null
          provider_session_reference?: string | null
          provider_status?: Json
          recording_consent?: boolean
          started_at?: string | null
          status?: string
          status_callback_payload?: Json
        }
        Relationships: [
          {
            foreignKeyName: "masked_call_sessions_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "booking_sensitive_access"
            referencedColumns: ["booking_id"]
          },
          {
            foreignKeyName: "masked_call_sessions_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "booking_zooter_profiles"
            referencedColumns: ["booking_id"]
          },
          {
            foreignKeyName: "masked_call_sessions_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      masked_conversation_sessions: {
        Row: {
          booking_id: string
          client_identity: string | null
          contractor_identity: string | null
          created_at: string
          ended_at: string | null
          failure_reason: string | null
          id: string
          provider: string
          provider_conversation_sid: string | null
          requester_id: string
          started_at: string | null
          status: string
        }
        Insert: {
          booking_id: string
          client_identity?: string | null
          contractor_identity?: string | null
          created_at?: string
          ended_at?: string | null
          failure_reason?: string | null
          id?: string
          provider?: string
          provider_conversation_sid?: string | null
          requester_id: string
          started_at?: string | null
          status?: string
        }
        Update: {
          booking_id?: string
          client_identity?: string | null
          contractor_identity?: string | null
          created_at?: string
          ended_at?: string | null
          failure_reason?: string | null
          id?: string
          provider?: string
          provider_conversation_sid?: string | null
          requester_id?: string
          started_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "masked_conversation_sessions_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "booking_sensitive_access"
            referencedColumns: ["booking_id"]
          },
          {
            foreignKeyName: "masked_conversation_sessions_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "booking_zooter_profiles"
            referencedColumns: ["booking_id"]
          },
          {
            foreignKeyName: "masked_conversation_sessions_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          body: string
          booking_id: string
          client_safety_flags: string[]
          created_at: string
          envelope_version: number
          id: string
          moderation_state: string
          reported_at: string | null
          sender_type: string
          sender_user_id: string | null
        }
        Insert: {
          body: string
          booking_id: string
          client_safety_flags?: string[]
          created_at?: string
          envelope_version?: number
          id?: string
          moderation_state?: string
          reported_at?: string | null
          sender_type: string
          sender_user_id?: string | null
        }
        Update: {
          body?: string
          booking_id?: string
          client_safety_flags?: string[]
          created_at?: string
          envelope_version?: number
          id?: string
          moderation_state?: string
          reported_at?: string | null
          sender_type?: string
          sender_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "booking_sensitive_access"
            referencedColumns: ["booking_id"]
          },
          {
            foreignKeyName: "messages_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "booking_zooter_profiles"
            referencedColumns: ["booking_id"]
          },
          {
            foreignKeyName: "messages_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      native_push_subscriptions: {
        Row: {
          app_version: string | null
          created_at: string
          device_id: string
          id: string
          last_seen_at: string
          permission_status: string
          platform: string
          push_token: string | null
          revoked_at: string | null
          token_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          app_version?: string | null
          created_at?: string
          device_id: string
          id?: string
          last_seen_at?: string
          permission_status?: string
          platform?: string
          push_token?: string | null
          revoked_at?: string | null
          token_type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          app_version?: string | null
          created_at?: string
          device_id?: string
          id?: string
          last_seen_at?: string
          permission_status?: string
          platform?: string
          push_token?: string | null
          revoked_at?: string | null
          token_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notification_templates: {
        Row: {
          active: boolean
          audience: string
          channels: string[]
          created_at: string
          event_type: string
          id: string
          owner: string
          purpose: string
          template: string
        }
        Insert: {
          active?: boolean
          audience: string
          channels: string[]
          created_at?: string
          event_type: string
          id?: string
          owner: string
          purpose: string
          template: string
        }
        Update: {
          active?: boolean
          audience?: string
          channels?: string[]
          created_at?: string
          event_type?: string
          id?: string
          owner?: string
          purpose?: string
          template?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string
          created_at: string
          id: string
          kind: string
          link: string | null
          read: boolean
          title: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          kind: string
          link?: string | null
          read?: boolean
          title: string
          user_id: string
        }
        Update: {
          body?: string
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
      operational_controls: {
        Row: {
          approval_required: boolean
          approved_at: string | null
          approved_by: string | null
          control_key: string
          control_type: string
          created_at: string
          description: string
          enabled: boolean
          environment: string
          expires_at: string | null
          id: string
          metadata: Json
          owner: string
          updated_at: string
        }
        Insert: {
          approval_required?: boolean
          approved_at?: string | null
          approved_by?: string | null
          control_key: string
          control_type: string
          created_at?: string
          description: string
          enabled?: boolean
          environment?: string
          expires_at?: string | null
          id?: string
          metadata?: Json
          owner: string
          updated_at?: string
        }
        Update: {
          approval_required?: boolean
          approved_at?: string | null
          approved_by?: string | null
          control_key?: string
          control_type?: string
          created_at?: string
          description?: string
          enabled?: boolean
          environment?: string
          expires_at?: string | null
          id?: string
          metadata?: Json
          owner?: string
          updated_at?: string
        }
        Relationships: []
      }
      payment_provider_capabilities: {
        Row: {
          approval_request_id: string | null
          approved_at: string | null
          approved_by: string | null
          callback_urls_verified: boolean
          created_at: string
          environment: string
          hosted_checkout_enabled: boolean
          id: string
          metadata: Json
          payout_supported: boolean
          provider: string
          reconciliation_reference_format: string
          reconciliation_verified: boolean
          updated_at: string
          webhook_signature_verified: boolean
        }
        Insert: {
          approval_request_id?: string | null
          approved_at?: string | null
          approved_by?: string | null
          callback_urls_verified?: boolean
          created_at?: string
          environment?: string
          hosted_checkout_enabled?: boolean
          id?: string
          metadata?: Json
          payout_supported?: boolean
          provider: string
          reconciliation_reference_format?: string
          reconciliation_verified?: boolean
          updated_at?: string
          webhook_signature_verified?: boolean
        }
        Update: {
          approval_request_id?: string | null
          approved_at?: string | null
          approved_by?: string | null
          callback_urls_verified?: boolean
          created_at?: string
          environment?: string
          hosted_checkout_enabled?: boolean
          id?: string
          metadata?: Json
          payout_supported?: boolean
          provider?: string
          reconciliation_reference_format?: string
          reconciliation_verified?: boolean
          updated_at?: string
          webhook_signature_verified?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "payment_provider_capabilities_approval_request_id_fkey"
            columns: ["approval_request_id"]
            isOneToOne: false
            referencedRelation: "approval_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_reconciliation_checks: {
        Row: {
          checked_at: string | null
          checked_by: string | null
          created_at: string
          currency: string
          environment: string
          expected_amount: number
          id: string
          metadata: Json
          mismatch_reason: string | null
          payment_record_id: string | null
          provider: string
          provider_event_id: string | null
          provider_reference: string
          received_amount: number
          status: string
          updated_at: string
        }
        Insert: {
          checked_at?: string | null
          checked_by?: string | null
          created_at?: string
          currency?: string
          environment?: string
          expected_amount: number
          id?: string
          metadata?: Json
          mismatch_reason?: string | null
          payment_record_id?: string | null
          provider: string
          provider_event_id?: string | null
          provider_reference: string
          received_amount: number
          status?: string
          updated_at?: string
        }
        Update: {
          checked_at?: string | null
          checked_by?: string | null
          created_at?: string
          currency?: string
          environment?: string
          expected_amount?: number
          id?: string
          metadata?: Json
          mismatch_reason?: string | null
          payment_record_id?: string | null
          provider?: string
          provider_event_id?: string | null
          provider_reference?: string
          received_amount?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_reconciliation_checks_payment_record_id_fkey"
            columns: ["payment_record_id"]
            isOneToOne: false
            referencedRelation: "payment_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_reconciliation_checks_provider_event_id_fkey"
            columns: ["provider_event_id"]
            isOneToOne: false
            referencedRelation: "provider_events"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_records: {
        Row: {
          amount: number
          booking_id: string | null
          created_at: string
          currency: string
          id: string
          meta: Json
          paid_at: string | null
          payment_kind: string
          provider: string
          provider_reference: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          booking_id?: string | null
          created_at?: string
          currency?: string
          id?: string
          meta?: Json
          paid_at?: string | null
          payment_kind?: string
          provider?: string
          provider_reference?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          booking_id?: string | null
          created_at?: string
          currency?: string
          id?: string
          meta?: Json
          paid_at?: string | null
          payment_kind?: string
          provider?: string
          provider_reference?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_records_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "booking_sensitive_access"
            referencedColumns: ["booking_id"]
          },
          {
            foreignKeyName: "payment_records_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "booking_zooter_profiles"
            referencedColumns: ["booking_id"]
          },
          {
            foreignKeyName: "payment_records_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      payout_change_requests: {
        Row: {
          approval_request_id: string | null
          created_at: string
          decided_at: string | null
          decided_by: string | null
          id: string
          metadata: Json
          previous_payout_account_id: string | null
          reason: string
          requested_payout_account_id: string | null
          status: string
          step_up_verified_at: string | null
          updated_at: string
          zooter_id: string
        }
        Insert: {
          approval_request_id?: string | null
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          id?: string
          metadata?: Json
          previous_payout_account_id?: string | null
          reason: string
          requested_payout_account_id?: string | null
          status?: string
          step_up_verified_at?: string | null
          updated_at?: string
          zooter_id: string
        }
        Update: {
          approval_request_id?: string | null
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          id?: string
          metadata?: Json
          previous_payout_account_id?: string | null
          reason?: string
          requested_payout_account_id?: string | null
          status?: string
          step_up_verified_at?: string | null
          updated_at?: string
          zooter_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payout_change_requests_approval_request_id_fkey"
            columns: ["approval_request_id"]
            isOneToOne: false
            referencedRelation: "approval_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payout_change_requests_previous_payout_account_id_fkey"
            columns: ["previous_payout_account_id"]
            isOneToOne: false
            referencedRelation: "zooter_payout_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payout_change_requests_requested_payout_account_id_fkey"
            columns: ["requested_payout_account_id"]
            isOneToOne: false
            referencedRelation: "zooter_payout_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_job_reviews: {
        Row: {
          booking_id: string
          complaint: boolean
          created_at: string
          id: string
          notes: string | null
          punctuality_rating: number | null
          quality_rating: number | null
          rating: number
          user_id: string
          zooter_id: string
        }
        Insert: {
          booking_id: string
          complaint?: boolean
          created_at?: string
          id?: string
          notes?: string | null
          punctuality_rating?: number | null
          quality_rating?: number | null
          rating: number
          user_id: string
          zooter_id: string
        }
        Update: {
          booking_id?: string
          complaint?: boolean
          created_at?: string
          id?: string
          notes?: string | null
          punctuality_rating?: number | null
          quality_rating?: number | null
          rating?: number
          user_id?: string
          zooter_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_job_reviews_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "booking_sensitive_access"
            referencedColumns: ["booking_id"]
          },
          {
            foreignKeyName: "post_job_reviews_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "booking_zooter_profiles"
            referencedColumns: ["booking_id"]
          },
          {
            foreignKeyName: "post_job_reviews_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_job_reviews_zooter_id_fkey"
            columns: ["zooter_id"]
            isOneToOne: false
            referencedRelation: "analytics_contractor_quality"
            referencedColumns: ["zooter_id"]
          },
          {
            foreignKeyName: "post_job_reviews_zooter_id_fkey"
            columns: ["zooter_id"]
            isOneToOne: false
            referencedRelation: "booking_zooter_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_job_reviews_zooter_id_fkey"
            columns: ["zooter_id"]
            isOneToOne: false
            referencedRelation: "zooters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_job_reviews_zooter_id_fkey"
            columns: ["zooter_id"]
            isOneToOne: false
            referencedRelation: "zooters_public"
            referencedColumns: ["id"]
          },
        ]
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
      property_accounts: {
        Row: {
          account_type: string
          billing_email: string | null
          created_at: string
          default_service_type: string
          id: string
          monthly_invoice: boolean
          name: string
          notes: string | null
          preferred_days: string[]
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          account_type: string
          billing_email?: string | null
          created_at?: string
          default_service_type?: string
          id?: string
          monthly_invoice?: boolean
          name: string
          notes?: string | null
          preferred_days?: string[]
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          account_type?: string
          billing_email?: string | null
          created_at?: string
          default_service_type?: string
          id?: string
          monthly_invoice?: boolean
          name?: string
          notes?: string | null
          preferred_days?: string[]
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      provider_events: {
        Row: {
          created_at: string
          error_message: string | null
          event_id: string
          event_type: string
          id: string
          idempotency_key: string
          metadata: Json
          payload_hash: string
          processed_at: string | null
          provider: string
          received_at: string
          status: string
          subject_id: string | null
          subject_table: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          event_id: string
          event_type: string
          id?: string
          idempotency_key: string
          metadata?: Json
          payload_hash: string
          processed_at?: string | null
          provider: string
          received_at?: string
          status?: string
          subject_id?: string | null
          subject_table?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          event_id?: string
          event_type?: string
          id?: string
          idempotency_key?: string
          metadata?: Json
          payload_hash?: string
          processed_at?: string | null
          provider?: string
          received_at?: string
          status?: string
          subject_id?: string | null
          subject_table?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      push_tokens: {
        Row: {
          id: string
          platform: string
          token: string
          updated_at: string
          user_id: string
        }
        Insert: {
          id?: string
          platform: string
          token: string
          updated_at?: string
          user_id: string
        }
        Update: {
          id?: string
          platform?: string
          token?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      rate_limit_events: {
        Row: {
          action: string
          actor_hash: string
          bucket: string
          count: number
          created_at: string
          expires_at: string
          id: string
          limit_count: number
          updated_at: string
          window_seconds: number
          window_started_at: string
        }
        Insert: {
          action: string
          actor_hash: string
          bucket: string
          count?: number
          created_at?: string
          expires_at: string
          id?: string
          limit_count: number
          updated_at?: string
          window_seconds: number
          window_started_at: string
        }
        Update: {
          action?: string
          actor_hash?: string
          bucket?: string
          count?: number
          created_at?: string
          expires_at?: string
          id?: string
          limit_count?: number
          updated_at?: string
          window_seconds?: number
          window_started_at?: string
        }
        Relationships: []
      }
      recurring_schedules: {
        Row: {
          cadence_days: number
          created_at: string
          household_profile_id: string | null
          id: string
          next_suggested_at: string | null
          preferred_day: string | null
          preferred_time: string | null
          status: string
          user_id: string
          zooter_id: string | null
        }
        Insert: {
          cadence_days?: number
          created_at?: string
          household_profile_id?: string | null
          id?: string
          next_suggested_at?: string | null
          preferred_day?: string | null
          preferred_time?: string | null
          status?: string
          user_id: string
          zooter_id?: string | null
        }
        Update: {
          cadence_days?: number
          created_at?: string
          household_profile_id?: string | null
          id?: string
          next_suggested_at?: string | null
          preferred_day?: string | null
          preferred_time?: string | null
          status?: string
          user_id?: string
          zooter_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recurring_schedules_household_profile_id_fkey"
            columns: ["household_profile_id"]
            isOneToOne: false
            referencedRelation: "household_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_schedules_zooter_id_fkey"
            columns: ["zooter_id"]
            isOneToOne: false
            referencedRelation: "analytics_contractor_quality"
            referencedColumns: ["zooter_id"]
          },
          {
            foreignKeyName: "recurring_schedules_zooter_id_fkey"
            columns: ["zooter_id"]
            isOneToOne: false
            referencedRelation: "booking_zooter_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_schedules_zooter_id_fkey"
            columns: ["zooter_id"]
            isOneToOne: false
            referencedRelation: "zooters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_schedules_zooter_id_fkey"
            columns: ["zooter_id"]
            isOneToOne: false
            referencedRelation: "zooters_public"
            referencedColumns: ["id"]
          },
        ]
      }
      refund_requests: {
        Row: {
          amount: number
          booking_id: string
          created_at: string
          currency: string
          id: string
          payment_record_id: string | null
          reason: string
          requested_by: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          booking_id: string
          created_at?: string
          currency?: string
          id?: string
          payment_record_id?: string | null
          reason: string
          requested_by?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          booking_id?: string
          created_at?: string
          currency?: string
          id?: string
          payment_record_id?: string | null
          reason?: string
          requested_by?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "refund_requests_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "booking_sensitive_access"
            referencedColumns: ["booking_id"]
          },
          {
            foreignKeyName: "refund_requests_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "booking_zooter_profiles"
            referencedColumns: ["booking_id"]
          },
          {
            foreignKeyName: "refund_requests_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "refund_requests_payment_record_id_fkey"
            columns: ["payment_record_id"]
            isOneToOne: false
            referencedRelation: "payment_records"
            referencedColumns: ["id"]
          },
        ]
      }
      safety_sos_alerts: {
        Row: {
          accuracy_m: number | null
          address_snapshot: string | null
          booking_id: string | null
          cancelled_at: string | null
          created_at: string
          dispatched_at: string | null
          emergency_number_dialled: string | null
          id: string
          latitude: number | null
          longitude: number | null
          raiser_id: string
          raiser_role: string
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          silent: boolean
          state: string
          triggered_at: string
        }
        Insert: {
          accuracy_m?: number | null
          address_snapshot?: string | null
          booking_id?: string | null
          cancelled_at?: string | null
          created_at?: string
          dispatched_at?: string | null
          emergency_number_dialled?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          raiser_id: string
          raiser_role: string
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          silent?: boolean
          state?: string
          triggered_at?: string
        }
        Update: {
          accuracy_m?: number | null
          address_snapshot?: string | null
          booking_id?: string | null
          cancelled_at?: string | null
          created_at?: string
          dispatched_at?: string | null
          emergency_number_dialled?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          raiser_id?: string
          raiser_role?: string
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          silent?: boolean
          state?: string
          triggered_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "safety_sos_alerts_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "booking_sensitive_access"
            referencedColumns: ["booking_id"]
          },
          {
            foreignKeyName: "safety_sos_alerts_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "booking_zooter_profiles"
            referencedColumns: ["booking_id"]
          },
          {
            foreignKeyName: "safety_sos_alerts_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
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
      sensitive_access_logs: {
        Row: {
          access_granted: boolean
          actor_id: string | null
          booking_id: string | null
          created_at: string
          device_hint: string | null
          id: string
          reason: string
          requested_fields: string[]
          risk_signal: string | null
        }
        Insert: {
          access_granted: boolean
          actor_id?: string | null
          booking_id?: string | null
          created_at?: string
          device_hint?: string | null
          id?: string
          reason: string
          requested_fields?: string[]
          risk_signal?: string | null
        }
        Update: {
          access_granted?: boolean
          actor_id?: string | null
          booking_id?: string | null
          created_at?: string
          device_hint?: string | null
          id?: string
          reason?: string
          requested_fields?: string[]
          risk_signal?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sensitive_access_logs_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "booking_sensitive_access"
            referencedColumns: ["booking_id"]
          },
          {
            foreignKeyName: "sensitive_access_logs_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "booking_zooter_profiles"
            referencedColumns: ["booking_id"]
          },
          {
            foreignKeyName: "sensitive_access_logs_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      sensitive_booking_access: {
        Row: {
          booking_id: string
          ciphertext: string
          created_at: string
          iv: string
          key_version: string
          owner_user_id: string
          updated_at: string
        }
        Insert: {
          booking_id: string
          ciphertext: string
          created_at?: string
          iv: string
          key_version?: string
          owner_user_id: string
          updated_at?: string
        }
        Update: {
          booking_id?: string
          ciphertext?: string
          created_at?: string
          iv?: string
          key_version?: string
          owner_user_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sensitive_booking_access_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "booking_sensitive_access"
            referencedColumns: ["booking_id"]
          },
          {
            foreignKeyName: "sensitive_booking_access_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "booking_zooter_profiles"
            referencedColumns: ["booking_id"]
          },
          {
            foreignKeyName: "sensitive_booking_access_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      sensitive_data_access_log: {
        Row: {
          accessed_at: string
          booking_id: string
          device_info: string | null
          field_accessed: string
          id: string
          was_within_window: boolean
          zooter_id: string
        }
        Insert: {
          accessed_at?: string
          booking_id: string
          device_info?: string | null
          field_accessed: string
          id?: string
          was_within_window: boolean
          zooter_id: string
        }
        Update: {
          accessed_at?: string
          booking_id?: string
          device_info?: string | null
          field_accessed?: string
          id?: string
          was_within_window?: boolean
          zooter_id?: string
        }
        Relationships: []
      }
      subscription_plans: {
        Row: {
          cadence: string
          created_at: string
          hours_per_visit: number
          id: string
          monthly_price: number
          name: string
          perks: string[]
          popular: boolean
          savings_pct: number
        }
        Insert: {
          cadence?: string
          created_at?: string
          hours_per_visit?: number
          id?: string
          monthly_price?: number
          name: string
          perks?: string[]
          popular?: boolean
          savings_pct?: number
        }
        Update: {
          cadence?: string
          created_at?: string
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
      support_followups: {
        Row: {
          booking_id: string | null
          created_at: string
          due_at: string | null
          id: string
          notes: string | null
          priority: string
          resolved_at: string | null
          status: string
          ticket_id: string | null
          trigger_type: string
          user_id: string | null
        }
        Insert: {
          booking_id?: string | null
          created_at?: string
          due_at?: string | null
          id?: string
          notes?: string | null
          priority?: string
          resolved_at?: string | null
          status?: string
          ticket_id?: string | null
          trigger_type: string
          user_id?: string | null
        }
        Update: {
          booking_id?: string | null
          created_at?: string
          due_at?: string | null
          id?: string
          notes?: string | null
          priority?: string
          resolved_at?: string | null
          status?: string
          ticket_id?: string | null
          trigger_type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "support_followups_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "booking_sensitive_access"
            referencedColumns: ["booking_id"]
          },
          {
            foreignKeyName: "support_followups_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "booking_zooter_profiles"
            referencedColumns: ["booking_id"]
          },
          {
            foreignKeyName: "support_followups_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_followups_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_handoff_contexts: {
        Row: {
          booking_id: string | null
          consent_to_share_context: boolean
          correlation_id: string
          created_at: string
          customer_stated_issue: string
          id: string
          intent_category: string
          recommended_owner: string
          recommended_queue: string
          requested_action: string
          role_type: string
          safe_context: Json
          ticket_id: string
          updated_at: string
          urgency_level: number
          user_id: string
        }
        Insert: {
          booking_id?: string | null
          consent_to_share_context?: boolean
          correlation_id?: string
          created_at?: string
          customer_stated_issue: string
          id?: string
          intent_category?: string
          recommended_owner?: string
          recommended_queue?: string
          requested_action?: string
          role_type?: string
          safe_context?: Json
          ticket_id: string
          updated_at?: string
          urgency_level?: number
          user_id: string
        }
        Update: {
          booking_id?: string | null
          consent_to_share_context?: boolean
          correlation_id?: string
          created_at?: string
          customer_stated_issue?: string
          id?: string
          intent_category?: string
          recommended_owner?: string
          recommended_queue?: string
          requested_action?: string
          role_type?: string
          safe_context?: Json
          ticket_id?: string
          updated_at?: string
          urgency_level?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_handoff_contexts_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "booking_sensitive_access"
            referencedColumns: ["booking_id"]
          },
          {
            foreignKeyName: "support_handoff_contexts_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "booking_zooter_profiles"
            referencedColumns: ["booking_id"]
          },
          {
            foreignKeyName: "support_handoff_contexts_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_handoff_contexts_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
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
          badge_color: string
          badge_label: string | null
          category: string
          created_at: string
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
          badge_color?: string
          badge_label?: string | null
          category?: string
          created_at?: string
          description: string
          duration_min?: number
          id?: string
          pass_score?: number
          quiz_questions?: Json
          rank_points?: number
          required?: boolean
          title: string
        }
        Update: {
          badge_color?: string
          badge_label?: string | null
          category?: string
          created_at?: string
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
      trust_incidents: {
        Row: {
          booking_id: string | null
          created_at: string
          id: string
          incident_type: string
          notes: string | null
          severity: number
          status: string
          user_id: string | null
          zooter_id: string | null
        }
        Insert: {
          booking_id?: string | null
          created_at?: string
          id?: string
          incident_type: string
          notes?: string | null
          severity?: number
          status?: string
          user_id?: string | null
          zooter_id?: string | null
        }
        Update: {
          booking_id?: string | null
          created_at?: string
          id?: string
          incident_type?: string
          notes?: string | null
          severity?: number
          status?: string
          user_id?: string | null
          zooter_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trust_incidents_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "booking_sensitive_access"
            referencedColumns: ["booking_id"]
          },
          {
            foreignKeyName: "trust_incidents_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "booking_zooter_profiles"
            referencedColumns: ["booking_id"]
          },
          {
            foreignKeyName: "trust_incidents_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trust_incidents_zooter_id_fkey"
            columns: ["zooter_id"]
            isOneToOne: false
            referencedRelation: "analytics_contractor_quality"
            referencedColumns: ["zooter_id"]
          },
          {
            foreignKeyName: "trust_incidents_zooter_id_fkey"
            columns: ["zooter_id"]
            isOneToOne: false
            referencedRelation: "booking_zooter_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trust_incidents_zooter_id_fkey"
            columns: ["zooter_id"]
            isOneToOne: false
            referencedRelation: "zooters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trust_incidents_zooter_id_fkey"
            columns: ["zooter_id"]
            isOneToOne: false
            referencedRelation: "zooters_public"
            referencedColumns: ["id"]
          },
        ]
      }
      twilio_verify_attempts: {
        Row: {
          actor_hash: string | null
          channel: string
          created_at: string
          failure_reason: string | null
          id: string
          metadata: Json
          purpose: string
          status: string
          to_hash: string
          to_last4: string | null
          twilio_verification_sid: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          actor_hash?: string | null
          channel: string
          created_at?: string
          failure_reason?: string | null
          id?: string
          metadata?: Json
          purpose: string
          status?: string
          to_hash: string
          to_last4?: string | null
          twilio_verification_sid?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          actor_hash?: string | null
          channel?: string
          created_at?: string
          failure_reason?: string | null
          id?: string
          metadata?: Json
          purpose?: string
          status?: string
          to_hash?: string
          to_last4?: string | null
          twilio_verification_sid?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      twilio_webhook_events: {
        Row: {
          channel: string
          event_type: string
          from_hash: string | null
          from_last4: string | null
          id: string
          payload: Json
          received_at: string
          signature_valid: boolean
          status: string | null
          to_hash: string | null
          to_last4: string | null
          twilio_sid: string | null
        }
        Insert: {
          channel?: string
          event_type: string
          from_hash?: string | null
          from_last4?: string | null
          id?: string
          payload?: Json
          received_at?: string
          signature_valid?: boolean
          status?: string | null
          to_hash?: string | null
          to_last4?: string | null
          twilio_sid?: string | null
        }
        Update: {
          channel?: string
          event_type?: string
          from_hash?: string | null
          from_last4?: string | null
          id?: string
          payload?: Json
          received_at?: string
          signature_valid?: boolean
          status?: string | null
          to_hash?: string | null
          to_last4?: string | null
          twilio_sid?: string | null
        }
        Relationships: []
      }
      user_encryption_keys: {
        Row: {
          created_at: string
          device_id: string
          id: string
          key_version: number
          last_seen_at: string
          public_jwk: Json
          revoked_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          device_id: string
          id?: string
          key_version?: number
          last_seen_at?: string
          public_jwk: Json
          revoked_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          device_id?: string
          id?: string
          key_version?: number
          last_seen_at?: string
          public_jwk?: Json
          revoked_at?: string | null
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
      user_safety_pins: {
        Row: {
          created_at: string
          failed_attempts: number
          locked_until: string | null
          pin_hash: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          failed_attempts?: number
          locked_until?: string | null
          pin_hash: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          failed_attempts?: number
          locked_until?: string | null
          pin_hash?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_subscriptions: {
        Row: {
          cancelled_at: string | null
          checkout_url: string | null
          favourite_zooter_id: string | null
          id: string
          next_billing_at: string
          plan_id: string | null
          started_at: string
          status: Database["public"]["Enums"]["subscription_status"]
          user_id: string
        }
        Insert: {
          cancelled_at?: string | null
          checkout_url?: string | null
          favourite_zooter_id?: string | null
          id?: string
          next_billing_at?: string
          plan_id?: string | null
          started_at?: string
          status?: Database["public"]["Enums"]["subscription_status"]
          user_id: string
        }
        Update: {
          cancelled_at?: string | null
          checkout_url?: string | null
          favourite_zooter_id?: string | null
          id?: string
          next_billing_at?: string
          plan_id?: string | null
          started_at?: string
          status?: Database["public"]["Enums"]["subscription_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_subscriptions_favourite_zooter_id_fkey"
            columns: ["favourite_zooter_id"]
            isOneToOne: false
            referencedRelation: "analytics_contractor_quality"
            referencedColumns: ["zooter_id"]
          },
          {
            foreignKeyName: "user_subscriptions_favourite_zooter_id_fkey"
            columns: ["favourite_zooter_id"]
            isOneToOne: false
            referencedRelation: "booking_zooter_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_subscriptions_favourite_zooter_id_fkey"
            columns: ["favourite_zooter_id"]
            isOneToOne: false
            referencedRelation: "zooters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_subscriptions_favourite_zooter_id_fkey"
            columns: ["favourite_zooter_id"]
            isOneToOne: false
            referencedRelation: "zooters_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      visit_recordings: {
        Row: {
          attached_at: string | null
          attached_to_incident_id: string | null
          booking_id: string
          created_at: string
          duration_seconds: number | null
          ended_at: string | null
          id: string
          parties_notified_at: string
          purge_after: string
          recorder_id: string
          recorder_role: string
          started_at: string
          storage_path: string
        }
        Insert: {
          attached_at?: string | null
          attached_to_incident_id?: string | null
          booking_id: string
          created_at?: string
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          parties_notified_at: string
          purge_after?: string
          recorder_id: string
          recorder_role: string
          started_at: string
          storage_path: string
        }
        Update: {
          attached_at?: string | null
          attached_to_incident_id?: string | null
          booking_id?: string
          created_at?: string
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          parties_notified_at?: string
          purge_after?: string
          recorder_id?: string
          recorder_role?: string
          started_at?: string
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "visit_recordings_attached_to_incident_id_fkey"
            columns: ["attached_to_incident_id"]
            isOneToOne: false
            referencedRelation: "trust_incidents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visit_recordings_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "booking_sensitive_access"
            referencedColumns: ["booking_id"]
          },
          {
            foreignKeyName: "visit_recordings_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "booking_zooter_profiles"
            referencedColumns: ["booking_id"]
          },
          {
            foreignKeyName: "visit_recordings_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      xooter_commission_boosts: {
        Row: {
          bps: number
          created_at: string
          ends_at: string
          granted_by: string | null
          id: string
          reason: string
          starts_at: string
          zooter_id: string
        }
        Insert: {
          bps?: number
          created_at?: string
          ends_at?: string
          granted_by?: string | null
          id?: string
          reason: string
          starts_at?: string
          zooter_id: string
        }
        Update: {
          bps?: number
          created_at?: string
          ends_at?: string
          granted_by?: string | null
          id?: string
          reason?: string
          starts_at?: string
          zooter_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "xooter_commission_boosts_zooter_id_fkey"
            columns: ["zooter_id"]
            isOneToOne: false
            referencedRelation: "analytics_contractor_quality"
            referencedColumns: ["zooter_id"]
          },
          {
            foreignKeyName: "xooter_commission_boosts_zooter_id_fkey"
            columns: ["zooter_id"]
            isOneToOne: false
            referencedRelation: "booking_zooter_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "xooter_commission_boosts_zooter_id_fkey"
            columns: ["zooter_id"]
            isOneToOne: false
            referencedRelation: "zooters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "xooter_commission_boosts_zooter_id_fkey"
            columns: ["zooter_id"]
            isOneToOne: false
            referencedRelation: "zooters_public"
            referencedColumns: ["id"]
          },
        ]
      }
      zoot_black_area_pilots: {
        Row: {
          approval_request_id: string | null
          approved_at: string | null
          approved_by: string | null
          area_key: string
          area_name: string
          created_at: string
          id: string
          metadata: Json
          pilot_notes: string | null
          status: string
          updated_at: string
        }
        Insert: {
          approval_request_id?: string | null
          approved_at?: string | null
          approved_by?: string | null
          area_key: string
          area_name: string
          created_at?: string
          id?: string
          metadata?: Json
          pilot_notes?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          approval_request_id?: string | null
          approved_at?: string | null
          approved_by?: string | null
          area_key?: string
          area_name?: string
          created_at?: string
          id?: string
          metadata?: Json
          pilot_notes?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "zoot_black_area_pilots_approval_request_id_fkey"
            columns: ["approval_request_id"]
            isOneToOne: false
            referencedRelation: "approval_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      zoot_black_completion_certificates: {
        Row: {
          booking_id: string
          certificate_number: string
          client_id: string
          created_at: string
          evidence_summary: Json
          id: string
          issued_at: string | null
          issued_by: string | null
          revoke_reason: string | null
          revoked_at: string | null
          status: string
          storage_bucket: string
          storage_path: string | null
          updated_at: string
          zooter_id: string | null
        }
        Insert: {
          booking_id: string
          certificate_number: string
          client_id: string
          created_at?: string
          evidence_summary?: Json
          id?: string
          issued_at?: string | null
          issued_by?: string | null
          revoke_reason?: string | null
          revoked_at?: string | null
          status?: string
          storage_bucket?: string
          storage_path?: string | null
          updated_at?: string
          zooter_id?: string | null
        }
        Update: {
          booking_id?: string
          certificate_number?: string
          client_id?: string
          created_at?: string
          evidence_summary?: Json
          id?: string
          issued_at?: string | null
          issued_by?: string | null
          revoke_reason?: string | null
          revoked_at?: string | null
          status?: string
          storage_bucket?: string
          storage_path?: string | null
          updated_at?: string
          zooter_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "zoot_black_completion_certificates_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "booking_sensitive_access"
            referencedColumns: ["booking_id"]
          },
          {
            foreignKeyName: "zoot_black_completion_certificates_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "booking_zooter_profiles"
            referencedColumns: ["booking_id"]
          },
          {
            foreignKeyName: "zoot_black_completion_certificates_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "zoot_black_completion_certificates_zooter_id_fkey"
            columns: ["zooter_id"]
            isOneToOne: false
            referencedRelation: "analytics_contractor_quality"
            referencedColumns: ["zooter_id"]
          },
          {
            foreignKeyName: "zoot_black_completion_certificates_zooter_id_fkey"
            columns: ["zooter_id"]
            isOneToOne: false
            referencedRelation: "booking_zooter_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "zoot_black_completion_certificates_zooter_id_fkey"
            columns: ["zooter_id"]
            isOneToOne: false
            referencedRelation: "zooters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "zoot_black_completion_certificates_zooter_id_fkey"
            columns: ["zooter_id"]
            isOneToOne: false
            referencedRelation: "zooters_public"
            referencedColumns: ["id"]
          },
        ]
      }
      zoot_black_equipment_evidence: {
        Row: {
          created_at: string
          evidence_type: string
          expires_at: string | null
          id: string
          metadata: Json
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          storage_bucket: string
          storage_path: string | null
          submitted_by: string | null
          updated_at: string
          zooter_id: string
        }
        Insert: {
          created_at?: string
          evidence_type: string
          expires_at?: string | null
          id?: string
          metadata?: Json
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          storage_bucket?: string
          storage_path?: string | null
          submitted_by?: string | null
          updated_at?: string
          zooter_id: string
        }
        Update: {
          created_at?: string
          evidence_type?: string
          expires_at?: string | null
          id?: string
          metadata?: Json
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          storage_bucket?: string
          storage_path?: string | null
          submitted_by?: string | null
          updated_at?: string
          zooter_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "zoot_black_equipment_evidence_zooter_id_fkey"
            columns: ["zooter_id"]
            isOneToOne: false
            referencedRelation: "analytics_contractor_quality"
            referencedColumns: ["zooter_id"]
          },
          {
            foreignKeyName: "zoot_black_equipment_evidence_zooter_id_fkey"
            columns: ["zooter_id"]
            isOneToOne: false
            referencedRelation: "booking_zooter_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "zoot_black_equipment_evidence_zooter_id_fkey"
            columns: ["zooter_id"]
            isOneToOne: false
            referencedRelation: "zooters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "zoot_black_equipment_evidence_zooter_id_fkey"
            columns: ["zooter_id"]
            isOneToOne: false
            referencedRelation: "zooters_public"
            referencedColumns: ["id"]
          },
        ]
      }
      zoot_black_status_history: {
        Row: {
          approval_request_id: string | null
          changed_by: string | null
          created_at: string
          effective_at: string
          expires_at: string | null
          id: string
          metadata: Json
          reason: string
          status: string
          zooter_id: string
        }
        Insert: {
          approval_request_id?: string | null
          changed_by?: string | null
          created_at?: string
          effective_at?: string
          expires_at?: string | null
          id?: string
          metadata?: Json
          reason: string
          status: string
          zooter_id: string
        }
        Update: {
          approval_request_id?: string | null
          changed_by?: string | null
          created_at?: string
          effective_at?: string
          expires_at?: string | null
          id?: string
          metadata?: Json
          reason?: string
          status?: string
          zooter_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "zoot_black_status_history_approval_request_id_fkey"
            columns: ["approval_request_id"]
            isOneToOne: false
            referencedRelation: "approval_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "zoot_black_status_history_zooter_id_fkey"
            columns: ["zooter_id"]
            isOneToOne: false
            referencedRelation: "analytics_contractor_quality"
            referencedColumns: ["zooter_id"]
          },
          {
            foreignKeyName: "zoot_black_status_history_zooter_id_fkey"
            columns: ["zooter_id"]
            isOneToOne: false
            referencedRelation: "booking_zooter_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "zoot_black_status_history_zooter_id_fkey"
            columns: ["zooter_id"]
            isOneToOne: false
            referencedRelation: "zooters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "zoot_black_status_history_zooter_id_fkey"
            columns: ["zooter_id"]
            isOneToOne: false
            referencedRelation: "zooters_public"
            referencedColumns: ["id"]
          },
        ]
      }
      zoot_black_training_requirements: {
        Row: {
          approval_request_id: string | null
          created_at: string
          description: string
          id: string
          metadata: Json
          required_for_status: string
          requirement_key: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          approval_request_id?: string | null
          created_at?: string
          description: string
          id?: string
          metadata?: Json
          required_for_status?: string
          requirement_key: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          approval_request_id?: string | null
          created_at?: string
          description?: string
          id?: string
          metadata?: Json
          required_for_status?: string
          requirement_key?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "zoot_black_training_requirements_approval_request_id_fkey"
            columns: ["approval_request_id"]
            isOneToOne: false
            referencedRelation: "approval_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      zoot_concierge_feedback: {
        Row: {
          answer_excerpt: string | null
          conversation_context: string | null
          created_at: string
          id: string
          knowledge_version: string | null
          reason: string
          role: string
          source: string
          status: string
          user_id: string | null
        }
        Insert: {
          answer_excerpt?: string | null
          conversation_context?: string | null
          created_at?: string
          id?: string
          knowledge_version?: string | null
          reason: string
          role?: string
          source: string
          status?: string
          user_id?: string | null
        }
        Update: {
          answer_excerpt?: string | null
          conversation_context?: string | null
          created_at?: string
          id?: string
          knowledge_version?: string | null
          reason?: string
          role?: string
          source?: string
          status?: string
          user_id?: string | null
        }
        Relationships: []
      }
      zoot_concierge_knowledge_versions: {
        Row: {
          created_at: string
          effective_at: string
          id: string
          knowledge_context: string
          source_summary: string
          status: string
          version_key: string
        }
        Insert: {
          created_at?: string
          effective_at?: string
          id?: string
          knowledge_context: string
          source_summary: string
          status?: string
          version_key: string
        }
        Update: {
          created_at?: string
          effective_at?: string
          id?: string
          knowledge_context?: string
          source_summary?: string
          status?: string
          version_key?: string
        }
        Relationships: []
      }
      zootcred_ledger: {
        Row: {
          amount: number
          booking_id: string | null
          created_at: string
          direction: string
          expires_at: string | null
          id: string
          meta: Json
          reason: string
          status: string
          user_id: string
        }
        Insert: {
          amount?: number
          booking_id?: string | null
          created_at?: string
          direction: string
          expires_at?: string | null
          id?: string
          meta?: Json
          reason: string
          status?: string
          user_id: string
        }
        Update: {
          amount?: number
          booking_id?: string | null
          created_at?: string
          direction?: string
          expires_at?: string | null
          id?: string
          meta?: Json
          reason?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "zootcred_ledger_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "booking_sensitive_access"
            referencedColumns: ["booking_id"]
          },
          {
            foreignKeyName: "zootcred_ledger_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "booking_zooter_profiles"
            referencedColumns: ["booking_id"]
          },
          {
            foreignKeyName: "zootcred_ledger_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      zooter_applications: {
        Row: {
          activation_locked_reason: string | null
          address: string | null
          address_verification_status: string
          availability: Json
          background_check_consent: boolean
          background_check_status: string
          bank_account_number: string | null
          bank_branch_code: string | null
          bank_name: string | null
          banking_verification_status: string
          behavioural_screening: Json
          bio: string | null
          city: string | null
          created_at: string
          date_of_birth: string | null
          email: string | null
          emergency_contact: Json
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          full_name: string | null
          id: string
          id_number: string | null
          id_verification_status: string
          name: string | null
          pet_comfort: string | null
          phone: string | null
          postal_code: string | null
          reference_1_name: string | null
          reference_1_phone: string | null
          reference_2_name: string | null
          reference_2_phone: string | null
          reference_verification_status: string
          references_payload: Json
          reviewed_at: string | null
          reviewed_by: string | null
          reviewer_notes: string | null
          selfie_storage_path: string | null
          selfie_verification_status: string
          service_category: string | null
          status: string
          suburb: string | null
          supplies_owned: string[]
          third_party_verification_status: string
          transport: string | null
          updated_at: string
          user_id: string
          verification_notes: Json
          years_experience: number | null
        }
        Insert: {
          activation_locked_reason?: string | null
          address?: string | null
          address_verification_status?: string
          availability?: Json
          background_check_consent?: boolean
          background_check_status?: string
          bank_account_number?: string | null
          bank_branch_code?: string | null
          bank_name?: string | null
          banking_verification_status?: string
          behavioural_screening?: Json
          bio?: string | null
          city?: string | null
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          emergency_contact?: Json
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          full_name?: string | null
          id?: string
          id_number?: string | null
          id_verification_status?: string
          name?: string | null
          pet_comfort?: string | null
          phone?: string | null
          postal_code?: string | null
          reference_1_name?: string | null
          reference_1_phone?: string | null
          reference_2_name?: string | null
          reference_2_phone?: string | null
          reference_verification_status?: string
          references_payload?: Json
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_notes?: string | null
          selfie_storage_path?: string | null
          selfie_verification_status?: string
          service_category?: string | null
          status?: string
          suburb?: string | null
          supplies_owned?: string[]
          third_party_verification_status?: string
          transport?: string | null
          updated_at?: string
          user_id: string
          verification_notes?: Json
          years_experience?: number | null
        }
        Update: {
          activation_locked_reason?: string | null
          address?: string | null
          address_verification_status?: string
          availability?: Json
          background_check_consent?: boolean
          background_check_status?: string
          bank_account_number?: string | null
          bank_branch_code?: string | null
          bank_name?: string | null
          banking_verification_status?: string
          behavioural_screening?: Json
          bio?: string | null
          city?: string | null
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          emergency_contact?: Json
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          full_name?: string | null
          id?: string
          id_number?: string | null
          id_verification_status?: string
          name?: string | null
          pet_comfort?: string | null
          phone?: string | null
          postal_code?: string | null
          reference_1_name?: string | null
          reference_1_phone?: string | null
          reference_2_name?: string | null
          reference_2_phone?: string | null
          reference_verification_status?: string
          references_payload?: Json
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_notes?: string | null
          selfie_storage_path?: string | null
          selfie_verification_status?: string
          service_category?: string | null
          status?: string
          suburb?: string | null
          supplies_owned?: string[]
          third_party_verification_status?: string
          transport?: string | null
          updated_at?: string
          user_id?: string
          verification_notes?: Json
          years_experience?: number | null
        }
        Relationships: []
      }
      zooter_documents: {
        Row: {
          application_id: string | null
          created_at: string
          doc_type: string
          id: string
          reviewer_notes: string | null
          status: string
          storage_path: string
          user_id: string
        }
        Insert: {
          application_id?: string | null
          created_at?: string
          doc_type: string
          id?: string
          reviewer_notes?: string | null
          status?: string
          storage_path: string
          user_id: string
        }
        Update: {
          application_id?: string | null
          created_at?: string
          doc_type?: string
          id?: string
          reviewer_notes?: string | null
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
          booking_id: string | null
          created_at: string
          gross_amount: number
          id: string
          net_amount: number
          platform_fee: number
          status: string
          zooter_id: string
        }
        Insert: {
          booking_id?: string | null
          created_at?: string
          gross_amount?: number
          id?: string
          net_amount?: number
          platform_fee?: number
          status?: string
          zooter_id: string
        }
        Update: {
          booking_id?: string | null
          created_at?: string
          gross_amount?: number
          id?: string
          net_amount?: number
          platform_fee?: number
          status?: string
          zooter_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "zooter_earnings_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "booking_sensitive_access"
            referencedColumns: ["booking_id"]
          },
          {
            foreignKeyName: "zooter_earnings_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "booking_zooter_profiles"
            referencedColumns: ["booking_id"]
          },
          {
            foreignKeyName: "zooter_earnings_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "zooter_earnings_zooter_id_fkey"
            columns: ["zooter_id"]
            isOneToOne: false
            referencedRelation: "analytics_contractor_quality"
            referencedColumns: ["zooter_id"]
          },
          {
            foreignKeyName: "zooter_earnings_zooter_id_fkey"
            columns: ["zooter_id"]
            isOneToOne: false
            referencedRelation: "booking_zooter_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "zooter_earnings_zooter_id_fkey"
            columns: ["zooter_id"]
            isOneToOne: false
            referencedRelation: "zooters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "zooter_earnings_zooter_id_fkey"
            columns: ["zooter_id"]
            isOneToOne: false
            referencedRelation: "zooters_public"
            referencedColumns: ["id"]
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: "zooter_jobs_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "booking_sensitive_access"
            referencedColumns: ["booking_id"]
          },
          {
            foreignKeyName: "zooter_jobs_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "booking_zooter_profiles"
            referencedColumns: ["booking_id"]
          },
          {
            foreignKeyName: "zooter_jobs_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "zooter_jobs_zooter_id_fkey"
            columns: ["zooter_id"]
            isOneToOne: false
            referencedRelation: "analytics_contractor_quality"
            referencedColumns: ["zooter_id"]
          },
          {
            foreignKeyName: "zooter_jobs_zooter_id_fkey"
            columns: ["zooter_id"]
            isOneToOne: false
            referencedRelation: "booking_zooter_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "zooter_jobs_zooter_id_fkey"
            columns: ["zooter_id"]
            isOneToOne: false
            referencedRelation: "zooters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "zooter_jobs_zooter_id_fkey"
            columns: ["zooter_id"]
            isOneToOne: false
            referencedRelation: "zooters_public"
            referencedColumns: ["id"]
          },
        ]
      }
      zooter_payout_accounts: {
        Row: {
          account_label: string | null
          account_reference_hash: string
          approval_request_id: string | null
          created_at: string
          disabled_at: string | null
          id: string
          metadata: Json
          provider: string
          status: string
          updated_at: string
          verification_method: string
          verified_at: string | null
          verified_by: string | null
          zooter_id: string
        }
        Insert: {
          account_label?: string | null
          account_reference_hash: string
          approval_request_id?: string | null
          created_at?: string
          disabled_at?: string | null
          id?: string
          metadata?: Json
          provider?: string
          status?: string
          updated_at?: string
          verification_method?: string
          verified_at?: string | null
          verified_by?: string | null
          zooter_id: string
        }
        Update: {
          account_label?: string | null
          account_reference_hash?: string
          approval_request_id?: string | null
          created_at?: string
          disabled_at?: string | null
          id?: string
          metadata?: Json
          provider?: string
          status?: string
          updated_at?: string
          verification_method?: string
          verified_at?: string | null
          verified_by?: string | null
          zooter_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "zooter_payout_accounts_approval_request_id_fkey"
            columns: ["approval_request_id"]
            isOneToOne: false
            referencedRelation: "approval_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      zooter_payout_holds: {
        Row: {
          amount: number
          booking_id: string | null
          created_at: string
          currency: string
          hold_reason: string
          id: string
          metadata: Json
          release_after: string
          released_at: string | null
          released_by: string | null
          status: string
          updated_at: string
          zooter_id: string
        }
        Insert: {
          amount: number
          booking_id?: string | null
          created_at?: string
          currency?: string
          hold_reason: string
          id?: string
          metadata?: Json
          release_after: string
          released_at?: string | null
          released_by?: string | null
          status?: string
          updated_at?: string
          zooter_id: string
        }
        Update: {
          amount?: number
          booking_id?: string | null
          created_at?: string
          currency?: string
          hold_reason?: string
          id?: string
          metadata?: Json
          release_after?: string
          released_at?: string | null
          released_by?: string | null
          status?: string
          updated_at?: string
          zooter_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "zooter_payout_holds_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "booking_sensitive_access"
            referencedColumns: ["booking_id"]
          },
          {
            foreignKeyName: "zooter_payout_holds_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "booking_zooter_profiles"
            referencedColumns: ["booking_id"]
          },
          {
            foreignKeyName: "zooter_payout_holds_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      zooter_reliability_metrics: {
        Row: {
          admin_review_required: boolean
          cancellation_count: number
          complaint_count: number
          completion_quality_avg: number
          lateness_count: number
          reliability_score: number
          repeat_booking_count: number
          support_escalation_count: number
          updated_at: string
          zooter_id: string
        }
        Insert: {
          admin_review_required?: boolean
          cancellation_count?: number
          complaint_count?: number
          completion_quality_avg?: number
          lateness_count?: number
          reliability_score?: number
          repeat_booking_count?: number
          support_escalation_count?: number
          updated_at?: string
          zooter_id: string
        }
        Update: {
          admin_review_required?: boolean
          cancellation_count?: number
          complaint_count?: number
          completion_quality_avg?: number
          lateness_count?: number
          reliability_score?: number
          repeat_booking_count?: number
          support_escalation_count?: number
          updated_at?: string
          zooter_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "zooter_reliability_metrics_zooter_id_fkey"
            columns: ["zooter_id"]
            isOneToOne: true
            referencedRelation: "analytics_contractor_quality"
            referencedColumns: ["zooter_id"]
          },
          {
            foreignKeyName: "zooter_reliability_metrics_zooter_id_fkey"
            columns: ["zooter_id"]
            isOneToOne: true
            referencedRelation: "booking_zooter_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "zooter_reliability_metrics_zooter_id_fkey"
            columns: ["zooter_id"]
            isOneToOne: true
            referencedRelation: "zooters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "zooter_reliability_metrics_zooter_id_fkey"
            columns: ["zooter_id"]
            isOneToOne: true
            referencedRelation: "zooters_public"
            referencedColumns: ["id"]
          },
        ]
      }
      zooter_training_completions: {
        Row: {
          completed_at: string
          id: string
          module_id: string
          passed: boolean
          score: number | null
          user_id: string
        }
        Insert: {
          completed_at?: string
          id?: string
          module_id: string
          passed?: boolean
          score?: number | null
          user_id: string
        }
        Update: {
          completed_at?: string
          id?: string
          module_id?: string
          passed?: boolean
          score?: number | null
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
            referencedRelation: "analytics_contractor_quality"
            referencedColumns: ["zooter_id"]
          },
          {
            foreignKeyName: "zooter_training_progress_zooter_id_fkey"
            columns: ["zooter_id"]
            isOneToOne: false
            referencedRelation: "booking_zooter_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "zooter_training_progress_zooter_id_fkey"
            columns: ["zooter_id"]
            isOneToOne: false
            referencedRelation: "zooters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "zooter_training_progress_zooter_id_fkey"
            columns: ["zooter_id"]
            isOneToOne: false
            referencedRelation: "zooters_public"
            referencedColumns: ["id"]
          },
        ]
      }
      zooters: {
        Row: {
          active: boolean
          airbnb_capable: boolean
          airbnb_specialist: boolean
          application_status: string
          background_check_status: string
          background_checked: boolean
          bio: string | null
          created_at: string
          distance_mi: number
          hourly_rate: number
          id: string
          is_zotm: boolean
          job_completion_rate: number
          jobs_completed: number
          languages: string[]
          languages_spoken: string[]
          name: string
          pet_comfort: string | null
          photo_url: string | null
          premium_care_awarded: boolean
          premium_care_plus: boolean
          rating: number
          reliability_flagged: boolean
          reliability_score: number
          repeat_client_count: number
          role: string
          suburb_coverage: string[]
          supplies_owned: string[]
          tags: string[]
          tier: string
          transport: string | null
          updated_at: string
          user_id: string | null
          verification_status: string
          verified: boolean
          years_experience: number | null
        }
        Insert: {
          active?: boolean
          airbnb_capable?: boolean
          airbnb_specialist?: boolean
          application_status?: string
          background_check_status?: string
          background_checked?: boolean
          bio?: string | null
          created_at?: string
          distance_mi?: number
          hourly_rate?: number
          id?: string
          is_zotm?: boolean
          job_completion_rate?: number
          jobs_completed?: number
          languages?: string[]
          languages_spoken?: string[]
          name: string
          pet_comfort?: string | null
          photo_url?: string | null
          premium_care_awarded?: boolean
          premium_care_plus?: boolean
          rating?: number
          reliability_flagged?: boolean
          reliability_score?: number
          repeat_client_count?: number
          role?: string
          suburb_coverage?: string[]
          supplies_owned?: string[]
          tags?: string[]
          tier?: string
          transport?: string | null
          updated_at?: string
          user_id?: string | null
          verification_status?: string
          verified?: boolean
          years_experience?: number | null
        }
        Update: {
          active?: boolean
          airbnb_capable?: boolean
          airbnb_specialist?: boolean
          application_status?: string
          background_check_status?: string
          background_checked?: boolean
          bio?: string | null
          created_at?: string
          distance_mi?: number
          hourly_rate?: number
          id?: string
          is_zotm?: boolean
          job_completion_rate?: number
          jobs_completed?: number
          languages?: string[]
          languages_spoken?: string[]
          name?: string
          pet_comfort?: string | null
          photo_url?: string | null
          premium_care_awarded?: boolean
          premium_care_plus?: boolean
          rating?: number
          reliability_flagged?: boolean
          reliability_score?: number
          repeat_client_count?: number
          role?: string
          suburb_coverage?: string[]
          supplies_owned?: string[]
          tags?: string[]
          tier?: string
          transport?: string | null
          updated_at?: string
          user_id?: string | null
          verification_status?: string
          verified?: boolean
          years_experience?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      analytics_booking_summary: {
        Row: {
          booking_count: number | null
          cancellation_count: number | null
          day: string | null
          gross_revenue: number | null
          launch_region: string | null
          recurring_count: number | null
          service: string | null
          service_type: string | null
        }
        Relationships: []
      }
      analytics_contractor_quality: {
        Row: {
          job_completion_rate: number | null
          name: string | null
          open_incident_count: number | null
          rating: number | null
          reliability_score: number | null
          repeat_client_count: number | null
          zooter_id: string | null
        }
        Relationships: []
      }
      booking_sensitive_access: {
        Row: {
          access_instructions: string | null
          alarm_code: string | null
          booking_id: string | null
          gate_code: string | null
          parking_instructions: string | null
          pet_notes: string | null
          zooter_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_zooter_id_fkey"
            columns: ["zooter_id"]
            isOneToOne: false
            referencedRelation: "analytics_contractor_quality"
            referencedColumns: ["zooter_id"]
          },
          {
            foreignKeyName: "bookings_zooter_id_fkey"
            columns: ["zooter_id"]
            isOneToOne: false
            referencedRelation: "booking_zooter_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_zooter_id_fkey"
            columns: ["zooter_id"]
            isOneToOne: false
            referencedRelation: "zooters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_zooter_id_fkey"
            columns: ["zooter_id"]
            isOneToOne: false
            referencedRelation: "zooters_public"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_zooter_profiles: {
        Row: {
          active: boolean | null
          airbnb_specialist: boolean | null
          background_check_status: string | null
          background_checked: boolean | null
          bio: string | null
          booking_id: string | null
          distance_mi: number | null
          hourly_rate: number | null
          id: string | null
          is_zotm: boolean | null
          job_completion_rate: number | null
          jobs_completed: number | null
          languages_spoken: string[] | null
          name: string | null
          pet_comfort: string | null
          photo_url: string | null
          premium_care_plus: boolean | null
          rating: number | null
          reliability_score: number | null
          repeat_client_count: number | null
          role: string | null
          suburb_coverage: string[] | null
          supplies_owned: string[] | null
          tags: string[] | null
          transport: string | null
          user_id: string | null
          verified: boolean | null
          years_experience: number | null
        }
        Relationships: []
      }
      zooters_public: {
        Row: {
          airbnb_specialist: boolean | null
          background_check_status: string | null
          background_checked: boolean | null
          distance_mi: number | null
          hourly_rate: number | null
          id: string | null
          is_zotm: boolean | null
          job_completion_rate: number | null
          jobs_completed: number | null
          languages_spoken: string[] | null
          name: string | null
          pet_comfort: string | null
          photo_url: string | null
          premium_care_plus: boolean | null
          rating: number | null
          reliability_score: number | null
          repeat_client_count: number | null
          role: string | null
          suburb_coverage: string[] | null
          supplies_owned: string[] | null
          tags: string[] | null
          transport: string | null
          verified: boolean | null
          years_experience: number | null
        }
        Insert: {
          airbnb_specialist?: boolean | null
          background_check_status?: string | null
          background_checked?: never
          distance_mi?: number | null
          hourly_rate?: number | null
          id?: string | null
          is_zotm?: boolean | null
          job_completion_rate?: number | null
          jobs_completed?: number | null
          languages_spoken?: string[] | null
          name?: string | null
          pet_comfort?: string | null
          photo_url?: string | null
          premium_care_plus?: boolean | null
          rating?: number | null
          reliability_score?: number | null
          repeat_client_count?: number | null
          role?: string | null
          suburb_coverage?: string[] | null
          supplies_owned?: string[] | null
          tags?: string[] | null
          transport?: string | null
          verified?: never
          years_experience?: number | null
        }
        Update: {
          airbnb_specialist?: boolean | null
          background_check_status?: string | null
          background_checked?: never
          distance_mi?: number | null
          hourly_rate?: number | null
          id?: string | null
          is_zotm?: boolean | null
          job_completion_rate?: number | null
          jobs_completed?: number | null
          languages_spoken?: string[] | null
          name?: string | null
          pet_comfort?: string | null
          photo_url?: string | null
          premium_care_plus?: boolean | null
          rating?: number | null
          reliability_score?: number | null
          repeat_client_count?: number | null
          role?: string | null
          suburb_coverage?: string[] | null
          supplies_owned?: string[] | null
          tags?: string[] | null
          transport?: string | null
          verified?: never
          years_experience?: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      can_access_sensitive_data: {
        Args: { p_booking_id: string; p_zooter_id: string }
        Returns: boolean
      }
      can_activate_payment_provider: {
        Args: { p_environment?: string; p_provider: string }
        Returns: boolean
      }
      can_create_masked_call: {
        Args: { p_actor_id: string; p_booking_id: string }
        Returns: {
          allowed: boolean
          eligible_until: string
          participant_role: string
          reason: string
        }[]
      }
      can_release_zooter_payout: {
        Args: { p_booking_id?: string; p_zooter_id: string }
        Returns: boolean
      }
      claim_provider_event: {
        Args: {
          p_event_id: string
          p_event_type: string
          p_metadata: Json
          p_payload_hash: string
          p_provider: string
          p_subject_id: string
          p_subject_table: string
        }
        Returns: {
          already_seen: boolean
          provider_event_id: string
        }[]
      }
      consume_rate_limit: {
        Args: {
          p_action: string
          p_actor_hash: string
          p_bucket: string
          p_limit_count: number
          p_window_seconds: number
        }
        Returns: boolean
      }
      get_accepted_zooter_job_destinations: {
        Args: { p_job_ids: string[] }
        Returns: {
          address: string
          booking_id: string
          job_id: string
        }[]
      }
      get_accepted_zooter_job_destinations_for_user: {
        Args: { p_job_ids: string[]; p_user_id: string }
        Returns: {
          address: string
          booking_id: string
          job_id: string
        }[]
      }
      get_zooter_job_cards: {
        Args: never
        Returns: {
          booking_id: string
          cancelled_at: string
          completed_at: string
          decline_reason: string
          destination_address: string
          duration_hours: number
          job_completed_at: string
          job_id: string
          offered_at: string
          price: number
          responded_at: string
          scheduled_at: string
          sensitive_access_available_notified_at: string
          sensitive_data_revoked_at: string
          service: string
          service_type: string
          state: string
          status: string
          user_id: string
          zooter_id: string
        }[]
      }
      get_zooter_job_cards_for_user: {
        Args: { p_user_id: string }
        Returns: {
          booking_id: string
          cancelled_at: string
          completed_at: string
          decline_reason: string
          destination_address: string
          duration_hours: number
          job_completed_at: string
          job_id: string
          offered_at: string
          price: number
          responded_at: string
          scheduled_at: string
          sensitive_access_available_notified_at: string
          sensitive_data_revoked_at: string
          service: string
          service_type: string
          state: string
          status: string
          user_id: string
          zooter_id: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_zoot_black_eligible: {
        Args: { p_area_key?: string; p_zooter_id: string }
        Returns: boolean
      }
      mark_provider_event_processed: {
        Args: {
          p_error_message: string
          p_provider_event_id: string
          p_status: string
        }
        Returns: undefined
      }
      set_safety_pin: { Args: { new_pin: string }; Returns: boolean }
      verify_safety_pin: {
        Args: { check_pin: string; check_user_id: string }
        Returns: boolean
      }
      zooter_job_transition_allowed: {
        Args: { current_state: string; next_state: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user" | "zooter"
      booking_status:
        | "pending"
        | "confirmed"
        | "enroute"
        | "arrived"
        | "in_progress"
        | "completed"
        | "cancelled"
        | "reassigned"
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
      subscription_status:
        | "active"
        | "paused"
        | "cancelled"
        | "pending_payment"
        | "past_due"
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
      app_role: ["admin", "user", "zooter"],
      booking_status: [
        "pending",
        "confirmed",
        "enroute",
        "arrived",
        "in_progress",
        "completed",
        "cancelled",
        "reassigned",
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
      ],
      subscription_status: [
        "active",
        "paused",
        "cancelled",
        "pending_payment",
        "past_due",
      ],
    },
  },
} as const
