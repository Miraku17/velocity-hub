@AGENTS.md

# Velocity Pickleball Hub

## Project Overview
A public-facing website and court booking platform for **Velocity Pickleball Hub**. Users can browse the site, view available courts, and book sessions — **no user sign-up or authentication required**.

## Tech Stack
- **Framework:** Next.js 16 (App Router) — React 19, Tailwind CSS v4
- **UI Components:** shadcn/ui (Radix primitives + Tailwind)
- **State Management:** Zustand
- **Data Fetching / Server State:** TanStack Query (React Query)
- **Backend / Database:** Supabase (Postgres, real-time, storage)
- **Language:** TypeScript (strict mode)

## Key Constraints
- **No auth / no user accounts.** Bookings are anonymous — collect only name, email, and phone at checkout.
- Always read `node_modules/next/dist/docs/` before using Next.js APIs — this version has breaking changes from training data.
- Use the `@/*` path alias (mapped to project root) for all imports.

## Project Structure
```
app/                  # Next.js App Router pages & layouts
  components/         # Shared React components
  (marketing)/        # Public marketing pages (home, about, pricing)
  booking/            # Court booking flow
lib/                  # Utilities, Supabase client, Zustand stores
  supabase/           # Supabase client & typed helpers
  stores/             # Zustand stores
  hooks/              # Custom React hooks (TanStack Query wrappers)
types/                # Shared TypeScript types
```

## Design Approach
- **Mobile first.** Design and build for small screens first, then scale up with responsive breakpoints (`sm:`, `md:`, `lg:`). Base styles target mobile; use Tailwind breakpoint prefixes to enhance for larger viewports.

## Coding Conventions
- **Components:** PascalCase filenames (`CourtCard.tsx`). Default exports for page/layout, named exports for components.
- **Utilities / stores / hooks:** camelCase filenames (`useBooking.ts`, `bookingStore.ts`).
- **Styling:** Tailwind utility classes via shadcn/ui. No custom CSS unless absolutely necessary.
- **Dropdowns / Selects:** Always use the shadcn `Select` component (`@/components/ui/select`) instead of native HTML `<select>`. Import `Select`, `SelectContent`, `SelectItem`, `SelectTrigger`, `SelectValue`.
- **Server vs Client:** Keep components server-side by default. Add `"use client"` only when state, effects, or browser APIs are needed.
- **Data fetching:** Use TanStack Query for client-side fetching. Use Next.js server components / `fetch` for server-side data.
- **State:** Zustand for client-side UI state (booking cart, filters). Do not use Zustand for server-cached data — that's TanStack Query's job.

## API Security
- **All GET endpoints that return customer PII (name, email, phone) MUST require admin auth.** Use `getAuthenticatedUser()` + `checkIsAdmin()` from `@/lib/supabase/auth`.
- Public (unauthenticated) API access must be scoped: require specific filters (e.g. `court_id` + `date`) and return only non-sensitive fields (e.g. `start_time`, `end_time`, `status`).
- The reservations table is accessed via `reservations_view` (not `reservations` directly). The date column is `reservation_date`.
- POST/PATCH/DELETE on admin resources must verify admin role. POST for public bookings uses rate limiting instead of auth.

## Mobile / Android Compatibility
- **Never use `pointer-events-none` + `pointer-events-auto` for modal overlays.** Android browsers don't reliably propagate touch events through `pointer-events: none` ancestors. Instead, use `onClick` on the overlay container with `e.stopPropagation()` on the inner card.
- **Use `onClick` instead of `onMouseDown`** for modal dismiss handlers — `onMouseDown` doesn't reliably fire on touch devices.
- **Use the `<Portal>` component (`@/components/ui/portal`) for all modals** in admin pages. Modals rendered inside `<main class="overflow-y-auto">` can have broken `fixed` positioning on Android. Portal renders them at `document.body`.

## Supabase
- Store the Supabase URL and anon key in `.env.local` as `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- Use Row Level Security (RLS) policies — even without auth, RLS should restrict writes appropriately.
- Never expose the service role key to the client.

## Commands
```bash
npm run dev      # Start dev server
npm run build    # Production build
npm run lint     # ESLint
```
