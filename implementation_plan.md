# 🔬 The Digital Atelier — Customer Web App Production Audit & Upgrade Plan

> **Scope**: Full audit of `customer-web/` — the Next.js 16 + Supabase customer booking app  
> **Date**: 2026-05-29 | **Auditor**: Senior SaaS Engineering Review

---

## Executive Summary

The customer web app has **solid foundations**: proper RTL/Arabic support, a clean design system, skeleton loading, a smart booking engine, and database-level double-booking prevention. However, it has **critical production gaps** that would cause data integrity failures, security vulnerabilities, and broken user flows under real traffic.

**Top 3 Critical Findings:**
1. **Booking insert is a raw client-side mutation** — no server-side RPC, no atomicity, exploitable via Supabase anon key
2. **No real-time slot updates** — two users can select the same slot and one gets a cryptic error
3. **`/shops` is protected by middleware** — guests cannot browse branches, killing acquisition

---

## 1. Authentication Flow Audit

### 1.1 Current State

| Component | File | Status |
|-----------|------|--------|
| Login | [page.tsx](file:///d:/projets/barbeShop/barberShop/customer-web/src/app/login/page.tsx) | ✅ Works |
| Register | [page.tsx](file:///d:/projets/barbeShop/barberShop/customer-web/src/app/register/page.tsx) | ⚠️ Missing validation |
| Middleware guards | [middleware.ts](file:///d:/projets/barbeShop/barberShop/customer-web/src/utils/supabase/middleware.ts) | 🔴 Over-protective |
| Session refresh | [middleware.ts](file:///d:/projets/barbeShop/barberShop/customer-web/src/middleware.ts) | ✅ Works |
| Signout | [route.ts](file:///d:/projets/barbeShop/barberShop/customer-web/src/app/auth/signout/route.ts) | ⚠️ Hardcoded URL |
| Server actions | [actions.ts](file:///d:/projets/barbeShop/barberShop/customer-web/src/app/login/actions.ts) | ⚠️ Profile insert not atomic |

### 1.2 Issues Found

> [!CAUTION]
> **CRITICAL: `/shops` is a protected route** — the middleware in [middleware.ts L5](file:///d:/projets/barbeShop/barberShop/customer-web/src/utils/supabase/middleware.ts#L5) marks `/shops` and `/booking` as `PROTECTED_ROUTES`. This means **unauthenticated visitors cannot even browse branches**. This kills the entire acquisition funnel — the customer should be able to discover branches before being asked to log in.

> [!WARNING]
> **HIGH: Signup profile insert is not atomic** — In [actions.ts L40-47](file:///d:/projets/barbeShop/barberShop/customer-web/src/app/login/actions.ts#L40-L47), `signUp` creates an auth user, then does a separate `profiles.insert`. If the insert fails (e.g., network issue), the user exists in `auth.users` but has **no profile row**, causing all downstream queries to return `null` for `full_name` and `phone_number`.

> [!WARNING]
> **HIGH: No input validation on signup** — No password length check, no phone format validation, no email format validation beyond browser `required`. A user can register with a 1-char password.

**Additional issues:**

| # | Severity | Issue | Location |
|---|----------|-------|----------|
| A1 | 🔴 Critical | `/shops` blocked for guests — breaks discovery funnel | [middleware.ts L5](file:///d:/projets/barbeShop/barberShop/customer-web/src/utils/supabase/middleware.ts#L5) |
| A2 | 🟠 High | Profile insert not in a transaction with auth signup | [actions.ts L34-47](file:///d:/projets/barbeShop/barberShop/customer-web/src/app/login/actions.ts#L34-L47) |
| A3 | 🟠 High | No server-side validation (password length, phone format) | [actions.ts L26-50](file:///d:/projets/barbeShop/barberShop/customer-web/src/app/login/actions.ts#L26-L50) |
| A4 | 🟡 Medium | Login redirect loses query params (booking URL with `&`) | [actions.ts L17](file:///d:/projets/barbeShop/barberShop/customer-web/src/app/login/actions.ts#L17) |
| A5 | 🟡 Medium | Signout route uses hardcoded `NEXT_PUBLIC_APP_URL` fallback | [route.ts L7](file:///d:/projets/barbeShop/barberShop/customer-web/src/app/auth/signout/route.ts#L7) |
| A6 | 🟡 Medium | No "forgot password" flow | Missing |
| A7 | 🟡 Medium | No email verification enforcement | [actions.ts L34](file:///d:/projets/barbeShop/barberShop/customer-web/src/app/login/actions.ts#L34) |
| A8 | 🟢 Low | No OAuth (Google/Apple) login — high friction for mobile users | Missing |
| A9 | 🟢 Low | No loading state on login/signup form submit | [login/page.tsx](file:///d:/projets/barbeShop/barberShop/customer-web/src/app/login/page.tsx) |

### 1.3 Recommended Fixes

```diff
- const PROTECTED_ROUTES = ['/shops', '/booking', '/profile']
+ const PROTECTED_ROUTES = ['/booking', '/profile']
```

- Move `/shops` and `/shops/[id]/*` out of protected routes — let guests browse freely
- Gate only at booking confirmation: the existing client-side check in [booking/page.tsx L57-59](file:///d:/projets/barbeShop/barberShop/customer-web/src/app/booking/page.tsx#L57-L59) already redirects to login
- Add server-side validation in `signup()`: min password 8 chars, phone regex `^(05|06|07)\d{8}$`
- Use a Supabase trigger (`on auth.users insert → create profile`) to make profile creation atomic
- Add `useFormStatus()` pending state to login/register buttons

---

## 2. Branch Discovery UX Audit

### 2.1 Current State

| Feature | Status | File |
|---------|--------|------|
| Branch listing | ✅ Works (SSR) | [shops/page.tsx](file:///d:/projets/barbeShop/barberShop/customer-web/src/app/shops/page.tsx) |
| Skeleton loading | ✅ Exists | [shops/loading.tsx](file:///d:/projets/barbeShop/barberShop/customer-web/src/app/shops/loading.tsx) |
| Empty state | ✅ Exists | [shops/page.tsx L49-61](file:///d:/projets/barbeShop/barberShop/customer-web/src/app/shops/page.tsx#L49-L61) |
| Error state | ✅ Exists | [shops/page.tsx L14-26](file:///d:/projets/barbeShop/barberShop/customer-web/src/app/shops/page.tsx#L14-L26) |
| Search/filter | ❌ Missing | — |
| Pagination | ❌ Missing | — |
| Shop detail page | ⚠️ Orphaned (`/shop/[id]`) | [shop/[id]/page.tsx](file:///d:/projets/barbeShop/barberShop/customer-web/src/app/shop/%5Bid%5D/page.tsx) |

### 2.2 Issues Found

| # | Severity | Issue | Details |
|---|----------|-------|---------|
| B1 | 🔴 Critical | Blocked by auth (see A1) | Guests can't reach `/shops` |
| B2 | 🟠 High | `SELECT *` fetches all columns from `shops_v2` | [shops/page.tsx L10](file:///d:/projets/barbeShop/barberShop/customer-web/src/app/shops/page.tsx#L10) — fetches `owner_id`, internal fields |
| B3 | 🟠 High | Orphaned `/shop/[id]` page uses old design system CSS classes (`bg-surface-container-lowest`, `font-heading`, `text-text-primary`) that don't exist in `globals.css` | [shop/[id]/page.tsx](file:///d:/projets/barbeShop/barberShop/customer-web/src/app/shop/%5Bid%5D/page.tsx) — completely broken rendering |
| B4 | 🟠 High | Shop images bypass Next.js `<Image>` optimization — raw `<img>` tags | [shops/page.tsx L77-81](file:///d:/projets/barbeShop/barberShop/customer-web/src/app/shops/page.tsx#L77-L81) |
| B5 | 🟡 Medium | No search or filter — unusable at 20+ branches | [shops/page.tsx](file:///d:/projets/barbeShop/barberShop/customer-web/src/app/shops/page.tsx) |
| B6 | 🟡 Medium | "متاح للحجز" badge is hardcoded — always shows available regardless of actual status | [shops/page.tsx L116-118](file:///d:/projets/barbeShop/barberShop/customer-web/src/app/shops/page.tsx#L116-L118) |
| B7 | 🟡 Medium | `revalidate = 60` is good but no on-demand revalidation when shops change | [shops/page.tsx L5](file:///d:/projets/barbeShop/barberShop/customer-web/src/app/shops/page.tsx#L5) |
| B8 | 🟢 Low | No geolocation-based sorting ("nearest branch") | — |

### 2.3 Recommended Fixes

- Delete or redirect the orphaned `/shop/[id]` route — the active flow is `/shops/[id]/barbers`
- Replace `select('*')` with `select('id, name, address, rating, image_url')` to avoid data leaks
- Use `next/image` with `remotePatterns` already configured in `next.config.ts`
- Add a client-side search input filtering by `shop.name` and `shop.address`

---

## 3. Booking Flow Audit — THE MOST CRITICAL SECTION

### 3.1 Current Workflow

```
/shops → /shops/[id]/barbers → /shops/[id]/services?barberId=X → /booking?shopId=X&barberId=Y&serviceId=Z → /booking/success
```

### 3.2 Smart Booking Engine Analysis

The [SmartBookingEngine.ts](file:///d:/projets/barbeShop/barberShop/customer-web/src/utils/SmartBookingEngine.ts) is **well-designed** with:
- ✅ Grid-based slot generation (10-min intervals)
- ✅ Packing density optimization (reduces fragmentation)
- ✅ Adjacency bonus (prefers back-to-back bookings)
- ✅ Today-aware filtering (removes past slots)
- ✅ Suggestion count limiting (3-5 smart suggestions)

However, it runs **entirely client-side**, which creates trust/security issues.

### 3.3 Issues Found

> [!CAUTION]
> **CRITICAL: Booking insert is a raw client-side `.insert()`** — In [booking/page.tsx L133-146](file:///d:/projets/barbeShop/barberShop/customer-web/src/app/booking/page.tsx#L133-L146), the booking is inserted directly from the browser using the Supabase anon key. This means:
> - A malicious user can craft arbitrary bookings with any `staff_id`, `shop_id`, or `start_time`
> - The `client_id` is set by client-side code (`user!.id`) — attackable
> - No re-validation of slot availability before insert
> - While the DB trigger `prevent_double_booking` catches overlaps, the **error message is a raw PostgreSQL exception** (`P0001`), not a user-friendly message

> [!CAUTION]
> **CRITICAL: No real-time slot synchronization** — When two users view the same barber's slots simultaneously, they both see the same available times. When user A books a slot, user B's UI doesn't update. User B then gets a cryptic DB error when trying to book the same slot.

> [!WARNING]
> **HIGH: No optimistic locking / slot reservation** — Between selecting a slot and clicking "confirm," several seconds pass. Another user or the owner/barber app can book the same time during this gap.

| # | Severity | Issue | Location |
|---|----------|-------|---------|
| C1 | 🔴 Critical | Raw client-side `.insert()` — no server-side validation | [booking/page.tsx L133-146](file:///d:/projets/barbeShop/barberShop/customer-web/src/app/booking/page.tsx#L133-L146) |
| C2 | 🔴 Critical | No real-time slot updates when others book | [booking/page.tsx L78-121](file:///d:/projets/barbeShop/barberShop/customer-web/src/app/booking/page.tsx#L78-L121) |
| C3 | 🟠 High | DB overlap error shows as generic "حدث خطأ" — no conflict-specific message | [booking/page.tsx L148-150](file:///d:/projets/barbeShop/barberShop/customer-web/src/app/booking/page.tsx#L148-L150) |
| C4 | 🟠 High | `supabase` client created inside render (new instance every render) | [booking/page.tsx L31](file:///d:/projets/barbeShop/barberShop/customer-web/src/app/booking/page.tsx#L31) |
| C5 | 🟠 High | `user!.id` non-null assertion — crashes if session expired mid-flow | [booking/page.tsx L137](file:///d:/projets/barbeShop/barberShop/customer-web/src/app/booking/page.tsx#L137) |
| C6 | 🟠 High | No timezone handling — `new Date()` uses local browser TZ, DB uses server TZ | [SmartBookingEngine.ts L40-43](file:///d:/projets/barbeShop/barberShop/customer-web/src/utils/SmartBookingEngine.ts#L40-L43) |
| C7 | 🟡 Medium | No "someone just booked this slot" toast/feedback | — |
| C8 | 🟡 Medium | Booking confirmation doesn't show which barber/shop, just redirects to generic success | [booking/success/page.tsx](file:///d:/projets/barbeShop/barberShop/customer-web/src/app/booking/success/page.tsx) |
| C9 | 🟡 Medium | `useEffect` dependencies missing `supabase` (ESLint exhaustive-deps) | [booking/page.tsx L75](file:///d:/projets/barbeShop/barberShop/customer-web/src/app/booking/page.tsx#L75) |
| C10 | 🟡 Medium | `details` in slot-loading effect triggers on every state change (no memo) | [booking/page.tsx L121](file:///d:/projets/barbeShop/barberShop/customer-web/src/app/booking/page.tsx#L121) |
| C11 | 🟢 Low | Only 7 days shown — no calendar picker for longer-range booking | [booking/page.tsx L10-22](file:///d:/projets/barbeShop/barberShop/customer-web/src/app/booking/page.tsx#L10-L22) |

### 3.4 Recommended Architecture Fix: Server-Side Booking RPC

Replace the client-side `.insert()` with a Supabase RPC function:

```sql
CREATE OR REPLACE FUNCTION create_booking(
  p_shop_id UUID,
  p_staff_id UUID,
  p_service_id UUID,
  p_booking_date DATE,
  p_start_time TIME,
  p_end_time TIME,
  p_display_start_time TIME
) RETURNS bookings_v2 AS $$
DECLARE
  v_booking bookings_v2;
BEGIN
  -- Re-check availability inside transaction
  IF EXISTS (
    SELECT 1 FROM bookings_v2
    WHERE staff_id = p_staff_id
      AND booking_date = p_booking_date
      AND status NOT IN ('cancelled', 'no_show')
      AND start_time < p_end_time
      AND end_time > p_start_time
    FOR UPDATE SKIP LOCKED
  ) THEN
    RAISE EXCEPTION 'SLOT_TAKEN';
  END IF;

  INSERT INTO bookings_v2 (
    shop_id, staff_id, service_id, client_id,
    client_name, client_phone, booking_date,
    start_time, end_time, display_start_time,
    status, payment_method
  )
  SELECT
    p_shop_id, p_staff_id, p_service_id, auth.uid(),
    p.full_name, p.phone_number, p_booking_date,
    p_start_time, p_end_time, p_display_start_time,
    'pending', 'cash'
  FROM profiles p WHERE p.id = auth.uid()
  RETURNING * INTO v_booking;

  RETURN v_booking;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

This provides:
- **Atomicity**: Overlap check + insert in one transaction
- **Server trust**: `auth.uid()` is verified server-side, not client-passed
- **Profile data**: Pulled from DB directly, not from client state
- **Proper error**: Catch `SLOT_TAKEN` on client and show user-friendly message

### 3.5 Recommended Real-time Sync

Add a Supabase Realtime subscription on `bookings_v2` in the booking page to auto-refresh slots when another booking is inserted for the same `staff_id` + `booking_date`.

---

## 4. Customer Profile Audit

### 4.1 Current State

| Feature | Status | File |
|---------|--------|------|
| Profile display | ✅ Works (SSR) | [profile/page.tsx](file:///d:/projets/barbeShop/barberShop/customer-web/src/app/profile/page.tsx) |
| Booking history | ✅ Works | [profile/page.tsx L33-41](file:///d:/projets/barbeShop/barberShop/customer-web/src/app/profile/page.tsx#L33-L41) |
| Upcoming/past separation | ✅ Works | [profile/page.tsx L43-44](file:///d:/projets/barbeShop/barberShop/customer-web/src/app/profile/page.tsx#L43-L44) |
| Cancel booking | ❌ Missing | — |
| Edit profile | ❌ Missing | — |
| Rebook | ❌ Missing | — |
| Phone number update | ❌ Missing | — |

### 4.2 Issues Found

| # | Severity | Issue | Details |
|---|----------|-------|---------|
| D1 | 🟠 High | No cancel booking button — customer cannot cancel their booking | Missing |
| D2 | 🟠 High | No edit profile flow — can't update name/phone after registration | Missing |
| D3 | 🟡 Medium | Signout form posts to `/auth/signout` which uses `method="post"` in a `<form>` — but there's no hidden CSRF token | [profile/page.tsx L78](file:///d:/projets/barbeShop/barberShop/customer-web/src/app/profile/page.tsx#L78) |
| D4 | 🟡 Medium | Booking date shown in raw ISO format (`2026-05-29`) — not localized Arabic | [profile/page.tsx L190](file:///d:/projets/barbeShop/barberShop/customer-web/src/app/profile/page.tsx#L190) |
| D5 | 🟡 Medium | No pagination on booking history — will slow down for active customers | [profile/page.tsx L35-40](file:///d:/projets/barbeShop/barberShop/customer-web/src/app/profile/page.tsx#L35-L40) |
| D6 | 🟡 Medium | `force-dynamic` disables all caching — performance hit | [profile/page.tsx L5](file:///d:/projets/barbeShop/barberShop/customer-web/src/app/profile/page.tsx#L5) |
| D7 | 🟢 Low | No "rebook" action on past bookings | Missing |

### 4.3 Recommended Fixes

- Add cancel button calling `supabase.from('bookings_v2').update({ status: 'cancelled' }).eq('id', bookingId).eq('client_id', user.id)` — the RLS policy `bookings_client_cancel` already exists
- Add `/profile/edit` page with name + phone fields
- Format dates with `Intl.DateTimeFormat('ar-EG', { dateStyle: 'long' })`

---

## 5. Owner/Barber Synchronization Audit

### 5.1 Current Architecture

When a customer books via the web app:
1. Client-side JS calls `supabase.from('bookings_v2').insert(...)` 
2. The row appears in the DB immediately
3. The owner/barber mobile app sees it only **if they refresh** (no evidence of Realtime subscription in the mobile app)

### 5.2 Issues Found

| # | Severity | Issue |
|---|----------|-------|
| E1 | 🟠 High | No evidence of Realtime push to barber/owner dashboards — bookings only visible on manual refresh |
| E2 | 🟡 Medium | No notification system (SMS, push, email) to barber when a new booking arrives |
| E3 | 🟡 Medium | `status: 'pending'` — unclear if barber needs to manually confirm or if it auto-confirms |
| E4 | 🟢 Low | No booking edit sync — if owner changes a booking, customer profile doesn't reflect it in real-time |

### 5.3 Recommended Architecture

- Enable Supabase Realtime on `bookings_v2` for `INSERT` and `UPDATE` events
- The mobile app should subscribe to `bookings_v2:shop_id=eq.{shopId}` channel
- Add a Supabase Edge Function for webhook notifications (SMS via Twilio/MessageBird)

---

## 6. Database & Supabase Architecture Audit

### 6.1 Schema Summary (from [columns.json](file:///d:/projets/barbeShop/barberShop/columns.json))

**Tables accessed by customer-web:**

| Table | Used in | Relationship |
|-------|---------|-------------|
| `shops_v2` | Shops listing, detail | Has `owner_id` FK |
| `shop_staff` | Barber listing | FK → `shops_v2`, `profiles` |
| `services` | Service selection | FK → `shops_v2` |
| `bookings_v2` | Booking creation, history | FKs → `shops_v2`, `shop_staff`, `services`, `profiles` |
| `working_hours` | Slot availability | FK → `shop_staff` |
| `profiles` | User data | FK → `auth.users` |

### 6.2 What's Working Well ✅

- **GiST exclusion constraint** `excl_no_double_booking` — prevents overlapping bookings at DB level
- **Trigger** `prevent_double_booking` — belt-and-suspenders overlap prevention with `FOR UPDATE SKIP LOCKED`
- **CHECK constraint** `bookings_v2_check` — ensures `start_time < end_time`
- **Foreign keys** are properly defined on all relationships
- **RLS policies** exist for booking read/write by role

### 6.3 Issues Found

> [!WARNING]
> **HIGH: RLS policy `bookings_insert` allows ANY authenticated user to insert into `bookings_v2`** — The policy `(auth.uid() IS NOT NULL)` means any logged-in user can insert a booking for ANY `shop_id` / `staff_id` combination, even with fabricated data. Combined with client-side insert, this is an exploitation vector.

| # | Severity | Issue | Details |
|---|----------|-------|---------|
| F1 | 🟠 High | `bookings_insert` RLS too permissive — any auth user can insert any booking | Should validate `client_id = auth.uid()` |
| F2 | 🟠 High | `working_hours` has overlapping SELECT policies — `hours_select` allows ANY auth user, `Shop staff can view` is more restrictive but PERMISSIVE policies stack with OR | Redundant/confusing policies |
| F3 | 🟡 Medium | No index on `bookings_v2(staff_id, booking_date)` visible — slot queries rely on this | May exist but not in dump |
| F4 | 🟡 Medium | `client_id` is nullable — allows bookings without a customer reference | [columns.json](file:///d:/projets/barbeShop/barberShop/columns.json) |
| F5 | 🟡 Medium | `start_time` and `end_time` are nullable — allows invalid bookings | [columns.json](file:///d:/projets/barbeShop/barberShop/columns.json) |
| F6 | 🟡 Medium | N+1 query risk: barbers page fetches shop name in one query, then staff with RPC, potentially a fallback query | [barbers/page.tsx L14-48](file:///d:/projets/barbeShop/barberShop/customer-web/src/app/shops/%5Bid%5D/barbers/page.tsx#L14-L48) |
| F7 | 🟢 Low | No `updated_at` auto-update trigger on `bookings_v2` — `updated_at` stays at creation time | [columns.json](file:///d:/projets/barbeShop/barberShop/columns.json) |

### 6.4 Recommended RLS Fix

```sql
-- Replace the overly permissive insert policy
DROP POLICY IF EXISTS bookings_insert ON bookings_v2;
CREATE POLICY bookings_insert_client ON bookings_v2
  FOR INSERT
  WITH CHECK (client_id = auth.uid());
```

Or better yet, use the `SECURITY DEFINER` RPC from Section 3.4 and remove direct insert access entirely.

---

## 7. UI/UX Production Readiness Audit

### 7.1 What's Working Well ✅

- Clean design system in [globals.css](file:///d:/projets/barbeShop/barberShop/customer-web/src/app/globals.css) with CSS variables
- RTL (`dir="rtl"`) properly set on `<html>` 
- Arabic (Cairo) font with proper subset loading and `display: swap`
- Mobile bottom navigation with 4 tabs
- Safe area support for notched phones
- iOS zoom prevention (`font-size: 16px` on inputs)
- Card hover animations
- Skeleton loading states on 3 routes

### 7.2 Issues Found

| # | Severity | Issue | Details |
|---|----------|-------|---------|
| G1 | 🟠 High | `/shop/[id]` page uses entirely different design system — CSS classes like `bg-surface-container-lowest`, `text-text-primary`, `shadow-ambient` don't exist in `globals.css` | [shop/[id]/page.tsx](file:///d:/projets/barbeShop/barberShop/customer-web/src/app/shop/%5Bid%5D/page.tsx) — renders with broken styles |
| G2 | 🟡 Medium | Mobile bottom nav doesn't highlight the active route — all tabs look the same | [layout.tsx L139-157](file:///d:/projets/barbeShop/barberShop/customer-web/src/app/layout.tsx#L139-L157) |
| G3 | 🟡 Medium | "احجز" tab in bottom nav goes to `/booking` which requires `searchParams` — shows spinner forever or redirects to `/shops` | [layout.tsx L142](file:///d:/projets/barbeShop/barberShop/customer-web/src/app/layout.tsx#L142) |
| G4 | 🟡 Medium | Booking success page is static — no booking details, no booking ID | [success/page.tsx](file:///d:/projets/barbeShop/barberShop/customer-web/src/app/booking/success/page.tsx) |
| G5 | 🟡 Medium | No toast/notification system for user feedback | Missing |
| G6 | 🟡 Medium | No `aria-label` on icon-only buttons (accessibility) | Multiple files |
| G7 | 🟡 Medium | Breadcrumb arrows use `ChevronLeft` which is correct for RTL but semantically should be `ChevronRight` for "next" in LTR-thinking | Minor visual concern |
| G8 | 🟢 Low | Copyright year computed at SSR build time with `new Date().getFullYear()` — correct for SSR but cached in static footer | [layout.tsx L130](file:///d:/projets/barbeShop/barberShop/customer-web/src/app/layout.tsx#L130) |
| G9 | 🟢 Low | No dark mode support | — |
| G10 | 🟢 Low | No offline/retry behavior — no service worker | — |

### 7.3 Design System Inconsistency Map

| File | Uses `globals.css` variables? | Uses Tailwind utility classes? | Design consistency |
|------|------------------------------|-------------------------------|-------------------|
| Home page | ✅ | ✅ | ✅ Consistent |
| Shops page | ✅ | ✅ | ✅ Consistent |
| Barbers page | ✅ | ✅ | ✅ Consistent |
| Services page | ✅ | ✅ | ✅ Consistent |
| Booking page | ✅ | ✅ | ✅ Consistent |
| Profile page | ✅ | ✅ | ✅ Consistent |
| **Shop detail** `/shop/[id]` | ❌ Uses old system | ❌ Old classes | 🔴 **Completely broken** |

---

## 8. Performance & Scalability Audit

### 8.1 What's Working Well ✅

- React Compiler enabled (`reactCompiler: true` in [next.config.ts](file:///d:/projets/barbeShop/barberShop/customer-web/next.config.ts))
- Image format optimization (`avif`, `webp`)
- Compression enabled
- Static asset caching with immutable headers
- Server Components used for shops, barbers, services (no client JS shipped)
- `revalidate = 60` ISR on shops/services pages
- Font `display: swap` prevents FOIT

### 8.2 Issues Found

| # | Severity | Issue | Details |
|---|----------|-------|---------|
| H1 | 🟠 High | Booking page creates new `supabase` client inside render scope — not memoized | [booking/page.tsx L31](file:///d:/projets/barbeShop/barberShop/customer-web/src/app/booking/page.tsx#L31) |
| H2 | 🟡 Medium | `revalidate = 0` on barbers page — no caching at all, every visit hits Supabase | [barbers/page.tsx L5](file:///d:/projets/barbeShop/barberShop/customer-web/src/app/shops/%5Bid%5D/barbers/page.tsx#L5) |
| H3 | 🟡 Medium | Profile page uses `force-dynamic` — prevents static optimization | [profile/page.tsx L5](file:///d:/projets/barbeShop/barberShop/customer-web/src/app/profile/page.tsx#L5) |
| H4 | 🟡 Medium | Booking page fires 3 parallel `select` queries + auth check on mount, then another 2 queries per date change | [booking/page.tsx L55-74](file:///d:/projets/barbeShop/barberShop/customer-web/src/app/booking/page.tsx#L55-L74) |
| H5 | 🟡 Medium | SmartBookingEngine runs entirely client-side — duplicating logic that should run server-side | [SmartBookingEngine.ts](file:///d:/projets/barbeShop/barberShop/customer-web/src/utils/SmartBookingEngine.ts) |
| H6 | 🟢 Low | No bundle analysis — unknown if large dependencies are tree-shaken | — |
| H7 | 🟢 Low | `lucide-react` icons imported individually (good) but no verification of tree-shaking | — |

### 8.3 Scalability Under Load

| Scenario | Current Behavior | Risk |
|----------|-----------------|------|
| 100 simultaneous bookings | Each does 5+ client-side queries | 🟡 Supabase rate limits may hit |
| 50+ branches | All fetched with `select('*')` in one query | 🟡 No pagination |
| 10+ barbers at one branch | RPC call + fallback query pattern | 🟢 Acceptable |
| Peak booking window (Friday 5pm) | Multiple users same barber/time | 🔴 Race condition between UI check and DB insert |

---

## 9. Security Audit Summary

| # | Severity | Issue | Impact |
|---|----------|-------|--------|
| S1 | 🔴 Critical | Client-side booking insert — data can be fabricated | Fake bookings, wrong client_id |
| S2 | 🟠 High | `bookings_insert` RLS allows any auth user to insert for any shop/staff | Spam bookings across shops |
| S3 | 🟠 High | Supabase anon key exposed in `.env.local` committed to repo | Key rotation needed if public |
| S4 | 🟡 Medium | No rate limiting on booking creation | Abuse/spam potential |
| S5 | 🟡 Medium | No CAPTCHA on registration | Bot account creation |
| S6 | 🟡 Medium | Profile data (`phone_number`) accessible via `profiles` table without column-level RLS | Privacy concern |
| S7 | 🟢 Low | No Content Security Policy headers | XSS risk reduction |
| S8 | 🟢 Low | No `X-Frame-Options` / `X-Content-Type-Options` headers | Clickjacking risk |

---

## 10. Production Readiness Checklist

### 🔴 Critical (Must fix before production)

- [ ] **C1**: Replace client-side `.insert()` with server-side RPC for bookings
- [ ] **A1**: Allow guests to browse `/shops` without authentication
- [ ] **C2**: Add Realtime subscription for slot availability updates
- [ ] **S1/F1**: Tighten `bookings_insert` RLS policy to validate `client_id = auth.uid()`

### 🟠 High Priority (Fix within first sprint)

- [ ] **A2**: Make signup profile creation atomic (DB trigger or transaction)
- [ ] **A3**: Add server-side input validation on signup
- [ ] **C3**: Parse DB overlap errors and show user-friendly "slot taken" message
- [ ] **C5**: Handle session expiry gracefully in booking flow
- [ ] **C6**: Normalize timezone handling (force server TZ or use UTC)
- [ ] **D1**: Add cancel booking button with confirmation dialog
- [ ] **D2**: Add edit profile page
- [ ] **B3**: Remove or rebuild the orphaned `/shop/[id]` page
- [ ] **B4**: Use `next/image` for all shop/barber images
- [ ] **G1**: Fix orphaned page's broken CSS classes
- [ ] **H1**: Memoize or move `supabase` client creation out of render
- [ ] **E1**: Enable Realtime on `bookings_v2` for owner/barber dashboards

### 🟡 Medium Priority (Fix within 2 sprints)

- [ ] **A4**: Fix login redirect URL encoding for booking params
- [ ] **A6**: Add forgot password flow
- [ ] **A7**: Add email verification
- [ ] **B5**: Add search/filter on shops page
- [ ] **B6**: Show real availability status on shop cards
- [ ] **C8**: Show booking details on success page
- [ ] **D4**: Format dates in Arabic locale
- [ ] **D5**: Add pagination on booking history
- [ ] **G2**: Highlight active route in bottom nav
- [ ] **G3**: Change "احجز" tab to link to `/shops` instead of `/booking`
- [ ] **G5**: Add toast notification system
- [ ] **G6**: Add `aria-label` to icon-only buttons
- [ ] **H2**: Set reasonable `revalidate` on barbers page (e.g., 30s)

### 🟢 Low Priority (Post-launch improvements)

- [ ] **A8**: Add OAuth (Google) login
- [ ] **A9**: Add form submit loading states
- [ ] **B8**: Geolocation sorting
- [ ] **C11**: Calendar picker for longer-range booking
- [ ] **D7**: "Rebook" action on past bookings
- [ ] **E2**: SMS/push notifications for new bookings
- [ ] **G9**: Dark mode
- [ ] **G10**: Service worker for offline
- [ ] **S7/S8**: Security headers

---

## 11. Phased Upgrade Roadmap

### Phase 1: Security & Data Integrity (Week 1)
> Goal: Prevent data corruption and security exploits

1. Create `create_booking` RPC function in Supabase
2. Update booking page to call RPC instead of `.insert()`
3. Tighten `bookings_insert` RLS policy
4. Move `/shops` out of `PROTECTED_ROUTES`
5. Add input validation to signup server action
6. Make profile creation atomic via DB trigger

### Phase 2: Core UX Completion (Week 2)
> Goal: Complete the customer workflow end-to-end

1. Add cancel booking flow with RLS policy already in place
2. Add edit profile page
3. Add Realtime slot synchronization
4. Fix bottom nav (active state, "احجز" → `/shops`)
5. Add toast notification system
6. Delete/redirect orphaned `/shop/[id]` route
7. Show booking details on success page

### Phase 3: Polish & Performance (Week 3)
> Goal: Production-grade performance and UX

1. Replace `<img>` with `next/image` everywhere
2. Add search/filter on shops page
3. Format all dates in Arabic locale
4. Add proper error boundaries
5. Add `forgot password` flow
6. Add booking history pagination
7. Set proper `revalidate` values
8. Add accessibility labels

### Phase 4: Scale & Delight (Week 4+)
> Goal: Scale to 100+ branches, delight users

1. Add Realtime for owner/barber dashboard sync
2. Add SMS notifications via Edge Function
3. Add OAuth login
4. Add geolocation sorting
5. Add dark mode
6. Security headers and CSP
7. Performance monitoring (Web Vitals)
8. Load testing with 100+ concurrent bookings

---

## Open Questions

> [!IMPORTANT]
> **Q1**: Should the booking flow require email verification before allowing a booking? Currently, unverified emails can book.

> [!IMPORTANT]  
> **Q2**: The booking currently defaults to `status: 'pending'` — should it auto-confirm, or does the barber/owner need to manually confirm? This affects the customer's expectation.

> [!IMPORTANT]
> **Q3**: The `document.md` spec mentions "ريال" (SAR) as currency, but the customer web uses "ج.م" (EGP). Which currency is correct for production?

> [!IMPORTANT]
> **Q4**: The orphaned `/shop/[id]` page — should it be deleted entirely, or rebuilt to serve as a branch detail page with a different purpose from the booking flow?

> [!IMPORTANT]
> **Q5**: Do you want to proceed with implementing all phases, or should I start with Phase 1 (Security & Data Integrity) first?
