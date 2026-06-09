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
      book_categories: {
        Row: {
          course_id: string
          created_at: string
          id: string
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          course_id: string
          created_at?: string
          id?: string
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          course_id?: string
          created_at?: string
          id?: string
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      books: {
        Row: {
          category_id: string | null
          course_id: string
          created_at: string
          description: string | null
          id: string
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          course_id: string
          created_at?: string
          description?: string | null
          id?: string
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          course_id?: string
          created_at?: string
          description?: string | null
          id?: string
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "books_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "book_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "books_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          created_at: string
          description: string | null
          id: string
          library_url: string | null
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          library_url?: string | null
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          library_url?: string | null
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      homepage_blocks: {
        Row: {
          body_ar: string | null
          body_en: string | null
          body_fa: string | null
          created_at: string
          icon: string | null
          id: string
          image_url: string | null
          kind: string
          sort_order: number
          title_ar: string | null
          title_en: string | null
          title_fa: string | null
          updated_at: string
          visible: boolean
        }
        Insert: {
          body_ar?: string | null
          body_en?: string | null
          body_fa?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          image_url?: string | null
          kind?: string
          sort_order?: number
          title_ar?: string | null
          title_en?: string | null
          title_fa?: string | null
          updated_at?: string
          visible?: boolean
        }
        Update: {
          body_ar?: string | null
          body_en?: string | null
          body_fa?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          image_url?: string | null
          kind?: string
          sort_order?: number
          title_ar?: string | null
          title_en?: string | null
          title_fa?: string | null
          updated_at?: string
          visible?: boolean
        }
        Relationships: []
      }
      lesson_exercises: {
        Row: {
          created_at: string
          created_by: string | null
          exercise_type: string
          expected_answer: string
          id: string
          lesson_id: string
          options: Json | null
          question: string
          sort_order: number
          source: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          exercise_type?: string
          expected_answer?: string
          id?: string
          lesson_id: string
          options?: Json | null
          question: string
          sort_order?: number
          source?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          exercise_type?: string
          expected_answer?: string
          id?: string
          lesson_id?: string
          options?: Json | null
          question?: string
          sort_order?: number
          source?: string
          updated_at?: string
        }
        Relationships: []
      }
      lessons: {
        Row: {
          audio_url: string | null
          book_id: string | null
          content: string | null
          course_id: string
          created_at: string
          created_by: string | null
          explanation: string | null
          id: string
          original_text: string | null
          slide_url: string | null
          sort_order: number
          title: string
          translation: string | null
          updated_at: string
          video_embed: string | null
        }
        Insert: {
          audio_url?: string | null
          book_id?: string | null
          content?: string | null
          course_id: string
          created_at?: string
          created_by?: string | null
          explanation?: string | null
          id?: string
          original_text?: string | null
          slide_url?: string | null
          sort_order?: number
          title: string
          translation?: string | null
          updated_at?: string
          video_embed?: string | null
        }
        Update: {
          audio_url?: string | null
          book_id?: string | null
          content?: string | null
          course_id?: string
          created_at?: string
          created_by?: string | null
          explanation?: string | null
          id?: string
          original_text?: string | null
          slide_url?: string | null
          sort_order?: number
          title?: string
          translation?: string | null
          updated_at?: string
          video_embed?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lessons_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lessons_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string | null
          id: string
          pending_teacher: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id: string
          pending_teacher?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
          pending_teacher?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          created_at: string
          key: string
          updated_at: string
          value_ar: string | null
          value_en: string | null
          value_fa: string | null
        }
        Insert: {
          created_at?: string
          key: string
          updated_at?: string
          value_ar?: string | null
          value_en?: string | null
          value_fa?: string | null
        }
        Update: {
          created_at?: string
          key?: string
          updated_at?: string
          value_ar?: string | null
          value_en?: string | null
          value_fa?: string | null
        }
        Relationships: []
      }
      teacher_book_access: {
        Row: {
          book_id: string
          created_at: string
          id: string
          teacher_id: string
        }
        Insert: {
          book_id: string
          created_at?: string
          id?: string
          teacher_id: string
        }
        Update: {
          book_id?: string
          created_at?: string
          id?: string
          teacher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "teacher_book_access_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_course_access: {
        Row: {
          course_id: string
          created_at: string
          id: string
          teacher_id: string
        }
        Insert: {
          course_id: string
          created_at?: string
          id?: string
          teacher_id: string
        }
        Update: {
          course_id?: string
          created_at?: string
          id?: string
          teacher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "teacher_course_access_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      user_achievements: {
        Row: {
          badge_key: string
          earned_at: string
          id: string
          user_id: string
        }
        Insert: {
          badge_key: string
          earned_at?: string
          id?: string
          user_id: string
        }
        Update: {
          badge_key?: string
          earned_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      user_exercise_attempts: {
        Row: {
          ai_feedback: string | null
          correct_answer: string | null
          created_at: string
          exercise_id: string
          id: string
          is_correct: boolean
          score: number
          user_answer: string
          user_id: string
          xp_awarded: number
        }
        Insert: {
          ai_feedback?: string | null
          correct_answer?: string | null
          created_at?: string
          exercise_id: string
          id?: string
          is_correct?: boolean
          score?: number
          user_answer: string
          user_id: string
          xp_awarded?: number
        }
        Update: {
          ai_feedback?: string | null
          correct_answer?: string | null
          created_at?: string
          exercise_id?: string
          id?: string
          is_correct?: boolean
          score?: number
          user_answer?: string
          user_id?: string
          xp_awarded?: number
        }
        Relationships: []
      }
      user_lesson_progress: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          lesson_id: string
          status: string
          updated_at: string
          user_id: string
          xp_earned: number
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          lesson_id: string
          status?: string
          updated_at?: string
          user_id: string
          xp_earned?: number
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          lesson_id?: string
          status?: string
          updated_at?: string
          user_id?: string
          xp_earned?: number
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
      user_stats: {
        Row: {
          created_at: string
          current_streak: number
          hearts: number
          hearts_refill_at: string | null
          last_activity_date: string | null
          league: string
          longest_streak: number
          total_xp: number
          updated_at: string
          user_id: string
          weekly_reset_at: string
          weekly_xp: number
        }
        Insert: {
          created_at?: string
          current_streak?: number
          hearts?: number
          hearts_refill_at?: string | null
          last_activity_date?: string | null
          league?: string
          longest_streak?: number
          total_xp?: number
          updated_at?: string
          user_id: string
          weekly_reset_at?: string
          weekly_xp?: number
        }
        Update: {
          created_at?: string
          current_streak?: number
          hearts?: number
          hearts_refill_at?: string | null
          last_activity_date?: string | null
          league?: string
          longest_streak?: number
          total_xp?: number
          updated_at?: string
          user_id?: string
          weekly_reset_at?: string
          weekly_xp?: number
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
      teacher_has_book_access: {
        Args: { _book_id: string; _user_id: string }
        Returns: boolean
      }
      teacher_has_course_access: {
        Args: { _course_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "student" | "teacher"
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
      app_role: ["admin", "student", "teacher"],
    },
  },
} as const
