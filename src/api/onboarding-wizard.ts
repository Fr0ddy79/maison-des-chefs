import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { db } from '../db/index.js';
import { chefProfiles, services, chefOnboardingState, users } from '../db/schema.js';
import { eq } from 'drizzle-orm';

// Schema definitions
const cuisineTags = ['french', 'italian', 'japanese', 'mexican', 'indian', 'thai', 'american', 'mediterranean', 'korean', 'chinese', 'vietnamese', 'spanish', 'greek', 'middle_eastern', 'nordic'] as const;
const serviceCategories = ['Private Dinner', 'Cooking Class', 'Tasting Menu', 'Catering'] as const;

const step1Schema = z.object({
  displayName: z.string().min(1).max(50),
  bio: z.string().max(300).optional(),
  cuisineTags: z.array(z.enum(cuisineTags)).min(1).max(5),
  location: z.string().min(1).max(200),
});

const step2Schema = z.object({
  name: z.string().min(1).max(80),
  description: z.string().min(1).max(500),
  price: z.number().min(20),
  minGuests: z.number().min(1).max(50),
  maxGuests: z.number().min(1).max(50),
  category: z.enum(serviceCategories),
});

const step3Schema = z.object({
  blockedDates: z.array(z.string()), // ISO date strings YYYY-MM-DD
});

const saveStateSchema = z.object({
  currentStep: z.number().min(1).max(4),
  step1Data: z.object({
    displayName: z.string(),
    bio: z.string().optional(),
    cuisineTags: z.array(z.string()),
    location: z.string(),
  }).optional(),
  step2Data: z.object({
    name: z.string(),
    description: z.string(),
    price: z.number(),
    minGuests: z.number(),
    maxGuests: z.number(),
    category: z.string(),
  }).optional(),
  step3Data: z.object({
    blockedDates: z.array(z.string()),
  }).optional(),
});

