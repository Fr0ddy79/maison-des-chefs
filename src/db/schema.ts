import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  name: text('name').notNull(),
  role: text('role', { enum: ['chef', 'diner', 'admin'] }).notNull().default('diner'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

export const chefProfiles = sqliteTable('chef_profiles', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id),
  bio: text('bio'),
  cuisineTypes: text('cuisine_types').notNull().default(''), // JSON array
  location: text('location').notNull().default(''),
  pricePerPerson: real('price_per_person').notNull().default(0),
  available: integer('available', { mode: 'boolean' }).notNull().default(true),
  verified: integer('verified', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

export const services = sqliteTable('services', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  chefId: integer('chef_id').notNull().references(() => users.id),
  name: text('name').notNull(),
  description: text('description').notNull().default(''),
  pricePerPerson: real('price_per_person').notNull(),
  minGuests: integer('min_guests').notNull().default(1),
  maxGuests: integer('max_guests').notNull().default(10),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

export const bookings = sqliteTable('bookings', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  serviceId: integer('service_id').notNull().references(() => services.id),
  dinerId: integer('diner_id').notNull().references(() => users.id),
  chefId: integer('chef_id').notNull().references(() => users.id),
  eventDate: text('event_date').notNull(), // ISO date string
  guestCount: integer('guest_count').notNull(),
  totalPrice: real('total_price').notNull(),
  status: text('status', { enum: ['pending', 'confirmed', 'rejected', 'completed', 'cancelled'] }).notNull().default('pending'),
  notes: text('notes').notNull().default(''),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

export const refreshTokens = sqliteTable('refresh_tokens', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id),
  token: text('token').notNull().unique(),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});
