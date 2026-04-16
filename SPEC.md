# Maison des Chefs — Product Specification

## Product Concept

**Name:** Maison des Chefs
**Type:** Two-sided marketplace
**Core Value:** Connect diners with trusted private chefs for premium at-home dining experiences in Montreal

## Tech Stack
- **Runtime:** Node.js 24+
- **Language:** TypeScript
- **API Framework:** Fastify
- **Database:** SQLite (Drizzle ORM)
- **Auth:** JWT with refresh tokens
- **Deployment:** Docker-ready

## Business Model

- Diners browse, discover, and book private chefs for events/dinners
- Chefs create profiles, list services, and manage bookings
- Platform takes a commission on bookings (future)

## Core Modules

### 1. Auth (`/auth`)
- [x] User registration (chef vs diner)
- [x] User login
- [x] JWT access tokens (15m expiry)
- [x] JWT refresh tokens (7d expiry)
- [x] Get current user (`/me`)
- [x] Token refresh

### 2. Chef Profiles (`/chefs`)
- [x] Chef profile creation/update (auth required)
- [x] Public chef listing
- [x] Chef detail view
- [x] Get own profile (`/chefs/me/profile`)

### 3. Services (`/services`)
- [x] Chef creates service offerings
- [x] Public service listing by chef (`/services/chef/:chefId`)
- [x] Service detail view
- [x] Service update (chef only)
- [x] Service delete (chef only)

### 4. Bookings (`/bookings`)
- [x] Customer submits booking request
- [x] Chef views booking requests
- [x] Customer views their bookings
- [x] Chef approves/rejects booking
- [x] Booking status tracking

## Data Models

### Users
```
users: id, email, password_hash, name, role (chef|diner), created_at
```

### Chef Profiles
```
chef_profiles: id, user_id, bio, cuisine_types[], location, price_per_person, available, verified, created_at
```

### Services
```
services: id, chef_id, name, description, price_per_person, min_guests, max_guests, created_at
```

### Bookings
```
bookings: id, service_id, diner_id, chef_id, event_date, guest_count, total_price, status, notes, created_at
```

## Implementation Phases

### Phase 1 — Foundation ✅
- [x] Project structure
- [x] Database schema
- [x] Config management
- [x] TypeScript setup
- [x] Server with Fastify
- [x] Auth routes
- [x] Chef profile routes
- [x] Service routes
- [x] Booking routes

### Phase 2 — Polish & Frontend (TODO)
- [ ] Search/filter for chefs
- [ ] Image upload for chef profiles
- [ ] Booking confirmation emails (future)
- [ ] Payments (future)

### Phase 3 — Admin & Verification (TODO)
- [ ] Admin dashboard
- [ ] Chef verification workflow
- [ ] Platform oversight

---

## Notes
- All timestamps in UTC
- JWT includes `role` claim for authorization
- Keep it simple — no payments in MVP
- drizzle-orm v0.45.2 + better-sqlite3: use `.returning().all()[0]` instead of destructuring
