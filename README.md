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

Create a local `.env` file and add the required private service credentials.

Create a Supabase project, then run [`supabase/schema.sql`](supabase/schema.sql) in its SQL Editor.

Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deployment

The app is ready to deploy with Vercel. Configure the required private credentials in the Vercel project and add the production URL to Supabase and Google OAuth.

## Status

PokeCell is a personal project under active development.
