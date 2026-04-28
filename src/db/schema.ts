import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  name: text('name').notNull(),
  role: text('role', { enum: ['chef', 'diner', 'admin'] }).notNull().default('diner'),
  hasCompletedOnboarding: integer('has_completed_onboarding', { mode: 'boolean' }).notNull().default(false),
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
  profileCompletedAt: integer('profile_completed_at', { mode: 'timestamp' }),
  onboardingStartedAt: integer('onboarding_started_at', { mode: 'timestamp' }),
  onboardingCompletedAt: integer('onboarding_completed_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

// Allowed dietary tag values
export const DIETARY_TAGS = ['vegetarian', 'vegan', 'gluten_free', 'halal', 'kosher', 'dairy_free', 'nut_free'] as const;
export type DietaryTag = typeof DIETARY_TAGS[number];

export const services = sqliteTable('services', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  chefId: integer('chef_id').notNull().references(() => users.id),
  name: text('name').notNull(),
  description: text('description').notNull().default(''),
  pricePerPerson: real('price_per_person').notNull(),
  minGuests: integer('min_guests').notNull().default(1),
  maxGuests: integer('max_guests').notNull().default(10),
  dietaryTags: text('dietary_tags').notNull().default('[]'), // JSON array of dietary tags
  category: text('category'), // e.g., 'Private Dinner', 'Cooking Class', 'Tasting Menu', 'Catering'
  status: text('status', { enum: ['draft', 'published'] }).notNull().default('draft'),
  blockedDates: text('blocked_dates').notNull().default('[]'), // JSON array of ISO date strings
  isOnboardingService: integer('is_onboarding_service', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

export const bookings = sqliteTable('bookings', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  serviceId: integer('service_id').notNull().references(() => services.id),
  dinerId: integer('diner_id').references(() => users.id), // nullable for guest bookings
  chefId: integer('chef_id').notNull().references(() => users.id),
  eventDate: text('event_date').notNull(), // ISO date string
  guestCount: integer('guest_count').notNull(),
  totalPrice: real('total_price').notNull(),
  status: text('status', { enum: ['pending', 'accepted', 'declined', 'pending_payment', 'pending_payment_failed', 'confirmed', 'rejected', 'completed', 'cancelled'] }).notNull().default('pending'),
  notes: text('notes').notNull().default(''),
  // Guest checkout fields (MAI-205)
  guestEmail: text('guest_email'), // guest's email address
  guestTokenHash: text('guest_token_hash'), // hashed token for managing this specific booking
  emailVerified: integer('email_verified', { mode: 'boolean' }).notNull().default(false), // whether guest email has been verified
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

export const refreshTokens = sqliteTable('refresh_tokens', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id),
  token: text('token').notNull().unique(),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

// Abandoned bookings tracking (MAI-695/MAI-703)
export const abandonedBookings = sqliteTable('abandoned_bookings', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  bookingId: integer('booking_id').notNull().references(() => bookings.id).unique(),
  detectedAt: integer('detected_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  emailSent: integer('email_sent', { mode: 'boolean' }).notNull().default(false),
  smsSent: integer('sms_sent', { mode: 'boolean' }).notNull().default(false),
  recovered: integer('recovered', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

// Chef onboarding state (MAI-717)
export const chefOnboardingState = sqliteTable('chef_onboarding_state', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  chefId: integer('chef_id').notNull().references(() => users.id).unique(),
  currentStep: integer('current_step').notNull().default(1),
  step1Data: text('step1_data'), // JSON profile data
  step2Data: text('step2_data'), // JSON service draft data
  step3Data: text('step3_data'), // JSON blocked dates
  step4Completed: integer('step4_completed', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

// Diner preferences (MAI-725)
export const dinerPreferences = sqliteTable('diner_preferences', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id).unique(),
  cuisines: text('cuisines').notNull().default('[]'), // JSON array of cuisine tags (max 5)
  dietaryRestrictions: text('dietary_restrictions').notNull().default('[]'), // JSON array of dietary tags
  spiceTolerance: text('spice_tolerance', { enum: ['mild', 'medium', 'hot'] }).notNull().default('medium'),
  defaultPartySize: integer('default_party_size').notNull().default(2),
  defaultDelivery: integer('default_delivery', { mode: 'boolean' }).notNull().default(true),
  defaultLocation: text('default_location').notNull().default(''),
  wizardCompletionStatus: text('wizard_completion_status', { enum: ['none', 'partial', 'skipped', 'completed'] }).notNull().default('none'),
  wizardCompletedAt: integer('wizard_completed_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

// Diner wizard lifecycle events (MAI-725)
export const dinerWizardEvents = sqliteTable('diner_wizard_events', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id),
  event: text('event', { enum: ['wizard_start', 'wizard_step_complete', 'wizard_complete', 'wizard_skip', 'wizard_abandon'] }).notNull(),
  step: integer('step'), // 1, 2, 3, or null for non-step events
  sessionId: text('session_id'), // UUID for tracking wizard session
  eventData: text('event_data').notNull().default('{}'), // JSON with cuisines_selected, dietary_selected, delivery_mode, party_size
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

// Leads table - stores diner inquiries for chef services
export const leads = sqliteTable('leads', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  serviceId: integer('service_id').notNull().references(() => services.id),
  chefId: integer('chef_id').notNull().references(() => users.id),
  clientName: text('client_name'),
  email: text('email').notNull(),
  phone: text('phone'),
  eventDate: text('event_date'),
  guestCount: integer('guest_count').notNull().default(0),
  message: text('message'),
  status: text('status').notNull().default('new'),
  priceEstimateSentAt: integer('price_estimate_sent_at', { mode: 'timestamp' }),
  firstResponseAt: integer('first_response_at', { mode: 'timestamp' }),
  firstChefActionAt: integer('first_chef_action_at', { mode: 'timestamp' }),
  responseWithinSla: integer('response_within_sla', { mode: 'boolean' }).notNull().default(false),
  slaEscalated: integer('sla_escalated', { mode: 'boolean' }).notNull().default(false),
  slaEscalatedAt: integer('sla_escalated_at', { mode: 'timestamp' }),
  inquiryConfirmSentAt: integer('inquiry_confirm_sent_at', { mode: 'timestamp' }), // MAI-751: Idempotency for diner confirmation email
  quoteAmount: real('quote_amount'), // MAI-766: Chef's quoted price
  quoteMessage: text('quote_message'), // MAI-766: Chef's message with quote
  quoteSentAt: integer('quote_sent_at', { mode: 'timestamp' }), // MAI-766: When quote was sent
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});
