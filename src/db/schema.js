"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.leads = exports.dinerWizardEvents = exports.dinerPreferences = exports.chefOnboardingState = exports.abandonedBookings = exports.refreshTokens = exports.bookings = exports.services = exports.DIETARY_TAGS = exports.chefProfiles = exports.users = void 0;
var sqlite_core_1 = require("drizzle-orm/sqlite-core");
exports.users = (0, sqlite_core_1.sqliteTable)('users', {
    id: (0, sqlite_core_1.integer)('id').primaryKey({ autoIncrement: true }),
    email: (0, sqlite_core_1.text)('email').notNull().unique(),
    passwordHash: (0, sqlite_core_1.text)('password_hash').notNull(),
    name: (0, sqlite_core_1.text)('name').notNull(),
    role: (0, sqlite_core_1.text)('role', { enum: ['chef', 'diner', 'admin'] }).notNull().default('diner'),
    hasCompletedOnboarding: (0, sqlite_core_1.integer)('has_completed_onboarding', { mode: 'boolean' }).notNull().default(false),
    createdAt: (0, sqlite_core_1.integer)('created_at', { mode: 'timestamp' }).notNull().$defaultFn(function () { return new Date(); }),
});
exports.chefProfiles = (0, sqlite_core_1.sqliteTable)('chef_profiles', {
    id: (0, sqlite_core_1.integer)('id').primaryKey({ autoIncrement: true }),
    userId: (0, sqlite_core_1.integer)('user_id').notNull().references(function () { return exports.users.id; }),
    bio: (0, sqlite_core_1.text)('bio'),
    cuisineTypes: (0, sqlite_core_1.text)('cuisine_types').notNull().default(''), // JSON array
    location: (0, sqlite_core_1.text)('location').notNull().default(''),
    pricePerPerson: (0, sqlite_core_1.real)('price_per_person').notNull().default(0),
    available: (0, sqlite_core_1.integer)('available', { mode: 'boolean' }).notNull().default(true),
    verified: (0, sqlite_core_1.integer)('verified', { mode: 'boolean' }).notNull().default(false),
    profileCompletedAt: (0, sqlite_core_1.integer)('profile_completed_at', { mode: 'timestamp' }),
    onboardingStartedAt: (0, sqlite_core_1.integer)('onboarding_started_at', { mode: 'timestamp' }),
    onboardingCompletedAt: (0, sqlite_core_1.integer)('onboarding_completed_at', { mode: 'timestamp' }),
    createdAt: (0, sqlite_core_1.integer)('created_at', { mode: 'timestamp' }).notNull().$defaultFn(function () { return new Date(); }),
});
// Allowed dietary tag values
exports.DIETARY_TAGS = ['vegetarian', 'vegan', 'gluten_free', 'halal', 'kosher', 'dairy_free', 'nut_free'];
exports.services = (0, sqlite_core_1.sqliteTable)('services', {
    id: (0, sqlite_core_1.integer)('id').primaryKey({ autoIncrement: true }),
    chefId: (0, sqlite_core_1.integer)('chef_id').notNull().references(function () { return exports.users.id; }),
    name: (0, sqlite_core_1.text)('name').notNull(),
    description: (0, sqlite_core_1.text)('description').notNull().default(''),
    pricePerPerson: (0, sqlite_core_1.real)('price_per_person').notNull(),
    minGuests: (0, sqlite_core_1.integer)('min_guests').notNull().default(1),
    maxGuests: (0, sqlite_core_1.integer)('max_guests').notNull().default(10),
    dietaryTags: (0, sqlite_core_1.text)('dietary_tags').notNull().default('[]'), // JSON array of dietary tags
    category: (0, sqlite_core_1.text)('category'), // e.g., 'Private Dinner', 'Cooking Class', 'Tasting Menu', 'Catering'
    status: (0, sqlite_core_1.text)('status', { enum: ['draft', 'published'] }).notNull().default('draft'),
    blockedDates: (0, sqlite_core_1.text)('blocked_dates').notNull().default('[]'), // JSON array of ISO date strings
    isOnboardingService: (0, sqlite_core_1.integer)('is_onboarding_service', { mode: 'boolean' }).notNull().default(false),
    createdAt: (0, sqlite_core_1.integer)('created_at', { mode: 'timestamp' }).notNull().$defaultFn(function () { return new Date(); }),
});
exports.bookings = (0, sqlite_core_1.sqliteTable)('bookings', {
    id: (0, sqlite_core_1.integer)('id').primaryKey({ autoIncrement: true }),
    serviceId: (0, sqlite_core_1.integer)('service_id').notNull().references(function () { return exports.services.id; }),
    dinerId: (0, sqlite_core_1.integer)('diner_id').references(function () { return exports.users.id; }), // nullable for guest bookings
    chefId: (0, sqlite_core_1.integer)('chef_id').notNull().references(function () { return exports.users.id; }),
    eventDate: (0, sqlite_core_1.text)('event_date').notNull(), // ISO date string
    guestCount: (0, sqlite_core_1.integer)('guest_count').notNull(),
    totalPrice: (0, sqlite_core_1.real)('total_price').notNull(),
    status: (0, sqlite_core_1.text)('status', { enum: ['pending', 'accepted', 'declined', 'pending_payment', 'pending_payment_failed', 'confirmed', 'rejected', 'completed', 'cancelled'] }).notNull().default('pending'),
    notes: (0, sqlite_core_1.text)('notes').notNull().default(''),
    // Guest checkout fields (MAI-205)
    guestEmail: (0, sqlite_core_1.text)('guest_email'), // guest's email address
    guestTokenHash: (0, sqlite_core_1.text)('guest_token_hash'), // hashed token for managing this specific booking
    emailVerified: (0, sqlite_core_1.integer)('email_verified', { mode: 'boolean' }).notNull().default(false), // whether guest email has been verified
    createdAt: (0, sqlite_core_1.integer)('created_at', { mode: 'timestamp' }).notNull().$defaultFn(function () { return new Date(); }),
});
exports.refreshTokens = (0, sqlite_core_1.sqliteTable)('refresh_tokens', {
    id: (0, sqlite_core_1.integer)('id').primaryKey({ autoIncrement: true }),
    userId: (0, sqlite_core_1.integer)('user_id').notNull().references(function () { return exports.users.id; }),
    token: (0, sqlite_core_1.text)('token').notNull().unique(),
    expiresAt: (0, sqlite_core_1.integer)('expires_at', { mode: 'timestamp' }).notNull(),
    createdAt: (0, sqlite_core_1.integer)('created_at', { mode: 'timestamp' }).notNull().$defaultFn(function () { return new Date(); }),
});
// Abandoned bookings tracking (MAI-695/MAI-703)
exports.abandonedBookings = (0, sqlite_core_1.sqliteTable)('abandoned_bookings', {
    id: (0, sqlite_core_1.integer)('id').primaryKey({ autoIncrement: true }),
    bookingId: (0, sqlite_core_1.integer)('booking_id').notNull().references(function () { return exports.bookings.id; }).unique(),
    detectedAt: (0, sqlite_core_1.integer)('detected_at', { mode: 'timestamp' }).notNull().$defaultFn(function () { return new Date(); }),
    emailSent: (0, sqlite_core_1.integer)('email_sent', { mode: 'boolean' }).notNull().default(false),
    smsSent: (0, sqlite_core_1.integer)('sms_sent', { mode: 'boolean' }).notNull().default(false),
    recovered: (0, sqlite_core_1.integer)('recovered', { mode: 'boolean' }).notNull().default(false),
    createdAt: (0, sqlite_core_1.integer)('created_at', { mode: 'timestamp' }).notNull().$defaultFn(function () { return new Date(); }),
});
// Chef onboarding state (MAI-717)
exports.chefOnboardingState = (0, sqlite_core_1.sqliteTable)('chef_onboarding_state', {
    id: (0, sqlite_core_1.integer)('id').primaryKey({ autoIncrement: true }),
    chefId: (0, sqlite_core_1.integer)('chef_id').notNull().references(function () { return exports.users.id; }).unique(),
    currentStep: (0, sqlite_core_1.integer)('current_step').notNull().default(1),
    step1Data: (0, sqlite_core_1.text)('step1_data'), // JSON profile data
    step2Data: (0, sqlite_core_1.text)('step2_data'), // JSON service draft data
    step3Data: (0, sqlite_core_1.text)('step3_data'), // JSON blocked dates
    step4Completed: (0, sqlite_core_1.integer)('step4_completed', { mode: 'boolean' }).notNull().default(false),
    createdAt: (0, sqlite_core_1.integer)('created_at', { mode: 'timestamp' }).notNull().$defaultFn(function () { return new Date(); }),
    updatedAt: (0, sqlite_core_1.integer)('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(function () { return new Date(); }),
});
// Diner preferences (MAI-725)
exports.dinerPreferences = (0, sqlite_core_1.sqliteTable)('diner_preferences', {
    id: (0, sqlite_core_1.integer)('id').primaryKey({ autoIncrement: true }),
    userId: (0, sqlite_core_1.integer)('user_id').notNull().references(function () { return exports.users.id; }).unique(),
    cuisines: (0, sqlite_core_1.text)('cuisines').notNull().default('[]'), // JSON array of cuisine tags (max 5)
    dietaryRestrictions: (0, sqlite_core_1.text)('dietary_restrictions').notNull().default('[]'), // JSON array of dietary tags
    spiceTolerance: (0, sqlite_core_1.text)('spice_tolerance', { enum: ['mild', 'medium', 'hot'] }).notNull().default('medium'),
    defaultPartySize: (0, sqlite_core_1.integer)('default_party_size').notNull().default(2),
    defaultDelivery: (0, sqlite_core_1.integer)('default_delivery', { mode: 'boolean' }).notNull().default(true),
    defaultLocation: (0, sqlite_core_1.text)('default_location').notNull().default(''),
    wizardCompletionStatus: (0, sqlite_core_1.text)('wizard_completion_status', { enum: ['none', 'partial', 'skipped', 'completed'] }).notNull().default('none'),
    wizardCompletedAt: (0, sqlite_core_1.integer)('wizard_completed_at', { mode: 'timestamp' }),
    createdAt: (0, sqlite_core_1.integer)('created_at', { mode: 'timestamp' }).notNull().$defaultFn(function () { return new Date(); }),
    updatedAt: (0, sqlite_core_1.integer)('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(function () { return new Date(); }),
});
// Diner wizard lifecycle events (MAI-725)
exports.dinerWizardEvents = (0, sqlite_core_1.sqliteTable)('diner_wizard_events', {
    id: (0, sqlite_core_1.integer)('id').primaryKey({ autoIncrement: true }),
    userId: (0, sqlite_core_1.integer)('user_id').notNull().references(function () { return exports.users.id; }),
    event: (0, sqlite_core_1.text)('event', { enum: ['wizard_start', 'wizard_step_complete', 'wizard_complete', 'wizard_skip', 'wizard_abandon'] }).notNull(),
    step: (0, sqlite_core_1.integer)('step'), // 1, 2, 3, or null for non-step events
    sessionId: (0, sqlite_core_1.text)('session_id'), // UUID for tracking wizard session
    eventData: (0, sqlite_core_1.text)('event_data').notNull().default('{}'), // JSON with cuisines_selected, dietary_selected, delivery_mode, party_size
    createdAt: (0, sqlite_core_1.integer)('created_at', { mode: 'timestamp' }).notNull().$defaultFn(function () { return new Date(); }),
});
// Leads table - stores diner inquiries for chef services
exports.leads = (0, sqlite_core_1.sqliteTable)('leads', {
    id: (0, sqlite_core_1.integer)('id').primaryKey({ autoIncrement: true }),
    serviceId: (0, sqlite_core_1.integer)('service_id').notNull().references(function () { return exports.services.id; }),
    chefId: (0, sqlite_core_1.integer)('chef_id').notNull().references(function () { return exports.users.id; }),
    clientName: (0, sqlite_core_1.text)('client_name'),
    email: (0, sqlite_core_1.text)('email').notNull(),
    phone: (0, sqlite_core_1.text)('phone'),
    eventDate: (0, sqlite_core_1.text)('event_date'),
    guestCount: (0, sqlite_core_1.integer)('guest_count').notNull().default(0),
    message: (0, sqlite_core_1.text)('message'),
    status: (0, sqlite_core_1.text)('status').notNull().default('new'),
    priceEstimateSentAt: (0, sqlite_core_1.integer)('price_estimate_sent_at', { mode: 'timestamp' }),
    firstResponseAt: (0, sqlite_core_1.integer)('first_response_at', { mode: 'timestamp' }),
    firstChefActionAt: (0, sqlite_core_1.integer)('first_chef_action_at', { mode: 'timestamp' }),
    responseWithinSla: (0, sqlite_core_1.integer)('response_within_sla', { mode: 'boolean' }).notNull().default(false),
    slaEscalated: (0, sqlite_core_1.integer)('sla_escalated', { mode: 'boolean' }).notNull().default(false),
    slaEscalatedAt: (0, sqlite_core_1.integer)('sla_escalated_at', { mode: 'timestamp' }),
    inquiryConfirmSentAt: (0, sqlite_core_1.integer)('inquiry_confirm_sent_at', { mode: 'timestamp' }), // MAI-751: Idempotency for diner confirmation email
    quoteAmount: (0, sqlite_core_1.real)('quote_amount'), // MAI-766: Chef's quoted price
    quoteMessage: (0, sqlite_core_1.text)('quote_message'), // MAI-766: Chef's message with quote
    quoteSentAt: (0, sqlite_core_1.integer)('quote_sent_at', { mode: 'timestamp' }), // MAI-766: When quote was sent
    createdAt: (0, sqlite_core_1.integer)('created_at', { mode: 'timestamp' }).notNull().$defaultFn(function () { return new Date(); }),
});
