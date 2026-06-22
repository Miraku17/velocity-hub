# Supabase region migration — Sydney → Singapore

Move the Velocity Pickleball Hub Supabase project from **`ap-southeast-2` (Sydney)**
to **`ap-southeast-1` (Singapore)**, ~2× closer to PH users.

Supabase cannot change a project's region in place — this is a **migrate-to-a-new-project**
operation. Plan for a short maintenance window (the final data copy). This is a
**production database migration**: do a full dry run into a throwaway project first,
and keep the old project untouched until you've verified the new one in production.

---

## What this project contains (inventory)

| Area | Detail |
|---|---|
| **DB schema** | `public` schema in `supabase/migrations/`. Tables incl. `bookings`, `booking_items`, `reservations`, `courts`, `court_schedules`, `blocked_slots`, `profiles`, `permissions`, `role_permissions`, `user_permissions`, `payment_qr_codes`, `payment_receipts`, `time_entries`, `audit_logs`, `venue_settings`. Views: `reservations_view`, `bookings_view`, `booking_items_view`. RPCs incl. `get_calendar_availability`, `create_booking`, `is_admin`, `handle_new_user`. |
| **Extensions** | `pg_graphql`, `pg_stat_statements`, `pgcrypto`, `supabase_vault`, `uuid-ossp` (all standard; auto-present in new projects). |
| **Auth** | Admin/staff users in `auth.users`. Trigger `on_auth_user_created` → `handle_new_user()` inserts into `public.profiles`. `is_admin()` drives RLS. Passwords are bcrypt hashes in `auth.users.encrypted_password` — they carry over. |
| **Storage buckets** | `venue` (public — logos/images), `payment_qr_codes` (public — QR images), `receipts` (private — payment receipts, served via signed URLs). Verify the full list against the dashboard before cutover. |
| **Edge functions** | None. |
| **Realtime** | Enabled. |
| **External services (unchanged)** | Resend (`RESEND_API_KEY`), Cloudflare Turnstile (`*TURNSTILE*`), app domain (`NEXT_PUBLIC_SITE_URL`). Not Supabase-coupled — no change. |

**Env vars that change (Vercel + local):** `NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
**Everything else stays the same.**

---

## Prerequisites

- `supabase` CLI ≥ latest, `psql` / `pg_dump` **v16+** (must match the project's Postgres major version), and `rclone` for storage.
- Both projects' **direct (session) DB connection strings** — Dashboard → *Project Settings → Database → Connection string → URI*. Use the **direct** connection (port 5432), not the pooler, for dump/restore.
- Service-role keys + (for storage) **S3 access keys** for both projects — Dashboard → *Project Settings → Storage → S3 access keys*.

Set these once per shell (never commit them):

```bash
export OLD_DB_URL='postgresql://postgres:[OLD_PW]@db.pkahsxwnkvqmwmnvbzdc.supabase.co:5432/postgres'
export NEW_DB_URL='postgresql://postgres:[NEW_PW]@db.[NEW_REF].supabase.co:5432/postgres'
```

---

## Phase 0 — Prep & record current settings (no downtime)

The DB dump does **not** capture project-level config. Screenshot / note from the **old** dashboard so you can reproduce them on the new project:

- **Auth** → URL config: *Site URL* + all *Redirect URLs*.
- **Auth** → Providers enabled, *Email* settings (confirm/secure email change), rate limits.
- **Auth** → *SMTP* settings (custom SMTP host/user, if any) and *Email templates* (the repo has `supabase/templates/invite.html` and `reset-password.html` — re-paste them).
- **Storage** → each bucket's **public/private** flag and file-size limit (`venue`, `payment_qr_codes` = public; `receipts` = private).
- **Database** → any **network restrictions** / disallowed IPs (config shows currently disabled).
- **Project Settings** → any **secrets** stored in Vault, if used.

---

## Phase 1 — Create the new project

1. Supabase Dashboard → **New project**, region **Southeast Asia (Singapore) `ap-southeast-1`**.
   Use the **same Postgres major version** as the old project.
2. Record the new **project ref**, **anon key**, **service-role key**, and **DB password**.

---

## Phase 2 — Schema + data (the database)

Run a full **dry run** into the new (empty) project. Use the Supabase CLI dumps — it
scopes correctly to the `public` schema and emits restore-friendly SQL.

```bash
# --- dump from OLD ---
supabase db dump --db-url "$OLD_DB_URL" -f roles.sql  --role-only
supabase db dump --db-url "$OLD_DB_URL" -f schema.sql
supabase db dump --db-url "$OLD_DB_URL" -f data.sql   --data-only --use-copy
```

```bash
# --- restore into NEW ---
# session_replication_role = replica disables triggers + FK checks during the
# COPY, which (a) prevents handle_new_user() from double-inserting profiles and
# (b) removes table-ordering problems. ON_ERROR_STOP + single-transaction = all
# or nothing.
psql \
  --single-transaction \
  --variable ON_ERROR_STOP=1 \
  --file roles.sql \
  --file schema.sql \
  --command 'SET session_replication_role = replica' \
  --file data.sql \
  --dbname "$NEW_DB_URL"
