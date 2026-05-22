import { sqliteTable, text, integer, real, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  name: text('name').notNull(),
  role: text('role', { enum: ['chef', 'diner', 'admin'] }).notNull().default('diner'),
  hasCompletedOnboarding: integer('has_completed_onboarding', { mode: 'boolean' }).notNull().default(false),
  phone: text('phone'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

export const chefProfiles = sqliteTable('chef_profiles', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id),
  bio: text('bio'),
  cuisineTypes: text('cuisine_types').notNull().default(''), // JSON array
  location: text('location').notNull().default(''),
  whatsappNumber: text('whatsapp_number'), // WhatsApp number for booking notifications
  pricePerPerson: real('price_per_person').notNull().default(0),
  available: integer('available', { mode: 'boolean' }).notNull().default(true),
  verified: integer('verified', { mode: 'boolean' }).notNull().default(false),
  verificationBadges: text('verification_badges').notNull().default('[]'), // JSON array of badge strings: ['identity', 'experience', 'safety']
  photoUrl: text('photo_url'), // URL/path to chef's profile photo
  signatureDishes: text('signature_dishes').notNull().default('[]'), // JSON array: [{"name":"Dish","description":"..."}]
  profileCompletedAt: integer('profile_completed_at', { mode: 'timestamp' }),
  onboardingStartedAt: integer('onboarding_started_at', { mode: 'timestamp' }),
  onboardingCompletedAt: integer('onboarding_completed_at', { mode: 'timestamp' }),
  // MAI-1387: Track whether the lead-response tutorial modal has been dismissed
  leadResponseTutorialDismissed: integer('lead_response_tutorial_dismissed', { mode: 'boolean' }).notNull().default(false),
  // MAI-1586: Chef's quick-reply response templates (JSON, per-chef editable)
  responseTemplates: text('response_templates').notNull().default('[]'),
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
  isPublished: integer('is_published', { mode: 'boolean' }).notNull().default(true), // MAI-1211: visibility toggle
  blockedDates: text('blocked_dates').notNull().default('[]'), // JSON array of ISO date strings
  isOnboardingService: integer('is_onboarding_service', { mode: 'boolean' }).notNull().default(false),
  photos: text('photos').notNull().default('[]'), // JSON array of photo URLs (max 6)
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
  // Guest booking recovery token (MAI-805)
  accessToken: text('access_token'), // 64-char hex token for public booking status access
  accessTokenExpiresAt: integer('access_token_expires_at', { mode: 'timestamp' }), // token expiration (30 days from creation)
  // MAI-1548: Stagnation alert tracking (idempotency for diner-facing proactive alert)
  stagnationAlertSentAt: integer('stagnation_alert_sent_at', { mode: 'timestamp' }), // when stagnation alert was sent, NULL if not sent yet
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
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
export const reviews = sqliteTable('reviews', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  chefId: integer('chef_id').notNull().references(() => users.id),
  serviceId: integer('service_id').notNull().references(() => services.id),
  dinerId: integer('diner_id').references(() => users.id), // nullable for guest checkout reviews
  bookingId: integer('booking_id').notNull().references(() => bookings.id),
  rating: integer('rating').notNull(), // 1-5
  comment: text('comment'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

// MAI-1212: In-app notifications for diners
export const notifications = sqliteTable('notifications', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id),
  type: text('type').notNull(), // e.g., 'booking_confirmed', 'booking_declined', 'booking_completed', 'review_request'
  title: text('title').notNull(),
  body: text('body').notNull(),
  read: integer('read', { mode: 'boolean' }).notNull().default(false),
  metadata: text('metadata'), // JSON string with extra fields (leadId, etc.)
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

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
  // MAI-1144: Link lead to booking for direct booking inquiries
  bookingId: integer('booking_id').references(() => bookings.id),
  // MAI-948: Multi-chef inquiry tracking
  inquiryType: text('inquiry_type', { enum: ['single', 'multi', 'direct_booking'] }).notNull().default('single'),
  multiInquiryId: text('multi_inquiry_id'), // shared UUID linking leads from same multi-inquiry
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
  quoteReminderSentAt: integer('quote_reminder_sent_at', { mode: 'timestamp' }), // MAI-795: When reminder email was sent
  quoteToken: text('quote_token'), // MAI-766: Raw token for booking link (32+ chars, URL-safe)
  quoteTokenHash: text('quote_token_hash'), // MAI-766: Hashed for verification
  chefNote: text('chef_note').notNull().default(''), // MAI-806: Chef's personal note to diner (max 500 chars)
  // MAI-805: Guest booking recovery token for public status access
  accessToken: text('access_token'), // 64-char hex token for public inquiry status access
  accessTokenExpiresAt: integer('access_token_expires_at', { mode: 'timestamp' }), // token expiration (30 days from creation)
  // MAI-823: Referral tracking
  referralCode: text('referral_code'), // 8-char alphanumeric code generated on first booking conversion
  referralSource: text('referral_source'), // Source of referral (e.g., 'diner_share', 'email', 'whatsapp')
  // MAI-875: Upsell add-ons (hardcoded MVP)
  selectedAddons: text('selected_addons').notNull().default('[]'), // JSON array of addon IDs
  // MAI-845: Stale lead re-engagement email sent timestamp (for idempotency)
  staleLeadReengagementSentAt: integer('stale_lead_reengagement_sent_at', { mode: 'timestamp' }),
  // MAI-1396: Lead expiration email sent timestamp (for idempotency)
  leadExpiredSentAt: integer('lead_expired_sent_at', { mode: 'timestamp' }),
  // MAI-1745: SLA tracking fields
  inquiryReceivedAt: integer('inquiry_received_at', { mode: 'timestamp' }), // Set on lead creation (now())
  slaDeadlineAt: integer('sla_deadline_at', { mode: 'timestamp' }), // inquiryReceivedAt + 48 hours
  // MAI-1745: SLA check-in email sent timestamp (for idempotency)
  slaCheckInSentAt: integer('sla_check_in_sent_at', { mode: 'timestamp' }),
  // MAI-1745: "Request received" confirmation email sent timestamp (for idempotency)
  requestReceivedSentAt: integer('request_received_sent_at', { mode: 'timestamp' }),
  // MAI-1822: Payment status for Stripe payment tracking
  paymentStatus: text('payment_status', { enum: ['unpaid', 'paid', 'failed', 'refunded'] }).notNull().default('unpaid'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

// Chef availability schedule (MAI-1251)
export const chefAvailability = sqliteTable('chef_availability', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  chefId: integer('chef_id').notNull().references(() => users.id),
  dayOfWeek: integer('day_of_week').notNull(), // 0=Sunday, 6=Saturday
  startTime: text('start_time').notNull(), // HH:MM format
  endTime: text('end_time').notNull(), // HH:MM format
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

// Chef blocked dates (MAI-1251)
export const chefBlockedDates = sqliteTable('chef_blocked_dates', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  chefId: integer('chef_id').notNull().references(() => users.id),
  date: text('date').notNull(), // YYYY-MM-DD format
  reason: text('reason'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

// Chef verification submissions (MAI-1326)
export const chefVerificationSubmissions = sqliteTable('chef_verification_submissions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  chefId: integer('chef_id').notNull().references(() => users.id),
  identityFullName: text('identity_full_name'),
  identityPhoneVerified: integer('identity_phone_verified', { mode: 'boolean' }).notNull().default(false),
  identityGovernmentIdUrl: text('identity_government_id_url'),
  experienceYears: integer('experience_years'),
  experiencePastEmployment: text('experience_past_employment').notNull().default('[]'), // JSON array
  experienceCuisineTraining: text('experience_cuisine_training').notNull().default('[]'), // JSON array
  safetyFoodSafetyCert: text('safety_food_safety_cert'),
  safetyCertExpiryDate: text('safety_cert_expiry_date'), // YYYY-MM-DD
  safetyCertUrl: text('safety_cert_url'),
  status: text('status', { enum: ['pending', 'approved', 'rejected'] }).notNull().default('pending'),
  submittedAt: integer('submitted_at', { mode: 'timestamp' }),
  reviewedAt: integer('reviewed_at', { mode: 'timestamp' }),
  reviewedBy: integer('reviewed_by').references(() => users.id),
  reviewNotes: text('review_notes'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

// Outreach campaigns (MAI-1681): groups outreach touches into campaigns
export const outreachCampaigns = sqliteTable('outreach_campaigns', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  status: text('status', { enum: ['active', 'paused', 'completed'] }).notNull().default('active'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

// Outreach touches (MAI-1681): tracks each individual outreach attempt
export const outreachTouches = sqliteTable('outreach_touches', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  chefId: integer('chef_id').notNull().references(() => users.id),
  campaignId: integer('campaign_id').notNull().references(() => outreachCampaigns.id),
  channel: text('channel', { enum: ['email', 'instagram', 'phone', 'sms'] }).notNull(),
  touchNumber: integer('touch_number').notNull(),
  sentAt: integer('sent_at', { mode: 'timestamp' }).notNull(),
  status: text('status', { enum: ['pending', 'sent', 'opened', 'replied', 'bounced'] }).notNull().default('pending'),
  responseAt: integer('response_at', { mode: 'timestamp' }),
  notes: text('notes'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

// MAI-1778: Referral Reward System
// Stores referral credit earned by diners (from referral program)
export const dinerCredits = sqliteTable('diner_credits', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  dinerId: integer('diner_id').notNull().references(() => users.id),
  amount: integer('amount').notNull(), // integer in cents (e.g., 2500 = $25.00)
  earnedFromReferralId: integer('earned_from_referral_id').references((): any => referralCodes.id), // FK to referralCodes table, nullable
  used: integer('used', { mode: 'boolean' }).notNull().default(false), // whether credit has been used
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(), // expiration date (12 months from earning)
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

// MAI-1778: Referral Reward System
// Stores unique referral codes generated per diner (8-char alphanumeric)
export const referralCodes = sqliteTable('referral_codes', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  code: text('code').notNull().unique(), // 8-char alphanumeric, unique
  dinerId: integer('diner_id').notNull().references(() => users.id), // diner who earned this code
  usedByDinerId: integer('used_by_diner_id').references((): any => users.id), // nullable - who used this code
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  usedAt: integer('used_at', { mode: 'timestamp' }), // when the code was used
}, (table) => {
  return {
    codeIndex: uniqueIndex('referral_code_idx').on(table.code),
    dinerIndex: uniqueIndex('referral_diner_idx').on(table.dinerId),
  };
});
