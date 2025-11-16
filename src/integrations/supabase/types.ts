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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string
          name: string
          created_at: string | null
          plan: string | null
          plan_status: string | null
          owner_id: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          stripe_price_id: string | null
          current_period_end: string | null
          canceled_at: string | null
          updated_at: string | null
          // Branding & Routing
          brand_color?: string | null
          logo_url?: string | null
          slug?: string | null
          custom_domain?: string | null
          custom_domain_status?: string | null
          // SSO & SCIM
          sso_google_enabled?: boolean | null
          sso_azure_enabled?: boolean | null
          scim_status?: string | null
          scim_provisioning_token?: string | null
          scim_last_sync_at?: string | null
          // GRC settings
          risk_appetite_threshold?: number | null
          disabled_framework_ids?: string[] | null
        }
        Insert: {
          id?: string
          name: string
          created_at?: string | null
          plan?: string | null
          plan_status?: string | null
          owner_id?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          stripe_price_id?: string | null
          current_period_end?: string | null
          canceled_at?: string | null
          updated_at?: string | null
          // Branding & Routing
          brand_color?: string | null
          logo_url?: string | null
          slug?: string | null
          custom_domain?: string | null
          custom_domain_status?: string | null
          // SSO & SCIM
          sso_google_enabled?: boolean | null
          sso_azure_enabled?: boolean | null
          scim_status?: string | null
          scim_provisioning_token?: string | null
          scim_last_sync_at?: string | null
          // GRC settings
          risk_appetite_threshold?: number | null
          disabled_framework_ids?: string[] | null
        }
        Update: {
          id?: string
          name?: string
          created_at?: string | null
          plan?: string | null
          plan_status?: string | null
          owner_id?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          stripe_price_id?: string | null
          current_period_end?: string | null
          canceled_at?: string | null
          updated_at?: string | null
          // Branding & Routing
          brand_color?: string | null
          logo_url?: string | null
          slug?: string | null
          custom_domain?: string | null
          custom_domain_status?: string | null
          // SSO & SCIM
          sso_google_enabled?: boolean | null
          sso_azure_enabled?: boolean | null
          scim_status?: string | null
          scim_provisioning_token?: string | null
          scim_last_sync_at?: string | null
          // GRC settings
          risk_appetite_threshold?: number | null
          disabled_framework_ids?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "organizations_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      },
      controls: {
        Row: {
          code: string | null
          description: string | null
          evidence_url: string | null
          framework_id: string | null
          id: string
          status: string | null
          updated_at: string | null
          org_id?: string | null
        }
        Insert: {
          code?: string | null
          description?: string | null
          evidence_url?: string | null
          framework_id?: string | null
          id?: string
          status?: string | null
          updated_at?: string | null
          org_id?: string | null
        }
        Update: {
          code?: string | null
          description?: string | null
          evidence_url?: string | null
          framework_id?: string | null
          id?: string
          status?: string | null
          updated_at?: string | null
          org_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "controls_framework_id_fkey"
            columns: ["framework_id"]
            isOneToOne: false
            referencedRelation: "frameworks"
            referencedColumns: ["id"]
          },
        ]
      }
      frameworks: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
          org_id?: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          org_id?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          org_id?: string | null
        }
        Relationships: []
      }
      policies: {
        Row: {
          created_at: string | null
          file_url: string | null
          id: string
          name: string
          owner: string | null
          review_date: string | null
          status: string | null
          version: string | null
          org_id?: string | null
        }
        Insert: {
          created_at?: string | null
          file_url?: string | null
          id?: string
          name: string
          owner?: string | null
          review_date?: string | null
          status?: string | null
          version?: string | null
          org_id?: string | null
        }
        Update: {
          created_at?: string | null
          file_url?: string | null
          id?: string
          name?: string
          owner?: string | null
          review_date?: string | null
          status?: string | null
          version?: string | null
          org_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "policies_owner_fkey"
            columns: ["owner"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      policy_files: {
        Row: {
          id: string
          policy_id: string
          file_name: string | null
          file_type: string | null
          file_url: string | null
          storage_path: string | null
          size: number | null
          status: string | null
          uploaded_by: string | null
          uploaded_at: string | null
          updated_at: string | null
          hash_sha256?: string | null
          scan_status?: string | null
          org_id?: string | null
        }
        Insert: {
          id?: string
          policy_id: string
          file_name?: string | null
          file_type?: string | null
          file_url?: string | null
          storage_path?: string | null
          size?: number | null
          status?: string | null
          uploaded_by?: string | null
          uploaded_at?: string | null
          updated_at?: string | null
          hash_sha256?: string | null
          scan_status?: string | null
          org_id?: string | null
        }
        Update: {
          id?: string
          policy_id?: string
          file_name?: string | null
          file_type?: string | null
          file_url?: string | null
          storage_path?: string | null
          size?: number | null
          status?: string | null
          uploaded_by?: string | null
          uploaded_at?: string | null
          updated_at?: string | null
          hash_sha256?: string | null
          scan_status?: string | null
          org_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "policy_files_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "policies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "policy_files_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      policy_versions: {
        Row: {
          id: string
          policy_id: string
          version: string
          change_summary: string | null
          created_at: string | null
          org_id?: string | null
        }
        Insert: {
          id?: string
          policy_id: string
          version: string
          change_summary?: string | null
          created_at?: string | null
          org_id?: string | null
        }
        Update: {
          id?: string
          policy_id?: string
          version?: string
          change_summary?: string | null
          created_at?: string | null
          org_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "policy_versions_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "policies"
            referencedColumns: ["id"]
          },
        ]
      }
      policy_controls: {
        Row: {
          policy_id: string
          control_id: string
          created_at: string | null
          org_id?: string | null
        }
        Insert: {
          policy_id: string
          control_id: string
          created_at?: string | null
          org_id?: string | null
        }
        Update: {
          policy_id?: string
          control_id?: string
          created_at?: string | null
          org_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "policy_controls_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "policies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "policy_controls_control_id_fkey"
            columns: ["control_id"]
            isOneToOne: false
            referencedRelation: "controls"
            referencedColumns: ["id"]
          },
        ]
      }
      policy_exceptions: {
        Row: {
          id: string
          policy_id: string
          requester_id: string | null
          approver_id: string | null
          scope: string | null
          title: string | null
          expiry_date: string | null
          status: string | null
          created_at: string | null
          org_id?: string | null
        }
        Insert: {
          id?: string
          policy_id: string
          requester_id?: string | null
          approver_id?: string | null
          scope?: string | null
          title?: string | null
          expiry_date?: string | null
          status?: string | null
          created_at?: string | null
          org_id?: string | null
        }
        Update: {
          id?: string
          policy_id?: string
          requester_id?: string | null
          approver_id?: string | null
          scope?: string | null
          title?: string | null
          expiry_date?: string | null
          status?: string | null
          created_at?: string | null
          org_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "policy_exceptions_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "policies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "policy_exceptions_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "policy_exceptions_approver_id_fkey"
            columns: ["approver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      policy_approvals: {
        Row: {
          id: string
          policy_id: string
          approver_id: string | null
          comment: string | null
          status: string | null
          approved_at: string | null
          created_at: string | null
          org_id?: string | null
        }
        Insert: {
          id?: string
          policy_id: string
          approver_id?: string | null
          comment?: string | null
          status?: string | null
          approved_at?: string | null
          created_at?: string | null
          org_id?: string | null
        }
        Update: {
          id?: string
          policy_id?: string
          approver_id?: string | null
          comment?: string | null
          status?: string | null
          approved_at?: string | null
          created_at?: string | null
          org_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "policy_approvals_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "policies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "policy_approvals_approver_id_fkey"
            columns: ["approver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      control_evidences: {
        Row: {
          id: string
          control_id: string
          file_url: string | null
          storage_path: string | null
          version: string | null
          status: string | null
          uploaded_by: string | null
          uploaded_at: string | null
          reviewed_by: string | null
          reviewed_at: string | null
          expires_at: string | null
          updated_at: string | null
          org_id?: string | null
        }
        Insert: {
          id?: string
          control_id: string
          file_url?: string | null
          storage_path?: string | null
          version?: string | null
          status?: string | null
          uploaded_by?: string | null
          uploaded_at?: string | null
          reviewed_by?: string | null
          reviewed_at?: string | null
          expires_at?: string | null
          updated_at?: string | null
          org_id?: string | null
        }
        Update: {
          id?: string
          control_id?: string
          file_url?: string | null
          storage_path?: string | null
          version?: string | null
          status?: string | null
          uploaded_by?: string | null
          uploaded_at?: string | null
          reviewed_by?: string | null
          reviewed_at?: string | null
          expires_at?: string | null
          updated_at?: string | null
          org_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "control_evidences_control_id_fkey"
            columns: ["control_id"]
            isOneToOne: false
            referencedRelation: "controls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "control_evidences_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "control_evidences_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      control_tests: {
        Row: {
          id: string
          control_id: string
          period_start: string | null
          period_end: string | null
          sample_size: number | null
          exceptions_found: number | null
          conclusion: string | null
          tested_by: string | null
          created_at: string | null
          org_id?: string | null
        }
        Insert: {
          id?: string
          control_id: string
          period_start?: string | null
          period_end?: string | null
          sample_size?: number | null
          exceptions_found?: number | null
          conclusion?: string | null
          tested_by?: string | null
          created_at?: string | null
          org_id?: string | null
        }
        Update: {
          id?: string
          control_id?: string
          period_start?: string | null
          period_end?: string | null
          sample_size?: number | null
          exceptions_found?: number | null
          conclusion?: string | null
          tested_by?: string | null
          created_at?: string | null
          org_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "control_tests_control_id_fkey"
            columns: ["control_id"]
            isOneToOne: false
            referencedRelation: "controls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "control_tests_tested_by_fkey"
            columns: ["tested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          role: string | null
          org_id?: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          role?: string | null
          org_id?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          role?: string | null
          org_id?: string | null
        }
        Relationships: []
      }
      risks: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          impact: number | null
          likelihood: number | null
          owner: string | null
          inherent_likelihood: number | null
          inherent_impact: number | null
          category: string | null
          cause: string | null
          consequence: string | null
          affected_asset: string | null
          department: string | null
          next_review_date: string | null
          delegate_owner: string | null
          last_reviewed_at: string | null
          acceptance_status: string | null
          acceptance_approver: string | null
          acceptance_rationale: string | null
          acceptance_expiry: string | null
          acceptance_requested_at: string | null
          acceptance_decided_at: string | null
          acceptance_requester?: string | null
          score: number | null
          status: string | null
          title: string
          updated_at: string | null
          org_id?: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          impact?: number | null
          likelihood?: number | null
          owner?: string | null
          inherent_likelihood?: number | null
          inherent_impact?: number | null
          category?: string | null
          cause?: string | null
          consequence?: string | null
          affected_asset?: string | null
          department?: string | null
          next_review_date?: string | null
          delegate_owner?: string | null
          last_reviewed_at?: string | null
          acceptance_status?: string | null
          acceptance_approver?: string | null
          acceptance_rationale?: string | null
          acceptance_expiry?: string | null
          acceptance_requested_at?: string | null
          acceptance_decided_at?: string | null
          acceptance_requester?: string | null
          score?: number | null
          status?: string | null
          title: string
          updated_at?: string | null
          org_id?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          impact?: number | null
          likelihood?: number | null
          owner?: string | null
          inherent_likelihood?: number | null
          inherent_impact?: number | null
          category?: string | null
          cause?: string | null
          consequence?: string | null
          affected_asset?: string | null
          department?: string | null
          next_review_date?: string | null
          delegate_owner?: string | null
          last_reviewed_at?: string | null
          acceptance_status?: string | null
          acceptance_approver?: string | null
          acceptance_rationale?: string | null
          acceptance_expiry?: string | null
          acceptance_requested_at?: string | null
          acceptance_decided_at?: string | null
          score?: number | null
          status?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "risks_owner_fkey"
            columns: ["owner"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      risk_controls: {
        Row: {
          risk_id: string
          control_id: string
          created_at: string | null
          org_id?: string | null
        }
        Insert: {
          risk_id: string
          control_id: string
          created_at?: string | null
          org_id?: string | null
        }
        Update: {
          risk_id?: string
          control_id?: string
          created_at?: string | null
          org_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "risk_controls_risk_id_fkey"
            columns: ["risk_id"]
            isOneToOne: false
            referencedRelation: "risks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "risk_controls_control_id_fkey"
            columns: ["control_id"]
            isOneToOne: false
            referencedRelation: "controls"
            referencedColumns: ["id"]
          },
        ]
      }
      risk_policies: {
        Row: {
          risk_id: string
          policy_id: string
          created_at: string | null
          org_id?: string | null
        }
        Insert: {
          risk_id: string
          policy_id: string
          created_at?: string | null
          org_id?: string | null
        }
        Update: {
          risk_id?: string
          policy_id?: string
          created_at?: string | null
          org_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "risk_policies_risk_id_fkey"
            columns: ["risk_id"]
            isOneToOne: false
            referencedRelation: "risks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "risk_policies_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "policies"
            referencedColumns: ["id"]
          },
        ]
      }
      findings: {
        Row: {
          id: string
          title: string
          description: string | null
          severity: string | null
          status: string | null
          risk_id: string | null
          created_at: string | null
          owner?: string | null
          sla_due_date?: string | null
          org_id?: string | null
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          severity?: string | null
          status?: string | null
          risk_id?: string | null
          created_at?: string | null
          owner?: string | null
          sla_due_date?: string | null
          org_id?: string | null
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          severity?: string | null
          status?: string | null
          risk_id?: string | null
          created_at?: string | null
          owner?: string | null
          sla_due_date?: string | null
          org_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "findings_risk_id_fkey"
            columns: ["risk_id"]
            isOneToOne: false
            referencedRelation: "risks"
            referencedColumns: ["id"]
          },
        ]
      }
      risk_acceptance_logs: {
        Row: {
          id: string
          risk_id: string
          actor: string | null
          action: string
          rationale: string | null
          expiry: string | null
          created_at: string | null
          org_id?: string | null
        }
        Insert: {
          id?: string
          risk_id: string
          actor?: string | null
          action: string
          rationale?: string | null
          expiry?: string | null
          created_at?: string | null
          org_id?: string | null
        }
        Update: {
          id?: string
          risk_id?: string
          actor?: string | null
          action?: string
          rationale?: string | null
          expiry?: string | null
          created_at?: string | null
          org_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "risk_acceptance_logs_risk_id_fkey"
            columns: ["risk_id"]
            isOneToOne: false
            referencedRelation: "risks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "risk_acceptance_logs_actor_fkey"
            columns: ["actor"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          assigned_to: string | null
          created_at: string | null
          due_date: string | null
          id: string
          related_id: string | null
          related_type: string | null
          status: string | null
          title: string
          org_id?: string | null
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string | null
          due_date?: string | null
          id?: string
          related_id?: string | null
          related_type?: string | null
          status?: string | null
          title: string
          org_id?: string | null
        }
        Update: {
          assigned_to?: string | null
          created_at?: string | null
          due_date?: string | null
          id?: string
          related_id?: string | null
          related_type?: string | null
          status?: string | null
          title?: string
          org_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      treatment_plans: {
        Row: {
          action_title: string
          action_type: string | null
          cost_estimate: number | null
          created_at: string | null
          description: string | null
          due_date: string | null
          evidence_url: string | null
          id: string
          responsible_user: string | null
          risk_id: string | null
          status: string | null
          org_id?: string | null
        }
        Insert: {
          action_title: string
          action_type?: string | null
          cost_estimate?: number | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          evidence_url?: string | null
          id?: string
          responsible_user?: string | null
          risk_id?: string | null
          status?: string | null
          org_id?: string | null
        }
        Update: {
          action_title?: string
          action_type?: string | null
          cost_estimate?: number | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          evidence_url?: string | null
          id?: string
          responsible_user?: string | null
          risk_id?: string | null
          status?: string | null
          org_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "treatment_plans_responsible_user_fkey"
            columns: ["responsible_user"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treatment_plans_risk_id_fkey"
            columns: ["risk_id"]
            isOneToOne: false
            referencedRelation: "risks"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