```

> `roles.sql` may emit warnings for roles that already exist on the new project —
> that's expected; the `--single-transaction` restore still succeeds.

**Verify (run against `$NEW_DB_URL`):** row counts match the old project for the
hot tables.

```sql
select 'bookings' t, count(*) from bookings
union all select 'booking_items', count(*) from booking_items
union all select 'reservations', count(*) from reservations
union all select 'courts', count(*) from courts
union all select 'court_schedules', count(*) from court_schedules
union all select 'blocked_slots', count(*) from blocked_slots
union all select 'profiles', count(*) from profiles
union all select 'audit_logs', count(*) from audit_logs;
```

---

## Phase 3 — Auth users

The CLI dump above is `public`-only. Migrate the auth users separately so admins
keep their logins and passwords, and so `profiles.id` / `created_by` FKs stay valid.

```bash
# Dump auth users + identities (data only) from OLD
pg_dump "$OLD_DB_URL" \
  --data-only --no-owner --no-privileges \
  --table 'auth.users' --table 'auth.identities' \
  -f auth.sql

# Restore into NEW with triggers disabled (so handle_new_user doesn't re-insert
# profiles that Phase 2 already restored).
psql \
  --single-transaction \
  --variable ON_ERROR_STOP=1 \
  --command 'SET session_replication_role = replica' \
  --file auth.sql \
  --dbname "$NEW_DB_URL"
