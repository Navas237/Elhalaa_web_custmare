-- ══════════════════════════════════════════════════════════════
-- FIX: Permission denied for table shop_staff (error 42501)
-- 
-- Problem: shops_v2 has an RLS policy that references shop_staff,
-- but the anon role has no SELECT privilege on shop_staff.
-- When an unauthenticated user browses /shops, the RLS policy
-- evaluation fails because it can't read shop_staff.
--
-- Run this in: Supabase Dashboard → SQL Editor
-- ══════════════════════════════════════════════════════════════

-- Step 1: Grant table-level SELECT to anon and authenticated
-- This allows RLS policies to reference shop_staff in subqueries
GRANT SELECT ON public.shop_staff TO anon;
GRANT SELECT ON public.shop_staff TO authenticated;

-- Step 2: Ensure shops_v2 is publicly readable (for branch discovery)
-- Check if a public SELECT policy already exists, if not create one
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'shops_v2' 
    AND policyname = 'shops_public_read'
  ) THEN
    -- Allow anyone (including anon) to read shops
    CREATE POLICY shops_public_read ON public.shops_v2
      FOR SELECT
      USING (true);
  END IF;
END $$;

-- Step 3: Ensure services are publicly readable (for service listing)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'services' 
    AND policyname = 'services_public_read'
  ) THEN
    CREATE POLICY services_public_read ON public.services
      FOR SELECT
      USING (is_active = true);
  END IF;
END $$;

-- Step 4: Add a public read policy for shop_staff (barber listing)
-- Only expose active staff, not sensitive data
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'shop_staff' 
    AND policyname = 'staff_public_read'
  ) THEN
    CREATE POLICY staff_public_read ON public.shop_staff
      FOR SELECT
      USING (is_active = true);
  END IF;
END $$;

-- Step 5: Ensure profiles are readable for display names
GRANT SELECT ON public.profiles TO anon;
GRANT SELECT ON public.profiles TO authenticated;

-- Step 6: Ensure working_hours is readable for slot availability
GRANT SELECT ON public.working_hours TO anon;
GRANT SELECT ON public.working_hours TO authenticated;

-- Verify: List all policies on key tables
SELECT tablename, policyname, cmd, permissive 
FROM pg_policies 
WHERE tablename IN ('shops_v2', 'shop_staff', 'services', 'profiles', 'working_hours')
ORDER BY tablename, policyname;
