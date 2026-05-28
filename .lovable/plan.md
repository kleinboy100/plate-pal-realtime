
## 1. Google Maps connector

Connect the Google Maps Platform connector. We use the gateway server-side (Routes API for distance/ETA) and the browser key client-side (Maps JS for live driver tracking).

## 2. Database

New table `restaurant_drivers` (mirrors `restaurant_staff`): `id, restaurant_id, user_id, email, created_at`. RLS: owner manages, driver views own.

Add columns to `orders`:
- `driver_id uuid` — assigned driver
- `driver_accepted_at timestamptz`
- `delivered_at timestamptz`
- `tip_amount numeric default 0`
- `distance_meters integer`

Add column to `restaurants`: `delivery_rate_per_100m numeric default 0.70`.

New helper `is_restaurant_driver()` (SECURITY DEFINER) and RLS additions on `orders`:
- Drivers can SELECT delivery orders at their restaurant where status in ('ready','out_for_delivery','delivered') (pool + own).
- Drivers can UPDATE orders where `driver_id = auth.uid()` OR (claim) `driver_id IS NULL AND status='ready'`.

New RPC `claim_delivery_order(order_id)` — atomically sets driver_id, status='out_for_delivery', driver_accepted_at; only when unassigned + status='ready' + caller is driver at that restaurant.

New RPC `mark_order_delivered(order_id)` — driver_id must match auth.uid(); sets status='delivered', delivered_at.

Update `create_validated_order` signature to accept `p_tip_amount numeric default 0`; add to total; persist on order. Delivery fee already passed in by client (validated 0–5000).

## 3. Edge function: `compute-delivery-quote`

Replaces OSRM call. Input: restaurant_id, destination address or lat/lng. Uses Google Routes API via gateway to compute meters + duration. Returns `{ distance_meters, duration_seconds, fee }` where `fee = round((distance_meters / 100) * rate_per_100m, 2)`. Fallback: Haversine × R0.70/100m if Routes fails.

## 4. Frontend

**Cart / checkout**
- Replace flat R25 logic. Call `compute-delivery-quote` after address is set; show breakdown (distance, fee).
- Tip selector: chips (R0, R5, R10, R20, custom). Passed to `create_validated_order` and to Yoco amount.

**OrderDetail (customer)**
- "Tip your driver" button once `status='delivered'` and `tip_amount=0`. Increments via RPC `add_tip(order_id, amount)` (new, SECURITY DEFINER, customer only).

**Owner dashboard**
- New `DriverManager` component (clone of `StaffManager`) using `resolve-staff-email` flow → inserts into `restaurant_drivers`.

**Driver dashboard** (`/driver/dashboard`)
- Hook `useIsRestaurantDriver` (mirrors staff hook). Auth redirect added in `Auth.tsx` / role-based redirector.
- 3 tabs:
  1. **Ready for pickup** — delivery orders, `status='ready'`, `driver_id IS NULL`. Accept (calls `claim_delivery_order`) / Decline (local hide only; pool stays open).
  2. **Active delivery** — orders where `driver_id = me AND status='out_for_delivery'`. Google Map (Maps JS): driver's `watchPosition`, restaurant marker, destination marker, Routes API polyline + ETA. "Mark delivered" button.
  3. **Delivered** — orders where `driver_id = me AND status='delivered'` (last 30 days), showing tip if any.

**Navbar / routing**
- Add `/driver/dashboard` route, role-based redirect (driver → driver dashboard, hide bottom nav like staff).

## 5. Memory updates

Update Core: pricing now R0.70 per 100m via Google Routes (was OSRM/R25 flat). Add memory entries for driver role, tips, Google Maps integration.

## Technical notes

- Driver realtime location stays client-side only (no DB write) per request — "see his current location to destination" is on the driver's own device. (If you want the customer to also see the driver moving, say so and I'll add a `driver_locations` table + Supabase Realtime broadcast.)
- Google Routes API gateway path: `routes/directions/v2:computeRoutes`.
- Browser Maps JS uses `VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY` with `loading=async` + `callback=initMap`, no `mapId`, classic `google.maps.Marker`.
- Existing Mapbox `DeliveryMap` stays for the customer order page (or we can swap it later).
