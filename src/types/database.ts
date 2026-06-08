export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          avatar_url: string | null
          role: 'diner' | 'chef' | null
          created_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          avatar_url?: string | null
          role?: 'diner' | 'chef' | null
          created_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          avatar_url?: string | null
          role?: 'diner' | 'chef' | null
          created_at?: string
        }
      }
      chef_profiles: {
        Row: {
          id: string
          display_name: string | null
          bio: string | null
          location: string | null
          cuisines: string[]
          years_experience: number | null
          is_verified: boolean
          avg_rating: number
          review_count: number
          price_per_hour: number | null
          price_per_event: number | null
          max_guests: number
          hero_image_url: string | null
          created_at: string
        }
        Insert: {
          id: string
          display_name?: string | null
          bio?: string | null
          location?: string | null
          cuisines?: string[]
          years_experience?: number | null
          is_verified?: boolean
          avg_rating?: number
          review_count?: number
          price_per_hour?: number | null
          price_per_event?: number | null
          max_guests?: number
          hero_image_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          display_name?: string | null
          bio?: string | null
          location?: string | null
          cuisines?: string[]
          years_experience?: number | null
          is_verified?: boolean
          avg_rating?: number
          review_count?: number
          price_per_hour?: number | null
          price_per_event?: number | null
          max_guests?: number
          hero_image_url?: string | null
          created_at?: string
        }
      }
      services: {
        Row: {
          id: string
          chef_id: string
          title: string
          description: string | null
          cuisine_type: string | null
          duration_hours: number | null
          price_per_person: number | null
          max_guests: number
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          chef_id: string
          title: string
          description?: string | null
          cuisine_type?: string | null
          duration_hours?: number | null
          price_per_person?: number | null
          max_guests?: number
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          chef_id?: string
          title?: string
          description?: string | null
          cuisine_type?: string | null
          duration_hours?: number | null
          price_per_person?: number | null
          max_guests?: number
          is_active?: boolean
          created_at?: string
        }
      }
      bookings: {
        Row: {
          id: string
          inquiry_id: string | null
          service_id: string | null
          chef_id: string
          diner_id: string
          booking_date: string
          start_time: string
          end_time: string | null
          guest_count: number
          total_price: number
          status: 'pending' | 'confirmed' | 'completed' | 'cancelled'
          special_requests: string | null
          created_at: string
          quote_amount: number | null
          quote_message: string | null
          quote_valid_until: string | null
          quote_status: 'pending' | 'accepted' | 'declined' | 'expired' | null
          dietary_restrictions: string | null
          allergies: string | null
          allergy_severity: string | null
          food_preferences: string | null
          special_occasion: string | null
          reminder_sent: boolean
        }
        Insert: {
          id?: string
          inquiry_id?: string | null
          service_id?: string | null
          chef_id: string
          diner_id: string
          booking_date: string
          start_time: string
          end_time?: string | null
          guest_count: number
          total_price: number
          status?: 'pending' | 'confirmed' | 'completed' | 'cancelled'
          special_requests?: string | null
          created_at?: string
          quote_amount?: number | null
          quote_message?: string | null
          quote_valid_until?: string | null
          quote_status?: 'pending' | 'accepted' | 'declined' | 'expired' | null
          dietary_restrictions?: string | null
          allergies?: string | null
          allergy_severity?: string | null
          food_preferences?: string | null
          special_occasion?: string | null
          reminder_sent?: boolean
        }
        Update: {
          id?: string
          inquiry_id?: string | null
          service_id?: string | null
          chef_id?: string
          diner_id?: string
          booking_date?: string
          start_time?: string
          end_time?: string | null
          guest_count?: number
          total_price?: number
          status?: 'pending' | 'confirmed' | 'completed' | 'cancelled'
          special_requests?: string | null
          created_at?: string
          quote_amount?: number | null
          quote_message?: string | null
          quote_valid_until?: string | null
          quote_status?: 'pending' | 'accepted' | 'declined' | 'expired' | null
          dietary_restrictions?: string | null
          allergies?: string | null
          allergy_severity?: string | null
          food_preferences?: string | null
          special_occasion?: string | null
        }
      }
      reviews: {
        Row: {
          id: string
          booking_id: string | null
          chef_id: string
          diner_id: string
          rating: number
          comment: string | null
          created_at: string
        }
        Insert: {
          id?: string
          booking_id?: string | null
          chef_id: string
          diner_id: string
          rating: number
          comment?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          booking_id?: string | null
          chef_id?: string
          diner_id?: string
          rating?: number
          comment?: string | null
          created_at?: string
        }
      }
      chef_applications: {
        Row: {
          id: string
          name: string
          email: string
          phone: string | null
          location: string
          cuisine_types: string[]
          years_experience: number
          price_range: string | null
          bio: string | null
          preferred_contact: 'email' | 'phone' | 'either'
          status: 'pending' | 'approved' | 'rejected'
          reviewed_at: string | null
          reviewed_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          email: string
          phone?: string | null
          location: string
          cuisine_types?: string[]
          years_experience: number
          price_range?: string | null
          bio?: string | null
          preferred_contact?: 'email' | 'phone' | 'either'
          status?: 'pending' | 'approved' | 'rejected'
          reviewed_at?: string | null
          reviewed_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          email?: string
          phone?: string | null
          location?: string
          cuisine_types?: string[]
          years_experience?: number
          price_range?: string | null
          bio?: string | null
          preferred_contact?: 'email' | 'phone' | 'either'
          status?: 'pending' | 'approved' | 'rejected'
          reviewed_at?: string | null
          reviewed_by?: string | null
          created_at?: string
        }
      }
      inquiries: {
        Row: {
          id: string
          service_id: string | null
          chef_id: string
          diner_id: string | null
          email: string
          message: string
          inquiry_date: string
          guest_count: number | null
          inquiry_time: string | null
          status: 'pending' | 'contacted' | 'converted' | 'cancelled'
          created_at: string
          lead_id: string | null
        }
        Insert: {
          id?: string
          service_id?: string | null
          chef_id: string
          diner_id?: string | null
          email: string
          message: string
          inquiry_date: string
          guest_count?: number | null
          inquiry_time?: string | null
          status?: 'pending' | 'contacted' | 'converted' | 'cancelled'
          created_at?: string
          lead_id?: string | null
        }
        Update: {
          id?: string
          service_id?: string | null
          chef_id?: string
          diner_id?: string | null
          email?: string
          message?: string
          inquiry_date?: string
          guest_count?: number | null
          inquiry_time?: string | null
          status?: 'pending' | 'contacted' | 'converted' | 'cancelled'
          created_at?: string
          lead_id?: string | null
        }
      }
      leads: {
        Row: {
          id: string
          email: string
          source: 'booking_form' | 'waitlist' | 'contact' | 'other'
          created_at: string
        }
        Insert: {
          id?: string
          email: string
          source?: 'booking_form' | 'waitlist' | 'contact' | 'other'
          created_at?: string
        }
        Update: {
          id?: string
          email?: string
          source?: 'booking_form' | 'waitlist' | 'contact' | 'other'
          created_at?: string
        }
      }
      abandoned_bookings: {
        Row: {
          id: string
          email: string
          chef_id: string
          service_id: string | null
          service_type: string | null
          guest_count: number
          created_at: string
          contacted_at: string | null
        }
        Insert: {
          id?: string
          email: string
          chef_id: string
          service_id?: string | null
          service_type?: string | null
          guest_count?: number
          created_at?: string
          contacted_at?: string | null
        }
        Update: {
          id?: string
          email?: string
          chef_id?: string
          service_id?: string | null
          service_type?: string | null
          guest_count?: number
          created_at?: string
          contacted_at?: string | null
        }
      }
    }
  }
}

export type Profile = Database['public']['Tables']['profiles']['Row']
export type ChefProfile = Database['public']['Tables']['chef_profiles']['Row']
export type Service = Database['public']['Tables']['services']['Row']
export type Booking = Database['public']['Tables']['bookings']['Row']
export type Review = Database['public']['Tables']['reviews']['Row']
export type ChefApplication = Database['public']['Tables']['chef_applications']['Row']
export type Lead = Database['public']['Tables']['leads']['Row']
export type AbandonedBooking = Database['public']['Tables']['abandoned_bookings']['Row']