```

**Verify:** `select count(*) from auth.users;` matches old, and
`select email from auth.users order by created_at;` lists your admins. After
cutover, confirm an admin can actually **sign in** on the deployed app.

> If the two projects' auth schema versions differ and `auth.sql` errors, fall
> back to per-user recreation via the Admin API (`supabase.auth.admin.createUser`
> with `id` + `password` preserved) — but the direct dump is preferred since it
> keeps the original bcrypt hashes and UUIDs.

---

## Phase 4 — Storage files

Files live in the storage backend, not the DB dump. Recreate buckets, then copy
files; uploading through Supabase's S3 endpoint registers the `storage.objects`
rows automatically.

1. **Recreate buckets** on the new project with **matching names + public/private
   flags**: `venue` (public), `payment_qr_codes` (public), `receipts` (private).
   (Dashboard → Storage → New bucket, or `insert into storage.buckets ...`.)

2. **Copy files with rclone** (Supabase has the S3 protocol enabled). Configure two
   remotes using each project's S3 access keys and its region:

   ```ini
   # ~/.config/rclone/rclone.conf
   [old]
   type = s3
   provider = Other
   access_key_id = OLD_S3_KEY
   secret_access_key = OLD_S3_SECRET
   endpoint = https://pkahsxwnkvqmwmnvbzdc.supabase.co/storage/v1/s3
   region = ap-southeast-2

   [new]
   type = s3
   provider = Other
   access_key_id = NEW_S3_KEY
   secret_access_key = NEW_S3_SECRET
   endpoint = https://NEW_REF.supabase.co/storage/v1/s3
   region = ap-southeast-1
   ```

   ```bash
   for b in venue payment_qr_codes receipts; do
     rclone sync "old:$b" "new:$b" --progress
   done
   ```

**Verify:** `rclone size old:receipts` == `rclone size new:receipts` for each
bucket; open the venue logo + a QR image in the new dashboard.

---

## Phase 5 — Project settings parity

Reproduce everything from **Phase 0** on the **new** project: Auth Site URL +
Redirect URLs, providers, SMTP, email templates (invite/reset), storage bucket
limits, network restrictions, Vault secrets. The app won't behave correctly until
these match.

---

## Phase 6 — Repoint the app

Code change in this repo — `next.config.ts` hardcodes the old Supabase host for
`next/image`, so venue/QR images 404 until updated:

```ts
// next.config.ts → images.remotePatterns
{ protocol: "https", hostname: "NEW_REF.supabase.co" },   // was pkahsxwnkvqmwmnvbzdc.supabase.co
```

`vercel.json` — move functions to Singapore to stay co-located with the new DB:

```json
{ "$schema": "https://openapi.vercel.sh/vercel.json", "regions": ["sin1"] }
```

**Vercel env vars** (Production + Preview) — update only these, then redeploy:

- `NEXT_PUBLIC_SUPABASE_URL` → `https://NEW_REF.supabase.co`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` → new anon key
- `SUPABASE_SERVICE_ROLE_KEY` → new service-role key

Update local `.env.local` / `.env.production.local` to match. Re-link the CLI:
`supabase link --project-ref NEW_REF`.

---

## Phase 7 — Cutover (maintenance window, low-traffic PH hours)

1. **Freeze writes** to the old project (put the app in maintenance, or revoke
   write on the old DB).
2. **Re-sync the delta** since the dry run: re-run Phase 2 data dump + restore
   (truncate-and-reload the new project, or restore into a fresh new project), then
   Phase 3 auth, then Phase 4 `rclone sync` (only changed files copy).
3. **Swap env vars** in Vercel + deploy (Phase 6). Because the project ref changes,
   the anon/service keys rotate — existing admin sessions are invalidated and admins
   simply re-login.
4. **Verify** with the checklist below.
5. Keep the old project **paused, not deleted**, for at least a few days as rollback.

---

## Phase 8 — Verification checklist (on the live, repointed app)

- [ ] `/schedules` loads availability; `/api/grid-availability?date=…` returns 200.
- [ ] Repeat hit shows `x-vercel-cache: HIT`; function region reports `sin1`.
- [ ] `/booking` → complete a real booking end-to-end; row appears in `bookings`/`booking_items`.
- [ ] No-double-book: try booking an already-taken slot → rejected by the unique-slot constraint.
- [ ] Admin can **sign in** (auth migrated), and RLS-gated admin pages load.
- [ ] Venue logo + payment QR images render (next/image host updated); a receipt signed-URL opens.
- [ ] Admin invite + password-reset emails send (Auth SMTP/templates configured).
- [ ] Latency check: warm `/api/grid-availability` TTFB should drop materially vs Sydney.

---

## Rollback

If verification fails, revert the three Vercel env vars (and `next.config.ts` host +
`vercel.json` region) to the old project and redeploy. Because the old project was
only **frozen**, not modified, it's an instant fallback. Investigate, then retry the
cutover.

---

## Post-migration cleanup

- Once stable for several days, delete the dry-run/throwaway project and the dump
  files (`roles.sql schema.sql data.sql auth.sql` — they contain PII + auth hashes;
  `shred`/delete them).
- Pause or delete the old Sydney project.
- Commit the `next.config.ts` + `vercel.json` changes.
