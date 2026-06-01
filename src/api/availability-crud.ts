// Chef Availability CRUD API - MAI-2369
// Endpoints: POST, GET, DELETE at /api/availability
// Chef can create/view/delete date-specific availability slots
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { db, schema } from '../db/index.js';
import { eq, and, gte, lte, ne } from 'drizzle-orm';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

// Schema for creating an availability slot
const createSlotSchema = z.object({
  date: z.string().regex(dateRegex, 'Invalid date format, use YYYY-MM-DD'),
  start_time: z.string().regex(timeRegex, 'Invalid start_time format, use HH:MM'),
  end_time: z.string().regex(timeRegex, 'Invalid end_time format, use HH:MM'),
});

// Schema for deleting a slot (by ID or by date+time)
const deleteSlotSchema = z.object({
  id: z.string().optional(),
  date: z.string().regex(dateRegex, 'Invalid date format, use YYYY-MM-DD').optional(),
  start_time: z.string().regex(timeRegex, 'Invalid start_time format, use HH:MM').optional(),
}).refine(data => data.id || (data.date && data.start_time), {
  message: 'Either id or (date + start_time) must be provided',
});

function generateUUID(): string {
  return crypto.randomUUID();
}

/**
 * Parse time string "HH:MM" to minutes since midnight
 */
function parseTimeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Check if two time ranges overlap
 */
function timeRangesOverlap(s1: string, e1: string, s2: string, e2: string): boolean {
  const start1 = parseTimeToMinutes(s1);
  const end1 = parseTimeToMinutes(e1);
  const start2 = parseTimeToMinutes(s2);
  const end2 = parseTimeToMinutes(e2);
  return start1 < end2 && start2 < end1;
}

