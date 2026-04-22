# Maison des Chefs

Premium marketplace for private chef experiences in Montreal. A two-sided platform connecting diners with verified private chefs for unforgettable at-home dining.

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Database:** Supabase (PostgreSQL)
- **Auth:** Supabase Auth
- **Styling:** Tailwind CSS
- **Icons:** Lucide React

## Getting Started

### 1. Clone and Install

```bash
cd maison-des-chefs
npm install
```

### 2. Set Up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Get your project URL and anon key from Settings → API
3. Copy `.env.local.example` to `.env.local` and fill in your credentials:

```bash
cp .env.local.example .env.local
```

4. Run the database migration in Supabase SQL Editor:
   - Open Supabase Dashboard → SQL Editor
   - Copy contents of `supabase/migrations/001_initial_schema.sql`
   - Execute the migration

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── (auth)/            # Auth pages (login, signup)
│   ├── chefs/             # Chef listing and detail pages
│   ├── book/              # Booking flow
│   ├── dashboard/         # Chef dashboard
│   └── api/               # API routes
├── components/            # Reusable components
├── lib/
│   └── supabase/         # Supabase client setup
└── types/
    └── database.ts       # TypeScript types
```

## Features (MVP)

### For Diners
- [x] Browse and search chefs
- [x] Filter by cuisine type
- [x] View chef profiles with services and reviews
- [x] Multi-step booking flow
- [x] User authentication

### For Chefs
- [x] Chef dashboard
- [x] View upcoming bookings
- [x] Manage services (coming soon)
- [x] Availability management (coming soon)

## TODO

- [ ] Payment processing integration
- [ ] Real-time availability calendar
- [ ] Email notifications
- [ ] Booking acceptance/decline workflow
- [ ] Chef verification workflow
- [ ] Admin panel
- [ ] Mobile responsive polish

## Design System

See `SPEC.md` for full design language documentation including:
- Color palette
- Typography
- Component inventory
- Spacing system

## License

Private project. All rights reserved.