// GET /api/onboarding/state — check if onboarding in progress
export default async function onboardingWizardRoutes(server: FastifyInstance) {
  // GET /api/onboarding/state — get current onboarding state (for resume banner)
  server.get('/state', { preHandler: [server.authenticate] }, async (request, reply) => {
    const { userId, role } = request.user as { userId: number; role: string };
    
    if (role !== 'chef') {
      return reply.status(403).send({ error: 'Only chefs have onboarding state' });
    }

    // Check if onboarding already completed
    const profile = db.select().from(chefProfiles).where(eq(chefProfiles.userId, userId)).get();
    
    if (profile?.onboardingCompletedAt) {
      return { inProgress: false, completed: true };
    }

    // Get saved state
    const state = db.select().from(chefOnboardingState).where(eq(chefOnboardingState.chefId, userId)).get();
    
    if (!state) {
      return { inProgress: false, completed: false };
    }

    return {
      inProgress: true,
      currentStep: state.currentStep,
      step1Data: state.step1Data ? JSON.parse(state.step1Data) : null,
      step2Data: state.step2Data ? JSON.parse(state.step2Data) : null,
      step3Data: state.step3Data ? JSON.parse(state.step3Data) : null,
      step4Completed: state.step4Completed,
    };
  });

  // POST /api/onboarding/state — save onboarding state (Save & Continue Later)
  server.post('/state', { preHandler: [server.authenticate] }, async (request, reply) => {
    const { userId, role } = request.user as { userId: number; role: string };
    
    if (role !== 'chef') {
      return reply.status(403).send({ error: 'Only chefs have onboarding state' });
    }

    const body = saveStateSchema.parse(request.body);

    // Upsert the state
    const existing = db.select().from(chefOnboardingState).where(eq(chefOnboardingState.chefId, userId)).get();
    
    const stateData = {
      currentStep: body.currentStep,
      step1Data: body.step1Data ? JSON.stringify(body.step1Data) : null,
      step2Data: body.step2Data ? JSON.stringify(body.step2Data) : null,
      step3Data: body.step3Data ? JSON.stringify(body.step3Data) : null,
      updatedAt: new Date(),
    };

    if (existing) {
      db.update(chefOnboardingState).set(stateData).where(eq(chefOnboardingState.chefId, userId)).run();
    } else {
      db.insert(chefOnboardingState).values({
        chefId: userId,
        ...stateData,
        createdAt: new Date(),
      }).run();
    }

    return { success: true, savedAt: new Date().toISOString() };
  });

  // PUT /api/onboarding/step1 — save profile basics
  server.put('/step1', { preHandler: [server.authenticate] }, async (request, reply) => {
    const { userId, role } = request.user as { userId: number; role: string };
    
    if (role !== 'chef') {
      return reply.status(403).send({ error: 'Only chefs can update profile' });
    }

    const body = step1Schema.parse(request.body);

    // Check if profile exists
    const existing = db.select().from(chefProfiles).where(eq(chefProfiles.userId, userId)).get();
    
    if (existing) {
      db.update(chefProfiles).set({
        bio: body.bio ?? existing.bio,
        cuisineTypes: JSON.stringify(body.cuisineTags),
        location: body.location,
      }).where(eq(chefProfiles.userId, userId)).run();
    } else {
      db.insert(chefProfiles).values({
        userId,
        bio: body.bio ?? '',
        cuisineTypes: JSON.stringify(body.cuisineTags),
        location: body.location,
      }).run();
    }

    // Set onboarding_started_at on first save
    if (existing?.onboardingStartedAt === null) {
      db.update(chefProfiles).set({ onboardingStartedAt: new Date() })
        .where(eq(chefProfiles.userId, userId)).run();
    }

    // Update onboarding state current step
    const state = db.select().from(chefOnboardingState).where(eq(chefOnboardingState.chefId, userId)).get();
    if (state) {
      db.update(chefOnboardingState).set({ 
        currentStep: 2,
        step1Data: JSON.stringify(body),
        updatedAt: new Date(),
      }).where(eq(chefOnboardingState.chefId, userId)).run();
    } else {
      db.insert(chefOnboardingState).values({
        chefId: userId,
        currentStep: 2,
        step1Data: JSON.stringify(body),
        createdAt: new Date(),
        updatedAt: new Date(),
      }).run();
    }

    return { success: true, step: 1 };
  });

  // PUT /api/onboarding/step2 — create first service draft
  server.put('/step2', { preHandler: [server.authenticate] }, async (request, reply) => {
    const { userId, role } = request.user as { userId: number; role: string };
    
    if (role !== 'chef') {
      return reply.status(403).send({ error: 'Only chefs can create services' });
    }

    const body = step2Schema.parse(request.body);

    // Validate guest range
    if (body.minGuests > body.maxGuests) {
      return reply.status(400).send({ error: 'minGuests cannot be greater than maxGuests' });
    }

    // Create service as draft
    const service = db.insert(services).values({
      chefId: userId,
      name: body.name,
      description: body.description,
      pricePerPerson: body.price,
      minGuests: body.minGuests,
      maxGuests: body.maxGuests,
      category: body.category,
      status: 'draft',
      isOnboardingService: true,
      dietaryTags: '[]',
      blockedDates: '[]',
    }).returning().get();

    // Update onboarding state
    const state = db.select().from(chefOnboardingState).where(eq(chefOnboardingState.chefId, userId)).get();
    const step2Data = JSON.stringify(body);
    
    if (state) {
      db.update(chefOnboardingState).set({ 
        currentStep: 3,
        step2Data,
        updatedAt: new Date(),
      }).where(eq(chefOnboardingState.chefId, userId)).run();
    } else {
      db.insert(chefOnboardingState).values({
        chefId: userId,
        currentStep: 3,
        step2Data,
        createdAt: new Date(),
        updatedAt: new Date(),
      }).run();
    }

    return { success: true, step: 2, serviceId: service.id };
  });

  // PUT /api/onboarding/step3 — save availability/blocked dates
  server.put('/step3', { preHandler: [server.authenticate] }, async (request, reply) => {
    const { userId, role } = request.user as { userId: number; role: string };
    
    if (role !== 'chef') {
      return reply.status(403).send({ error: 'Only chefs can update availability' });
    }

    const body = step3Schema.parse(request.body);

    // Get the onboarding service (draft with is_onboarding_service=true)
    const service = db.select().from(services)
      .where(eq(services.chefId, userId))
      .all()
      .filter(s => s.isOnboardingService && s.status === 'draft')
      .pop();

    if (!service) {
      return reply.status(400).send({ error: 'No onboarding service found. Please complete Step 2 first.' });
    }

    // Update blocked dates
    db.update(services).set({ blockedDates: JSON.stringify(body.blockedDates) })
      .where(eq(services.id, service.id)).run();

    // Update onboarding state
    const state = db.select().from(chefOnboardingState).where(eq(chefOnboardingState.chefId, userId)).get();
    const step3Data = JSON.stringify(body);
    
    if (state) {
      db.update(chefOnboardingState).set({ 
        currentStep: 4,
        step3Data,
        updatedAt: new Date(),
      }).where(eq(chefOnboardingState.chefId, userId)).run();
    } else {
      db.insert(chefOnboardingState).values({
        chefId: userId,
        currentStep: 4,
        step3Data,
        createdAt: new Date(),
        updatedAt: new Date(),
      }).run();
    }

    return { success: true, step: 3 };
  });

  // POST /api/onboarding/publish — publish the service and complete onboarding
  server.post('/publish', { preHandler: [server.authenticate] }, async (request, reply) => {
    const { userId, role } = request.user as { userId: number; role: string };
    
    if (role !== 'chef') {
      return reply.status(403).send({ error: 'Only chefs can publish services' });
    }

    // Get the onboarding service
    const service = db.select().from(services)
      .where(eq(services.chefId, userId))
      .all()
      .filter(s => s.isOnboardingService && s.status === 'draft')
      .pop();

    if (!service) {
      return reply.status(400).send({ error: 'No service to publish' });
    }

    // Validate service has required fields
    if (!service.name || !service.description || service.pricePerPerson < 20) {
      return reply.status(400).send({ error: 'Service is missing required fields' });
    }

    // Publish the service
    db.update(services).set({ status: 'published' })
      .where(eq(services.id, service.id)).run();

    // Mark onboarding complete
    db.update(chefProfiles).set({ 
      onboardingCompletedAt: new Date(),
      profileCompletedAt: new Date(),
    }).where(eq(chefProfiles.userId, userId)).run();

    // Clear onboarding state
    db.delete(chefOnboardingState).where(eq(chefOnboardingState.chefId, userId)).run();

    const updatedService = db.select().from(services).where(eq(services.id, service.id)).get();

    return { 
      success: true, 
      published: true,
      service: updatedService,
    };
  });

  // GET /api/onboarding/preview — get preview data for step 4
  server.get('/preview', { preHandler: [server.authenticate] }, async (request, reply) => {
    const { userId, role } = request.user as { userId: number; role: string };
    
    if (role !== 'chef') {
      return reply.status(403).send({ error: 'Only chefs can preview onboarding' });
    }

    // Get onboarding state
    const state = db.select().from(chefOnboardingState).where(eq(chefOnboardingState.chefId, userId)).get();
    
    if (!state) {
      return reply.status(400).send({ error: 'No onboarding in progress' });
    }

    // Get chef profile for preview
    const profile = db.select().from(chefProfiles).where(eq(chefProfiles.userId, userId)).get();
    
    if (!profile) {
      return reply.status(400).send({ error: 'Chef profile not found' });
    }

    // Get the onboarding service
    const service = db.select().from(services)
      .where(eq(services.chefId, userId))
      .all()
      .filter(s => s.isOnboardingService && s.status === 'draft')
      .pop();

    return {
      profile: {
        displayName: state.step1Data ? JSON.parse(state.step1Data).displayName : profile.bio,
        bio: profile.bio,
        cuisineTags: JSON.parse(profile.cuisineTypes || '[]'),
        location: profile.location,
      },
      service: service ? {
        id: service.id,
        name: service.name,
        description: service.description,
        price: service.pricePerPerson,
        minGuests: service.minGuests,
        maxGuests: service.maxGuests,
        category: service.category,
        blockedDates: JSON.parse(service.blockedDates || '[]'),
      } : null,
      step1Data: state.step1Data ? JSON.parse(state.step1Data) : null,
      step2Data: state.step2Data ? JSON.parse(state.step2Data) : null,
      step3Data: state.step3Data ? JSON.parse(state.step3Data) : null,
    };
  });

  // DELETE /api/onboarding/state — clear onboarding state (abort/cancel)
  server.delete('/state', { preHandler: [server.authenticate] }, async (request, reply) => {
    const { userId, role } = request.user as { userId: number; role: string };
    
    if (role !== 'chef') {
      return reply.status(403).send({ error: 'Only chefs have onboarding state' });
    }

    // Delete onboarding state
    db.delete(chefOnboardingState).where(eq(chefOnboardingState.chefId, userId)).run();

    // Delete any onboarding service drafts
    const onboardingServices = db.select().from(services)
      .where(eq(services.chefId, userId))
      .all()
      .filter(s => s.isOnboardingService);
    
    for (const svc of onboardingServices) {
      db.delete(services).where(eq(services.id, svc.id)).run();
    }

    return { success: true };
  });
}