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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      account_sanctions: {
        Row: {
          created_at: string
          created_by: string | null
          ends_at: string | null
          id: string
          kind: string
          lifted_at: string | null
          lifted_by: string | null
          reason: string
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          ends_at?: string | null
          id?: string
          kind: string
          lifted_at?: string | null
          lifted_by?: string | null
          reason: string
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          ends_at?: string | null
          id?: string
          kind?: string
          lifted_at?: string | null
          lifted_by?: string | null
          reason?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "account_sanctions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "account_sanctions_lifted_by_fkey"
            columns: ["lifted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "account_sanctions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      activities: {
        Row: {
          actor_id: string
          book_id: string | null
          collection_id: string | null
          created_at: string
          id: string
          target_user_id: string | null
          type: string
        }
        Insert: {
          actor_id: string
          book_id?: string | null
          collection_id?: string | null
          created_at?: string
          id?: string
          target_user_id?: string | null
          type: string
        }
        Update: {
          actor_id?: string
          book_id?: string | null
          collection_id?: string | null
          created_at?: string
          id?: string
          target_user_id?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "activities_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_target_user_id_fkey"
            columns: ["target_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_audit_log: {
        Row: {
          action: string
          actor_id: string | null
          after: Json | null
          before: Json | null
          created_at: string
          id: string
          reason: string | null
          target_id: string | null
          target_type: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          after?: Json | null
          before?: Json | null
          created_at?: string
          id?: string
          reason?: string | null
          target_id?: string | null
          target_type: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          after?: Json | null
          before?: Json | null
          created_at?: string
          id?: string
          reason?: string | null
          target_id?: string | null
          target_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_audit_log_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      book_change_requests: {
        Row: {
          base_snapshot: Json
          book_id: string
          changes: Json
          created_at: string
          id: string
          reason: string
          review_note: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          target_book_id: string | null
          type: string
          user_id: string
        }
        Insert: {
          base_snapshot?: Json
          book_id: string
          changes?: Json
          created_at?: string
          id?: string
          reason: string
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          target_book_id?: string | null
          type: string
          user_id: string
        }
        Update: {
          base_snapshot?: Json
          book_id?: string
          changes?: Json
          created_at?: string
          id?: string
          reason?: string
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          target_book_id?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "book_change_requests_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "book_change_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "book_change_requests_target_book_id_fkey"
            columns: ["target_book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "book_change_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      books: {
        Row: {
          authors: string[]
          cover_color: string | null
          cover_style: string | null
          cover_url: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          description: string | null
          genres: string[]
          id: string
          isbn_10: string | null
          isbn_13: string | null
          language: string | null
          merged_into: string | null
          moderation_note: string | null
          moderation_status: string
          page_count: number | null
          published_year: number | null
          source: string
          source_id: string | null
          subtitle: string | null
          title: string
        }
        Insert: {
          authors?: string[]
          cover_color?: string | null
          cover_style?: string | null
          cover_url?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          genres?: string[]
          id?: string
          isbn_10?: string | null
          isbn_13?: string | null
          language?: string | null
          merged_into?: string | null
          moderation_note?: string | null
          moderation_status?: string
          page_count?: number | null
          published_year?: number | null
          source: string
          source_id?: string | null
          subtitle?: string | null
          title: string
        }
        Update: {
          authors?: string[]
          cover_color?: string | null
          cover_style?: string | null
          cover_url?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          genres?: string[]
          id?: string
          isbn_10?: string | null
          isbn_13?: string | null
          language?: string | null
          merged_into?: string | null
          moderation_note?: string | null
          moderation_status?: string
          page_count?: number | null
          published_year?: number | null
          source?: string
          source_id?: string | null
          subtitle?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "books_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "books_merged_into_fkey"
            columns: ["merged_into"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
        ]
      }
      collection_items: {
        Row: {
          added_at: string
          added_by: string | null
          book_id: string
          collection_id: string
          note: string | null
          position: string
        }
        Insert: {
          added_at?: string
          added_by?: string | null
          book_id: string
          collection_id: string
          note?: string | null
          position: string
        }
        Update: {
          added_at?: string
          added_by?: string | null
          book_id?: string
          collection_id?: string
          note?: string | null
          position?: string
        }
        Relationships: [
          {
            foreignKeyName: "collection_items_added_by_fkey"
            columns: ["added_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collection_items_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collection_items_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
        ]
      }
      collection_likes: {
        Row: {
          collection_id: string
          created_at: string
          user_id: string
        }
        Insert: {
          collection_id: string
          created_at?: string
          user_id: string
        }
        Update: {
          collection_id?: string
          created_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "collection_likes_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collection_likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      collection_members: {
        Row: {
          collection_id: string
          created_at: string
          role: string
          user_id: string
        }
        Insert: {
          collection_id: string
          created_at?: string
          role?: string
          user_id: string
        }
        Update: {
          collection_id?: string
          created_at?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "collection_members_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collection_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      collection_saves: {
        Row: {
          collection_id: string
          created_at: string
          user_id: string
        }
        Insert: {
          collection_id: string
          created_at?: string
          user_id: string
        }
        Update: {
          collection_id?: string
          created_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "collection_saves_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collection_saves_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      collections: {
        Row: {
          copied_from_id: string | null
          copied_from_owner_id: string | null
          created_at: string
          description: string | null
          emoji: string | null
          id: string
          is_collaborative: boolean
          owner_id: string
          title: string
          updated_at: string
          visibility: string
        }
        Insert: {
          copied_from_id?: string | null
          copied_from_owner_id?: string | null
          created_at?: string
          description?: string | null
          emoji?: string | null
          id?: string
          is_collaborative?: boolean
          owner_id: string
          title: string
          updated_at?: string
          visibility?: string
        }
        Update: {
          copied_from_id?: string | null
          copied_from_owner_id?: string | null
          created_at?: string
          description?: string | null
          emoji?: string | null
          id?: string
          is_collaborative?: boolean
          owner_id?: string
          title?: string
          updated_at?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "collections_copied_from_id_fkey"
            columns: ["copied_from_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collections_copied_from_owner_id_fkey"
            columns: ["copied_from_owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collections_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      content_reports: {
        Row: {
          created_at: string
          details: string | null
          id: string
          reason: string
          reporter_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          target_id: string
          target_type: string
        }
        Insert: {
          created_at?: string
          details?: string | null
          id?: string
          reason: string
          reporter_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          target_id: string
          target_type: string
        }
        Update: {
          created_at?: string
          details?: string | null
          id?: string
          reason?: string
          reporter_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          target_id?: string
          target_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_reports_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_suggestions: {
        Row: {
          author_id: string
          body: string
          category: string
          comment_count: number
          created_at: string
          deleted_at: string | null
          edited_at: string | null
          hidden_at: string | null
          id: string
          official_response: string | null
          responded_at: string | null
          responded_by: string | null
          status: string
          title: string
          vote_count: number
        }
        Insert: {
          author_id: string
          body: string
          category: string
          comment_count?: number
          created_at?: string
          deleted_at?: string | null
          edited_at?: string | null
          hidden_at?: string | null
          id?: string
          official_response?: string | null
          responded_at?: string | null
          responded_by?: string | null
          status?: string
          title: string
          vote_count?: number
        }
        Update: {
          author_id?: string
          body?: string
          category?: string
          comment_count?: number
          created_at?: string
          deleted_at?: string | null
          edited_at?: string | null
          hidden_at?: string | null
          id?: string
          official_response?: string | null
          responded_at?: string | null
          responded_by?: string | null
          status?: string
          title?: string
          vote_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "feature_suggestions_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feature_suggestions_responded_by_fkey"
            columns: ["responded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      follows: {
        Row: {
          created_at: string
          follower_id: string
          following_id: string
          status: string
        }
        Insert: {
          created_at?: string
          follower_id: string
          following_id: string
          status?: string
        }
        Update: {
          created_at?: string
          follower_id?: string
          following_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "follows_follower_id_fkey"
            columns: ["follower_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follows_following_id_fkey"
            columns: ["following_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      forum_categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          position: number
          slug: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          position?: number
          slug: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          position?: number
          slug?: string
        }
        Relationships: []
      }
      forum_reactions: {
        Row: {
          created_at: string
          kind: string
          reply_id: string | null
          topic_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          kind: string
          reply_id?: string | null
          topic_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          kind?: string
          reply_id?: string | null
          topic_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "forum_reactions_reply_id_fkey"
            columns: ["reply_id"]
            isOneToOne: false
            referencedRelation: "forum_replies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_reactions_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "forum_topics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      forum_replies: {
        Row: {
          author_id: string
          body: string
          created_at: string
          deleted_at: string | null
          edited_at: string | null
          hidden_at: string | null
          id: string
          like_count: number
          parent_id: string | null
          quoted_reply_id: string | null
          topic_id: string
          useful_count: number
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          deleted_at?: string | null
          edited_at?: string | null
          hidden_at?: string | null
          id?: string
          like_count?: number
          parent_id?: string | null
          quoted_reply_id?: string | null
          topic_id: string
          useful_count?: number
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          deleted_at?: string | null
          edited_at?: string | null
          hidden_at?: string | null
          id?: string
          like_count?: number
          parent_id?: string | null
          quoted_reply_id?: string | null
          topic_id?: string
          useful_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "forum_replies_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_replies_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "forum_replies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_replies_quoted_reply_id_fkey"
            columns: ["quoted_reply_id"]
            isOneToOne: false
            referencedRelation: "forum_replies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_replies_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "forum_topics"
            referencedColumns: ["id"]
          },
        ]
      }
      forum_subscriptions: {
        Row: {
          created_at: string
          topic_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          topic_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          topic_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "forum_subscriptions_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "forum_topics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      forum_topic_books: {
        Row: {
          book_id: string
          topic_id: string
        }
        Insert: {
          book_id: string
          topic_id: string
        }
        Update: {
          book_id?: string
          topic_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "forum_topic_books_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_topic_books_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "forum_topics"
            referencedColumns: ["id"]
          },
        ]
      }
      forum_topics: {
        Row: {
          author_id: string
          body: string
          category_id: string
          contains_spoilers: boolean
          created_at: string
          deleted_at: string | null
          edited_at: string | null
          hidden_at: string | null
          id: string
          last_activity_at: string
          like_count: number
          locked: boolean
          pinned: boolean
          reply_count: number
          tags: string[]
          title: string
          useful_count: number
        }
        Insert: {
          author_id: string
          body: string
          category_id: string
          contains_spoilers?: boolean
          created_at?: string
          deleted_at?: string | null
          edited_at?: string | null
          hidden_at?: string | null
          id?: string
          last_activity_at?: string
          like_count?: number
          locked?: boolean
          pinned?: boolean
          reply_count?: number
          tags?: string[]
          title: string
          useful_count?: number
        }
        Update: {
          author_id?: string
          body?: string
          category_id?: string
          contains_spoilers?: boolean
          created_at?: string
          deleted_at?: string | null
          edited_at?: string | null
          hidden_at?: string | null
          id?: string
          last_activity_at?: string
          like_count?: number
          locked?: boolean
          pinned?: boolean
          reply_count?: number
          tags?: string[]
          title?: string
          useful_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "forum_topics_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_topics_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "forum_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      genres: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          is_official: boolean
          name: string
          slug: string
          status: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_official?: boolean
          name: string
          slug: string
          status?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_official?: boolean
          name?: string
          slug?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "genres_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          actor_id: string | null
          created_at: string
          id: string
          read_at: string | null
          refs: Json
          type: string
          user_id: string
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          id?: string
          read_at?: string | null
          refs?: Json
          type: string
          user_id: string
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          id?: string
          read_at?: string | null
          refs?: Json
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_preferences: {
        Row: {
          preferences: Json
          profile_id: string
          updated_at: string
        }
        Insert: {
          preferences?: Json
          profile_id: string
          updated_at?: string
        }
        Update: {
          preferences?: Json
          profile_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_preferences_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          display_name: string | null
          favorite_genres: string[]
          id: string
          is_private: boolean
          onboarded_at: string | null
          updated_at: string
          username: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          favorite_genres?: string[]
          id: string
          is_private?: boolean
          onboarded_at?: string | null
          updated_at?: string
          username: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          favorite_genres?: string[]
          id?: string
          is_private?: boolean
          onboarded_at?: string | null
          updated_at?: string
          username?: string
        }
        Relationships: []
      }
      quotes: {
        Row: {
          book_id: string
          created_at: string
          id: string
          page: number | null
          text: string
          user_id: string
        }
        Insert: {
          book_id: string
          created_at?: string
          id?: string
          page?: number | null
          text: string
          user_id: string
        }
        Update: {
          book_id?: string
          created_at?: string
          id?: string
          page?: number | null
          text?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quotes_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      site_settings: {
        Row: {
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          updated_by?: string | null
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "site_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      suggestion_comments: {
        Row: {
          author_id: string
          body: string
          created_at: string
          deleted_at: string | null
          edited_at: string | null
          hidden_at: string | null
          id: string
          suggestion_id: string
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          deleted_at?: string | null
          edited_at?: string | null
          hidden_at?: string | null
          id?: string
          suggestion_id: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          deleted_at?: string | null
          edited_at?: string | null
          hidden_at?: string | null
          id?: string
          suggestion_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "suggestion_comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suggestion_comments_suggestion_id_fkey"
            columns: ["suggestion_id"]
            isOneToOne: false
            referencedRelation: "feature_suggestions"
            referencedColumns: ["id"]
          },
        ]
      }
      suggestion_votes: {
        Row: {
          created_at: string
          suggestion_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          suggestion_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          suggestion_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "suggestion_votes_suggestion_id_fkey"
            columns: ["suggestion_id"]
            isOneToOne: false
            referencedRelation: "feature_suggestions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suggestion_votes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_books: {
        Row: {
          book_id: string
          copied_from_user_id: string | null
          created_at: string
          current_page: number | null
          finished_at: string | null
          id: string
          rating: number | null
          review: string | null
          started_at: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          book_id: string
          copied_from_user_id?: string | null
          created_at?: string
          current_page?: number | null
          finished_at?: string | null
          id?: string
          rating?: number | null
          review?: string | null
          started_at?: string | null
          status: string
          updated_at?: string
          user_id: string
        }
        Update: {
          book_id?: string
          copied_from_user_id?: string | null
          created_at?: string
          current_page?: number | null
          finished_at?: string | null
          id?: string
          rating?: number | null
          review?: string | null
          started_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_books_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_books_copied_from_user_id_fkey"
            columns: ["copied_from_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_books_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_favorite_genres: {
        Row: {
          created_at: string
          genre_id: string
          position: number
          user_id: string
        }
        Insert: {
          created_at?: string
          genre_id: string
          position?: number
          user_id: string
        }
        Update: {
          created_at?: string
          genre_id?: string
          position?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_favorite_genres_genre_id_fkey"
            columns: ["genre_id"]
            isOneToOne: false
            referencedRelation: "genres"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_favorite_genres_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          role: string
          user_id: string
        }
        Update: {
          created_at?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      trending_books: {
        Row: {
          book_id: string | null
          total_adds: number | null
          week_adds: number | null
        }
        Relationships: [
          {
            foreignKeyName: "user_books_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      admin_books: {
        Args: {
          direction?: string
          page?: number
          page_size?: number
          q?: string
          sort?: string
          status_filter?: string
        }
        Returns: {
          authors: string[]
          cover_color: string
          cover_style: string
          cover_url: string
          created_at: string
          creator: string
          deleted_at: string
          id: string
          merged_into: string
          merged_title: string
          moderation_note: string
          moderation_status: string
          page_count: number
          published_year: number
          shelves: number
          source: string
          title: string
          total: number
        }[]
      }
      admin_overview: { Args: never; Returns: Json }
      admin_users: {
        Args: {
          direction?: string
          page?: number
          page_size?: number
          q?: string
          sort?: string
          status_filter?: string
        }
        Returns: {
          avatar_url: string
          books: number
          created_at: string
          display_name: string
          email: string
          id: string
          role: string
          sanction: string
          sanction_ends_at: string
          total: number
          username: string
        }[]
      }
      book_redirect: { Args: { book: string }; Returns: string }
      copy_collection: { Args: { source: string }; Returns: string }
      feed_activities: {
        Args: { before_at?: string; before_id?: string; max_rows?: number }
        Returns: {
          actor_id: string
          book_id: string | null
          collection_id: string | null
          created_at: string
          id: string
          target_user_id: string | null
          type: string
        }[]
        SetofOptions: {
          from: "*"
          to: "activities"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      is_admin: { Args: never; Returns: boolean }
      is_moderator: { Args: never; Returns: boolean }
      merge_preferences: { Args: { patch: Json }; Returns: Json }
      moderate_book: {
        Args: { action: string; book: string; changes?: Json; note?: string }
        Returns: undefined
      }
      moderate_topic: {
        Args: { action: string; category?: string; topic: string }
        Returns: undefined
      }
      popular_collections: {
        Args: { max_results?: number }
        Returns: {
          copied_from_id: string | null
          copied_from_owner_id: string | null
          created_at: string
          description: string | null
          emoji: string | null
          id: string
          is_collaborative: boolean
          owner_id: string
          title: string
          updated_at: string
          visibility: string
        }[]
        SetofOptions: {
          from: "*"
          to: "collections"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      profile_counts: {
        Args: { profile_id: string }
        Returns: {
          books: number
          collections: number
          followers: number
          following: number
        }[]
      }
      readers_by_affinity: {
        Args: { max_results?: number }
        Returns: {
          avatar_url: string
          common_books: number
          display_name: string
          favorite_genres: string[]
          id: string
          is_private: boolean
          score: number
          username: string
        }[]
      }
      reading_affinity: {
        Args: { a: string; b: string }
        Returns: {
          common_books: number
          score: number
        }[]
      }
      removed_book_keys: { Args: { keys: string[] }; Returns: string[] }
      review_change_request: {
        Args: { approve: boolean; note?: string; request: string }
        Returns: undefined
      }
      review_genre: {
        Args: { approve: boolean; genre_slug: string; note?: string }
        Returns: undefined
      }
      review_manual_book: {
        Args: {
          book: string
          changes?: Json
          decision: string
          duplicate_of?: string
          note?: string
        }
        Returns: undefined
      }
      review_report: {
        Args: { hide: boolean; report: string }
        Returns: undefined
      }
      search_catalog: {
        Args: { max_results?: number; q: string }
        Returns: {
          authors: string[]
          cover_color: string | null
          cover_style: string | null
          cover_url: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          description: string | null
          genres: string[]
          id: string
          isbn_10: string | null
          isbn_13: string | null
          language: string | null
          merged_into: string | null
          moderation_note: string | null
          moderation_status: string
          page_count: number | null
          published_year: number | null
          source: string
          source_id: string | null
          subtitle: string | null
          title: string
        }[]
        SetofOptions: {
          from: "*"
          to: "books"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      search_collections: {
        Args: { max_results?: number; q: string }
        Returns: {
          copied_from_id: string | null
          copied_from_owner_id: string | null
          created_at: string
          description: string | null
          emoji: string | null
          id: string
          is_collaborative: boolean
          owner_id: string
          title: string
          updated_at: string
          visibility: string
        }[]
        SetofOptions: {
          from: "*"
          to: "collections"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      search_readers: {
        Args: { max_results?: number; q: string }
        Returns: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          display_name: string | null
          favorite_genres: string[]
          id: string
          is_private: boolean
          onboarded_at: string | null
          updated_at: string
          username: string
        }[]
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      set_collection_positions: {
        Args: { book_ids: string[]; positions: string[]; target: string }
        Returns: number
      }
      set_favorite_genres: { Args: { slugs: string[] }; Returns: undefined }
      set_suggestion_status: {
        Args: { new_status: string; response?: string; suggestion: string }
        Returns: undefined
      }
      similar_suggestions: {
        Args: { max_results?: number; q: string }
        Returns: {
          id: string
          status: string
          title: string
          vote_count: number
        }[]
      }
      suggested_readers: {
        Args: { max_results?: number }
        Returns: {
          avatar_url: string
          common_genres: number
          display_name: string
          favorite_genres: string[]
          id: string
          is_private: boolean
          username: string
        }[]
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
    Enums: {},
  },
} as const
