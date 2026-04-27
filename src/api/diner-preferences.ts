import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { db } from '../db/index.js';
import { dinerPreferences, dinerWizardEvents, users } from '../db/schema.js';
import { eq } from 'drizzle-orm';

// Controlled cuisine list (matches wizard UI)
const CUISINE_TAGS = ['italian', 'mexican', 'asian', 'american', 'mediterranean', 'indian', 'french', 'middle_eastern', 'other'] as const;
// Controlled dietary list (matches existing DIETARY_TAGS)
const DIETARY_TAGS = ['none', 'vegetarian', 'vegan', 'gluten_free', 'dairy_free', 'nut_free', 'halal', 'kosher'] as const;
const SPICE_TOLERANCE = ['mild', 'medium', 'hot'] as const;
const WIZARD_COMPLETION_STATUS = ['none', 'partial', 'skipped', 'completed'] as const;

// Schemas
const preferencesUpsertSchema = z.object({
  cuisines: z.array(z.enum(CUISINE_TAGS)).max(5),
  dietaryRestrictions: z.array(z.enum(DIETARY_TAGS)),
  spiceTolerance: z.enum(SPICE_TOLERANCE).default('medium'),
  defaultPartySize: z.number().int().min(1).max(8).default(2),
  defaultDelivery: z.boolean().default(true),
  defaultLocation: z.string().max(200).default(''),
  wizardCompletionStatus: z.enum(WIZARD_COMPLETION_STATUS).optional(),
});

const preferencesPatchSchema = z.object({
  cuisines: z.array(z.enum(CUISINE_TAGS)).max(5).optional(),
  dietaryRestrictions: z.array(z.enum(DIETARY_TAGS)).optional(),
  spiceTolerance: z.enum(SPICE_TOLERANCE).optional(),
  defaultPartySize: z.number().int().min(1).max(8).optional(),
  defaultDelivery: z.boolean().optional(),
  defaultLocation: z.string().max(200).optional(),
  wizardCompletionStatus: z.enum(WIZARD_COMPLETION_STATUS).optional(),
});

const wizardEventSchema = z.object({
  event: z.enum(['wizard_start', 'wizard_step_complete', 'wizard_complete', 'wizard_skip', 'wizard_abandon']),
  step: z.number().int().min(1).max(3).nullable().optional(),
  sessionId: z.string().uuid().optional(),
  data: z.object({
    cuisinesSelected: z.array(z.string()).optional(),
    dietarySelected: z.array(z.string()).optional(),
    deliveryMode: z.enum(['delivery', 'pickup']).optional(),
    partySize: z.number().int().min(1).max(8).optional(),
  }).optional(),
});

