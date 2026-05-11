// Admin API - Operator Rescue Dashboard (MAI-1281)
// Returns all bookings for the operator rescue dashboard

import { db } from '../db/index.js';
import { bookings, services, users, chefProfiles, leads } from '../db/schema.js';
import { eq, sql, desc, and } from 'drizzle-orm';

export default async function adminBookingsHandler(status: string = 'all') {
  // Build where clause based on status filter
  let whereClause;
  if (status && status !== 'all') {
    whereClause = eq(bookings.status, status as any);
  }

  // Fetch all bookings with chef and diner info
  const allBookings = db
    .select({
      id: bookings.id,
      chefId: bookings.chefId,
      serviceId: bookings.serviceId,
      dinerId: bookings.dinerId,
      eventDate: bookings.eventDate,
      guestCount: bookings.guestCount,
      totalPrice: bookings.totalPrice,
      status: bookings.status,
      notes: bookings.notes,
      createdAt: bookings.createdAt,
      // Chef info
      chefName: users.name,
      // Service info
      serviceName: services.name,
      // Diner info (if logged in diner)
      dinerName: sql`COALESCE(
        (SELECT name FROM users WHERE id = ${bookings.dinerId}),
        'Guest'
      )`,
      dinerEmail: sql`COALESCE(
        (SELECT email FROM users WHERE id = ${bookings.dinerId}),
        ${bookings.guestEmail}
      )`,
    })
    .from(bookings)
    .innerJoin(users, eq(bookings.chefId, users.id))
    .leftJoin(services, eq(bookings.serviceId, services.id))
    .where(whereClause)
    .orderBy(desc(bookings.createdAt))
    .all();

  // Calculate days pending for each booking
  const now = new Date();
  const enrichedBookings = allBookings.map(booking => {
    const createdAt = booking.createdAt ? new Date(booking.createdAt) : now;
    const daysPending = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
    return {
      id: booking.id,
      chefId: booking.chefId,
      chefName: booking.chefName,
      serviceId: booking.serviceId,
      serviceName: booking.serviceName,
      dinerName: booking.dinerName,
      dinerEmail: booking.dinerEmail,
      eventDate: booking.eventDate,
      guests: booking.guestCount,
      totalPrice: booking.totalPrice,
      status: booking.status,
      createdAt: booking.createdAt?.toISOString(),
      daysPending,
    };
  });

  return {
    bookings: enrichedBookings,
    total: enrichedBookings.length,
  };
}
