# Maison des Chefs — Specification

## 1. Concept & Vision

A premium two-sided marketplace connecting Montreal diners with verified private chefs for at-home dining experiences. The platform exudes quiet luxury — think Airbnb Luxe meets a Michelin-starred reservation system. Clean, confident, trustworthy. Every interaction should feel effortless and high-end.

## 2. Design Language

### Aesthetic Direction
Refined minimalism with warm editorial touches. Think Kinfolk magazine meets a boutique hotel booking experience. Light, airy, sophisticated.

### Color Palette
```
--mdc-bg:          #FAFAF8    (warm off-white)
--mdc-surface:     #FFFFFF    (pure white cards)
--mdc-text:        #1A1A1A    (near-black)
--mdc-text-muted:  #6B6B6B    (warm gray)
--mdc-accent:      #C9A84C    (muted gold)
--mdc-accent-dark: #A68A3A    (deeper gold, hover)
--mdc-border:      #E8E6E1    (warm light border)
--mdc-success:     #3D7A5A    (forest green)
--mdc-error:       #B54A4A    (muted red)
```

### Typography
- **Headings:** Cormorant Garamond (elegant serif)
- **Body:** DM Sans (clean, readable sans-serif)
- **Fallbacks:** Georgia, system-ui

### Spatial System
- Base unit: 4px
- Section padding: 80px vertical, 24px horizontal
- Card padding: 24px
- Border radius: 8px (cards), 4px (buttons), 2px (inputs)
- Max content width: 1200px

### Motion Philosophy
Subtle and refined. Fade-in on scroll (200ms ease-out), gentle hover lifts on cards (translateY -2px, 150ms), smooth page transitions. Nothing bouncy or playful — this is a premium experience.

### Visual Assets
- Lucide icons (thin stroke, elegant)
- High-quality chef profile photos (circular crop for headshots)
- Atmospheric food photography (Unsplash: fine dining, home dining)

## 3. Layout & Structure

### Page Architecture

```
/ (Landing)
  → Hero with search/CTA
  → How It Works (3 steps)
  → Featured Chefs
  → Experience Types
  → Testimonials
  → Footer

/chef/apply
  → Chef application form (public, no auth)
  → Name, email, phone, location
  → Cuisine types (multi-select)
  → Years of experience
  → Price point range (optional)
  → Bio (optional, max 500 chars)
  → Preferred contact method
  → Confirmation page on success

/chefs
  → Chef search/filter page
  → Grid of chef cards

/chefs/[id]
  → Chef profile detail
  → Services/experiences
  → Reviews
  → Booking CTA

/book
  → Multi-step booking flow
  → Date/time selection
  → Menu preferences
  → Guest details
  → Confirmation

/dashboard (chef)
  → Upcoming bookings
  → Availability calendar
  → Earnings overview
  → Profile management

/auth
  → Login / Sign up
  → Role selection (diner / chef)
```

### Responsive Strategy
Mobile-first. Single column on mobile, 2-col on tablet (768px+), 3-col on desktop (1024px+). Navigation collapses to hamburger on mobile.

## 4. Features & Interactions

### For Diners
- **Search & Discover:** Filter by cuisine type, date availability, price range, group size
- **Chef Profiles:** Photos, bio, specialties, past experience, verified badges
- **Service Types:** Prix fixe dinners, cocktail parties, cooking classes, special occasions
- **Booking Flow:** Select chef → choose experience → pick date/time → specify guests → confirm
- **Reviews:** Post-booking reviews with 1-5 star rating and written feedback

### For Chefs
- **Profile Management:** Photo, bio, cuisine types, service offerings, pricing
- **Availability:** Calendar with available slots
- **Booking Management:** Accept/decline requests, view details
- **Earnings Dashboard:** Revenue tracking, booking history

### For Prospective Chefs
- **Self-Apply Flow:** Public form at `/chef/apply` (no auth required)
- **Application Fields:** Name, email, phone (optional), location, cuisine types (multi-select), years of experience, price range (optional), bio (optional, max 500 chars), preferred contact method
- **Validation:** Client-side validation for all required fields, duplicate email check
- **Confirmation:** Success page after submission with next steps info
- **Duplicate Handling:** Graceful "already submitted" message for duplicate emails

### Core Interactions
- **Hover on chef card:** Subtle lift, shadow deepens
- **CTA buttons:** Gold background, darkens on hover (150ms)
- **Form inputs:** Border highlights gold on focus
- **Booking steps:** Progress indicator at top, smooth step transitions
- **Error states:** Muted red border + message below field
- **Empty states:** Friendly illustration + helpful message

