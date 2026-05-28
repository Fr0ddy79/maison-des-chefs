// Chef Availability API Routes - MAI-2131/MAI-2135
// Endpoints under /api/chefs/:id/availability/*
// Uses chef_availability_slots (new) and chef_blocked_dates (existing MAI-1251)
import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { db } from '../db/index.js';
import { chefAvailabilitySlots, chefBlockedDates, bookings, users } from '../db/schema.js';
import { eq, and, gte, lte, ne } from 'drizzle-orm';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// Schema for updating weekly availability slots
const updateSlotsSchema = z.object({
  slots: z.array(z.object({
    dayOfWeek: z.number().int().min(0).max(6),
    startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format, use HH:MM'),
    endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format, use HH:MM'),
    isActive: z.boolean().default(true),
  })).max(7),
});

// Schema for blocking dates
const blockDatesSchema = z.object({
  dates: z.array(z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format, use YYYY-MM-DD'),
    reason: z.string().max(200).optional(),
  })).min(1).max(100),
});

function generateUUID(): string {
  return crypto.randomUUID();
}

export default async function chefAvailabilityRoutes(server: FastifyInstance) {

  // GET /api/chefs/:id/availability?from=&to= — return available slots for date range
  server.get('/:id/availability', async (request, reply) => {
    const { id } = z.object({ id: z.string() }).parse(request.params);
    const { from, to } = z.object({
      from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    }).parse(request.query);

    const chefId = parseInt(id);
    if (isNaN(chefId)) {
      return reply.status(400).send({ error: 'Invalid chef ID' });
    }

    // Verify chef exists
    const chef = db.select({ id: users.id, name: users.name }).from(users).where(
      and(eq(users.id, chefId), eq(users.role, 'chef'))
    ).get();
    if (!chef) {
      return reply.status(404).send({ error: 'Chef not found' });
    }

    // If no date range provided, return weekly template
    if (!from || !to) {
      const slots = db.select().from(chefAvailabilitySlots).where(
        eq(chefAvailabilitySlots.chefId, chefId)
      ).all();

      return {
        chefId,
        weeklyTemplate: DAY_NAMES.map((name, dayOfWeek) => {
          const daySlots = slots.filter(s => s.dayOfWeek === dayOfWeek);
          return {
            dayOfWeek,
            dayName: name,
            slots: daySlots.map(slot => ({
              id: slot.id,
              startTime: slot.startTime,
              endTime: slot.endTime,
              isActive: slot.isActive,
            })),
            isAvailable: daySlots.some(s => s.isActive),
          };
        }),
      };
    }

    // Validate date range (max 30 days for MVP)
    const fromDate = new Date(from);
    const toDate = new Date(to);
    const maxRangeMs = 30 * 24 * 60 * 60 * 1000;
    if (toDate.getTime() - fromDate.getTime() > maxRangeMs) {
      return reply.status(400).send({ error: 'Date range cannot exceed 30 days' });
    }

    if (fromDate > toDate) {
      return reply.status(400).send({ error: 'from date must be before or equal to to date' });
    }

    // Get weekly template
    const weeklySlots = db.select().from(chefAvailabilitySlots).where(
      and(eq(chefAvailabilitySlots.chefId, chefId), eq(chefAvailabilitySlots.isActive, true))
    ).all();

    // Get blocked dates in range
    const blockedRows = db.select().from(chefBlockedDates).where(
      and(
        eq(chefBlockedDates.chefId, chefId),
        gte(chefBlockedDates.date, from),
        lte(chefBlockedDates.date, to)
      )
    ).all();
    const blockedDateMap = new Map(blockedRows.map(b => [b.date, b.reason]));

    // Get existing confirmed bookings in range
    const existingBookings = db.select({
      eventDate: bookings.eventDate,
      status: bookings.status,
    })
      .from(bookings)
      .where(
        and(
          eq(bookings.chefId, chefId),
          gte(bookings.eventDate, from),
          lte(bookings.eventDate, to),
          ne(bookings.status, 'cancelled')
        )
      )
      .all();
    const bookedDates = new Set(
      existingBookings
        .filter(b => !['cancelled', 'rejected', 'declined'].includes(b.status))
        .map(b => b.eventDate)
    );

    // Build availability for each day in range
    const days: Array<{
      date: string;
      dayName: string;
      dayOfWeek: number;
      isAvailable: boolean;
      reason?: string;
      slots: Array<{ startTime: string; endTime: string }>;
    }> = [];

    const current = new Date(fromDate);
    while (current <= toDate) {
      const dateStr = current.toISOString().split('T')[0];
      const dayOfWeek = current.getDay();

      if (blockedDateMap.has(dateStr)) {
        days.push({
          date: dateStr,
          dayName: DAY_NAMES[dayOfWeek],
          dayOfWeek,
          isAvailable: false,
          reason: blockedDateMap.get(dateStr) || 'Blocked',
          slots: [],
        });
      } else if (bookedDates.has(dateStr)) {
        days.push({
          date: dateStr,
          dayName: DAY_NAMES[dayOfWeek],
          dayOfWeek,
          isAvailable: false,
          reason: 'Fully booked',
          slots: [],
        });
      } else {
        const daySlots = weeklySlots.filter(s => s.dayOfWeek === dayOfWeek);
        if (daySlots.length === 0) {
          days.push({
            date: dateStr,
            dayName: DAY_NAMES[dayOfWeek],
            dayOfWeek,
            isAvailable: false,
            reason: 'Not available on this day',
            slots: [],
          });
        } else {
          days.push({
            date: dateStr,
            dayName: DAY_NAMES[dayOfWeek],
            dayOfWeek,
            isAvailable: true,
            slots: daySlots.map(s => ({
              startTime: s.startTime,
              endTime: s.endTime,
            })),
          });
        }
      }

      current.setDate(current.getDate() + 1);
    }

    return {
      chefId,
      from,
      to,
      days,
    };
  });

  // PUT /api/chefs/:id/availability/slots — update weekly template (chef only)
  server.put('/:id/availability/slots', { preHandler: [server.authenticate] }, async (request, reply) => {
    const { id } = z.object({ id: z.string() }).parse(request.params);
    const { userId, role } = request.user as { userId: number; role: string };

    const chefId = parseInt(id);
    if (isNaN(chefId)) {
      return reply.status(400).send({ error: 'Invalid chef ID' });
    }

    if (role !== 'chef' || chefId !== userId) {
      return reply.status(403).send({ error: 'Access denied. Only the chef can update their own availability.' });
    }

    const body = updateSlotsSchema.parse(request.body);

    // Delete existing slots for this chef
    db.delete(chefAvailabilitySlots).where(eq(chefAvailabilitySlots.chefId, chefId)).run();

    // Insert new slots
    const created = body.slots.map(slot => ({
      id: generateUUID(),
      chefId,
      dayOfWeek: slot.dayOfWeek,
      startTime: slot.startTime,
      endTime: slot.endTime,
      isActive: slot.isActive,
    }));

    for (const slot of created) {
      db.insert(chefAvailabilitySlots).values(slot).run();
    }

    return {
      success: true,
      slots: created.map(s => ({
        id: s.id,
        dayOfWeek: s.dayOfWeek,
        startTime: s.startTime,
        endTime: s.endTime,
        isActive: s.isActive,
      })),
    };
  });

  // POST /api/chefs/:id/availability/blocked-dates — block specific dates (chef only)
  server.post('/:id/availability/blocked-dates', { preHandler: [server.authenticate] }, async (request, reply) => {
    const { id } = z.object({ id: z.string() }).parse(request.params);
    const { userId, role } = request.user as { userId: number; role: string };

    const chefId = parseInt(id);
    if (isNaN(chefId)) {
      return reply.status(400).send({ error: 'Invalid chef ID' });
    }

    if (role !== 'chef' || chefId !== userId) {
      return reply.status(403).send({ error: 'Access denied. Only the chef can block dates on their own calendar.' });
    }

    const body = blockDatesSchema.parse(request.body);

    let created = 0;
    let skipped = 0;

    for (const block of body.dates) {
      // Check if already blocked
      const existing = db.select().from(chefBlockedDates).where(
        and(eq(chefBlockedDates.chefId, chefId), eq(chefBlockedDates.date, block.date))
      ).get();

      if (existing) {
        skipped++;
        continue;
      }

      db.insert(chefBlockedDates).values({
        chefId,
        date: block.date,
        reason: block.reason || null,
      }).run();
      created++;
    }

    return {
      success: true,
      blockedCount: created,
      skippedCount: skipped,
    };
  });

  // DELETE /api/chefs/:id/availability/blocked-dates/:date — unblock a date (chef only)
  server.delete('/:id/availability/blocked-dates/:date', { preHandler: [server.authenticate] }, async (request, reply) => {
    const { id, date } = z.object({
      id: z.string(),
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format, use YYYY-MM-DD'),
    }).parse(request.params);
    const { userId, role } = request.user as { userId: number; role: string };

    const chefId = parseInt(id);
    if (isNaN(chefId)) {
      return reply.status(400).send({ error: 'Invalid chef ID' });
    }

    if (role !== 'chef' || chefId !== userId) {
      return reply.status(403).send({ error: 'Access denied. Only the chef can unblock dates on their own calendar.' });
    }

    const result = db.delete(chefBlockedDates).where(
      and(eq(chefBlockedDates.chefId, chefId), eq(chefBlockedDates.date, date))
    ).run();

    if (result.changes === 0) {
      return reply.status(404).send({ error: 'Blocked date not found' });
    }

    return { success: true, unblockedDate: date };
  });
}
