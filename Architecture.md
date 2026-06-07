# The Digital Atelier — Booking Architecture

> **Document**: System Architecture  
> **Product**: Customer Web (`customer-web`) + Owner Dashboard  
> **Date**: 2026-05-30  
> **Version**: 1.0

---

## 1. Overview

This document describes the complete booking flow — from a customer discovering a branch to a confirmed appointment in the database — and the slot availability system that powers it. The architecture is designed around a single principle:

> **The PostgreSQL server is the single source of truth for time, availability, and booking validity.**

The client device clock is never trusted for business decisions.

---

## 2. Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           CUSTOMER DEVICE (Browser)                          │
│                                                                              │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐   ┌──────────────┐  │
│  │  /shops      │ → │ /barbers     │ → │ /services    │ → │  /booking    │  │
│  │  SSR (guest) │   │  SSR (guest) │   │  SSR (guest) │   │ Client (auth)│  │
│  └──────────────┘   └──────────────┘   └──────────────┘   └──────┬───────┘  │
│                                                                  │           │
│  ┌──────────────────────────────────────────────────────────────┘           │
│  │  Booking Page (React Client Component)                                    │
│  │  ── Uses `get_server_time()` to get authoritative date                    │
│  │  ── Uses `get_staff_available_slots()` to get all slots                   │
│  │  ── Subscribes to Realtime for automatic slot refresh                     │
│  │  ── Calls `createBooking` server action on confirm                         │
│  └──────────────────────────────────────────────────────────────────────────┘
└────────────────────────────────────────┬──────────────────────────────────────┘
                                         │ HTTPS / WebSocket
                                         │
┌────────────────────────────────────────┴──────────────────────────────────────┐
│                         SUPABASE PLATFORM                                      │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐   │
│  │  Supabase Auth                                                          │   │
│  │  ── JWT session management                                               │   │
│  │  ── Email verification                                                   │   │
│  └────────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐   │
│  │  PostgreSQL Database                                                     │   │
│  │                                                                          │   │
│  │  ┌──────────────────────────────────────────────────────────────────┐   │   │
│  │  │  RPC Functions (SECURITY DEFINER)                                 │   │   │
│  │  │  ── get_server_time(p_timezone)                                   │   │   │
│  │  │  ── get_staff_occupied_slots(p_staff_id, p_date)                  │   │   │
│  │  │  ── get_staff_available_slots(p_staff_id, p_date, ...)            │   │   │
│  │  └──────────────────────────────────────────────────────────────────┘   │   │
│  │                                                                          │   │
│  │  ┌──────────────────────────────────────────────────────────────────┐   │   │
│  │  │  Triggers                                                         │   │   │
│  │  │  ── prevent_double_booking (occupied statuses only)                 │   │   │
│  │  │  ── prevent_duplicate_client_booking                              │   │   │
│  │  └──────────────────────────────────────────────────────────────────┘   │   │
│  │                                                                          │   │
│  │  ┌──────────────────────────────────────────────────────────────────┐   │   │
│  │  │  Constraints                                                      │   │   │
│  │  │  ── excl_no_double_booking (GiST EXCLUDE, occupied only)        │   │   │
│  │  │  ── bookings_v2_check (start_time < end_time)                   │   │   │
│  │  └──────────────────────────────────────────────────────────────────┘   │   │
│  │                                                                          │   │
│  │  ┌──────────────────────────────────────────────────────────────────┐   │   │
│  │  │  Tables                                                           │   │   │
│  │  │  ── shops_v2 (branches, timezone column)                        │   │   │
│  │  │  ── shop_staff (barbers, is_active)                             │   │   │
│  │  │  ── services (catalog, price, duration)                         │   │   │
│  │  │  ── working_hours (shift schedules per staff per day)             │   │   │
│  │  │  ── bookings_v2 (appointments with statuses)                      │   │   │
│  │  │  ── profiles (customers, name, phone, avatar)                     │   │   │
│  │  └──────────────────────────────────────────────────────────────────┘   │   │
│  └────────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐   │
│  │  Realtime (WebSocket)                                                     │   │
│  │  ── Listens to `bookings_v2` INSERT/UPDATE for staff_id filter           │   │
│  │  ── Pushes to all connected clients viewing same barber                  │   │
│  └────────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐   │
│  │  Edge Functions                                                           │   │
│  │  ── rate-limit-booking (Upstash Redis)                                   │   │
│  │     5 bookings/user/min, 20 bookings/IP/min                               │   │
│  └────────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
                                         │
                                         │
