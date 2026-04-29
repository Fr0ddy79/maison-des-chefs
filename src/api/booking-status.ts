import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { db } from '../db/index.js';
import { leads, services, users, chefProfiles } from '../db/schema.js';
import { eq } from 'drizzle-orm';

/**
 * Format a date string for display.
 */
function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'Not specified';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

/**
 * Get the display-friendly status text for leads.
 */
function getStatusDisplay(status: string): { label: string; color: string; description: string } {
  // Lead statuses from the leads table
  const statusMap: Record<string, { label: string; color: string; description: string }> = {
    'new': { label: 'New Inquiry', color: '#f59e0b', description: 'Chef will review your request soon' },
    'pending': { label: 'Pending', color: '#f59e0b', description: 'Waiting for chef to respond' },
    'quoted': { label: 'Quote Received', color: '#3b82f6', description: 'Chef has sent you a quote' },
    'accepted': { label: 'Accepted', color: '#22c55e', description: 'Chef has accepted your request' },
    'declined': { label: 'Declined', color: '#ef4444', description: 'Chef has declined your request' },
    'converted': { label: 'Booking Confirmed', color: '#22c55e', description: 'A booking has been created' },
    'cancelled': { label: 'Cancelled', color: '#6b7280', description: 'This inquiry has been cancelled' },
  };
  return statusMap[status] || { label: status, color: '#6b7280', description: '' };
}

/**
 * Check if a quote has been sent (quote-related statuses).
 */
function hasQuote(status: string): boolean {
  return ['quoted', 'accepted', 'converted'].includes(status);
}

export default async function bookingStatusRoutes(server: FastifyInstance) {
  // GET /api/booking-status/:token - Public endpoint to get booking status by access token
  // MAI-805: This endpoint works with leads (inquiries) to track guest booking status
  server.get('/:token', async (request, reply) => {
    const { token } = z.object({ token: z.string() }).parse(request.params);

    if (!token || token.length !== 64) {
      return reply.status(400).send({ error: 'Invalid access token' });
    }

    // Find lead by access token
    const lead = db.select({
      id: leads.id,
      serviceId: leads.serviceId,
      eventDate: leads.eventDate,
      guestCount: leads.guestCount,
      status: leads.status,
      message: leads.message,
      createdAt: leads.createdAt,
      accessToken: leads.accessToken,
      accessTokenExpiresAt: leads.accessTokenExpiresAt,
      email: leads.email,
      clientName: leads.clientName,
      quoteAmount: leads.quoteAmount,
      quoteMessage: leads.quoteMessage,
      quoteSentAt: leads.quoteSentAt,
      // Service info
      serviceName: services.name,
      serviceDescription: services.description,
      // Chef info
      chefId: leads.chefId,
      chefName: users.name,
      chefLocation: chefProfiles.location,
    })
      .from(leads)
      .innerJoin(services, eq(leads.serviceId, services.id))
      .innerJoin(users, eq(leads.chefId, users.id))
      .leftJoin(chefProfiles, eq(leads.chefId, chefProfiles.userId))
      .where(eq(leads.accessToken, token))
      .get();

    if (!lead) {
      return reply.status(404).send({ error: 'Booking not found' });
    }

    // Check if token has expired
    if (lead.accessTokenExpiresAt && new Date(lead.accessTokenExpiresAt) < new Date()) {
      return reply.status(410).send({
        error: 'Access token has expired',
        expiredAt: lead.accessTokenExpiresAt,
      });
    }

    // Build the response (non-sensitive data only)
    const statusDisplay = getStatusDisplay(lead.status);
    const hasQuoteSent = hasQuote(lead.status);
    const checkoutUrl = hasQuoteSent ? `/checkout?lead=${lead.id}&token=${token}` : null;

    return {
      booking: {
        id: lead.id,
        serviceName: lead.serviceName,
        serviceDescription: lead.serviceDescription,
        chefName: lead.chefName,
        chefLocation: lead.chefLocation || 'Montreal',
        eventDate: formatDate(lead.eventDate),
        eventDateRaw: lead.eventDate,
        guestCount: lead.guestCount,
        status: lead.status,
        statusLabel: statusDisplay.label,
        statusColor: statusDisplay.color,
        statusDescription: statusDisplay.description,
        message: lead.message,
        createdAt: lead.createdAt,
        quoteAmount: hasQuoteSent ? lead.quoteAmount : null,
        quoteMessage: hasQuoteSent ? lead.quoteMessage : null,
      },
      isPaymentNeeded: hasQuoteSent,
      checkoutUrl,
      tokenExpiresAt: lead.accessTokenExpiresAt,
    };
  });
}
