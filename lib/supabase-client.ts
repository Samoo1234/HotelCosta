import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

// Client-side Supabase client
export const createClient = () => createClientComponentClient()

// Database types
export type Database = {
  public: {
    Tables: {
      hotels: {
        Row: {
          id: string
          name: string
          address: string
          phone: string
          email: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          address: string
          phone: string
          email: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          address?: string
          phone?: string
          email?: string
          created_at?: string
          updated_at?: string
        }
      }
      rooms: {
        Row: {
          id: string
          hotel_id: string
          room_number: string
          room_type: string
          capacity: number
          price_per_night: number
          status: 'available' | 'occupied' | 'maintenance' | 'reserved'
          amenities: string[]
          description: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          hotel_id: string
          room_number: string
          room_type: string
          capacity: number
          price_per_night: number
          status?: 'available' | 'occupied' | 'maintenance' | 'reserved'
          amenities?: string[]
          description?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          hotel_id?: string
          room_number?: string
          room_type?: string
          capacity?: number
          price_per_night?: number
          status?: 'available' | 'occupied' | 'maintenance' | 'reserved'
          amenities?: string[]
          description?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      guests: {
        Row: {
          id: string
          client_type: 'individual' | 'company'
          first_name: string | null
          last_name: string | null
          date_of_birth: string | null
          company_name: string | null
          trade_name: string | null
          contact_person: string | null
          email: string
          phone: string
          document_type: string
          document_number: string
          address: string | null
          nationality: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          client_type: 'individual' | 'company'
          first_name?: string | null
          last_name?: string | null
          date_of_birth?: string | null
          company_name?: string | null
          trade_name?: string | null
          contact_person?: string | null
          email: string
          phone: string
          document_type: string
          document_number: string
          address?: string | null
          nationality?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          client_type?: 'individual' | 'company'
          first_name?: string | null
          last_name?: string | null
          date_of_birth?: string | null
          company_name?: string | null
          trade_name?: string | null
          contact_person?: string | null
          email?: string
          phone?: string
          document_type?: string
          document_number?: string
          address?: string | null
          nationality?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      reservations: {
        Row: {
          id: string
          guest_id: string
          room_id: string
          check_in_date: string
          check_out_date: string
          total_amount: number
          status: 'pending' | 'confirmed' | 'checked_in' | 'checked_out' | 'cancelled'
          special_requests: string | null
          reservation_code: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          guest_id: string
          room_id: string
          check_in_date: string
          check_out_date: string
          total_amount: number
          status?: 'pending' | 'confirmed' | 'checked_in' | 'checked_out' | 'cancelled'
          special_requests?: string | null
          reservation_code: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          guest_id?: string
          room_id?: string
          check_in_date?: string
          check_out_date?: string
          total_amount?: number
          status?: 'pending' | 'confirmed' | 'checked_in' | 'checked_out' | 'cancelled'
          special_requests?: string | null
          reservation_code?: string
          created_at?: string
          updated_at?: string
        }
      }
      payments: {
        Row: {
          id: string
          reservation_id: string
          amount: number
          payment_method: 'cash' | 'credit_card' | 'debit_card' | 'pix' | 'bank_transfer'
          payment_status: 'pending' | 'completed' | 'failed' | 'refunded'
          transaction_id: string | null
          payment_date: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          reservation_id: string
          amount: number
          payment_method: 'cash' | 'credit_card' | 'debit_card' | 'pix' | 'bank_transfer'
          payment_status?: 'pending' | 'completed' | 'failed' | 'refunded'
          transaction_id?: string | null
          payment_date?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          reservation_id?: string
          amount?: number
          payment_method?: 'cash' | 'credit_card' | 'debit_card' | 'pix' | 'bank_transfer'
          payment_status?: 'pending' | 'completed' | 'failed' | 'refunded'
          transaction_id?: string | null
          payment_date?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}