┌────────────────────────────────────────┴──────────────────────────────────────┐
│                         NEXT.JS SERVER (Node.js)                             │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐   │
│  │  Server Actions                                                         │   │
│  │  ── createBooking(formData)                                             │   │
│  │     1. Validate auth session (supabase server client)                  │   │
│  │     2. Check email_verified                                            │   │
│  │     3. Call rate-limit-booking Edge Function                             │   │
│  │     4. Pre-check: no existing pending/waiting_time booking               │   │
│  │     5. Build booking object with auth.uid() as client_id                 │   │
│  │     6. Insert into bookings_v2                                           │   │
│  │     7. Parse errors: PENDING_BOOKING_EXISTS, SLOT_TAKEN, etc.          │   │
│  │     8. Return success + booking row or structured error                  │   │
│  └────────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐   │
│  │  SSR Pages                                                              │   │
│  │  ── /shops, /shops/[id]/barbers, /shops/[id]/services                   │   │
│  │  ── /profile, /booking/success                                          │   │
│  └────────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Booking Status Lifecycle

```
                    ┌─────────────────────────┐
                    │   Owner/Barber creates   │
                    │   or Customer books      │
                    └───────────┬─────────────┘
                                │
                                ▼
                    ┌─────────────────────────┐
                    │      PENDING            │ ←── New customer booking
                    │  (قيد الانتظار)          │     Blocks slot
                    └───────────┬─────────────┘
                                │ Owner/barber confirms
                                ▼
                    ┌─────────────────────────┐
                    │      CONFIRMED          │ ←── Confirmed by staff
                    │      (مؤكد)              │     Blocks slot
                    └───────────┬─────────────┘
                                │ Service completed
                                ▼
                    ┌─────────────────────────┐
                    │     COMPLETED           │ ←── Service done, paid
                    │     (مكتمل)             │     Slot released
                    └─────────────────────────┘
                                │
                    ┌───────────┴───────────┐
                    │                       │
                    ▼                       ▼
         ┌─────────────────┐    ┌─────────────────┐
         │    CANCELLED     │    │   WAITING_TIME   │
         │    (ملغي)        │    │   (in queue)     │
         │   Slot released  │    │   Blocks slot    │
         └─────────────────┘    └─────────────────┘
```

### Status Rules

| Status | Meaning | Blocks Slot? | Who can set it? |
|--------|---------|--------------|-----------------|
| `pending` | Awaiting barber confirmation | ✅ Yes | Customer (via web), Owner/Barber |
| `confirmed` | Barber approved | ✅ Yes | Owner/Barber |
| `waiting_time` | Customer arrived, waiting in queue | ✅ Yes | Owner/Barber |
| `completed` | Service finished | ❌ No | Owner/Barber |
| `cancelled` | Booking cancelled | ❌ No | Customer, Owner/Barber |

> **Note:** `no_show` is not part of the current schema and is ignored entirely.

---

## 4. Slot Availability Calculation

### 4.1 What Makes a Slot "Occupied"?

A slot is considered **occupied** (unavailable for new bookings) if there exists a `bookings_v2` row for the same `staff_id` + `booking_date` where:

```sql
status IN ('pending', 'confirmed', 'waiting_time')
AND start_time < candidate_end_time
AND end_time > candidate_start_time
```

This check is performed by:
1. **`get_staff_available_slots` RPC** — for generating available slots
2. **`prevent_double_booking` trigger** — belt-and-suspenders at insert time
3. **`excl_no_double_booking` GiST constraint** — hard DB-level prevention

### 4.2 Slot Generation Algorithm (`get_staff_available_slots`)

The RPC runs entirely inside PostgreSQL using `SECURITY DEFINER` to see all bookings regardless of RLS.

**Step 1: Get Server Time**
```sql
v_now_date := (NOW() AT TIME ZONE p_timezone)::DATE;
v_now_min := EXTRACT(HOUR FROM NOW() AT TIME ZONE p_timezone)::INTEGER * 60
           + EXTRACT(MINUTE FROM NOW() AT TIME ZONE p_timezone)::INTEGER;
```

**Step 2: Fetch Working Hours**
```sql
SELECT start_time, end_time, is_off
FROM working_hours
WHERE staff_id = p_staff_id AND day_of_week = EXTRACT(DOW FROM p_date);
```

