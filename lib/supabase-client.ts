import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

// Client-side Supabase client with strict database typing
export const createClient = () => createClientComponentClient<Database>()

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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      activity_logs: {
        Row: {
          category: string
          created_at: string | null
          details: Json | null
          id: string
          ip_address: unknown
          level: string
          message: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          category: string
          created_at?: string | null
          details?: Json | null
          id?: string
          ip_address?: unknown
          level: string
          message: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          details?: Json | null
          id?: string
          ip_address?: unknown
          level?: string
          message?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      atividade_heartbeat: {
        Row: {
          data_hora: string | null
          id: number
        }
        Insert: {
          data_hora?: string | null
          id?: number
        }
        Update: {
          data_hora?: string | null
          id?: number
        }
        Relationships: []
      }
      guests: {
        Row: {
          address: string | null
          client_type: string | null
          company_name: string | null
          contact_person: string | null
          created_at: string | null
          date_of_birth: string | null
          document_number: string
          document_type: string
          email: string
          first_name: string | null
          id: string
          last_name: string | null
          nationality: string | null
          phone: string
          trade_name: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          client_type?: string | null
          company_name?: string | null
          contact_person?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          document_number: string
          document_type: string
          email: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          nationality?: string | null
          phone: string
          trade_name?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          client_type?: string | null
          company_name?: string | null
          contact_person?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          document_number?: string
          document_type?: string
          email?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          nationality?: string | null
          phone?: string
          trade_name?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      hotels: {
        Row: {
          address: string
          check_in_time: string | null
          check_out_time: string | null
          created_at: string | null
          currency: string | null
          description: string | null
          email: string
          id: string
          name: string
          phone: string
          tax_rate: number | null
          timezone: string | null
          updated_at: string | null
          website: string | null
        }
        Insert: {
          address: string
          check_in_time?: string | null
          check_out_time?: string | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          email: string
          id?: string
          name: string
          phone: string
          tax_rate?: number | null
          timezone?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          address?: string
          check_in_time?: string | null
          check_out_time?: string | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          email?: string
          id?: string
          name?: string
          phone?: string
          tax_rate?: number | null
          timezone?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          created_at: string | null
          id: string
          payment_date: string
          payment_method: string
          payment_status: string | null
          reservation_id: string | null
          transaction_id: string | null
          updated_at: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          id?: string
          payment_date: string
          payment_method: string
          payment_status?: string | null
          reservation_id?: string | null
          transaction_id?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          id?: string
          payment_date?: string
          payment_method?: string
          payment_status?: string | null
          reservation_id?: string | null
          transaction_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "open_reservations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          }
        ]
      }
      product_categories: {
        Row: {
          active: boolean | null
          created_at: string | null
          description: string | null
          display_order: number | null
          icon: string | null
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          icon?: string | null
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          icon?: string | null
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      products: {
        Row: {
          active: boolean | null
          barcode: string | null
          category_id: string | null
          cost_price: number | null
          created_at: string | null
          description: string | null
          id: string
          image_url: string | null
          min_stock_alert: number | null
          name: string
          price: number
          sku: string | null
          stock_quantity: number | null
          unit: string | null
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          barcode?: string | null
          category_id?: string | null
          cost_price?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          min_stock_alert?: number | null
          name: string
          price: number
          sku?: string | null
          stock_quantity?: number | null
          unit?: string | null
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          barcode?: string | null
          category_id?: string | null
          cost_price?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          min_stock_alert?: number | null
          name?: string
          price?: number
          sku?: string | null
          stock_quantity?: number | null
          unit?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "product_categories"
            referencedColumns: ["id"]
          }
        ]
      }
      reservations: {
        Row: {
          actual_check_in_date: string | null
          actual_check_out_date: string | null
          cancellation_date: string | null
          cancellation_reason: string | null
          cancelled_at: string | null
          check_in_date: string
          check_out_date: string | null
          created_at: string | null
          guest_id: string | null
          id: string
          no_show_at: string | null
          reservation_code: string | null
          room_id: string | null
          special_requests: string | null
          status: string | null
          status_updated_at: string | null
          total_amount: number
          updated_at: string | null
        }
        Insert: {
          actual_check_in_date?: string | null
          actual_check_out_date?: string | null
          cancellation_date?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          check_in_date: string
          check_out_date?: string | null
          created_at?: string | null
          guest_id?: string | null
          id?: string
          no_show_at?: string | null
          reservation_code?: string | null
          room_id?: string | null
          special_requests?: string | null
          status?: string | null
          status_updated_at?: string | null
          total_amount: number
          updated_at?: string | null
        }
        Update: {
          actual_check_in_date?: string | null
          actual_check_out_date?: string | null
          cancellation_date?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          check_in_date?: string
          check_out_date?: string | null
          created_at?: string | null
          guest_id?: string | null
          id?: string
          no_show_at?: string | null
          reservation_code?: string | null
          room_id?: string | null
          special_requests?: string | null
          status?: string | null
          status_updated_at?: string | null
          total_amount?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reservations_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "guests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          }
        ]
      }
      room_consumptions: {
        Row: {
          consumption_date: string | null
          created_at: string | null
          id: string
          notes: string | null
          payment_responsibility: string | null
          product_id: string | null
          quantity: number
          registered_by: string | null
          reservation_id: string | null
          room_id: string | null
          status: string | null
          total_amount: number
          unit_price: number
          updated_at: string | null
        }
        Insert: {
          consumption_date?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          payment_responsibility?: string | null
          product_id?: string | null
          quantity?: number
          registered_by?: string | null
          reservation_id?: string | null
          room_id?: string | null
          status?: string | null
          total_amount: number
          unit_price: number
          updated_at?: string | null
        }
        Update: {
          consumption_date?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          payment_responsibility?: string | null
          product_id?: string | null
          quantity?: number
          registered_by?: string | null
          reservation_id?: string | null
          room_id?: string | null
          status?: string | null
          total_amount?: number
          unit_price?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "room_consumptions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "low_stock_alert"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_consumptions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_consumptions_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "open_reservations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_consumptions_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_consumptions_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          }
        ]
      }
      rooms: {
        Row: {
          amenities: string[] | null
          capacity: number
          created_at: string | null
          description: string | null
          hotel_id: string | null
          id: string
          price_per_night: number
          room_number: string
          room_type: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          amenities?: string[] | null
          capacity: number
          created_at?: string | null
          description?: string | null
          hotel_id?: string | null
          id?: string
          price_per_night: number
          room_number: string
          room_type: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          amenities?: string[] | null
          capacity?: number
          created_at?: string | null
          description?: string | null
          hotel_id?: string | null
          id?: string
          price_per_night?: number
          room_number?: string
          room_type?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rooms_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          }
        ]
      }
      stock_movements: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          movement_type: string
          notes: string | null
          product_id: string | null
          quantity: number
          reason: string | null
          reference_id: string | null
          reference_type: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          movement_type: string
          notes?: string | null
          product_id?: string | null
          quantity: number
          reason?: string | null
          reference_id?: string | null
          reference_type?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          movement_type?: string
          notes?: string | null
          product_id?: string | null
          quantity?: number
          reason?: string | null
          reference_id?: string | null
          reference_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "low_stock_alert"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          }
        ]
      }
      system_logs: {
        Row: {
          category: string
          created_at: string | null
          details: Json | null
          entity_id: string | null
          entity_type: string | null
          id: string
          level: string
          message: string
          source: string | null
          tags: string[] | null
          user_id: string | null
        }
        Insert: {
          category: string
          created_at?: string | null
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          level: string
          message: string
          source?: string | null
          tags?: string[] | null
          user_id?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          level?: string
          message?: string
          source?: string | null
          tags?: string[] | null
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      consumption_report: {
        Row: {
          category_name: string | null
          check_in_date: string | null
          check_out_date: string | null
          client_type: string | null
          consumption_date: string | null
          guest_name: string | null
          id: string | null
          payment_responsibility: string | null
          product_name: string | null
          quantity: number | null
          room_number: string | null
          status: string | null
          total_amount: number | null
          unit_price: number | null
        }
        Relationships: []
      }
      low_stock_alert: {
        Row: {
          category_name: string | null
          id: string | null
          min_stock_alert: number | null
          name: string | null
          sku: string | null
          stock_quantity: number | null
        }
        Relationships: []
      }
      open_reservations: {
        Row: {
          actual_check_in_date: string | null
          actual_check_out_date: string | null
          cancellation_date: string | null
          cancellation_reason: string | null
          cancelled_at: string | null
          check_in_date: string | null
          check_out_date: string | null
          company_name: string | null
          created_at: string | null
          current_total_amount: number | null
          days_stayed: number | null
          email: string | null
          first_name: string | null
          guest_id: string | null
          id: string | null
          last_name: string | null
          no_show_at: string | null
          phone: string | null
          price_per_night: number | null
          reservation_code: string | null
          room_id: string | null
          room_number: string | null
          room_type: string | null
          special_requests: string | null
          status: string | null
          status_updated_at: string | null
          total_amount: number | null
          trade_name: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reservations_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "guests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Functions: {
      finalize_checkout: {
        Args: { checkout_date?: string; reservation_id: string }
        Returns: {
          final_amount: number
          message: string
          success: boolean
        }[]
      }
      reset_atividade_heartbeat: { Args: never; Returns: undefined }
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