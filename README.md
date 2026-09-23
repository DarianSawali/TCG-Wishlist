# pokelist

A private Japanese Pokémon TCG wishlist and collection tracker built with Next.js, PokeWallet, and Supabase.

## Supabase setup

1. Create a new project at [Supabase](https://supabase.com/dashboard).
2. Open **SQL Editor**, create a query, paste [`supabase/schema.sql`](supabase/schema.sql), and run it. This creates the cloud collection table and row-level security policies.
   The schema also explicitly grants table access to signed-in users; RLS still limits each user to their own row, so **Automatically expose new tables** can remain disabled.
3. Open **Project Settings → API** and copy the Project URL and publishable key.
4. Copy `.env.example` to `.env` and set:

   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
   ```

   Keep the existing `POKEWALLET_API_KEY` and `JUSTTCG_API_KEY` values.
5. In **Authentication → Providers → Email**, leave Email enabled. For the simplest personal setup, turn off **Confirm email**; otherwise new users must follow the confirmation email before signing in.
6. Restart the development server and create a fresh account:

   ```bash
   npm run dev
   ```

The old `.data/accounts.json` file is no longer read. You can delete `.data` after confirming Supabase works.

## Vercel deployment

1. Import this repository into Vercel.
2. Add `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `POKEWALLET_API_KEY`, `JUSTTCG_API_KEY`, and `EXCHANGERATE_API_KEY` under **Project Settings → Environment Variables**.
3. Deploy. In Supabase, add the Vercel production URL under **Authentication → URL Configuration → Site URL**. Add preview URLs as redirect URLs if you later enable email confirmation or Google sign-in.

No Supabase service-role key is used or needed. Browser-facing requests use the publishable key, and database access is restricted by row-level security to the signed-in user.

## Google sign-in setup

1. In **Supabase → Authentication → Providers → Google**, copy the callback URL shown there. It looks like `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`.
2. In the [Google Auth Platform](https://console.cloud.google.com/auth/overview), configure the consent screen, then create an OAuth client with application type **Web application**.
3. Add these **Authorized JavaScript origins**:
   - `http://localhost:3000`
   - Your production Vercel origin later, such as `https://your-app.vercel.app`
4. Under **Authorized redirect URIs**, add the Supabase callback URL from step 1. This is the Supabase URL, not this app's `/auth/callback` URL.
5. Copy Google's Client ID and Client Secret into the Supabase Google provider settings, enable the provider, and save.
6. In **Supabase → Authentication → URL Configuration** set:
   - Site URL: `http://localhost:3000` while developing
   - Redirect URLs: `http://localhost:3000/auth/callback`
   - Add `https://your-app.vercel.app/auth/callback` when deploying.

Google sign-in and email/password sign-in both use the same `collections` table. Supabase's authenticated user ID is the owner key, so each Google account gets a separate private list.
