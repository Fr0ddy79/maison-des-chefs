# Maison des Chefs — Premium Private Chef Marketplace

AI-powered platform connecting Montreal diners with verified private chefs.

## Quick Start

```bash
cd maison-des-chefs
npm install
cp .env.example .env
# Edit .env with your JWT_SECRET (min 32 chars)
npm run db:migrate
npm run dev
```

## API Endpoints

### Auth
- `POST /auth/register` - Create account (chef or diner)
- `POST /auth/login` - Login
- `POST /auth/refresh` - Refresh token
- `GET /auth/me` - Get current user

### Chefs
- `GET /chefs` - List all chefs (public)
- `GET /chefs/:id` - Get chef profile (public)
- `POST /chefs/profile` - Create/update chef profile (chef only)
- `PATCH /chefs/profile` - Update chef profile (chef only)

### Services
- `GET /chefs/:chefId/services` - List chef's services (public)
- `POST /chefs/:chefId/services` - Create service (chef only)
- `GET /services/:id` - Get service detail (public)
- `PATCH /services/:id` - Update service (chef only)
- `DELETE /services/:id` - Delete service (chef only)

### Bookings
- `POST /bookings` - Create booking request (diner only)
- `GET /bookings` - List bookings (chef sees requests, diner sees their bookings)
- `GET /bookings/:id` - Get booking details
- `PATCH /bookings/:id/status` - Update booking status (chef only: approve/reject)

## Demo

```
Chef account: chef@demo.com / demo1234
Diner account: diner@demo.com / demo1234
```

## Architecture

- **Fastify** - Fast, low-overhead web framework
- **Drizzle ORM** - Type-safe SQL
- **SQLite** - Zero-infrastructure database
- **JWT** - Stateless authentication with refresh tokens
- **bcrypt** - Password hashing
- **Zod** - Request/response validation

## Scripts

```bash
npm run dev        # Development with hot reload
npm run build      # Build for production
npm run start      # Run production server
npm run db:migrate # Run database migrations
npm run db:seed    # Seed demo data
npm test           # Run tests
```
