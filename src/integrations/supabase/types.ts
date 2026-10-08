export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.18";
  };

  public: {
    Tables: {
      attendees: {
        Row: {
          id: string;
          booking_id: string;
          attendee_index: number;
          attendee_name: string;
          created_at: string;
        };

        Insert: {
          id?: string;
          booking_id: string;
          attendee_index: number;
          attendee_name: string;
          created_at?: string;
        };

        Update: {
          id?: string;
          booking_id?: string;
          attendee_index?: number;
          attendee_name?: string;
          created_at?: string;
        };

        Relationships: [
          {
            foreignKeyName: "attendees_booking_id_fkey";
            columns: ["booking_id"];
            isOneToOne: false;
            referencedRelation: "bookings";
            referencedColumns: ["id"];
          },
        ];
      };

      bookings: {
        Row: {
          amount_paise: number;
          base_amount_paise: number;
          discount_amount_paise: number;
          attendee_count: number;
          booking_code: string;
          created_at: string;
          customer_name: string;
          email: string;
          event_date: string;
          id: string;
          mobile: string;
          paid_at: string | null;
          pass_type: Database["public"]["Enums"]["pass_type"];
          payment_status: Database["public"]["Enums"]["payment_status"];
          quantity: number;
          referral_discount_paise: number;
          referral_discount_percent: number;
          razorpay_order_id: string | null;
          referral_code: string | null;
        };

        Insert: {
          amount_paise: number;
          base_amount_paise: number;
          discount_amount_paise?: number;
          attendee_count: number;
          booking_code: string;
          created_at?: string;
          customer_name: string;
          email: string;
          event_date: string;
          id?: string;
          mobile: string;
          paid_at?: string | null;
          pass_type: Database["public"]["Enums"]["pass_type"];
          payment_status?: Database["public"]["Enums"]["payment_status"];
          quantity: number;
          referral_discount_paise?: number;
          referral_discount_percent?: number;
          razorpay_order_id?: string | null;
          referral_code?: string | null;
        };

        Update: {
          amount_paise?: number;
          base_amount_paise?: number;
          discount_amount_paise?: number;
          attendee_count?: number;
          booking_code?: string;
          created_at?: string;
          customer_name?: string;
          email?: string;
          event_date?: string;
          id?: string;
          mobile?: string;
          paid_at?: string | null;
          pass_type?: Database["public"]["Enums"]["pass_type"];
          payment_status?: Database["public"]["Enums"]["payment_status"];
          quantity?: number;
          referral_discount_paise?: number;
          referral_discount_percent?: number;
          razorpay_order_id?: string | null;
          referral_code?: string | null;
        };

        Relationships: [];
      };

      payments: {
        Row: {
          amount_paise: number;
          booking_id: string;
          created_at: string;
          id: string;
          provider: string;
          razorpay_order_id: string;
          razorpay_payment_id: string | null;
          status: Database["public"]["Enums"]["payment_status"];
          verified_at: string | null;
        };

        Insert: {
          amount_paise: number;
          booking_id: string;
          created_at?: string;
          id?: string;
          provider?: string;
          razorpay_order_id: string;
          razorpay_payment_id?: string | null;
          status?: Database["public"]["Enums"]["payment_status"];
          verified_at?: string | null;
        };

        Update: {
          amount_paise?: number;
          booking_id?: string;
          created_at?: string;
          id?: string;
          provider?: string;
          razorpay_order_id?: string;
          razorpay_payment_id?: string | null;
          status?: Database["public"]["Enums"]["payment_status"];
          verified_at?: string | null;
        };

        Relationships: [
          {
            foreignKeyName: "payments_booking_id_fkey";
            columns: ["booking_id"];
            isOneToOne: false;
            referencedRelation: "bookings";
            referencedColumns: ["id"];
          },
        ];
      };

      tickets: {
        Row: {
          attendee_index: number;
          attendee_name: string | null;
          booking_id: string;
          checked_in_at: string | null;
          checked_in_by: string | null;
          created_at: string;
          event_date: string;
          id: string;
          ticket_code: string;
        };

        Insert: {
          attendee_index: number;
          attendee_name?: string | null;
          booking_id: string;
          checked_in_at?: string | null;
          checked_in_by?: string | null;
          created_at?: string;
          event_date: string;
          id?: string;
          ticket_code: string;
        };

        Update: {
          attendee_index?: number;
          attendee_name?: string | null;
          booking_id?: string;
          checked_in_at?: string | null;
          checked_in_by?: string | null;
          created_at?: string;
          event_date?: string;
          id?: string;
          ticket_code?: string;
        };

        Relationships: [
          {
            foreignKeyName: "tickets_booking_id_fkey";
            columns: ["booking_id"];
            isOneToOne: false;
            referencedRelation: "bookings";
            referencedColumns: ["id"];
          },
        ];
      };

      referrals: {
        Row: {
          id: string;
          code: string;
          name: string;
          active: boolean;
          discount_individual_paise: number;
          discount_squad_paise: number;
          discount_percent: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          code: string;
          name: string;
          active?: boolean;
          discount_individual_paise?: number;
          discount_squad_paise?: number;
          discount_percent?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          code?: string;
          name?: string;
          active?: boolean;
          discount_individual_paise?: number;
          discount_squad_paise?: number;
          discount_percent?: number;
          created_at?: string;
        };
        Relationships: [];
      };

      site_settings: {
        Row: {
          id: string;
          value: Json;
          updated_at: string;
        };
        Insert: {
          id?: string;
          value: Json;
          updated_at?: string;
        };
        Update: {
          id?: string;
          value?: Json;
          updated_at?: string;
        };
        Relationships: [];
      };

      user_roles: {
        Row: {
          id: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };

        Insert: {
          id?: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };

        Update: {
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id?: string;
        };

        Relationships: [];
      };
    };

    Views: {
      [_ in never]: never;
    };

    Functions: {
      check_in_ticket: {
        Args: {
          _code: string;
        };
        Returns: Json;
      };

      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"];
          _user_id: string;
        };
        Returns: boolean;
      };
    };

    Enums: {
      app_role: "admin" | "staff";
      pass_type: "individual" | "squad";
      payment_status:
        | "pending"
        | "paid"
        | "failed"
        | "refunded";
    };

    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<
  Database,
  "__InternalSupabase"
