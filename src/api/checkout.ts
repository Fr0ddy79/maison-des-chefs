import { FastifyInstance } from 'fastify';
import Stripe from 'stripe';
import { z } from 'zod';
import { db } from '../db/index.js';
import { leads, services, users, chefProfiles } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { getAddonsByIds } from '../data/addons.js';

const CHECKOUT_URL = process.env.CHECKOUT_URL || 'https://maisondeschefs.com';
const DASHBOARD_URL = process.env.DASHBOARD_URL || 'https://maisondeschefs.com';

// Initialize Stripe - use test key if available
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder', {
  apiVersion: '2026-04-22.dahlia',
});

/**
 * Verify the access token matches the lead.
 */
function verifyLeadAccess(leadId: number, token: string) {
  const lead = db.select({
    id: leads.id,
    accessToken: leads.accessToken,
    accessTokenExpiresAt: leads.accessTokenExpiresAt,
  })
    .from(leads)
    .where(eq(leads.id, leadId))
    .get();

  if (!lead) return null;
  if (lead.accessToken !== token) return null;
  if (lead.accessTokenExpiresAt && new Date(lead.accessTokenExpiresAt) < new Date()) return null;

  return lead;
}

/**
 * Format a date string for display.
 */
function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'Not specified';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

export default async function checkoutRoutes(server: FastifyInstance) {
  // GET /api/checkout/:leadId - Get checkout summary
  server.get('/:leadId', async (request, reply) => {
    const { leadId } = request.params as { leadId: string };
    const query = request.query as { token?: string };

    const lead = db.select({
      id: leads.id,
      serviceId: leads.serviceId,
      eventDate: leads.eventDate,
      guestCount: leads.guestCount,
      status: leads.status,
      message: leads.message,
      accessToken: leads.accessToken,
      accessTokenExpiresAt: leads.accessTokenExpiresAt,
      email: leads.email,
      clientName: leads.clientName,
      quoteAmount: leads.quoteAmount,
      quoteMessage: leads.quoteMessage,
      quoteSentAt: leads.quoteSentAt,
      referralCode: leads.referralCode,
      selectedAddons: leads.selectedAddons,
      serviceName: services.name,
      serviceDescription: services.description,
      chefId: leads.chefId,
      chefName: users.name,
      chefLocation: chefProfiles.location,
    })
      .from(leads)
      .innerJoin(services, eq(leads.serviceId, services.id))
      .innerJoin(users, eq(leads.chefId, users.id))
      .leftJoin(chefProfiles, eq(leads.chefId, chefProfiles.userId))
      .where(eq(leads.id, parseInt(leadId)))
      .get();

    if (!lead) {
      return reply.status(404).send({ error: 'Booking not found' });
    }

    // Verify token if provided (optional for GET, but recommended)
    if (query.token) {
      const verified = verifyLeadAccess(lead.id, query.token);
      if (!verified) {
        return reply.status(403).send({ error: 'Invalid or expired access token' });
      }
    }

    // Check if lead has a quote (can proceed to checkout)
    const canPay = ['quoted', 'accepted'].includes(lead.status);
    if (!canPay) {
      return reply.status(400).send({
        error: 'Payment not available',
        message: 'A quote must be sent before payment can be processed',
        status: lead.status,
      });
    }

    // MAI-875: Parse selected addons
    let selectedAddonIds: string[] = [];
    try {
      selectedAddonIds = JSON.parse(lead.selectedAddons || '[]');
    } catch {
      selectedAddonIds = [];
    }
    const selectedAddons = getAddonsByIds(selectedAddonIds);
    const addonsTotal = selectedAddons.reduce((sum, addon) => sum + addon.price, 0);

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
        quoteAmount: lead.quoteAmount,
        quoteMessage: lead.quoteMessage,
        status: lead.status,
        // MAI-875: Addon info
        selectedAddons: selectedAddons.map(a => ({ id: a.id, name: a.name, price: a.price })),
        addonsTotal,
      },
      canPay,
      paymentDue: canPay,
    };
  });

  // POST /api/checkout/:leadId/create-session - Create Stripe Checkout Session
  server.post('/:leadId/create-session', async (request, reply) => {
    const { leadId } = request.params as { leadId: string };
    const query = request.query as { token?: string };

    // Validate token
    if (!query.token) {
      return reply.status(400).send({ error: 'Access token required' });
    }

    const verified = verifyLeadAccess(parseInt(leadId), query.token);
    if (!verified) {
      return reply.status(403).send({ error: 'Invalid or expired access token' });
    }

    // Get lead with full details
    const lead = db.select({
      id: leads.id,
      serviceId: leads.serviceId,
      eventDate: leads.eventDate,
      guestCount: leads.guestCount,
      status: leads.status,
      email: leads.email,
      clientName: leads.clientName,
      quoteAmount: leads.quoteAmount,
      quoteMessage: leads.quoteMessage,
      selectedAddons: leads.selectedAddons,
      serviceName: services.name,
      serviceDescription: services.description,
      chefId: leads.chefId,
      chefName: users.name,
    })
      .from(leads)
      .innerJoin(services, eq(leads.serviceId, services.id))
      .innerJoin(users, eq(leads.chefId, users.id))
      .where(eq(leads.id, parseInt(leadId)))
      .get();

    if (!lead) {
      return reply.status(404).send({ error: 'Booking not found' });
    }

    // Check if lead has a quote
    if (!['quoted', 'accepted'].includes(lead.status)) {
      return reply.status(400).send({
        error: 'Payment not available',
        message: 'A quote must be sent before payment can be processed',
        status: lead.status,
      });
    }

    if (!lead.quoteAmount || lead.quoteAmount <= 0) {
      return reply.status(400).send({
        error: 'Invalid quote amount',
        message: 'Quote amount is not set or is invalid',
      });
    }

    // MAI-875: Build line items including addons
    const lineItems: any[] = [
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: lead.serviceName,
            description: `${lead.guestCount} guests • ${formatDate(lead.eventDate)} • Chef ${lead.chefName}`,
          },
          unit_amount: Math.round(lead.quoteAmount * 100), // Convert to cents
        },
        quantity: 1,
      },
    ];

    // MAI-875: Add selected addons as separate line items
    let selectedAddonIds: string[] = [];
    try {
      selectedAddonIds = JSON.parse(lead.selectedAddons || '[]');
    } catch {
      selectedAddonIds = [];
    }
    const selectedAddons = getAddonsByIds(selectedAddonIds);
    for (const addon of selectedAddons) {
      lineItems.push({
        price_data: {
          currency: 'usd',
          product_data: {
            name: addon.name,
            description: addon.description,
          },
          unit_amount: Math.round(addon.price * 100), // Convert to cents
        },
        quantity: 1,
      });
    }

    // Create Stripe Checkout Session
    try {
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: lineItems,
        mode: 'payment',
        success_url: `${CHECKOUT_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}&lead=${lead.id}&token=${query.token}`,
        cancel_url: `${CHECKOUT_URL}/checkout/cancel?lead=${lead.id}&token=${query.token}`,
        customer_email: lead.email,
        metadata: {
          leadId: lead.id.toString(),
          chefId: lead.chefId.toString(),
          serviceId: lead.serviceId.toString(),
          // MAI-875: Store selected addon IDs for success page
          selectedAddonIds: JSON.stringify(selectedAddonIds),
        },
        payment_intent_data: {
          metadata: {
            leadId: lead.id.toString(),
            chefId: lead.chefId.toString(),
            serviceId: lead.serviceId.toString(),
            selectedAddonIds: JSON.stringify(selectedAddonIds),
          },
        },
      });

      return {
        sessionId: session.id,
        url: session.url,
      };
    } catch (error: any) {
      console.error('Stripe error:', error);
      return reply.status(500).send({
        error: 'Failed to create checkout session',
        message: error.message,
      });
    }
  });
}