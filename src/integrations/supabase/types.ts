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
      conversation_logs: {
        Row: {
          conversation_date: string
          conversation_time: string
          created_at: string
          email: string | null
          id: string
          messages: string
          order_id: string | null
          order_number: number | null
          restaurant_id: string
          updated_at: string
        }
        Insert: {
          conversation_date?: string
          conversation_time?: string
          created_at?: string
          email?: string | null
          id?: string
          messages?: string
          order_id?: string | null
          order_number?: number | null
          restaurant_id: string
          updated_at?: string
        }
        Update: {
          conversation_date?: string
          conversation_time?: string
          created_at?: string
          email?: string | null
          id?: string
          messages?: string
          order_id?: string | null
          order_number?: number | null
          restaurant_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      events: {
        Row: {
          event_date: string
          id: string
          impact_score: number
          restaurant_id: string | null
        }
        Insert: {
          event_date: string
          id?: string
          impact_score: number
          restaurant_id?: string | null
        }
        Update: {
          event_date?: string
          id?: string
          impact_score?: number
          restaurant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants_public"
            referencedColumns: ["id"]
          },
        ]
      }
      ingredient_stock: {
        Row: {
          created_at: string | null
          current_stock: number | null
          id: number
          ingredient_name: string
          last_updated: string | null
          max_stock_level: number | null
          min_stock_level: number | null
          restaurant_id: string | null
          unit: string
        }
        Insert: {
          created_at?: string | null
          current_stock?: number | null
          id?: number
          ingredient_name: string
          last_updated?: string | null
          max_stock_level?: number | null
          min_stock_level?: number | null
          restaurant_id?: string | null
          unit: string
        }
        Update: {
          created_at?: string | null
          current_stock?: number | null
          id?: number
          ingredient_name?: string
          last_updated?: string | null
          max_stock_level?: number | null
          min_stock_level?: number | null
          restaurant_id?: string | null
          unit?: string
        }
        Relationships: [
          {
            foreignKeyName: "ingredient_stock_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ingredient_stock_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants_public"
            referencedColumns: ["id"]
          },
        ]
      }
      meal_ingredients: {
        Row: {
          created_at: string | null
          id: string
          ingredient_name: string
          meal_name: string
          order_id: string
          quantity_used: number
          restaurant_id: string | null
          unit: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          ingredient_name: string
          meal_name: string
          order_id: string
          quantity_used: number
          restaurant_id?: string | null
          unit: string
        }
        Update: {
          created_at?: string | null
          id?: string
          ingredient_name?: string
          meal_name?: string
          order_id?: string
          quantity_used?: number
          restaurant_id?: string | null
          unit?: string
        }
        Relationships: [
          {
            foreignKeyName: "meal_ingredients_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meal_ingredients_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants_public"
            referencedColumns: ["id"]
          },
        ]
      }
      meal_recipes: {
        Row: {
          created_at: string | null
          id: string
          ingredient_name: string
          meal_name: string
          quantity_per_meal: number
          unit: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          ingredient_name: string
          meal_name: string
          quantity_per_meal: number
          unit: string
        }
        Update: {
          created_at?: string | null
          id?: string
          ingredient_name?: string
          meal_name?: string
          quantity_per_meal?: number
          unit?: string
        }
        Relationships: []
      }
      menu_items: {
        Row: {
          category: string
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_available: boolean | null
          name: string
          price: number
          restaurant_id: string
        }
        Insert: {
          category: string
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_available?: boolean | null
          name: string
          price: number
          restaurant_id: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_available?: boolean | null
          name?: string
          price?: number
          restaurant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "menu_items_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menu_items_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants_public"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          created_at: string
          id: string
          is_read: boolean
          order_id: string
          sender_id: string
          sender_type: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_read?: boolean
          order_id: string
          sender_id: string
          sender_type: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_read?: boolean
          order_id?: string
          sender_id?: string
          sender_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          id: string
          item_name: string
          menu_item_id: string | null
          order_id: string
          price: number
          quantity: number
        }
        Insert: {
          id?: string
          item_name: string
          menu_item_id?: string | null
          order_id: string
          price: number
          quantity: number
        }
        Update: {
          id?: string
          item_name?: string
          menu_item_id?: string | null
          order_id?: string
          price?: number
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          created_at: string
          delivery_address: string
          id: string
          notes: string | null
          order_number: number
          order_type: string
          payment_confirmed: boolean | null
          payment_method: string | null
          restaurant_id: string
          status: string
          total_amount: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          delivery_address: string
          id?: string
          notes?: string | null
          order_number: number
          order_type?: string
          payment_confirmed?: boolean | null
          payment_method?: string | null
          restaurant_id: string
          status?: string
          total_amount: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          delivery_address?: string
          id?: string
          notes?: string | null
          order_number?: number
          order_type?: string
          payment_confirmed?: boolean | null
          payment_method?: string | null
          restaurant_id?: string
          status?: string
          total_amount?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants_public"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          currency: string
          id: string
          order_id: string
          status: string
          updated_at: string
          yoco_checkout_id: string | null
          yoco_payment_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          id?: string
          order_id: string
          status?: string
          updated_at?: string
          yoco_checkout_id?: string | null
          yoco_payment_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          order_id?: string
          status?: string
          updated_at?: string
          yoco_checkout_id?: string | null
          yoco_payment_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          address: string | null
          created_at: string
          full_name: string | null
          id: string
          is_restaurant_owner: boolean | null
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          is_restaurant_owner?: boolean | null
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          is_restaurant_owner?: boolean | null
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      restaurant_payment_credentials: {
        Row: {
          created_at: string
          id: string
          restaurant_id: string
          updated_at: string
          yoco_public_key: string | null
          yoco_secret_key: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          restaurant_id: string
          updated_at?: string
          yoco_public_key?: string | null
          yoco_secret_key?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          restaurant_id?: string
          updated_at?: string
          yoco_public_key?: string | null
          yoco_secret_key?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "restaurant_payment_credentials_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: true
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "restaurant_payment_credentials_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: true
            referencedRelation: "restaurants_public"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurant_staff: {
        Row: {
          created_at: string
          email: string
          id: string
          restaurant_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          restaurant_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          restaurant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "restaurant_staff_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "restaurant_staff_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants_public"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurants: {
        Row: {
          address: string
          average_prep_time: number | null
          created_at: string
          cuisine_type: string
          description: string | null
          id: string
          image_url: string | null
          is_accepting_orders: boolean | null
          is_active: boolean | null
          latitude: number | null
          longitude: number | null
          name: string
          operating_hours_end: string | null
          operating_hours_start: string | null
          owner_id: string
          phone: string | null
          rating: number | null
          updated_at: string
        }
        Insert: {
          address: string
          average_prep_time?: number | null
          created_at?: string
          cuisine_type: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_accepting_orders?: boolean | null
          is_active?: boolean | null
          latitude?: number | null
          longitude?: number | null
          name: string
          operating_hours_end?: string | null
          operating_hours_start?: string | null
          owner_id: string
          phone?: string | null
          rating?: number | null
          updated_at?: string
        }
        Update: {
          address?: string
          average_prep_time?: number | null
          created_at?: string
          cuisine_type?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_accepting_orders?: boolean | null
          is_active?: boolean | null
          latitude?: number | null
          longitude?: number | null
          name?: string
          operating_hours_end?: string | null
          operating_hours_start?: string | null
          owner_id?: string
          phone?: string | null
          rating?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          order_id: string | null
          rating: number
          restaurant_id: string
          user_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          order_id?: string | null
          rating: number
          restaurant_id: string
          user_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          order_id?: string | null
          rating?: number
          restaurant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants_public"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_history: {
        Row: {
          id: string
          item_name: string
          quantity: number
          restaurant_id: string | null
          sale_date: string
        }
        Insert: {
          id?: string
          item_name: string
          quantity: number
          restaurant_id?: string | null
          sale_date: string
        }
        Update: {
          id?: string
          item_name?: string
          quantity?: number
          restaurant_id?: string | null
          sale_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_history_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_history_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants_public"
            referencedColumns: ["id"]
          },
        ]
      }
      stock: {
        Row: {
          created_at: string | null
          current_stock: number | null
          id: string
          item_name: string
          last_updated: string | null
          max_stock: number | null
          min_stock: number | null
          restaurant_id: string | null
        }
        Insert: {
          created_at?: string | null
          current_stock?: number | null
          id?: string
          item_name: string
          last_updated?: string | null
          max_stock?: number | null
          min_stock?: number | null
          restaurant_id?: string | null
        }
        Update: {
          created_at?: string | null
          current_stock?: number | null
          id?: string
          item_name?: string
          last_updated?: string | null
          max_stock?: number | null
          min_stock?: number | null
          restaurant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants_public"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_transactions: {
        Row: {
          created_at: string | null
          id: string
          item_name: string
          new_stock: number | null
          notes: string | null
          previous_stock: number | null
          quantity: number
          restaurant_id: string | null
          transaction_type: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          item_name: string
          new_stock?: number | null
          notes?: string | null
          previous_stock?: number | null
          quantity: number
          restaurant_id?: string | null
          transaction_type?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          item_name?: string
          new_stock?: number | null
          notes?: string | null
          previous_stock?: number | null
          quantity?: number
          restaurant_id?: string | null
          transaction_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_transactions_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_transactions_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants_public"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      restaurants_public: {
        Row: {
          accepts_online_payment: boolean | null
          address: string | null
          average_prep_time: number | null
          created_at: string | null
          cuisine_type: string | null
          description: string | null
          id: string | null
          image_url: string | null
          is_accepting_orders: boolean | null
          is_active: boolean | null
          latitude: number | null
          longitude: number | null
          name: string | null
          operating_hours_end: string | null
          operating_hours_start: string | null
          rating: number | null
          updated_at: string | null
        }
        Insert: {
          accepts_online_payment?: never
          address?: string | null
          average_prep_time?: number | null
          created_at?: string | null
          cuisine_type?: string | null
          description?: string | null
          id?: string | null
          image_url?: string | null
          is_accepting_orders?: boolean | null
          is_active?: boolean | null
          latitude?: number | null
          longitude?: number | null
          name?: string | null
          operating_hours_end?: string | null
          operating_hours_start?: string | null
          rating?: number | null
          updated_at?: string | null
        }
        Update: {
          accepts_online_payment?: never
          address?: string | null
          average_prep_time?: number | null
          created_at?: string | null
          cuisine_type?: string | null
          description?: string | null
          id?: string | null
          image_url?: string | null
          is_accepting_orders?: boolean | null
          is_active?: boolean | null
          latitude?: number | null
          longitude?: number | null
          name?: string | null
          operating_hours_end?: string | null
          operating_hours_start?: string | null
          rating?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      reviews_public: {
        Row: {
          comment: string | null
          created_at: string | null
          id: string | null
          rating: number | null
          restaurant_id: string | null
        }
        Insert: {
          comment?: string | null
          created_at?: string | null
          id?: string | null
          rating?: number | null
          restaurant_id?: string | null
        }
        Update: {
          comment?: string | null
          created_at?: string | null
          id?: string | null
          rating?: number | null
          restaurant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants_public"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      confirm_cod_payment: { Args: { p_order_id: string }; Returns: boolean }
      create_validated_order:
        | {
            Args: {
              p_delivery_address: string
              p_items: Json
              p_notes: string
              p_payment_method: string
              p_restaurant_id: string
            }
            Returns: string
          }
        | {
            Args: {
              p_delivery_address: string
              p_items: Json
              p_notes: string
              p_order_type?: string
              p_payment_method: string
              p_restaurant_id: string
            }
            Returns: string
          }
        | {
            Args: {
              p_delivery_address: string
              p_delivery_fee?: number
              p_items: Json
              p_notes: string
              p_order_type?: string
              p_payment_method: string
              p_restaurant_id: string
            }
            Returns: string
          }
      is_any_restaurant_owner: { Args: never; Returns: boolean }
      is_restaurant_owner: {
        Args: { p_restaurant_id: string }
        Returns: boolean
      }
      is_restaurant_staff: { Args: never; Returns: boolean }
      owner_has_payment_keys: {
        Args: { p_restaurant_id: string }
        Returns: boolean
      }
      remove_restaurant_payment_credentials: {
        Args: { p_restaurant_id: string }
        Returns: boolean
      }
      restaurant_has_online_payment: {
        Args: { p_restaurant_id: string }
        Returns: boolean
      }
      update_restaurant_payment_credentials: {
        Args: {
          p_restaurant_id: string
          p_yoco_public_key: string
          p_yoco_secret_key: string
        }
        Returns: boolean
      }
      user_has_order_at_restaurant: {
        Args: { restaurant_uuid: string }
        Returns: boolean
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