>;

type DefaultSchema =
  DatabaseWithoutInternals[
    Extract<keyof Database, "public">
  ];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (
        DefaultSchema["Tables"] &
        DefaultSchema["Views"]
      )
    | {
        schema: keyof DatabaseWithoutInternals;
      },
  TableName extends (
    DefaultSchemaTableNameOrOptions extends {
      schema: keyof DatabaseWithoutInternals;
    }
      ? keyof (
          DatabaseWithoutInternals[
            DefaultSchemaTableNameOrOptions["schema"]
          ]["Tables"] &
          DatabaseWithoutInternals[
            DefaultSchemaTableNameOrOptions["schema"]
          ]["Views"]
        )
      : never
  ) = never,
> =
  DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? (
        DatabaseWithoutInternals[
          DefaultSchemaTableNameOrOptions["schema"]
        ]["Tables"] &
        DatabaseWithoutInternals[
          DefaultSchemaTableNameOrOptions["schema"]
        ]["Views"]
      )[TableName] extends {
        Row: infer R;
      }
      ? R
      : never
    : DefaultSchemaTableNameOrOptions extends keyof (
        DefaultSchema["Tables"] &
        DefaultSchema["Views"]
      )
      ? (
          DefaultSchema["Tables"] &
          DefaultSchema["Views"]
        )[DefaultSchemaTableNameOrOptions] extends {
          Row: infer R;
        }
        ? R
        : never
      : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | {
        schema: keyof DatabaseWithoutInternals;
      },
  TableName extends (
    DefaultSchemaTableNameOrOptions extends {
      schema: keyof DatabaseWithoutInternals;
    }
      ? keyof DatabaseWithoutInternals[
          DefaultSchemaTableNameOrOptions["schema"]
        ]["Tables"]
      : never
  ) = never,
> =
  DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? DatabaseWithoutInternals[
        DefaultSchemaTableNameOrOptions["schema"]
      ]["Tables"][TableName] extends {
        Insert: infer I;
      }
      ? I
      : never
    : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
      ? DefaultSchema["Tables"][
          DefaultSchemaTableNameOrOptions
        ] extends {
          Insert: infer I;
        }
        ? I
        : never
      : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | {
        schema: keyof DatabaseWithoutInternals;
      },
  TableName extends (
    DefaultSchemaTableNameOrOptions extends {
      schema: keyof DatabaseWithoutInternals;
    }
      ? keyof DatabaseWithoutInternals[
          DefaultSchemaTableNameOrOptions["schema"]
        ]["Tables"]
      : never
  ) = never,
> =
  DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? DatabaseWithoutInternals[
        DefaultSchemaTableNameOrOptions["schema"]
      ]["Tables"][TableName] extends {
        Update: infer U;
      }
      ? U
      : never
    : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
      ? DefaultSchema["Tables"][
          DefaultSchemaTableNameOrOptions
        ] extends {
          Update: infer U;
        }
        ? U
        : never
      : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | {
        schema: keyof DatabaseWithoutInternals;
      },
  EnumName extends (
    DefaultSchemaEnumNameOrOptions extends {
      schema: keyof DatabaseWithoutInternals;
    }
      ? keyof DatabaseWithoutInternals[
          DefaultSchemaEnumNameOrOptions["schema"]
        ]["Enums"]
      : never
  ) = never,
> =
  DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? DatabaseWithoutInternals[
        DefaultSchemaEnumNameOrOptions["schema"]
      ]["Enums"][EnumName]
    : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
      ? DefaultSchema["Enums"][
          DefaultSchemaEnumNameOrOptions
        ]
      : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | {
        schema: keyof DatabaseWithoutInternals;
      },
  CompositeTypeName extends (
    PublicCompositeTypeNameOrOptions extends {
      schema: keyof DatabaseWithoutInternals;
    }
      ? keyof DatabaseWithoutInternals[
          PublicCompositeTypeNameOrOptions["schema"]
        ]["CompositeTypes"]
      : never
  ) = never,
> =
  PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? DatabaseWithoutInternals[
        PublicCompositeTypeNameOrOptions["schema"]
      ]["CompositeTypes"][CompositeTypeName]
    : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
      ? DatabaseWithoutInternals[
          "public"
        ]["CompositeTypes"][
          PublicCompositeTypeNameOrOptions
        ]
      : never;

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "staff"],
      pass_type: ["individual", "squad"],
      payment_status: [
        "pending",
        "paid",
        "failed",
        "refunded",
      ],
    },
  },
} as const;