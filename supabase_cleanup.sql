-- ============================================================
-- CLEANUP: Run this BEFORE supabase_schema.sql
-- Drops all TeamNotes objects so the schema can be re-created cleanly
-- ============================================================

-- Remove tables from realtime publication (ignore errors if not added)
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime DROP TABLE public.shared_items;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime DROP TABLE public.items;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Drop policies on storage.objects
DROP POLICY IF EXISTS "Users can upload media" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own media" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own media" ON storage.objects;
DROP POLICY IF EXISTS "Public can read media" ON storage.objects;

-- Drop storage bucket (skip — Supabase blocks direct deletes; schema uses ON CONFLICT)

-- Drop policies on shared_items
DROP POLICY IF EXISTS "Owner can manage shared_items" ON public.shared_items;
DROP POLICY IF EXISTS "Shared user can view own share records" ON public.shared_items;

-- Drop policies on items
DROP POLICY IF EXISTS "Owner can do everything with own items" ON public.items;
DROP POLICY IF EXISTS "Shared users can view items" ON public.items;
DROP POLICY IF EXISTS "Shared users can update items" ON public.items;

-- Drop policies on profiles
DROP POLICY IF EXISTS "Anyone can read profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- Drop tables (order matters: shared_items references items, items references users)
DROP TABLE IF EXISTS public.shared_items CASCADE;
DROP TABLE IF EXISTS public.items CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- Drop functions and triggers
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS public.update_modified_column();

-- Drop custom type
DROP TYPE IF EXISTS public.item_type;
