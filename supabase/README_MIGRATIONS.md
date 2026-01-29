# Supabase migrations

## Running migrations

### Option 1: Supabase Dashboard (SQL Editor)

1. Open your project in [Supabase Dashboard](https://supabase.com/dashboard).
2. Go to **SQL Editor**.
3. Create a new query and paste the contents of each migration file in order (e.g. `migrations/001_profiles.sql`).
4. Run the query.

### Option 2: Supabase CLI

If you use the [Supabase CLI](https://supabase.com/docs/guides/cli):

```bash
supabase db push
```

Or link your project and run migrations:

```bash
supabase link --project-ref your-project-ref
supabase db push
```

## Migrations

- **001_profiles.sql** – User profiles table keyed by `auth.users.id`, RLS policies, and trigger to create a profile row on signup. Run this after enabling Supabase Auth so that new users get a profile automatically.
