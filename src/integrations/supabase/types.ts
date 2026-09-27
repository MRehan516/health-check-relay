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
      audit_log: {
        Row: {
          action: string
          actor: string
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
        }
        Insert: {
          action: string
          actor?: string
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
        }
        Update: {
          action?: string
          actor?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
        }
        Relationships: []
      }
      caregivers: {
        Row: {
          created_at: string
          id: string
          name: string
          phone: string
          relation: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          phone: string
          relation?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          phone?: string
          relation?: string | null
        }
        Relationships: []
      }
      checkins: {
        Row: {
          channel: Database["public"]["Enums"]["checkin_channel"]
          id: string
          message_body: string | null
          missed_count: number
          parsed_status: Database["public"]["Enums"]["parsed_status"]
          patient_id: string
          raw_response: string | null
          response_deadline: string
          sent_at: string
          task_id: string | null
        }
        Insert: {
          channel?: Database["public"]["Enums"]["checkin_channel"]
          id?: string
          message_body?: string | null
          missed_count?: number
          parsed_status?: Database["public"]["Enums"]["parsed_status"]
          patient_id: string
          raw_response?: string | null
          response_deadline?: string
          sent_at?: string
          task_id?: string | null
        }
        Update: {
          channel?: Database["public"]["Enums"]["checkin_channel"]
          id?: string
          message_body?: string | null
          missed_count?: number
          parsed_status?: Database["public"]["Enums"]["parsed_status"]
          patient_id?: string
          raw_response?: string | null
          response_deadline?: string
          sent_at?: string
          task_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "checkins_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checkins_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "discharge_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      discharge_tasks: {
        Row: {
          created_at: string
          description: string
          id: string
          patient_id: string
          recovery_day: number
          status: Database["public"]["Enums"]["task_status"]
          type: Database["public"]["Enums"]["task_type"]
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          patient_id: string
          recovery_day?: number
          status?: Database["public"]["Enums"]["task_status"]
          type?: Database["public"]["Enums"]["task_type"]
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          patient_id?: string
          recovery_day?: number
          status?: Database["public"]["Enums"]["task_status"]
          type?: Database["public"]["Enums"]["task_type"]
        }
        Relationships: [
          {
            foreignKeyName: "discharge_tasks_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      escalations: {
        Row: {
          checkin_id: string | null
          created_at: string
          id: string
          patient_id: string | null
          reason: string
          resolution_note: string | null
          resolved_by: string | null
          severity: Database["public"]["Enums"]["escalation_severity"]
          status: Database["public"]["Enums"]["escalation_status"]
        }
        Insert: {
          checkin_id?: string | null
          created_at?: string
          id?: string
          patient_id?: string | null
          reason: string
          resolution_note?: string | null
          resolved_by?: string | null
          severity: Database["public"]["Enums"]["escalation_severity"]
          status?: Database["public"]["Enums"]["escalation_status"]
        }
        Update: {
          checkin_id?: string | null
          created_at?: string
          id?: string
          patient_id?: string | null
          reason?: string
          resolution_note?: string | null
          resolved_by?: string | null
          severity?: Database["public"]["Enums"]["escalation_severity"]
          status?: Database["public"]["Enums"]["escalation_status"]
        }
        Relationships: [
          {
            foreignKeyName: "escalations_checkin_id_fkey"
            columns: ["checkin_id"]
            isOneToOne: false
            referencedRelation: "checkins"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "escalations_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      patients: {
        Row: {
          caregiver_id: string | null
          created_at: string
          discharge_date: string
          document_path: string | null
          id: string
          name: string
          phone: string
        }
        Insert: {
          caregiver_id?: string | null
          created_at?: string
          discharge_date: string
          document_path?: string | null
          id?: string
          name: string
          phone: string
        }
        Update: {
          caregiver_id?: string | null
          created_at?: string
          discharge_date?: string
          document_path?: string | null
          id?: string
          name?: string
          phone?: string
        }
        Relationships: [
          {
            foreignKeyName: "patients_caregiver_id_fkey"
            columns: ["caregiver_id"]
            isOneToOne: false
            referencedRelation: "caregivers"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      reset_demo_data: { Args: never; Returns: undefined }
    }
    Enums: {
      app_role: "coordinator"
      checkin_channel: "sms" | "simulated"
      escalation_severity: "URGENT" | "WATCH" | "CONTACT_FAILURE" | "UNCLEAR"
      escalation_status: "open" | "resolved"
      parsed_status: "pending" | "routine" | "concerning" | "unclear"
      task_status: "pending" | "done"
      task_type: "medication" | "wound_care" | "follow_up" | "warning_sign"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["coordinator"],
      checkin_channel: ["sms", "simulated"],
      escalation_severity: ["URGENT", "WATCH", "CONTACT_FAILURE", "UNCLEAR"],
      escalation_status: ["open", "resolved"],
      parsed_status: ["pending", "routine", "concerning", "unclear"],
      task_status: ["pending", "done"],
      task_type: ["medication", "wound_care", "follow_up", "warning_sign"],
    },
  },
} as const
