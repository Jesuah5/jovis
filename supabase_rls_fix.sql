-- ============================================================
-- PATCH: Fix circular RLS dependency between items ↔ shared_items
-- Run this in Supabase SQL Editor to fix the 500 errors
-- ============================================================

-- Step 1: Create the helper function (bypasses RLS to break the cycle)
CREATE OR REPLACE FUNCTION public.is_item_owner(_item_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.items WHERE id = _item_id AND user_id = auth.uid()
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Step 2: Drop the old circular policy on shared_items
DROP POLICY IF EXISTS "Owner can manage shared_items" ON public.shared_items;

-- Step 3: Recreate it using the safe helper function
CREATE POLICY "Owner can manage shared_items"
  ON public.shared_items FOR ALL
  USING ( public.is_item_owner(item_id) )
  WITH CHECK ( public.is_item_owner(item_id) );
