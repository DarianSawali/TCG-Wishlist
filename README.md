# PokeCell

PokeCell is a personal Japanese Pokémon TCG wishlist and collection tracker. Browse Japanese sets, search for cards, and keep separate counts for cards you want and cards you own.

## Features

- Japanese card and set catalogue
- Wishlist and owned collection tracking
- Google and email/password authentication
- Private cloud storage with Supabase and row-level security
- USD, CAD, and JPY price display
- Rarity filtering and card/set search
- Dark theme and responsive mobile navigation

## Built with

- Next.js and React
- Supabase Auth and PostgreSQL
- PokeWallet, TCGdex, and JustTCG
- ExchangeRate-API

## Local setup

Install dependencies:

```bash
npm install
```

Copy `.env.example` to `.env` and add your API credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
POKEWALLET_API_KEY=
JUSTTCG_API_KEY=
EXCHANGERATE_API_KEY=
```

Create a Supabase project, then run [`supabase/schema.sql`](supabase/schema.sql) in its SQL Editor.

Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deployment

The app is ready to deploy with Vercel. Add the same environment variables to the Vercel project and configure the production URL in Supabase and Google OAuth.

## Status

PokeCell is a personal project under active development.
