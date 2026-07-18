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
      automation_queue: {
        Row: {
          attempts: number
          created_at: string
          id: string
          idempotency_key: string | null
          last_error: string | null
          locked_at: string | null
          max_attempts: number
          payload: Json
          scheduled_at: string
          status: string
          trigger_event: string | null
          updated_at: string
          workflow_key: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          id?: string
          idempotency_key?: string | null
          last_error?: string | null
          locked_at?: string | null
          max_attempts?: number
          payload?: Json
          scheduled_at?: string
          status?: string
          trigger_event?: string | null
          updated_at?: string
          workflow_key: string
        }
        Update: {
          attempts?: number
          created_at?: string
          id?: string
          idempotency_key?: string | null
          last_error?: string | null
          locked_at?: string | null
          max_attempts?: number
          payload?: Json
          scheduled_at?: string
          status?: string
          trigger_event?: string | null
          updated_at?: string
          workflow_key?: string
        }
        Relationships: []
      }
      automation_runs: {
        Row: {
          actor_id: string | null
          created_at: string
          duration_ms: number | null
          error: string | null
          finished_at: string | null
          id: string
          payload: Json
          started_at: string | null
          status: string
          trigger_event: string | null
          updated_at: string
          workflow_id: string | null
          workflow_key: string
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          duration_ms?: number | null
          error?: string | null
          finished_at?: string | null
          id?: string
          payload?: Json
          started_at?: string | null
          status?: string
          trigger_event?: string | null
          updated_at?: string
          workflow_id?: string | null
          workflow_key: string
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          duration_ms?: number | null
          error?: string | null
          finished_at?: string | null
          id?: string
          payload?: Json
          started_at?: string | null
          status?: string
          trigger_event?: string | null
          updated_at?: string
          workflow_id?: string | null
          workflow_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "automation_runs_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "automation_workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_steps: {
        Row: {
          created_at: string
          duration_ms: number | null
          error: string | null
          finished_at: string | null
          id: string
          input: Json | null
          name: string
          output: Json | null
          run_id: string
          started_at: string | null
          status: string
          step_index: number
        }
        Insert: {
          created_at?: string
          duration_ms?: number | null
          error?: string | null
          finished_at?: string | null
          id?: string
          input?: Json | null
          name: string
          output?: Json | null
          run_id: string
          started_at?: string | null
          status?: string
          step_index: number
        }
        Update: {
          created_at?: string
          duration_ms?: number | null
          error?: string | null
          finished_at?: string | null
          id?: string
          input?: Json | null
          name?: string
          output?: Json | null
          run_id?: string
          started_at?: string | null
          status?: string
          step_index?: number
        }
        Relationships: [
          {
            foreignKeyName: "automation_steps_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "automation_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_workflows: {
        Row: {
          created_at: string
          definition: Json
          description: string | null
          enabled: boolean
          id: string
          key: string
          name: string
          trigger_event: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          definition?: Json
          description?: string | null
          enabled?: boolean
          id?: string
          key: string
          name: string
          trigger_event: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          definition?: Json
          description?: string | null
          enabled?: boolean
          id?: string
          key?: string
          name?: string
          trigger_event?: string
          updated_at?: string
        }
        Relationships: []
      }
      backup_integrity_snapshots: {
        Row: {
          captured_at: string
          checksum: string
          id: string
          row_count: number
          run_id: string
          table_name: string
        }
        Insert: {
          captured_at?: string
          checksum: string
          id?: string
          row_count: number
          run_id: string
          table_name: string
        }
        Update: {
          captured_at?: string
          checksum?: string
          id?: string
          row_count?: number
          run_id?: string
          table_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "backup_integrity_snapshots_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "backup_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      backup_runs: {
        Row: {
          created_at: string
          duration_ms: number | null
          error: string | null
          finished_at: string | null
          id: string
          kind: string
          started_at: string
          status: string
          summary: Json
        }
        Insert: {
          created_at?: string
          duration_ms?: number | null
          error?: string | null
          finished_at?: string | null
          id?: string
          kind: string
          started_at?: string
          status: string
          summary?: Json
        }
        Update: {
          created_at?: string
          duration_ms?: number | null
          error?: string | null
          finished_at?: string | null
          id?: string
          kind?: string
          started_at?: string
          status?: string
          summary?: Json
        }
        Relationships: []
      }
      blog_categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          seo_description: string | null
          seo_title: string | null
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          seo_description?: string | null
          seo_title?: string | null
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          seo_description?: string | null
          seo_title?: string | null
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      blog_comments: {
        Row: {
          author_email: string
          author_name: string
          content: string
          created_at: string
          id: string
          parent_id: string | null
          post_id: string
          status: Database["public"]["Enums"]["blog_comment_status"]
          updated_at: string
        }
        Insert: {
          author_email: string
          author_name: string
          content: string
          created_at?: string
          id?: string
          parent_id?: string | null
          post_id: string
          status?: Database["public"]["Enums"]["blog_comment_status"]
          updated_at?: string
        }
        Update: {
          author_email?: string
          author_name?: string
          content?: string
          created_at?: string
          id?: string
          parent_id?: string | null
          post_id?: string
          status?: Database["public"]["Enums"]["blog_comment_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "blog_comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "blog_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blog_comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "blog_comments_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blog_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "blog_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_post_images: {
        Row: {
          alt: string | null
          created_at: string
          id: string
          post_id: string
          sort_order: number
          url: string
        }
        Insert: {
          alt?: string | null
          created_at?: string
          id?: string
          post_id: string
          sort_order?: number
          url: string
        }
        Update: {
          alt?: string | null
          created_at?: string
          id?: string
          post_id?: string
          sort_order?: number
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "blog_post_images_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "blog_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_post_tags: {
        Row: {
          post_id: string
          tag_id: string
        }
        Insert: {
          post_id: string
          tag_id: string
        }
        Update: {
          post_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "blog_post_tags_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "blog_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blog_post_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "blog_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_posts: {
        Row: {
          ai_generated: boolean
          ai_prompt: string | null
          author_id: string | null
          author_name: string | null
          canonical_url: string | null
          category_id: string | null
          comments_enabled: boolean
          content_html: string
          content_json: Json
          cover_image_alt: string | null
          cover_image_url: string | null
          created_at: string
          excerpt: string | null
          id: string
          locale: string
          noindex: boolean
          og_image_url: string | null
          published_at: string | null
          reading_time_min: number
          scheduled_at: string | null
          seo_description: string | null
          seo_title: string | null
          slug: string
          status: Database["public"]["Enums"]["blog_post_status"]
          title: string
          translation_of: string | null
          twitter_card: string
          updated_at: string
          view_count: number
        }
        Insert: {
          ai_generated?: boolean
          ai_prompt?: string | null
          author_id?: string | null
          author_name?: string | null
          canonical_url?: string | null
          category_id?: string | null
          comments_enabled?: boolean
          content_html?: string
          content_json?: Json
          cover_image_alt?: string | null
          cover_image_url?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          locale?: string
          noindex?: boolean
          og_image_url?: string | null
          published_at?: string | null
          reading_time_min?: number
          scheduled_at?: string | null
          seo_description?: string | null
          seo_title?: string | null
          slug: string
          status?: Database["public"]["Enums"]["blog_post_status"]
          title: string
          translation_of?: string | null
          twitter_card?: string
          updated_at?: string
          view_count?: number
        }
        Update: {
          ai_generated?: boolean
          ai_prompt?: string | null
          author_id?: string | null
          author_name?: string | null
          canonical_url?: string | null
          category_id?: string | null
          comments_enabled?: boolean
          content_html?: string
          content_json?: Json
          cover_image_alt?: string | null
          cover_image_url?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          locale?: string
          noindex?: boolean
          og_image_url?: string | null
          published_at?: string | null
          reading_time_min?: number
          scheduled_at?: string | null
          seo_description?: string | null
          seo_title?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["blog_post_status"]
          title?: string
          translation_of?: string | null
          twitter_card?: string
          updated_at?: string
          view_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "blog_posts_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "blog_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blog_posts_translation_of_fkey"
            columns: ["translation_of"]
            isOneToOne: false
            referencedRelation: "blog_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_settings: {
        Row: {
          comments_globally_enabled: boolean
          created_at: string
          id: number
          updated_at: string
        }
        Insert: {
          comments_globally_enabled?: boolean
          created_at?: string
          id?: number
          updated_at?: string
        }
        Update: {
          comments_globally_enabled?: boolean
          created_at?: string
          id?: number
          updated_at?: string
        }
        Relationships: []
      }
      blog_tags: {
        Row: {
          created_at: string
          id: string
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      client_portal_login_attempts: {
        Row: {
          created_at: string
          email: string
          id: string
          ip: string | null
          success: boolean
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          ip?: string | null
          success?: boolean
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          ip?: string | null
          success?: boolean
        }
        Relationships: []
      }
      client_portal_otps: {
        Row: {
          attempts: number
          code_hash: string
          created_at: string
          email: string
          expires_at: string
          id: string
          ip: string | null
          used_at: string | null
        }
        Insert: {
          attempts?: number
          code_hash: string
          created_at?: string
          email: string
          expires_at: string
          id?: string
          ip?: string | null
          used_at?: string | null
        }
        Update: {
          attempts?: number
          code_hash?: string
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          ip?: string | null
          used_at?: string | null
        }
        Relationships: []
      }
      client_portal_password_resets: {
        Row: {
          created_at: string
          customer_id: string
          email: string
          expires_at: string
          id: string
          ip: string | null
          token_hash: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          customer_id: string
          email: string
          expires_at: string
          id?: string
          ip?: string | null
          token_hash: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          customer_id?: string
          email?: string
          expires_at?: string
          id?: string
          ip?: string | null
          token_hash?: string
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_portal_password_resets_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      client_portal_sessions: {
        Row: {
          created_at: string
          customer_id: string
          email: string
          expires_at: string
          id: string
          ip: string | null
          last_seen_at: string
          revoked_at: string | null
          token_hash: string
          user_agent: string | null
        }
        Insert: {
          created_at?: string
          customer_id: string
          email: string
          expires_at: string
          id?: string
          ip?: string | null
          last_seen_at?: string
          revoked_at?: string | null
          token_hash: string
          user_agent?: string | null
        }
        Update: {
          created_at?: string
          customer_id?: string
          email?: string
          expires_at?: string
          id?: string
          ip?: string | null
          last_seen_at?: string
          revoked_at?: string | null
          token_hash?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_portal_sessions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_events: {
        Row: {
          actor_id: string | null
          created_at: string
          customer_id: string
          id: string
          payload: Json
          type: string
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          customer_id: string
          id?: string
          payload?: Json
          type: string
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          customer_id?: string
          id?: string
          payload?: Json
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_events_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          country: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          metadata: Json
          notes: string | null
          password_hash: string | null
          password_updated_at: string | null
          phone: string | null
          status: string
          updated_at: string
        }
        Insert: {
          country?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id?: string
          metadata?: Json
          notes?: string | null
          password_hash?: string | null
          password_updated_at?: string | null
          phone?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          country?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          metadata?: Json
          notes?: string | null
          password_hash?: string | null
          password_updated_at?: string | null
          phone?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      delivery_logs: {
        Row: {
          admin_id: string | null
          channel: string
          content: string
          created_at: string
          customer_id: string | null
          error: string | null
          id: string
          order_id: string | null
          recipient: string | null
          status: string
          subject: string | null
          template_id: string | null
        }
        Insert: {
          admin_id?: string | null
          channel: string
          content: string
          created_at?: string
          customer_id?: string | null
          error?: string | null
          id?: string
          order_id?: string | null
          recipient?: string | null
          status: string
          subject?: string | null
          template_id?: string | null
        }
        Update: {
          admin_id?: string | null
          channel?: string
          content?: string
          created_at?: string
          customer_id?: string | null
          error?: string | null
          id?: string
          order_id?: string | null
          recipient?: string | null
          status?: string
          subject?: string | null
          template_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "delivery_logs_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_logs_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      gallery_items: {
        Row: {
          active: boolean
          availability: string
          brand: string | null
          created_at: string
          currency: string
          description: string | null
          external_url: string | null
          id: string
          image_source: string
          image_url: string
          link_type: string
          plan_slug: string | null
          price: number | null
          product_slug: string | null
          rating_avg: number | null
          rating_count: number | null
          rating_enabled: boolean
          sku: string | null
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          availability?: string
          brand?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          external_url?: string | null
          id?: string
          image_source?: string
          image_url: string
          link_type?: string
          plan_slug?: string | null
          price?: number | null
          product_slug?: string | null
          rating_avg?: number | null
          rating_count?: number | null
          rating_enabled?: boolean
          sku?: string | null
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          availability?: string
          brand?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          external_url?: string | null
          id?: string
          image_source?: string
          image_url?: string
          link_type?: string
          plan_slug?: string | null
          price?: number | null
          product_slug?: string | null
          rating_avg?: number | null
          rating_count?: number | null
          rating_enabled?: boolean
          sku?: string | null
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      integration_debug_logs: {
        Row: {
          actor_id: string | null
          attempts: number | null
          connector_id: string
          created_at: string
          duration_ms: number | null
          error: string | null
          id: string
          method: string
          ok: boolean
          operation: string | null
          request_body: Json | null
          request_headers: Json
          response_body: Json | null
          response_headers: Json
          status: number | null
          url: string
        }
        Insert: {
          actor_id?: string | null
          attempts?: number | null
          connector_id: string
          created_at?: string
          duration_ms?: number | null
          error?: string | null
          id?: string
          method: string
          ok?: boolean
          operation?: string | null
          request_body?: Json | null
          request_headers?: Json
          response_body?: Json | null
          response_headers?: Json
          status?: number | null
          url: string
        }
        Update: {
          actor_id?: string | null
          attempts?: number | null
          connector_id?: string
          created_at?: string
          duration_ms?: number | null
          error?: string | null
          id?: string
          method?: string
          ok?: boolean
          operation?: string | null
          request_body?: Json | null
          request_headers?: Json
          response_body?: Json | null
          response_headers?: Json
          status?: number | null
          url?: string
        }
        Relationships: []
      }
      iptv_accounts: {
        Row: {
          account_type: Database["public"]["Enums"]["iptv_account_type"]
          admin_enabled: boolean | null
          admin_notes: string | null
          assigned_at: string | null
          bouquet: string | null
          code: string | null
          created_at: string
          customer_id: string | null
          dns_link: string | null
          dns_link_samsung_lg: string | null
          enabled: boolean | null
          expires_at: string | null
          forced_country: string | null
          id: string
          import_batch_id: string | null
          imported_at: string | null
          last_ip: string | null
          last_login: string | null
          mac: string | null
          mac_address: string | null
          max_connections: number | null
          megaott_subscription_id: string | null
          metadata: Json
          notes: string | null
          order_id: string | null
          owner: string | null
          package: string | null
          paid: boolean | null
          password: string | null
          portal_link: string | null
          provider_id: string | null
          reseller_notes: string | null
          source_created_at: string | null
          status: Database["public"]["Enums"]["iptv_account_status"]
          trial: boolean | null
          updated_at: string
          username: string
        }
        Insert: {
          account_type?: Database["public"]["Enums"]["iptv_account_type"]
          admin_enabled?: boolean | null
          admin_notes?: string | null
          assigned_at?: string | null
          bouquet?: string | null
          code?: string | null
          created_at?: string
          customer_id?: string | null
          dns_link?: string | null
          dns_link_samsung_lg?: string | null
          enabled?: boolean | null
          expires_at?: string | null
          forced_country?: string | null
          id?: string
          import_batch_id?: string | null
          imported_at?: string | null
          last_ip?: string | null
          last_login?: string | null
          mac?: string | null
          mac_address?: string | null
          max_connections?: number | null
          megaott_subscription_id?: string | null
          metadata?: Json
          notes?: string | null
          order_id?: string | null
          owner?: string | null
          package?: string | null
          paid?: boolean | null
          password?: string | null
          portal_link?: string | null
          provider_id?: string | null
          reseller_notes?: string | null
          source_created_at?: string | null
          status?: Database["public"]["Enums"]["iptv_account_status"]
          trial?: boolean | null
          updated_at?: string
          username: string
        }
        Update: {
          account_type?: Database["public"]["Enums"]["iptv_account_type"]
          admin_enabled?: boolean | null
          admin_notes?: string | null
          assigned_at?: string | null
          bouquet?: string | null
          code?: string | null
          created_at?: string
          customer_id?: string | null
          dns_link?: string | null
          dns_link_samsung_lg?: string | null
          enabled?: boolean | null
          expires_at?: string | null
          forced_country?: string | null
          id?: string
          import_batch_id?: string | null
          imported_at?: string | null
          last_ip?: string | null
          last_login?: string | null
          mac?: string | null
          mac_address?: string | null
          max_connections?: number | null
          megaott_subscription_id?: string | null
          metadata?: Json
          notes?: string | null
          order_id?: string | null
          owner?: string | null
          package?: string | null
          paid?: boolean | null
          password?: string | null
          portal_link?: string | null
          provider_id?: string | null
          reseller_notes?: string | null
          source_created_at?: string | null
          status?: Database["public"]["Enums"]["iptv_account_status"]
          trial?: boolean | null
          updated_at?: string
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "iptv_accounts_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "iptv_accounts_import_batch_fk"
            columns: ["import_batch_id"]
            isOneToOne: false
            referencedRelation: "iptv_import_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "iptv_accounts_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "iptv_accounts_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "iptv_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      iptv_import_batches: {
        Row: {
          created_at: string
          error_count: number
          file_format: string
          filename: string
          id: string
          imported_by: string | null
          inserted_count: number
          mapping_snapshot: Json
          notes: string | null
          row_count: number
          skipped_count: number
          updated_at: string
          updated_count: number
        }
        Insert: {
          created_at?: string
          error_count?: number
          file_format: string
          filename: string
          id?: string
          imported_by?: string | null
          inserted_count?: number
          mapping_snapshot?: Json
          notes?: string | null
          row_count?: number
          skipped_count?: number
          updated_at?: string
          updated_count?: number
        }
        Update: {
          created_at?: string
          error_count?: number
          file_format?: string
          filename?: string
          id?: string
          imported_by?: string | null
          inserted_count?: number
          mapping_snapshot?: Json
          notes?: string | null
          row_count?: number
          skipped_count?: number
          updated_at?: string
          updated_count?: number
        }
        Relationships: []
      }
      iptv_import_mappings: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          is_default: boolean
          mapping: Json
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_default?: boolean
          mapping?: Json
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_default?: boolean
          mapping?: Json
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      iptv_lifecycle_events: {
        Row: {
          account_id: string
          actor: string
          created_at: string
          from_state: string | null
          id: string
          metadata: Json
          reason: string
          to_state: string
        }
        Insert: {
          account_id: string
          actor?: string
          created_at?: string
          from_state?: string | null
          id?: string
          metadata?: Json
          reason: string
          to_state: string
        }
        Update: {
          account_id?: string
          actor?: string
          created_at?: string
          from_state?: string | null
          id?: string
          metadata?: Json
          reason?: string
          to_state?: string
        }
        Relationships: []
      }
      iptv_logs: {
        Row: {
          account_id: string | null
          action: string
          actor_id: string | null
          created_at: string
          id: string
          message: string | null
          payload: Json
          provider_id: string | null
        }
        Insert: {
          account_id?: string | null
          action: string
          actor_id?: string | null
          created_at?: string
          id?: string
          message?: string | null
          payload?: Json
          provider_id?: string | null
        }
        Update: {
          account_id?: string | null
          action?: string
          actor_id?: string | null
          created_at?: string
          id?: string
          message?: string | null
          payload?: Json
          provider_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "iptv_logs_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "iptv_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "iptv_logs_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "iptv_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      iptv_providers: {
        Row: {
          api_key: string | null
          api_url: string | null
          created_at: string
          id: string
          is_default: boolean
          metadata: Json
          name: string
          panel_url: string | null
          password: string | null
          status: Database["public"]["Enums"]["iptv_provider_status"]
          updated_at: string
          username: string | null
        }
        Insert: {
          api_key?: string | null
          api_url?: string | null
          created_at?: string
          id?: string
          is_default?: boolean
          metadata?: Json
          name: string
          panel_url?: string | null
          password?: string | null
          status?: Database["public"]["Enums"]["iptv_provider_status"]
          updated_at?: string
          username?: string | null
        }
        Update: {
          api_key?: string | null
          api_url?: string | null
          created_at?: string
          id?: string
          is_default?: boolean
          metadata?: Json
          name?: string
          panel_url?: string | null
          password?: string | null
          status?: Database["public"]["Enums"]["iptv_provider_status"]
          updated_at?: string
          username?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          channel: string
          created_at: string
          error: string | null
          id: string
          payload: Json
          recipient: string
          sent_at: string | null
          status: string
          subject: string | null
        }
        Insert: {
          body?: string | null
          channel: string
          created_at?: string
          error?: string | null
          id?: string
          payload?: Json
          recipient: string
          sent_at?: string | null
          status?: string
          subject?: string | null
        }
        Update: {
          body?: string | null
          channel?: string
          created_at?: string
          error?: string | null
          id?: string
          payload?: Json
          recipient?: string
          sent_at?: string | null
          status?: string
          subject?: string | null
        }
        Relationships: []
      }
      orders: {
        Row: {
          admin_notes: string | null
          amount: number
          created_at: string
          credentials: Json | null
          currency: string
          customer_id: string | null
          email: string
          full_name: string
          id: string
          metadata: Json
          method: string
          order_ref: string
          payment_provider: string | null
          plan_id: string
          plan_name: string
          provider_reference: string | null
          sebpay_reference: string | null
          status: string
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          amount: number
          created_at?: string
          credentials?: Json | null
          currency?: string
          customer_id?: string | null
          email: string
          full_name: string
          id?: string
          metadata?: Json
          method?: string
          order_ref: string
          payment_provider?: string | null
          plan_id: string
          plan_name: string
          provider_reference?: string | null
          sebpay_reference?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          amount?: number
          created_at?: string
          credentials?: Json | null
          currency?: string
          customer_id?: string | null
          email?: string
          full_name?: string
          id?: string
          metadata?: Json
          method?: string
          order_ref?: string
          payment_provider?: string | null
          plan_id?: string
          plan_name?: string
          provider_reference?: string | null
          sebpay_reference?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_dunning_sent: {
        Row: {
          customer_id: string | null
          failed_at: string
          id: string
          milestone_days: number
          order_id: string
          sent_at: string
        }
        Insert: {
          customer_id?: string | null
          failed_at: string
          id?: string
          milestone_days: number
          order_id: string
          sent_at?: string
        }
        Update: {
          customer_id?: string | null
          failed_at?: string
          id?: string
          milestone_days?: number
          order_id?: string
          sent_at?: string
        }
        Relationships: []
      }
      plans: {
        Row: {
          active: boolean
          created_at: string
          currency: string
          features: Json
          id: string
          name: string
          period_label: string
          popular: boolean
          price: number
          save_label: string | null
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          currency?: string
          features?: Json
          id?: string
          name: string
          period_label: string
          popular?: boolean
          price: number
          save_label?: string | null
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          currency?: string
          features?: Json
          id?: string
          name?: string
          period_label?: string
          popular?: boolean
          price?: number
          save_label?: string | null
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      portal_announcements: {
        Row: {
          active: boolean
          body: string
          created_at: string
          id: string
          published_at: string
          severity: string
          title: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          body: string
          created_at?: string
          id?: string
          published_at?: string
          severity?: string
          title: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          body?: string
          created_at?: string
          id?: string
          published_at?: string
          severity?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          category: string
          created_at: string
          currency: string
          description: string | null
          id: string
          image_url: string | null
          metadata: Json
          name: string
          price: number
          sku: string
          status: string
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          image_url?: string | null
          metadata?: Json
          name: string
          price?: number
          sku: string
          status?: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          image_url?: string | null
          metadata?: Json
          name?: string
          price?: number
          sku?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      renewal_plans: {
        Row: {
          active: boolean
          created_at: string
          currency: string
          description: string | null
          duration_months: number
          id: string
          name: string
          price: number
          sort_order: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          currency?: string
          description?: string | null
          duration_months: number
          id?: string
          name: string
          price: number
          sort_order?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          currency?: string
          description?: string | null
          duration_months?: number
          id?: string
          name?: string
          price?: number
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      renewal_reminders_sent: {
        Row: {
          account_id: string
          expires_at: string
          id: string
          milestone_days: number
          sent_at: string
        }
        Insert: {
          account_id: string
          expires_at: string
          id?: string
          milestone_days: number
          sent_at?: string
        }
        Update: {
          account_id?: string
          expires_at?: string
          id?: string
          milestone_days?: number
          sent_at?: string
        }
        Relationships: []
      }
      secret_registry: {
        Row: {
          created_at: string
          criticality: string
          environment: string
          id: string
          last_rotated_at: string | null
          name: string
          next_rotation_at: string | null
          notes: string | null
          owner: string
          rotation_interval: string
          service: string
          updated_at: string
          vault_backed: boolean
        }
        Insert: {
          created_at?: string
          criticality: string
          environment?: string
          id?: string
          last_rotated_at?: string | null
          name: string
          next_rotation_at?: string | null
          notes?: string | null
          owner: string
          rotation_interval?: string
          service: string
          updated_at?: string
          vault_backed?: boolean
        }
        Update: {
          created_at?: string
          criticality?: string
          environment?: string
          id?: string
          last_rotated_at?: string | null
          name?: string
          next_rotation_at?: string | null
          notes?: string | null
          owner?: string
          rotation_interval?: string
          service?: string
          updated_at?: string
          vault_backed?: boolean
        }
        Relationships: []
      }
      security_events: {
        Row: {
          actor_email: string | null
          actor_user_id: string | null
          created_at: string
          event_type: string
          id: string
          ip: string | null
          message: string
          payload: Json
          request_id: string | null
          route: string | null
          severity: string
          target_user_id: string | null
          user_agent: string | null
        }
        Insert: {
          actor_email?: string | null
          actor_user_id?: string | null
          created_at?: string
          event_type: string
          id?: string
          ip?: string | null
          message: string
          payload?: Json
          request_id?: string | null
          route?: string | null
          severity?: string
          target_user_id?: string | null
          user_agent?: string | null
        }
        Update: {
          actor_email?: string | null
          actor_user_id?: string | null
          created_at?: string
          event_type?: string
          id?: string
          ip?: string | null
          message?: string
          payload?: Json
          request_id?: string | null
          route?: string | null
          severity?: string
          target_user_id?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          created_at: string
          customer_id: string
          expires_at: string | null
          id: string
          metadata: Json
          product_id: string | null
          renewed_at: string | null
          started_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          expires_at?: string | null
          id?: string
          metadata?: Json
          product_id?: string | null
          renewed_at?: string | null
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          expires_at?: string | null
          id?: string
          metadata?: Json
          product_id?: string | null
          renewed_at?: string | null
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      support_messages: {
        Row: {
          author_type: string
          author_user_id: string | null
          body: string
          created_at: string
          id: string
          ticket_id: string
        }
        Insert: {
          author_type: string
          author_user_id?: string | null
          body: string
          created_at?: string
          id?: string
          ticket_id: string
        }
        Update: {
          author_type?: string
          author_user_id?: string | null
          body?: string
          created_at?: string
          id?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          assigned_to: string | null
          created_at: string
          customer_id: string | null
          email: string
          id: string
          last_message_at: string
          priority: string
          status: string
          subject: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          customer_id?: string | null
          email: string
          id?: string
          last_message_at?: string
          priority?: string
          status?: string
          subject: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          customer_id?: string | null
          email?: string
          id?: string
          last_message_at?: string
          priority?: string
          status?: string
          subject?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      trials: {
        Row: {
          created_at: string
          customer_id: string
          expires_at: string | null
          id: string
          metadata: Json
          notes: string | null
          product_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          expires_at?: string | null
          id?: string
          metadata?: Json
          notes?: string | null
          product_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          expires_at?: string | null
          id?: string
          metadata?: Json
          notes?: string | null
          product_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "trials_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trials_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
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
    }
    Views: {
      billing_metrics_daily: {
        Row: {
          day: string | null
          dunning_sent: number | null
          reactivations: number | null
          reminders_sent: number | null
          suspensions: number | null
        }
        Relationships: []
      }
      blog_comments_public: {
        Row: {
          author_name: string | null
          content: string | null
          created_at: string | null
          id: string | null
          parent_id: string | null
          post_id: string | null
        }
        Insert: {
          author_name?: string | null
          content?: string | null
          created_at?: string | null
          id?: string | null
          parent_id?: string | null
          post_id?: string | null
        }
        Update: {
          author_name?: string | null
          content?: string | null
          created_at?: string | null
          id?: string | null
          parent_id?: string | null
          post_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "blog_comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "blog_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blog_comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "blog_comments_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blog_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "blog_posts"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      admin_change_role: {
        Args: {
          _action: string
          _actor_user_id: string
          _target_user_id: string
        }
        Returns: Json
      }
      automation_claim_jobs: {
        Args: { _batch_size?: number }
        Returns: {
          attempts: number
          id: string
          max_attempts: number
          payload: Json
          trigger_event: string
          workflow_key: string
        }[]
      }
      automation_reclaim_stuck: {
        Args: { _older_than_seconds?: number }
        Returns: number
      }
      backup_capture_integrity: { Args: { _run_id: string }; Returns: Json }
      backup_restore_drill: { Args: { _table: string }; Returns: Json }
      blog_publish_scheduled: { Args: never; Returns: number }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      email_queue_dispatch: { Args: never; Returns: undefined }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      secret_registry_scan: { Args: never; Returns: Json }
      verify_email_cron_secret: { Args: { _token: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "user"
      blog_comment_status: "pending" | "approved" | "spam" | "trash"
      blog_post_status: "draft" | "scheduled" | "published" | "archived"
      iptv_account_status:
        | "available"
        | "assigned"
        | "active"
        | "expired"
        | "suspended"
        | "reserved"
        | "delivered"
        | "disabled"
      iptv_account_type: "trial" | "premium"
      iptv_provider_status: "active" | "inactive" | "error"
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
      blog_comment_status: ["pending", "approved", "spam", "trash"],
      blog_post_status: ["draft", "scheduled", "published", "archived"],
      iptv_account_status: [
        "available",
        "assigned",
        "active",
        "expired",
        "suspended",
        "reserved",
        "delivered",
        "disabled",
      ],
      iptv_account_type: ["trial", "premium"],
      iptv_provider_status: ["active", "inactive", "error"],
    },
  },
} as const
