-- ============================================================
-- TeamNotes — Supabase Database Schema
-- Run this in your Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

-- 0. Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. PROFILES TABLE
-- ============================================================
CREATE TABLE public.profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT UNIQUE NOT NULL,
  display_name TEXT DEFAULT '',
  avatar_url  TEXT DEFAULT '',
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- Auto-create a profile row when a user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- RLS for profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read profiles"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);


-- ============================================================
-- 2. ITEMS TABLE
-- ============================================================
CREATE TYPE public.item_type AS ENUM ('note', 'todo', 'media', 'bookmark');

CREATE TABLE public.items (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type         public.item_type NOT NULL DEFAULT 'note',
  title        TEXT NOT NULL DEFAULT 'Untitled',
  body         JSONB DEFAULT '{}',         -- rich text delta for notes, todo list for todos
  media_url    TEXT DEFAULT '',             -- public URL from storage for media items
  bookmark_url TEXT DEFAULT '',             -- saved URL for bookmark items
  created_at   TIMESTAMPTZ DEFAULT now(),
  updated_at   TIMESTAMPTZ DEFAULT now()
);

-- Auto-update the updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER items_updated_at
  BEFORE UPDATE ON public.items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_modified_column();

-- Helper function: checks if current user owns an item.
-- SECURITY DEFINER so it bypasses RLS and breaks the circular dependency
-- between items ↔ shared_items policies.
CREATE OR REPLACE FUNCTION public.is_item_owner(_item_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.items WHERE id = _item_id AND user_id = auth.uid()
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- RLS for items
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;

-- Owner full access
CREATE POLICY "Owner can do everything with own items"
  ON public.items FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Enable Realtime for items
ALTER PUBLICATION supabase_realtime ADD TABLE public.items;


-- ============================================================
-- 3. SHARED_ITEMS TABLE  (must exist before items policies that reference it)
-- ============================================================
CREATE TABLE public.shared_items (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_id              UUID NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
  shared_with_user_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  permission           TEXT NOT NULL DEFAULT 'edit' CHECK (permission IN ('view', 'edit')),
  created_at           TIMESTAMPTZ DEFAULT now(),
  UNIQUE (item_id, shared_with_user_id)
);

-- RLS for shared_items
ALTER TABLE public.shared_items ENABLE ROW LEVEL SECURITY;

-- Item owner can manage sharing (uses SECURITY DEFINER helper to avoid RLS loop)
CREATE POLICY "Owner can manage shared_items"
  ON public.shared_items FOR ALL
  USING ( public.is_item_owner(item_id) )
  WITH CHECK ( public.is_item_owner(item_id) );

-- Shared user can see their own share records
CREATE POLICY "Shared user can view own share records"
  ON public.shared_items FOR SELECT
  USING (shared_with_user_id = auth.uid());

-- Enable Realtime for shared_items
ALTER PUBLICATION supabase_realtime ADD TABLE public.shared_items;


-- ============================================================
-- 3b. ITEMS POLICIES THAT REFERENCE SHARED_ITEMS (deferred)
-- ============================================================

-- Shared users can SELECT
CREATE POLICY "Shared users can view items"
  ON public.items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.shared_items si
      WHERE si.item_id = id
        AND si.shared_with_user_id = auth.uid()
    )
  );

-- Shared users can UPDATE (for real-time checkbox ticking, etc.)
CREATE POLICY "Shared users can update items"
  ON public.items FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.shared_items si
      WHERE si.item_id = id
        AND si.shared_with_user_id = auth.uid()
        AND si.permission = 'edit'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.shared_items si
      WHERE si.item_id = id
        AND si.shared_with_user_id = auth.uid()
        AND si.permission = 'edit'
    )
  );


-- ============================================================
-- 4. STORAGE BUCKET FOR MEDIA
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('media', 'media', true)
ON CONFLICT (id) DO NOTHING;

-- Authenticated users can upload to their own folder
CREATE POLICY "Users can upload media"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'media'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Authenticated users can update their own files
CREATE POLICY "Users can update own media"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'media'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Authenticated users can delete their own files
CREATE POLICY "Users can delete own media"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'media'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Public can read media (since bucket is public)
CREATE POLICY "Public can read media"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'media');
