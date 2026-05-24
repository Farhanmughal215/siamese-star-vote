# Supabase setup — Phase 3A + 3B

This folder is the backend foundation for Siamese Star Vote. After running
the three SQL files below, the frontend's existing flows will write to
Supabase in the background while still functioning if the backend is down
(localStorage fallback).

## What's in this folder

```
supabase/
├── migrations/
│   └── 20260523000000_initial_schema.sql   ← all 8 tables, indexes, RLS enabled
├── seed.sql                                ← cats, invitation codes, app settings
├── policies_phase3b.sql                    ← anon-permissive RLS policies (prototype only)
└── README.md                               ← this file
```

## One-time project setup

1. Create a project at [supabase.com](https://supabase.com).
2. Copy your project URL and anon key from **Project Settings → API**.
3. In the repo root:
   ```bash
   cp .env.example .env.local
   ```
   Then paste your `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   into `.env.local`.
4. Apply the schema (pick one of the two options below).

### Option A — Supabase CLI (recommended)

```bash
# Install once:
npm install -g supabase

# Login + link this repo to your project:
supabase login
supabase link --project-ref <your-project-ref>

# Apply migration + seed:
supabase db push
psql "$(supabase status -o env | grep DB_URL | cut -d= -f2)" \
  -f supabase/seed.sql
```

Or the all-in-one local reset:

```bash
supabase db reset    # drops everything, re-runs migrations, runs seed.sql
```

### Option B — Supabase Dashboard SQL Editor

1. **SQL Editor → New query** → paste the contents of
   `migrations/20260523000000_initial_schema.sql` → **Run**.
2. **SQL Editor → New query** → paste `seed.sql` → **Run**.
3. **SQL Editor → New query** → paste `policies_phase3b.sql` → **Run**.

That's it — `cats` will have 16 rows, `app_settings` will have the three
defaults, `invitation_codes` will have four demo codes, and every table
will have a permissive RLS policy so the frontend's anon-key writes go
through.

## Verifying

In the **Table Editor**, you should see eight tables:

- `voters` (empty)
- `cats` (16 rows — Lucy, Charlie, Feli, … Soul)
- `hearts` (empty)
- `cat_affection` (empty)
- `coupons` (empty)
- `wheel_spins` (empty)
- `invitation_codes` (4 rows — SIAMESE-2026, CAT-CAFE, STAR-VOTE, TEST-LOCAL)
- `app_settings` (3 rows — heart_cooldown_hours = 5, coupon_expiry_days = 7, wheel_win_rate = 20)

Run a quick sanity check from the SQL Editor:

```sql
select count(*) as cats_count from public.cats;
-- expect: 16

select setting_key, setting_value from public.app_settings order by setting_key;
-- expect three rows
```

## Row Level Security

After running `policies_phase3b.sql`, the anon role can:

- **read** cats, app_settings, invitation_codes
- **insert/select/update/delete** voters, hearts, cat_affection,
  wheel_spins, coupons (scoped on the client by `voter_id`)

This is INSECURE for production — any client with the anon key can write
to any voter's rows. It's acceptable for the prototype because there's no
auth yet. Phase 3C should:

1. Replace the permissive policies with `auth.uid()::uuid = voter_id`
   checks.
2. Move the cooldown enforcement into a Postgres function so the client
   can't bypass it.

## Regenerating TypeScript types

`lib/supabase/database.types.ts` is hand-written for Phase 3A. After you've
deployed the schema, regenerate it from the live database so it always
matches:

```bash
supabase gen types typescript --linked > lib/supabase/database.types.ts
```

## What's intentionally NOT here yet

- **No `cats.rank`, `cats.tags[]`, `cats.quote`, `cats.favorite_things[]`** —
  these live in `data/cats.ts` for now. Phase 3B will add them as columns
  when we switch the frontend to read cats from Supabase.
- **No voter authentication** — `voters.id` is generated server-side but
  isn't tied to `auth.users` yet. Phase 3B introduces a sign-in flow.
- **No admin panel** — pure database for now.

## Migration order

If you need to roll forward incrementally:

1. `migrations/20260523000000_initial_schema.sql` — Phase 3A (this).
2. *(Phase 3B will add)* — RLS policies for `cats` + `app_settings` reads.
3. *(Phase 3B will add)* — Server-side validation functions for cooldown
   and undo windows.

Migrations are timestamped so the order they ran in is recoverable from
the `supabase_migrations.schema_migrations` table on the live project.