export default async function dinerPreferencesRoutes(server: FastifyInstance) {

  // GET /api/v1/diner/preferences — retrieve diner preferences
  server.get('/preferences', { preHandler: [server.authenticate] }, async (request, reply) => {
    const { userId, role } = request.user as { userId: number; role: string };

    if (role !== 'diner') {
      return reply.status(403).send({ error: 'Only diners have preferences' });
    }

    const prefs = db.select().from(dinerPreferences).where(eq(dinerPreferences.userId, userId)).get();

    if (!prefs) {
      return reply.status(404).send({ error: 'Preferences not found. Create with POST.' });
    }

    return {
      id: prefs.id,
      userId: prefs.userId,
      cuisines: JSON.parse(prefs.cuisines),
      dietaryRestrictions: JSON.parse(prefs.dietaryRestrictions),
      spiceTolerance: prefs.spiceTolerance,
      defaultPartySize: prefs.defaultPartySize,
      defaultDelivery: prefs.defaultDelivery,
      defaultLocation: prefs.defaultLocation,
      wizardCompletionStatus: prefs.wizardCompletionStatus,
      wizardCompletedAt: prefs.wizardCompletedAt?.toISOString() ?? null,
      createdAt: prefs.createdAt.toISOString(),
      updatedAt: prefs.updatedAt.toISOString(),
    };
  });

  // POST /api/v1/diner/preferences — create or fully replace preferences
  server.post('/preferences', { preHandler: [server.authenticate] }, async (request, reply) => {
    const { userId, role } = request.user as { userId: number; role: string };

    if (role !== 'diner') {
      return reply.status(403).send({ error: 'Only diners have preferences' });
    }

    const body = preferencesUpsertSchema.parse(request.body);

    const existing = db.select().from(dinerPreferences).where(eq(dinerPreferences.userId, userId)).get();

    const now = new Date();
    const values = {
      cuisines: JSON.stringify(body.cuisines),
      dietaryRestrictions: JSON.stringify(body.dietaryRestrictions),
      spiceTolerance: body.spiceTolerance,
      defaultPartySize: body.defaultPartySize,
      defaultDelivery: body.defaultDelivery,
      defaultLocation: body.defaultLocation,
      wizardCompletionStatus: body.wizardCompletionStatus ?? (existing?.wizardCompletionStatus ?? 'none'),
      wizardCompletedAt: body.wizardCompletionStatus === 'completed' ? now : (existing?.wizardCompletedAt ?? null),
      updatedAt: now,
    };

    if (existing) {
      db.update(dinerPreferences).set(values).where(eq(dinerPreferences.userId, userId)).run();
    } else {
      db.insert(dinerPreferences).values({
        userId,
        ...values,
        createdAt: now,
      }).run();
    }

    // If completed, mark user onboarding done
    if (body.wizardCompletionStatus === 'completed') {
      db.update(users).set({ hasCompletedOnboarding: true }).where(eq(users.id, userId)).run();
    }

    const updated = db.select().from(dinerPreferences).where(eq(dinerPreferences.userId, userId)).get();

    return {
      id: updated!.id,
      userId: updated!.userId,
      cuisines: JSON.parse(updated!.cuisines),
      dietaryRestrictions: JSON.parse(updated!.dietaryRestrictions),
      spiceTolerance: updated!.spiceTolerance,
      defaultPartySize: updated!.defaultPartySize,
      defaultDelivery: updated!.defaultDelivery,
      defaultLocation: updated!.defaultLocation,
      wizardCompletionStatus: updated!.wizardCompletionStatus,
      wizardCompletedAt: updated!.wizardCompletedAt?.toISOString() ?? null,
      createdAt: updated!.createdAt.toISOString(),
      updatedAt: updated!.updatedAt.toISOString(),
    };
  });

  // PATCH /api/v1/diner/preferences — partial update
  server.patch('/preferences', { preHandler: [server.authenticate] }, async (request, reply) => {
    const { userId, role } = request.user as { userId: number; role: string };

    if (role !== 'diner') {
      return reply.status(403).send({ error: 'Only diners have preferences' });
    }

    const body = preferencesPatchSchema.parse(request.body);
    const existing = db.select().from(dinerPreferences).where(eq(dinerPreferences.userId, userId)).get();

    if (!existing) {
      return reply.status(404).send({ error: 'Preferences not found. Create with POST.' });
    }

    const now = new Date();
    const updates: Record<string, unknown> = { updatedAt: now };

    if (body.cuisines !== undefined) updates.cuisines = JSON.stringify(body.cuisines);
    if (body.dietaryRestrictions !== undefined) updates.dietaryRestrictions = JSON.stringify(body.dietaryRestrictions);
    if (body.spiceTolerance !== undefined) updates.spiceTolerance = body.spiceTolerance;
    if (body.defaultPartySize !== undefined) updates.defaultPartySize = body.defaultPartySize;
    if (body.defaultDelivery !== undefined) updates.defaultDelivery = body.defaultDelivery;
    if (body.defaultLocation !== undefined) updates.defaultLocation = body.defaultLocation;
    if (body.wizardCompletionStatus !== undefined) {
      updates.wizardCompletionStatus = body.wizardCompletionStatus;
      if (body.wizardCompletionStatus === 'completed') {
        updates.wizardCompletedAt = now;
        db.update(users).set({ hasCompletedOnboarding: true }).where(eq(users.id, userId)).run();
      }
    }

    db.update(dinerPreferences).set(updates).where(eq(dinerPreferences.userId, userId)).run();

    const updated = db.select().from(dinerPreferences).where(eq(dinerPreferences.userId, userId)).get();

    return {
      id: updated!.id,
      userId: updated!.userId,
      cuisines: JSON.parse(updated!.cuisines),
      dietaryRestrictions: JSON.parse(updated!.dietaryRestrictions),
      spiceTolerance: updated!.spiceTolerance,
      defaultPartySize: updated!.defaultPartySize,
      defaultDelivery: updated!.defaultDelivery,
      defaultLocation: updated!.defaultLocation,
      wizardCompletionStatus: updated!.wizardCompletionStatus,
      wizardCompletedAt: updated!.wizardCompletedAt?.toISOString() ?? null,
      createdAt: updated!.createdAt.toISOString(),
      updatedAt: updated!.updatedAt.toISOString(),
    };
  });

  // POST /api/v1/diner/wizard/event — track wizard lifecycle events
  server.post('/wizard/event', { preHandler: [server.authenticate] }, async (request, reply) => {
    const { userId, role } = request.user as { userId: number; role: string };

    if (role !== 'diner') {
      return reply.status(403).send({ error: 'Only diners track wizard events' });
    }

    const body = wizardEventSchema.parse(request.body);

    db.insert(dinerWizardEvents).values({
      userId,
      event: body.event,
      step: body.step ?? null,
      sessionId: body.sessionId ?? null,
      eventData: JSON.stringify(body.data ?? {}),
      createdAt: new Date(),
    }).run();

    // If wizard_complete or wizard_skip, update preferences completion status
    if (body.event === 'wizard_complete' || body.event === 'wizard_skip') {
      const status = body.event === 'wizard_complete' ? 'completed' : 'skipped';
      const existing = db.select().from(dinerPreferences).where(eq(dinerPreferences.userId, userId)).get();
      const now = new Date();

      if (existing) {
        db.update(dinerPreferences).set({
          wizardCompletionStatus: status,
          wizardCompletedAt: status === 'completed' ? now : existing.wizardCompletedAt,
          updatedAt: now,
        }).where(eq(dinerPreferences.userId, userId)).run();
      }

      if (status === 'completed') {
        db.update(users).set({ hasCompletedOnboarding: true }).where(eq(users.id, userId)).run();
      }
    }

    return { success: true, event: body.event, recordedAt: new Date().toISOString() };
  });

  // GET /api/v1/diner/wizard/status — check wizard state for a diner
  server.get('/wizard/status', { preHandler: [server.authenticate] }, async (request, reply) => {
    const { userId, role } = request.user as { userId: number; role: string };

    if (role !== 'diner') {
      return reply.status(403).send({ error: 'Only diners have wizard status' });
    }

    const user = db.select().from(users).where(eq(users.id, userId)).get();
    const prefs = db.select().from(dinerPreferences).where(eq(dinerPreferences.userId, userId)).get();

    return {
      hasCompletedOnboarding: user?.hasCompletedOnboarding ?? false,
      wizardCompletionStatus: prefs?.wizardCompletionStatus ?? 'none',
      wizardCompletedAt: prefs?.wizardCompletedAt?.toISOString() ?? null,
      hasPreferences: !!prefs,
    };
  });

  // DELETE /api/v1/diner/preferences — reset preferences and allow wizard re-entry
  server.delete('/preferences', { preHandler: [server.authenticate] }, async (request, reply) => {
    const { userId, role } = request.user as { userId: number; role: string };

    if (role !== 'diner') {
      return reply.status(403).send({ error: 'Only diners can reset preferences' });
    }

    // Reset wizard status so it can be re-triggered
    const existing = db.select().from(dinerPreferences).where(eq(dinerPreferences.userId, userId)).get();

    if (existing) {
      db.update(dinerPreferences).set({
        wizardCompletionStatus: 'none',
        wizardCompletedAt: null,
        updatedAt: new Date(),
      }).where(eq(dinerPreferences.userId, userId)).run();
    }

    db.update(users).set({ hasCompletedOnboarding: false }).where(eq(users.id, userId)).run();

    return { success: true, message: 'Wizard can be re-entered' };
  });
}
