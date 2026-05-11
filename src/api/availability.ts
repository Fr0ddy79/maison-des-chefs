// Chef Availability API Routes - MAI-1251: Real-Time Availability Calendar
import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { db } from '../db/index.js';
import { chefAvailability, chefBlockedDates, services, bookings } from '../db/schema.js';
import { eq, and, gte, sql } from 'drizzle-orm';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// Schema for setting weekly availability
const setWeeklyAvailabilitySchema = z.object({
  schedule: z.array(z.object({
    dayOfWeek: z.number().min(0).max(6),
    startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format, use HH:MM'),
    endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format, use HH:MM'),
    isActive: z.boolean().default(true),
  })).max(7),
});

// Schema for blocking a date
const blockDateSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format, use YYYY-MM-DD'),
  reason: z.string().max(200).optional(),
});

export default async function availabilityRoutes(server: FastifyInstance) {
  
  // GET /api/availability/:chefId - Get available time slots for a chef on a specific date (public)
  server.get('/:chefId', async (request, reply) => {
    const { chefId } = z.object({ chefId: z.string() }).parse(request.params);
    const { date } = z.object({
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format, use YYYY-MM-DD').optional(),
    }).parse(request.query);

    const chefIdNum = parseInt(chefId);
    
    // If no date provided, return the chef's weekly schedule
    if (!date) {
      const schedule = db.select().from(chefAvailability).where(
        and(eq(chefAvailability.chefId, chefIdNum), eq(chefAvailability.isActive, true))
      ).all();
      
      const scheduleByDay = schedule.reduce((acc: Record<number, any[]>, slot: any) => {
        if (!acc[slot.dayOfWeek]) acc[slot.dayOfWeek] = [];
        acc[slot.dayOfWeek].push({
          startTime: slot.startTime,
          endTime: slot.endTime,
        });
        return acc;
      }, {});
      
      return {
        weeklySchedule: DAY_NAMES.map((name, idx) => ({
          dayOfWeek: idx,
          dayName: name,
          slots: scheduleByDay[idx] || [],
          isAvailable: (scheduleByDay[idx]?.length || 0) > 0,
        })),
      };
    }

    // Get day of week for the requested date
    const requestedDate = new Date(date);
    const dayOfWeek = requestedDate.getDay();
    
    // Check if date is in the past
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (requestedDate < today) {
      return reply.status(400).send({ error: 'Cannot check availability for past dates' });
    }

    // Get chef's weekly availability for this day of week
    const daySlots = db.select().from(chefAvailability).where(
      and(
        eq(chefAvailability.chefId, chefIdNum),
        eq(chefAvailability.dayOfWeek, dayOfWeek),
        eq(chefAvailability.isActive, true)
      )
    ).all();

    // Get chef-level blocked dates
    const chefBlocked = db.select().from(chefBlockedDates).where(
      and(eq(chefBlockedDates.chefId, chefIdNum), eq(chefBlockedDates.date, date))
    ).get();

    if (chefBlocked) {
      return { date, isBlocked: true, reason: chefBlocked.reason || 'Unavailable', slots: [] };
    }

    // Get service-level blocked dates for all chef's services
    const chefServices = db.select({ blockedDates: services.blockedDates })
      .from(services)
      .where(eq(services.chefId, chefIdNum))
      .all();
    
    const allBlockedDates: string[] = [];
    for (const svc of chefServices) {
      try {
        const parsed = JSON.parse(svc.blockedDates || '[]');
        allBlockedDates.push(...parsed);
      } catch {}
    }
    
    if (allBlockedDates.includes(date)) {
      return { date, isBlocked: true, reason: 'Service unavailable on this date', slots: [] };
    }

    // Get existing bookings for this chef on this date (non-cancelled)
    const existingBookings = db.select({
      eventDate: bookings.eventDate,
      guestCount: bookings.guestCount,
      status: bookings.status,
    })
      .from(bookings)
      .where(and(eq(bookings.chefId, chefIdNum), eq(bookings.eventDate, date)))
      .all();
    
    const bookedSlots = existingBookings
      .filter(b => !['cancelled', 'rejected', 'declined'].includes(b.status))
      .map(b => b.eventDate); // eventDate stored as date string, time would be in a separate field

    // Return available slots for this date
    const isBlocked = daySlots.length === 0; // No weekly schedule set = blocked
    
    return {
      date,
      dayOfWeek,
      dayName: DAY_NAMES[dayOfWeek],
      isBlocked,
      blockedReason: isBlocked ? 'No availability set for this day' : (chefBlocked?.reason || null),
      slots: daySlots.map((slot: any) => ({
        startTime: slot.startTime,
        endTime: slot.endTime,
        isAvailable: !bookedSlots.includes(`${date} ${slot.startTime}`), // Simplified - in reality would need datetime comparison
      })),
    };
  });

  // GET /api/availability/:chefId/slots - Get available slots for a date range (public)
  // Query params: startDate (YYYY-MM-DD), endDate (YYYY-MM-DD), serviceId (optional)
  server.get('/:chefId/slots', async (request, reply) => {
    const { chefId } = z.object({ chefId: z.string() }).parse(request.params);
    const { startDate, endDate, serviceId } = z.object({
      startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      serviceId: z.string().optional(),
    }).parse(request.query);

    const chefIdNum = parseInt(chefId);
    
    // Validate date range (max 60 days)
    const start = new Date(startDate);
    const end = new Date(endDate);
    const maxRange = 60 * 24 * 60 * 60 * 1000; // 60 days in ms
    if (end.getTime() - start.getTime() > maxRange) {
      return reply.status(400).send({ error: 'Date range cannot exceed 60 days' });
    }

    // Get chef's weekly schedule
    const weeklySchedule = db.select().from(chefAvailability).where(
      and(eq(chefAvailability.chefId, chefIdNum), eq(chefAvailability.isActive, true))
    ).all();

    // Get chef blocked dates
    const blockedDates = db.select().from(chefBlockedDates).where(
      eq(chefBlockedDates.chefId, chefIdNum)
    ).all();
    const blockedDateSet = new Set(blockedDates.map(b => b.date));

    // Get service blocked dates if serviceId provided
    let serviceBlockedDates: string[] = [];
    if (serviceId) {
      const service = db.select().from(services).where(eq(services.id, parseInt(serviceId))).get();
      if (service) {
        try {
          serviceBlockedDates = JSON.parse(service.blockedDates || '[]');
        } catch {}
      }
    }

    // Get existing bookings in date range
    const existingBookings = db.select({
      eventDate: bookings.eventDate,
      status: bookings.status,
    })
      .from(bookings)
      .where(and(
        eq(bookings.chefId, chefIdNum),
        gte(bookings.eventDate, startDate)
      ))
      .all();
    
    const bookedDates = new Set(
      existingBookings
        .filter(b => !['cancelled', 'rejected', 'declined'].includes(b.status))
        .map(b => b.eventDate)
    );

    // Generate slots for each day in range
    const slots: Array<{
      date: string;
      dayName: string;
      isAvailable: boolean;
      reason?: string;
      slots: Array<{ startTime: string; endTime: string }>;
    }> = [];

    const current = new Date(start);
    while (current <= end) {
      const dateStr = current.toISOString().split('T')[0];
      const dayOfWeek = current.getDay();
      
      // Check if date is blocked
      if (blockedDateSet.has(dateStr)) {
        const blockReason = blockedDates.find(b => b.date === dateStr)?.reason;
        slots.push({
          date: dateStr,
          dayName: DAY_NAMES[dayOfWeek],
          isAvailable: false,
          reason: blockReason || 'Blocked',
          slots: [],
        });
      } else if (serviceBlockedDates.includes(dateStr)) {
        slots.push({
          date: dateStr,
          dayName: DAY_NAMES[dayOfWeek],
          isAvailable: false,
          reason: 'Service unavailable',
          slots: [],
        });
      } else if (bookedDates.has(dateStr)) {
        slots.push({
          date: dateStr,
          dayName: DAY_NAMES[dayOfWeek],
          isAvailable: false,
          reason: 'Fully booked',
          slots: [],
        });
      } else {
        // Get slots for this day of week
        const daySlots = weeklySchedule.filter(s => s.dayOfWeek === dayOfWeek);
        if (daySlots.length === 0) {
          slots.push({
            date: dateStr,
            dayName: DAY_NAMES[dayOfWeek],
            isAvailable: false,
            reason: 'Not available on this day',
            slots: [],
          });
        } else {
          slots.push({
            date: dateStr,
            dayName: DAY_NAMES[dayOfWeek],
            isAvailable: true,
            slots: daySlots.map((slot: any) => ({
              startTime: slot.startTime,
              endTime: slot.endTime,
            })),
          });
        }
      }
      
      current.setDate(current.getDate() + 1);
    }

    return { slots };
  });

  // PUT /api/availability/:chefId/schedule - Set weekly availability (chef only)
  server.put('/:chefId/schedule', { preHandler: [server.authenticate] }, async (request, reply) => {
    const { chefId } = z.object({ chefId: z.string() }).parse(request.params);
    const { userId, role } = request.user as { userId: number; role: string };
    
    if (role !== 'chef' || parseInt(chefId) !== userId) {
      return reply.status(403).send({ error: 'Access denied' });
    }

    const body = setWeeklyAvailabilitySchema.parse(request.body);
    const chefIdNum = parseInt(chefId);

    // Delete existing availability for this chef
    db.delete(chefAvailability).where(eq(chefAvailability.chefId, chefIdNum)).run();

    // Insert new schedule
    for (const slot of body.schedule) {
      db.insert(chefAvailability).values({
        chefId: chefIdNum,
        dayOfWeek: slot.dayOfWeek,
        startTime: slot.startTime,
        endTime: slot.endTime,
        isActive: slot.isActive,
      }).run();
    }

    return { success: true, schedule: body.schedule };
  });

  // GET /api/availability/:chefId/schedule - Get weekly schedule (chef or public)
  server.get('/:chefId/schedule', async (request, reply) => {
    const { chefId } = z.object({ chefId: z.string() }).parse(request.params);
    const chefIdNum = parseInt(chefId);

    const schedule = db.select().from(chefAvailability).where(
      eq(chefAvailability.chefId, chefIdNum)
    ).all();

    return {
      schedule: DAY_NAMES.map((name, idx) => {
        const daySlots = schedule.filter(s => s.dayOfWeek === idx);
        return {
          dayOfWeek: idx,
          dayName: name,
          slots: daySlots.map((slot: any) => ({
            id: slot.id,
            startTime: slot.startTime,
            endTime: slot.endTime,
            isActive: slot.isActive,
          })),
        };
      }),
    };
  });

  // POST /api/availability/:chefId/blocked-dates - Block specific dates (chef only)
  server.post('/:chefId/blocked-dates', { preHandler: [server.authenticate] }, async (request, reply) => {
    const { chefId } = z.object({ chefId: z.string() }).parse(request.params);
    const { userId, role } = request.user as { userId: number; role: string };
    
    if (role !== 'chef' || parseInt(chefId) !== userId) {
      return reply.status(403).send({ error: 'Access denied' });
    }

    const body = z.object({
      dates: z.array(blockDateSchema).min(1).max(100),
    }).parse(request.body);
    const chefIdNum = parseInt(chefId);

    const created: number[] = [];
    for (const block of body.dates) {
      // Check if already blocked
      const existing = db.select().from(chefBlockedDates).where(
        and(eq(chefBlockedDates.chefId, chefIdNum), eq(chefBlockedDates.date, block.date))
      ).get();
      
      if (!existing) {
        const result = db.insert(chefBlockedDates).values({
          chefId: chefIdNum,
          date: block.date,
          reason: block.reason,
        }).run();
        created.push(Number(result.lastInsertRowid));
      }
    }

    return { success: true, blockedCount: created.length };
  });

  // DELETE /api/availability/:chefId/blocked-dates - Unblock dates (chef only)
  server.delete('/:chefId/blocked-dates', { preHandler: [server.authenticate] }, async (request, reply) => {
    const { chefId } = z.object({ chefId: z.string() }).parse(request.params);
    const { userId, role } = request.user as { userId: number; role: string };
    
    if (role !== 'chef' || parseInt(chefId) !== userId) {
      return reply.status(403).send({ error: 'Access denied' });
    }

    const body = z.object({
      dates: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).min(1),
    }).parse(request.body);
    const chefIdNum = parseInt(chefId);

    let deleted = 0;
    for (const date of body.dates) {
      const result = db.delete(chefBlockedDates).where(
        and(eq(chefBlockedDates.chefId, chefIdNum), eq(chefBlockedDates.date, date))
      ).run();
      deleted += result.changes || 0;
    }

    return { success: true, deletedCount: deleted };
  });

  // GET /api/availability/:chefId/blocked-dates - Get blocked dates (chef or public)
  server.get('/:chefId/blocked-dates', async (request, reply) => {
    const { chefId } = z.object({ chefId: z.string() }).parse(request.params);
    const { startDate, endDate } = z.object({
      startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    }).parse(request.query);
    const chefIdNum = parseInt(chefId);

    let query = db.select().from(chefBlockedDates).where(
      eq(chefBlockedDates.chefId, chefIdNum)
    );

    const blockedDates = query.all();
    
    // Filter by date range if provided
    let filtered = blockedDates;
    if (startDate && endDate) {
      filtered = blockedDates.filter(b => b.date >= startDate && b.date <= endDate);
    }

    return {
      blockedDates: filtered.map(b => ({
        date: b.date,
        reason: b.reason,
      })),
    };
  });
}