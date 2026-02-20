-- ============================================================
-- PATCH: Add 'meeting' to item_type ENUM
-- Run this in Supabase SQL Editor
-- ============================================================

ALTER TYPE public.item_type ADD VALUE IF NOT EXISTS 'meeting';