### Edge Cases
- **No search results:** "No chefs match your criteria. Try adjusting your filters."
- **Booking conflict:** "This slot was just booked. Please select another time."
- **Unverified chef:** Show badge "Verification in progress" with explanation

## 5. Component Inventory

### ChefCard
- Photo (circular, 80px), name, cuisine tags, starting price, rating stars
- States: default, hover (lift + shadow), loading (skeleton)

### ExperienceCard
- Title, description, duration, price per person, max guests
- States: default, hover, selected (gold border)

### BookingWidget
- Date picker, time selector, guest count stepper
- Sticky on desktop sidebar, full-width on mobile

### Button
- Variants: primary (gold fill), secondary (outline), ghost (text only)
- States: default, hover, active, disabled, loading (spinner)

### Input
- Label above, placeholder, optional helper text
- States: default, focus (gold border), error (red border + message), disabled

### StarRating
- 1-5 stars, half-star precision, interactive (hover preview) and display-only modes

### Badge
- Small pill: "Verified", "Popular", "New" — gold for featured, gray for neutral

## 6. Technical Approach

### Stack
- **Framework:** Next.js 16 (App Router)
- **Database:** Supabase (PostgreSQL)
- **Auth:** Supabase Auth (email/password)
- **Styling:** Tailwind CSS
- **Icons:** Lucide React

### Database Schema

```sql
-- Users (extends Supabase auth.users)
profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT CHECK (role IN ('diner', 'chef')),
  created_at TIMESTAMPTZ DEFAULT NOW()
)

-- Chef-specific profiles
chef_profiles (
  id UUID PRIMARY KEY REFERENCES profiles(id),
  display_name TEXT,
  bio TEXT,
  location TEXT,
  cuisines TEXT[], -- e.g., ['French', 'Italian']
  years_experience INT,
  is_verified BOOLEAN DEFAULT FALSE,
  avg_rating DECIMAL(2,1) DEFAULT 0,
  review_count INT DEFAULT 0,
  price_per_hour DECIMAL(10,2),
  price_per_event DECIMAL(10,2),
  max_guests INT DEFAULT 8,
  hero_image_url TEXT
)

-- Services/experiences offered
services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id UUID REFERENCES chef_profiles(id),
  title TEXT NOT NULL,
  description TEXT,
  cuisine_type TEXT,
  duration_hours DECIMAL(4,1),
  price_per_person DECIMAL(10,2),
  max_guests INT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
)

-- Chef availability slots
availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id UUID REFERENCES chef_profiles(id),
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_booked BOOLEAN DEFAULT FALSE
)

-- Bookings
bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID REFERENCES services(id),
  chef_id UUID REFERENCES chef_profiles(id),
  diner_id UUID REFERENCES profiles(id),
  booking_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME,
  guest_count INT NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,
  status TEXT CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),
  special_requests TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
)

-- Reviews
reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES bookings(id),
  chef_id UUID REFERENCES chef_profiles(id),
  diner_id UUID REFERENCES profiles(id),
  rating INT CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
)

-- Chef applications (for chef onboarding)
chef_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  location TEXT NOT NULL,
  cuisine_types TEXT[] NOT NULL,
  years_experience INT NOT NULL,
  price_range TEXT,
  bio TEXT,
  preferred_contact TEXT CHECK (preferred_contact IN ('email', 'phone', 'either')),
  created_at TIMESTAMPTZ DEFAULT NOW()
)
```

### API Routes

```
POST   /api/auth/signup
POST   /api/auth/login
POST   /api/auth/logout
GET    /api/chefs              → list chefs (with filters)
GET    /api/chefs/[id]         → chef detail
PUT    /api/chefs/[id]         → update chef profile
GET    /api/services           → list services (filter by chef)
POST   /api/bookings           → create booking
GET    /api/bookings           → list user's bookings
PATCH  /api/bookings/[id]      → update booking status
POST   /api/reviews            → create review
GET    /api/availability        → get chef availability
POST   /api/chefs/apply        → submit chef application (public, no auth)
```

### Auth Strategy
- Supabase email/password auth
- JWT stored in httpOnly cookies via `@supabase/ssr`
- Row-Level Security (RLS) on all tables
- Middleware protects `/dashboard` routes

## 7. MVP Scope (v1)

### Must Have
- Landing page with hero + chef preview
- Chef listing with basic filters
- Chef detail page
- Auth (sign up / login / logout)
- Booking request flow (email notification to chef)
- Basic chef dashboard (view bookings)
- Simple review system

### Not in v1
- Payment processing
- Real calendar availability
- Chef verification workflow
- Email notifications (can be stubbed)
- Booking acceptance/decline flow
- Mobile app