**Step 3: Generate Grid Candidates**
- Grid step: 10 minutes
- Range: `shift_start` to `shift_end - service_duration`
- Skip past times: `v_slot_start < v_cutoff` (where `v_cutoff = v_now_min + 1` for today, `0` for future dates)

**Step 4: Filter Occupied Slots**
```sql
-- Real overlap check (actual times, not display times)
IF EXISTS (
  SELECT 1 FROM bookings_v2
  WHERE staff_id = p_staff_id
    AND booking_date = p_date
    AND status IN ('pending', 'confirmed', 'waiting_time')
    AND start_time < min_to_time(v_slot_end)
    AND end_time > min_to_time(v_slot_start)
) THEN skip;
```

**Step 5: Compute Display Start (10-min Visual Overlap)**

The **actual** start/end times are always preserved for the database. Only the **display** start time may shift backward by up to 10 minutes to create a visual overlap with the preceding booking:

```
Actual timeline:   [Booking A: 10:00-10:30]  gap=0  [Candidate: 10:30-11:00]
Display timeline:  [Booking A: 10:00-10:30]        [Candidate: 10:20-11:00]  ← display_start shifted back 10 min
```

Rules:
- If `gap == 0`: `display_start = actual_start - 10 min` (but not earlier than preceding booking's start + 10 min)
- If `gap <= 10 min`: `display_start = preceding_end - gap` (partial overlap)
- If `gap > 10 min`: `display_start = actual_start` (no overlap)

**Step 6: Score Each Slot**

| Factor | Weight | Description |
|--------|--------|-------------|
| Packing Density Ratio (PDR) | 40% | Prefers slots that fill larger gaps (reduce fragmentation) |
| Adjacency Bonus | 25% | Rewards slots that are back-to-back with existing bookings |
| Earliness | 20% | Prefers earlier slots in the shift |
| Fragmentation Penalty | 15% | Penalizes slots that leave tiny unusable gaps |

**Step 7: Return Results**

- Returns **all** available slots, sorted by actual start time ascending
- Top 5 by score are flagged `is_recommended = true`
- Client highlights recommended slots with a star icon

### 4.3 Example Output

```json
[
  {
    "display_start_time": "10:20",
    "actual_start_time": "10:30",
    "actual_end_time": "11:00",
    "display_start_minutes": 620,
    "actual_start_minutes": 630,
    "actual_end_minutes": 660,
    "score": 0.85,
    "is_recommended": true
  },
  {
    "display_start_time": "11:00",
    "actual_start_time": "11:00",
    "actual_end_time": "11:30",
    "display_start_minutes": 660,
    "actual_start_minutes": 660,
    "actual_end_minutes": 690,
    "score": 0.72,
    "is_recommended": true
  },
  {
    "display_start_time": "11:30",
    "actual_start_time": "11:30",
    "actual_end_time": "12:00",
    "display_start_minutes": 690,
    "actual_start_minutes": 690,
    "actual_end_minutes": 720,
    "score": 0.45,
    "is_recommended": false
  }
]
```

---

## 5. Complete Booking Flow

### 5.1 Phase 1: Discovery (Guest — No Auth Required)

```
1. User visits /shops
   → Next.js SSR fetches shops_v2 (public RLS: status = 'open')
   → ISR revalidate = 60s

2. User clicks a shop → /shops/[id]/barbers
   → SSR fetches shop_staff (public RLS: via shop_id)
   → ISR revalidate = 30s

3. User clicks a barber → /shops/[id]/services?barberId=X
   → SSR fetches services (public RLS: active only)
   → ISR revalidate = 60s
```

### 5.2 Phase 2: Authentication (If Needed)

```
4. User clicks "احجز الآن" → /booking?shopId=X&barberId=Y&serviceId=Z
   → Booking page (Client Component) checks auth
   → If not authenticated: redirect to /login?redirect=...
   → If authenticated: proceed

5. Login/Register
   → Server action validates inputs (password ≥8, phone regex)
   → Creates auth user + profile row (email, name, phone)
   → Redirects back to /booking with preserved params
```

### 5.3 Phase 3: Slot Selection (Authenticated)

```
6. Booking page mounts
   → Calls get_server_time('Africa/Cairo')
   → Receives: { server_date: "2026-05-30", server_time_minutes: 1042 }
   → Initializes date picker with server_date (not new Date())

7. User selects a date (default = today from server)
   → Calls get_staff_available_slots(staff_id, date, duration, timezone)
   → Returns all available slots with is_recommended flags
   → Renders slots; recommended ones get star icon + brand border

8. Realtime subscription starts
   → Channel: staff-bookings-{staff_id}-{date}
   → Listens to INSERT/UPDATE on bookings_v2 for this staff
   → On any change: automatically re-fetches slots
   → If a slot the user selected becomes occupied: selection clears, error shown
```

### 5.4 Phase 4: Booking Creation

```
9. User selects a slot and clicks "تأكيد الحجز"
   → Client collects: shopId, staffId, serviceId, bookingDate,
     startTime (actual), endTime (actual), displayStartTime (visual)
   → Calls createBooking server action with FormData

10. Server action executes:
    a. Validates auth session (supabase server client)
    b. Checks email_verified — rejects if unverified
    c. Calls rate-limit-booking Edge Function
    d. Pre-check: SELECT 1 FROM bookings_v2
       WHERE client_id = auth.uid()
         AND status IN ('pending', 'waiting_time')
       → If found: return PENDING_BOOKING_EXISTS
    e. Builds booking object:
       { shop_id, staff_id, service_id, client_id: auth.uid(),
         client_name, client_phone, booking_date,
         start_time, end_time, display_start_time,
         status: 'pending', payment_method: 'cash' }
    f. Inserts into bookings_v2
    g. DB trigger prevent_double_booking fires:
       → Checks overlap with FOR UPDATE SKIP LOCKED
       → If overlap: raises exception (SLOT_TAKEN)
    h. DB trigger prevent_duplicate_client_booking fires:
       → Re-checks for duplicate pending booking
       → If found: raises exception (PENDING_BOOKING_EXISTS)
    i. GiST constraint excl_no_double_booking validates:
       → If overlap with occupied status: rejects insert
    j. Server action catches exceptions, maps to Arabic messages
    k. Returns { success: true, booking: row } or structured error

11. Client receives success
    → Redirects to /booking/success?id={booking.id}
    → Realtime subscription automatically pushes the new booking
       to all other clients viewing this barber's slots
```

### 5.5 Phase 5: Confirmation

```
12. Success page loads
    → SSR or client fetch: SELECT * FROM bookings_v2 WHERE id = ? AND client_id = auth.uid()
    → RLS ensures customer can only see their own booking
    → Displays: "في انتظار تأكيد الحجز" badge
    → Shows: service name, shop name, barber name, date, time, price, booking ID
    → Links: profile page, home
```

---

## 6. Security Model (Defense in Depth)

The booking system uses **three independent layers** of protection. Any one layer can prevent an invalid booking, even if the others are bypassed.

### Layer 1: Server Action (`createBooking`)

```
- Validates auth session (JWT cookie, server-side only)
- Validates email verification
- Rate limits via Edge Function
- Pre-checks duplicate pending booking
- Sets client_id from auth.uid() (not client-provided)
- All inserts go through server client (no anon key exposure)
```

### Layer 2: Row Level Security (RLS)

```sql
-- Only the authenticated user themselves can insert with their own client_id
CREATE POLICY bookings_insert_client ON bookings_v2
  FOR INSERT WITH CHECK (client_id = auth.uid());

-- Customers can only see their own bookings
CREATE POLICY bookings_select ON bookings_v2
  FOR SELECT USING (client_id = auth.uid());
```

Even if a malicious actor bypasses the server action and sends a raw `.insert()` with the anon key, the RLS policy rejects any `client_id` that doesn't match their `auth.uid()`.

### Layer 3: Database Triggers & Constraints

```sql
-- Trigger: prevents double-booking for occupied statuses
CREATE TRIGGER prevent_double_booking
BEFORE INSERT OR UPDATE ON bookings_v2
FOR EACH ROW
WHEN (NEW.status IN ('pending', 'confirmed', 'waiting_time'))
EXECUTE FUNCTION check_booking_overlap();

-- GiST constraint: hard database-level exclusion
ALTER TABLE bookings_v2
ADD CONSTRAINT excl_no_double_booking
EXCLUDE USING gist (
  staff_id WITH =,
  booking_date WITH =,
  make_time_range(start_time, end_time) WITH &&
)
WHERE (status IN ('pending', 'confirmed', 'waiting_time'));
```

Even if RLS were somehow bypassed (e.g., by a superuser or function running as `SECURITY DEFINER` without proper checks), the trigger and GiST constraint would still block overlapping bookings.

### Layer 4: RPC Security (`SECURITY DEFINER`)

```sql
CREATE FUNCTION get_staff_available_slots(...)
RETURNS TABLE(...)
SECURITY DEFINER AS $$
  -- This function runs with elevated privileges
  -- It can see ALL bookings (bypassing RLS) to compute accurate availability
  -- But it only RETURNS slot times, never booking details
$$ LANGUAGE plpgsql;
```

The `SECURITY DEFINER` is safe because:
- It only **reads** booking data
- It only returns **availability**, not customer names or other sensitive data
- It never modifies data
- It has no parameters that could be used for SQL injection (UUID + DATE + INTEGER only)

---

## 7. Timezone Strategy

### 7.1 Problem

All shops currently operate in Egypt. The database server runs in UTC. Client devices may be in any timezone. Using `new Date()` on the client would:
- Show wrong "today" for users with clocks set to the future/past
- Filter out valid slots or show past slots as available
- Cause date string mismatches (`toISOString().slice(0,10)` returns UTC date, which can be wrong for late-night Cairo users)

### 7.2 Solution: Server-Time Architecture

| Decision | Rationale |
|----------|-----------|
| **Default timezone** | `Africa/Cairo` for all shops (EGP currency, Egypt market) |
| **Date picker** | Initialized from `get_server_time('Africa/Cairo')` |
| **Past-time filter** | Applied inside `get_staff_available_slots` using `NOW() AT TIME ZONE 'Africa/Cairo'` |
| **Date strings** | `YYYY-MM-DD` strings passed between client and server (no conversion needed) |
| **Time strings** | `HH:MM` strings stored as `TIME WITHOUT TIME ZONE` (no TZ ambiguity) |
| **Future shops** | `shops_v2.timezone` column added; can be set per-shop when expanding beyond Egypt |

### 7.3 Time Flow Diagram

```
Client (any TZ)
    │
    │ GET /booking
    │
    ▼
Booking page mounts
    │
    │ RPC: get_server_time('Africa/Cairo')
    │
    ▼
Supabase (UTC server)
    │
    │ Computes: NOW() AT TIME ZONE 'Africa/Cairo'
    │ Returns: { server_date: "2026-05-30", server_time_minutes: 1042 }
    │
    ▼
Client initializes date picker with server_date
    │
    │ User selects date
    │
    ▼
Client calls: get_staff_available_slots(staff_id, date, duration, 'Africa/Cairo')
    │
    ▼
Supabase (UTC server)
    │
    │ Computes: (NOW() AT TIME ZONE 'Africa/Cairo')::DATE
    │ If selected_date == server_date:
    │    cutoff = server_time_minutes + 1
    │ Else:
    │    cutoff = 0
    │
    │ Generates grid candidates, filters by cutoff
    │ Checks overlap against occupied bookings
    │ Returns slots
    │
    ▼
Client renders slots (all times already in HH:MM format)
```

---

## 8. Realtime Synchronization

### 8.1 Why Realtime?

Without real-time updates:
- Two customers can see the same slot as "available"
- Customer A books it → Customer B clicks "confirm" → gets an error
- Barber/owner cancels a booking → Customer viewing the page doesn't see the slot reopen

### 8.2 Implementation

```typescript
// Booking page subscribes to bookings_v2 changes for the selected staff
const channel = supabase
  .channel(`staff-bookings-${barberId}-${selectedDate}`)
  .on(
    'postgres_changes',
    {
      event: '*',                    // INSERT, UPDATE, DELETE
      schema: 'public',
      table: 'bookings_v2',
      filter: `staff_id=eq.${barberId}`,
    },
    () => {
      // Re-fetch slots from server
      loadSlots();
    }
  )
  .subscribe();
```

### 8.3 Behaviors

| Event | Customer A (viewing slots) | Customer B (viewing slots) |
|-------|---------------------------|---------------------------|
| Customer A books 10:00 | Sees success page | Slot disappears from their list |
| Barber cancels 10:00 | (already on success page) | Slot reappears as available |
| Barber confirms 10:00 | Status unchanged for customer | No change (still occupied) |
| Walk-in booking created | — | Slot disappears (walk-in is `client_id = null`, but status is `pending`) |

### 8.4 Limitations

- Realtime filter is on `staff_id` only, not `booking_date`. This means a booking for the same barber on a different date will also trigger a re-fetch. This is acceptable (lightweight RPC call).
- Realtime requires the user to be online. Offline users will see stale slots until they reconnect.

---

## 9. Data Flow Summary

```
┌─────────────┐     ┌─────────────────────┐     ┌─────────────────────┐
│  Customer   │────▶│   Booking Page      │────▶│  get_server_time()  │
│  (Browser)  │◀────│   (Client Component)│◀────│  (PostgreSQL RPC)   │
└─────────────┘     └─────────────────────┘     └─────────────────────┘
       │                       │
       │                       │ RPC
       │                       ▼
       │              ┌─────────────────────┐
       │              │ get_staff_available │
       │              │ _slots()            │
       │              └─────────────────────┘
       │                       │
       │                       │ All slots + recommendations
       │◀──────────────────────┘
       │
       │ User selects slot → "تأكيد الحجز"
       │
       ▼
┌─────────────────────┐
│   createBooking()   │
│   (Server Action)   │
└─────────────────────┘
       │
       ├──▶ Validate auth
       ├──▶ Validate email_verified
       ├──▶ Check rate limit (Edge Function)
       ├──▶ Pre-check duplicate pending
       ├──▶ Insert into bookings_v2
       ├──▶ DB trigger validates overlap
       ├──▶ GiST constraint validates overlap
       │
       ▼
┌─────────────────────┐
│   bookings_v2 row   │
│   status: 'pending' │
└─────────────────────┘
       │
       ├──▶ Realtime broadcasts to all clients
       │    viewing this barber → slots refresh
       │
       ▼
┌─────────────────────┐
│  /booking/success   │
│  Confirmation page  │
└─────────────────────┘
```

---

## 10. Failure Scenarios & Handling

| Scenario | What Happens | Recovery |
|----------|-------------|----------|
| **Slot taken between selection and click** | DB trigger rejects insert with `SLOT_TAKEN` | User sees Arabic error: "عذراً، هذا الموعد تم حجزه للتو..." Slots auto-refresh via Realtime |
| **User has pending booking** | Pre-check fails with `PENDING_BOOKING_EXISTS` | User sees: "لديك حجز في الانتظار بالفعل" |
| **Rate limit exceeded** | Edge Function rejects with `RATE_LIMITED` | User sees rate limit message, can retry after 1 minute |
| **Email not verified** | Server action rejects with `EMAIL_NOT_VERIFIED` | User sees: "يرجى تأكيد بريدك الإلكتروني" |
| **Session expires mid-flow** | `createBooking` fails with `AUTH_REQUIRED` | Redirected to `/login?redirect=...` |
| **Supabase unreachable** | RPC calls fail | Date picker shows spinner; booking button disabled |
| **Device clock is wrong** | **No impact** | All time logic uses server time |
| **Two users click same slot simultaneously** | DB trigger + `FOR UPDATE SKIP LOCKED` ensures one succeeds, one gets `SLOT_TAKEN` | Both get appropriate feedback; Realtime refreshes the other's UI |

---

## 11. Glossary

| Term | Definition |
|------|-----------|
| **Actual start time** | The real booking start time stored in the database (`start_time` column) |
| **Display start time** | The visual start time shown to the user, which may include a 10-minute overlap with the preceding booking |
| **Defense in depth** | Multiple independent security layers (server action + RLS + trigger + constraint) |
| **GiST** | Generalized Search Tree — PostgreSQL index type supporting exclusion constraints |
| **Occupied status** | A booking status that blocks the slot: `pending`, `confirmed`, `waiting_time` |
| **Released status** | A booking status that frees the slot: `completed`, `cancelled` |
| **RPC** | Remote Procedure Call — PostgreSQL function exposed by Supabase over HTTP |
| **RLS** | Row Level Security — per-row access control in PostgreSQL |
| **SECURITY DEFINER** | PostgreSQL function execution mode that runs with the privileges of the function owner, not the caller |
| **Server time** | PostgreSQL `NOW()` — the authoritative clock for all availability logic |
| **Smart suggestion** | A slot flagged `is_recommended = true` by the scoring algorithm (top 5 by score) |

---

*End of Architecture Document*