export async function availabilityRoutes(server: FastifyInstance) {

  /**
   * POST /api/availability
   * Create a new availability slot for the authenticated chef.
   * Body: { date, start_time, end_time }
   */
  server.post('/api/availability', { preHandler: [server.authenticate] }, async (
    request: FastifyRequest,
    reply: FastifyReply
  ) => {
    try {
      const { userId, role } = request.user as { userId: number; role: string };

      // Only chefs can create availability slots
      if (role !== 'chef') {
        return reply.status(403).send({ error: 'Only chefs can manage availability slots' });
      }

      const body = createSlotSchema.parse(request.body);

      // Validate that start_time is before end_time
      if (parseTimeToMinutes(body.start_time) >= parseTimeToMinutes(body.end_time)) {
        return reply.status(400).send({ error: 'start_time must be before end_time' });
      }

      // Check date isn't in the past
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (new Date(body.date) < today) {
        return reply.status(400).send({ error: 'Cannot create availability slot for a past date' });
      }

      // Check for existing overlapping slot on the same date
      const existingSlots = db.select().from(schema.availability).where(
        and(
          eq(schema.availability.chefId, userId),
          eq(schema.availability.date, body.date)
        )
      ).all();

      for (const slot of existingSlots) {
        if (timeRangesOverlap(body.start_time, body.end_time, slot.startTime, slot.endTime)) {
          return reply.status(409).send({
            error: 'Time slot overlaps with an existing slot',
            existingSlot: {
              id: slot.id,
              start_time: slot.startTime,
              end_time: slot.endTime,
            },
          });
        }
      }

      // Create the new slot
      const now = new Date();
      const [created] = db.insert(schema.availability).values({
        id: generateUUID(),
        chefId: userId,
        date: body.date,
        startTime: body.start_time,
        endTime: body.end_time,
        isBooked: false,
        createdAt: now,
        updatedAt: now,
      }).returning().all();

      return reply.status(201).send({
        success: true,
        slot: {
          id: created.id,
          date: created.date,
          start_time: created.startTime,
          end_time: created.endTime,
          is_booked: created.isBooked,
        },
      });
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return reply.status(400).send({ error: 'Validation failed', details: err.errors });
      }
      console.error('Create availability slot error:', err);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  /**
   * GET /api/availability
   * Get all availability slots for the authenticated chef.
   * Query params: date_from (optional), date_to (optional)
   */
  server.get('/api/availability', { preHandler: [server.authenticate] }, async (
    request: FastifyRequest,
    reply: FastifyReply
  ) => {
    try {
      const { userId, role } = request.user as { userId: number; role: string };

      if (role !== 'chef') {
        return reply.status(403).send({ error: 'Only chefs can view availability slots' });
      }

      const query = z.object({
        date_from: z.string().regex(dateRegex, 'Invalid date format').optional(),
        date_to: z.string().regex(dateRegex, 'Invalid date format').optional(),
      }).parse(request.query);

      let slots;

      if (query.date_from && query.date_to) {
        // Date range query
        slots = db.select().from(schema.availability).where(
          and(
            eq(schema.availability.chefId, userId),
            gte(schema.availability.date, query.date_from),
            lte(schema.availability.date, query.date_to)
          )
        ).all();
      } else if (query.date_from) {
        // From date onwards
        slots = db.select().from(schema.availability).where(
          and(
            eq(schema.availability.chefId, userId),
            gte(schema.availability.date, query.date_from)
          )
        ).all();
      } else if (query.date_to) {
        // Up to date
        slots = db.select().from(schema.availability).where(
          and(
            eq(schema.availability.chefId, userId),
            lte(schema.availability.date, query.date_to)
          )
        ).all();
      } else {
        // All slots for this chef
        slots = db.select().from(schema.availability).where(
          eq(schema.availability.chefId, userId)
        ).all();
      }

      return {
        slots: slots.map(s => ({
          id: s.id,
          date: s.date,
          start_time: s.startTime,
          end_time: s.endTime,
          is_booked: s.isBooked,
          created_at: s.createdAt,
        })),
        total: slots.length,
      };
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return reply.status(400).send({ error: 'Invalid query parameters', details: err.errors });
      }
      console.error('Get availability slots error:', err);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  /**
   * DELETE /api/availability
   * Delete an availability slot (only if is_booked = false).
   * Body: { id } or { date, start_time }
   */
  server.delete('/api/availability', { preHandler: [server.authenticate] }, async (
    request: FastifyRequest,
    reply: FastifyReply
  ) => {
    try {
      const { userId, role } = request.user as { userId: number; role: string };

      if (role !== 'chef') {
        return reply.status(403).send({ error: 'Only chefs can delete availability slots' });
      }

      const body = deleteSlotSchema.parse(request.body);

      let slotToDelete;

      if (body.id) {
        // Delete by ID
        slotToDelete = db.select().from(schema.availability).where(
          and(
            eq(schema.availability.id, body.id),
            eq(schema.availability.chefId, userId)
          )
        ).get();
      } else if (body.date && body.start_time) {
        // Delete by date + start_time
        slotToDelete = db.select().from(schema.availability).where(
          and(
            eq(schema.availability.chefId, userId),
            eq(schema.availability.date, body.date),
            eq(schema.availability.startTime, body.start_time)
          )
        ).get();
      }

      if (!slotToDelete) {
        return reply.status(404).send({ error: 'Availability slot not found' });
      }

      // Check if slot is booked - cannot delete booked slots
      if (slotToDelete.isBooked) {
        return reply.status(409).send({
          error: 'Cannot delete a booked slot. Please cancel the booking first.',
          slot: {
            id: slotToDelete.id,
            date: slotToDelete.date,
            start_time: slotToDelete.startTime,
            end_time: slotToDelete.endTime,
            is_booked: slotToDelete.isBooked,
          },
        });
      }

      // Delete the slot
      const deleteQuery = body.id
        ? db.delete(schema.availability).where(eq(schema.availability.id, body.id))
        : db.delete(schema.availability).where(
            and(
              eq(schema.availability.chefId, userId),
              eq(schema.availability.date, body.date!),
              eq(schema.availability.startTime, body.start_time!)
            )
          );

      const result = deleteQuery.run();

      if (result.changes === 0) {
        return reply.status(404).send({ error: 'Slot not found or already deleted' });
      }

      return {
        success: true,
        deleted: {
          id: slotToDelete.id,
          date: slotToDelete.date,
          start_time: slotToDelete.startTime,
          end_time: slotToDelete.endTime,
        },
      };
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return reply.status(400).send({ error: 'Validation failed', details: err.errors });
      }
      console.error('Delete availability slot error:', err);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });
}

export default availabilityRoutes;