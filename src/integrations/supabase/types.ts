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
      practice_sessions: {
        Row: {
          artist: string | null
          audio_url: string | null
          bpm: number | null
          created_at: string
          id: string
          loop_end: number | null
          loop_start: number | null
          notes: string | null
          offset_ms: number
          pitch_semitones: number
          saved_tab_id: string | null
          tempo: number
          title: string | null
          updated_at: string
          user_id: string
          youtube_title: string | null
          youtube_video_id: string | null
        }
        Insert: {
          artist?: string | null
          audio_url?: string | null
          bpm?: number | null
          created_at?: string
          id?: string
          loop_end?: number | null
          loop_start?: number | null
          notes?: string | null
          offset_ms?: number
          pitch_semitones?: number
          saved_tab_id?: string | null
          tempo?: number
          title?: string | null
          updated_at?: string
          user_id: string
          youtube_title?: string | null
          youtube_video_id?: string | null
        }
        Update: {
          artist?: string | null
          audio_url?: string | null
          bpm?: number | null
          created_at?: string
          id?: string
          loop_end?: number | null
          loop_start?: number | null
          notes?: string | null
          offset_ms?: number
          pitch_semitones?: number
          saved_tab_id?: string | null
          tempo?: number
          title?: string | null
          updated_at?: string
          user_id?: string
          youtube_title?: string | null
          youtube_video_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      saved_tabs: {
        Row: {
          artist: string | null
          created_at: string
          format: string | null
          id: string
          midi_storage_path: string | null
          raw_content: string | null
          songsterr_id: string | null
          source: Database["public"]["Enums"]["tab_source"]
          storage_path: string | null
          tab_url: string | null
          title: string
          user_id: string
        }
        Insert: {
          artist?: string | null
          created_at?: string
          format?: string | null
          id?: string
          midi_storage_path?: string | null
          raw_content?: string | null
          songsterr_id?: string | null
          source: Database["public"]["Enums"]["tab_source"]
          storage_path?: string | null
          tab_url?: string | null
          title: string
          user_id: string
        }
        Update: {
          artist?: string | null
          created_at?: string
          format?: string | null
          id?: string
          midi_storage_path?: string | null
          raw_content?: string | null
          songsterr_id?: string | null
          source?: Database["public"]["Enums"]["tab_source"]
          storage_path?: string | null
          tab_url?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      tracks: {
        Row: {
          audio_url: string | null
          created_at: string
          duration_seconds: number | null
          error_message: string | null
          id: string
          image_url: string | null
          instrumental: boolean
          instrumental_url: string | null
          lyrics: string | null
          model: string | null
          prompt: string | null
          status: Database["public"]["Enums"]["track_status"]
          stream_audio_url: string | null
          style: string | null
          suno_audio_id: string | null
          suno_task_id: string | null
          title: string | null
          updated_at: string
          user_id: string
          video_url: string | null
          vocal_url: string | null
        }
        Insert: {
          audio_url?: string | null
          created_at?: string
          duration_seconds?: number | null
          error_message?: string | null
          id?: string
          image_url?: string | null
          instrumental?: boolean
          instrumental_url?: string | null
          lyrics?: string | null
          model?: string | null
          prompt?: string | null
          status?: Database["public"]["Enums"]["track_status"]
          stream_audio_url?: string | null
          style?: string | null
          suno_audio_id?: string | null
          suno_task_id?: string | null
          title?: string | null
          updated_at?: string
          user_id: string
          video_url?: string | null
          vocal_url?: string | null
        }
        Update: {
          audio_url?: string | null
          created_at?: string
          duration_seconds?: number | null
          error_message?: string | null
          id?: string
          image_url?: string | null
          instrumental?: boolean
          instrumental_url?: string | null
          lyrics?: string | null
          model?: string | null
          prompt?: string | null
          status?: Database["public"]["Enums"]["track_status"]
          stream_audio_url?: string | null
          style?: string | null
          suno_audio_id?: string | null
          suno_task_id?: string | null
          title?: string | null
          updated_at?: string
          user_id?: string
          video_url?: string | null
          vocal_url?: string | null
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
          role?: Database["public"]["Enums"]["app_role"]
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
    }
    Enums: {
      app_role: "admin" | "user"
      tab_source: "songsterr" | "ai_local" | "manual"
      track_status: "pending" | "processing" | "complete" | "error"
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
      app_role: ["admin", "user"],
      tab_source: ["songsterr", "ai_local", "manual"],
      track_status: ["pending", "processing", "complete", "error"],
    },
  },
} as const
