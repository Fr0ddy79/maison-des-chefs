import { FastifyInstance } from "fastify";
import { z } from "zod";
import { db } from "../db/index.js";
import { leads, services, users, bookings, chefProfiles, notifications } from "../db/schema.js";
import { eq, desc, sql, and, inArray } from "drizzle-orm";
import { sendQuoteEmail, sendDeclinedEmail, sendAcceptedEmail } from "../services/diner-confirmation-email.js";
import crypto from "crypto";

/**
 * MAI-1670: Fire-and-forget analytics event tracker for server-side use.
 */
async function trackAnalyticsEvent(data: Record<string, unknown>): Promise<void> {
  try {
    const body = JSON.stringify(data);
    // Use internal fetch to hit the analytics endpoint
    // In production this forwards to a real analytics service
    const response = await fetch('http://localhost:3000/api/analytics/event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    });
    if (!response.ok) {
      console.error('[Analytics] Failed to track event:', response.status);
    }
  } catch (err) {
    // Silently fail - analytics should not break business logic
    console.error('[Analytics] Error tracking event:', err);
  }
}

/**
 * Generate a secure quote token (32+ chars, URL-safe hex).
 */
function generateQuoteToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * MAI-823: Generate an 8-character alphanumeric referral code.
 */
function generateReferralCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Excluding ambiguous chars (0, O, 1, I)
  let code = '';
  const randomBytes = crypto.randomBytes(8);
  for (let i = 0; i < 8; i++) {
    code += chars[randomBytes[i] % chars.length];
  }
  return code;
}

const respondToLeadSchema = z.object({
  amount: z.number().positive("Quote amount must be greater than 0").refine(
    (v) => {
      if (v === undefined || v === null) return true;
      const decimals = (v.toString().split('.')[1] || '').length;
      return decimals <= 2;
    },
    { message: "Quote amount can have at most 2 decimal places" }
  ),
  message: z.string().max(1000).refine((v) => v.trim().length > 0, {
    message: "Quote message cannot be empty",
  }),
  chefNote: z.string().max(500).optional().default(''),
});

export default async function chefLeadsRoutes(server: FastifyInstance) {
  // GET /api/chef/leads — List all leads for authenticated chef
  server.get("/", { preHandler: [server.authenticate] }, async (request, reply) => {
    const { userId, role } = request.user as { userId: number; role: string };
    if (role !== "chef") {
      return reply.status(403).send({ error: "Only chefs can access leads" });
    }

    // Fetch leads with competing chef count for multi-inquiry leads
    const allLeads = db
      .select({
        id: leads.id,
        serviceId: leads.serviceId,
        clientName: leads.clientName,
        email: leads.email,
        phone: leads.phone,
        eventDate: leads.eventDate,
        guestCount: leads.guestCount,
        message: leads.message,
        status: leads.status,
        quoteAmount: leads.quoteAmount,
        quoteMessage: leads.quoteMessage,
        quoteSentAt: leads.quoteSentAt,
        chefNote: leads.chefNote,
        hasNote: sql<boolean>`length(${leads.chefNote}) > 0`,
        createdAt: leads.createdAt,
        inquiryType: leads.inquiryType,
        multiInquiryId: leads.multiInquiryId,
        serviceName: services.name,
      })
      .from(leads)
      .innerJoin(services, eq(leads.serviceId, services.id))
      .where(eq(leads.chefId, userId))
      .orderBy(desc(leads.createdAt))
      .all();

    // Build competingChefCount map from multiInquiryId groups
    const multiInquiryCounts = new Map<string, number>();
    for (const lead of allLeads) {
      if (lead.multiInquiryId) {
        multiInquiryCounts.set(
          lead.multiInquiryId,
          (multiInquiryCounts.get(lead.multiInquiryId) || 0) + 1
        );
      }
    }

    return allLeads.map((lead) => ({
      ...lead,
      // AC6: competingChefCount is the count of OTHER leads sharing the same multiInquiryId
      competingChefCount: lead.multiInquiryId
        ? (multiInquiryCounts.get(lead.multiInquiryId) || 1) - 1
        : 0,
    }));
  });

  // GET /api/chef/leads/:leadId — Get lead detail
  server.get("/:leadId", { preHandler: [server.authenticate] }, async (request, reply) => {
    const { userId, role } = request.user as { userId: number; role: string };
    if (role !== "chef") {
      return reply.status(403).send({ error: "Only chefs can access leads" });
    }

    const { leadId } = z.object({ leadId: z.string() }).parse(request.params);
    const lead = db
      .select({
        id: leads.id,
        serviceId: leads.serviceId,
        clientName: leads.clientName,
        email: leads.email,
        phone: leads.phone,
        eventDate: leads.eventDate,
        guestCount: leads.guestCount,
        message: leads.message,
        status: leads.status,
        quoteAmount: leads.quoteAmount,
        quoteMessage: leads.quoteMessage,
        quoteSentAt: leads.quoteSentAt,
        chefNote: leads.chefNote,
        hasNote: sql<boolean>`length(${leads.chefNote}) > 0`,
        createdAt: leads.createdAt,
        chefId: leads.chefId,
        serviceName: services.name,
        servicePricePerPerson: services.pricePerPerson,
        serviceDietaryTags: services.dietaryTags,
        serviceMinGuests: services.minGuests,
        serviceMaxGuests: services.maxGuests,
        chefName: users.name,
      })
      .from(leads)
      .innerJoin(services, eq(leads.serviceId, services.id))
      .innerJoin(users, eq(leads.chefId, users.id))
      .where(eq(leads.id, parseInt(leadId)))
      .get();

    if (!lead) {
      return reply.status(404).send({ error: "Lead not found" });
    }

    if (lead.chefId !== userId) {
      return reply.status(403).send({ error: "Not authorized to view this lead" });
    }

    return {
      ...lead,
      serviceDietaryTags: JSON.parse(lead.serviceDietaryTags || "[]"),
    };
  });

  // POST /api/chef/leads/:leadId/respond — Send price quote
  server.post("/:leadId/respond", { preHandler: [server.authenticate] }, async (request, reply) => {
    const { userId, role } = request.user as { userId: number; role: string };
    if (role !== "chef") {
      return reply.status(403).send({ error: "Only chefs can respond to leads" });
    }

    const { leadId } = z.object({ leadId: z.string() }).parse(request.params);
    const body = respondToLeadSchema.parse(request.body);

    const lead = db.select().from(leads).where(eq(leads.id, parseInt(leadId))).get();
    if (!lead) {
      return reply.status(404).send({ error: "Lead not found" });
    }

    if (lead.chefId !== userId) {
      return reply.status(403).send({ error: "Not authorized to respond to this lead" });
    }

    if (lead.status !== "new") {
      return reply.status(409).send({ error: "Lead has already been responded to" });
    }

    if (!lead.email) {
      return reply.status(422).send({ error: "Cannot send quote: diner email not on file" });
    }

    const service = db.select().from(services).where(eq(services.id, lead.serviceId)).get();
    const chef = db.select().from(users).where(eq(users.id, userId)).get();


    const now = new Date();
    const quoteToken = generateQuoteToken();

    const updatedLead = db
      .update(leads)
      .set({
        status: "responded",
        quoteAmount: body.amount ?? null,
        quoteMessage: body.message ?? null,
        chefNote: body.chefNote ?? '',
        quoteSentAt: now,
        quoteToken,
        firstChefActionAt: lead.firstChefActionAt ?? now,
        firstResponseAt: lead.firstResponseAt ?? now,
      } as Record<string, unknown>)
      .where(eq(leads.id, parseInt(leadId)))
      .returning()
      .all()[0];

    // MAI-1670: Fire-and-forget analytics event for quote_sent
    // MAI-1677: Add timeToRespondMs and leadAgeHours for response time analysis
    const leadAgeMs = now.getTime() - new Date(lead.createdAt).getTime();
    trackAnalyticsEvent({
      event: 'quote_sent',
      lead_id: lead.id,
      chef_id: userId,
      service_id: lead.serviceId,
      quote_amount: body.amount,
      guestCount: lead.guestCount,
      auth_status: 'chef',
      timestamp: now.toISOString(),
      timeToRespondMs: leadAgeMs,
      leadAgeHours: leadAgeMs / (1000 * 60 * 60),
    });

    // Send quote email to diner
    if (service && chef) {
      await sendQuoteEmail({
        leadId: lead.id,
        dinerName: lead.clientName || "there",
        dinerEmail: lead.email,
        chefName: chef.name,
        serviceName: service.name,
        eventDate: lead.eventDate,
        guestCount: lead.guestCount,
        quoteAmount: body.amount,
        quoteMessage: body.message,
        chefNote: body.chefNote,
      });
    }

    return { success: true, lead: updatedLead };
  });

  // POST /api/chef/leads/:leadId/convert — Mark lead as converted with booking reference
  server.post("/:leadId/convert", { preHandler: [server.authenticate] }, async (request, reply) => {
    const { userId, role } = request.user as { userId: number; role: string };
    if (role !== "chef") {
      return reply.status(403).send({ error: "Only chefs can update lead status" });
    }

    const { leadId } = z.object({ leadId: z.string() }).parse(request.params);
    const body = z.object({ booking_reference: z.string().min(5).max(20) }).parse(request.body);

    const lead = db.select().from(leads).where(eq(leads.id, parseInt(leadId))).get();
    if (!lead) {
      return reply.status(404).send({ error: "Lead not found" });
    }

    if (lead.chefId !== userId) {
      return reply.status(403).send({ error: "Not authorized to update this lead" });
    }

    if (lead.status !== "responded") {
      return reply.status(400).send({ error: "Only responded leads can be converted" });
    }

    // MAI-823: Generate referral code on first conversion
    const referralCode = generateReferralCode();

    const updatedLead = db
      .update(leads)
      .set({ status: "converted", referralCode } as Record<string, unknown>)
      .where(eq(leads.id, parseInt(leadId)))
      .returning()
      .all()[0];

    // Create booking record so diner can see it in "My Bookings"
    const now = new Date();
    const totalPrice = lead.quoteAmount || 0;

    db.insert(bookings).values({
      serviceId: lead.serviceId,
      chefId: lead.chefId,
      dinerId: null, // diner may not be a logged-in user; link via email/guestEmail instead
      guestEmail: lead.email || null,
      eventDate: lead.eventDate || '',
      guestCount: lead.guestCount || 0,
      totalPrice,
      status: 'confirmed',
      notes: `Converted from lead ${lead.id}`,
      createdAt: now,
    }).run();

    // MAI-1670: Fire-and-forget analytics event for quote_converted
    trackAnalyticsEvent({
      event: 'quote_converted',
      lead_id: lead.id,
      chef_id: userId,
      service_id: lead.serviceId,
      quote_amount: lead.quoteAmount,
      guestCount: lead.guestCount,
      referral_code: referralCode,
      auth_status: 'chef',
      timestamp: now.toISOString(),
    });

    // MAI-1396: Send accepted/confirmed email to diner
    if (lead.email) {
      const service = db.select().from(services).where(eq(services.id, lead.serviceId)).get();
      const chef = db.select().from(users).where(eq(users.id, userId)).get();
      if (service && chef) {
        const DASHBOARD_URL = process.env.DASHBOARD_URL || 'https://maisondeschefs.com';
        const DINER_BOOKINGS_URL = process.env.DINER_BOOKINGS_URL || 'https://maisondeschefs.com/diner/bookings';
        const fullBookingStatusUrl = lead.accessToken ? `${DASHBOARD_URL}/booking-status?token=${lead.accessToken}` : undefined;
        await sendAcceptedEmail({
          leadId: lead.id,
          dinerName: lead.clientName || "there",
          dinerEmail: lead.email,
          chefName: chef.name,
          serviceName: service.name,
          eventDate: lead.eventDate,
          guestCount: lead.guestCount,
          quoteAmount: lead.quoteAmount || undefined,
          bookingStatusUrl: fullBookingStatusUrl,
          dinerBookingsUrl: DINER_BOOKINGS_URL,
        });
      }
    }

    return { success: true, lead_status: "converted", converted_at: updatedLead.createdAt };
  });

  // POST /api/chef/leads/:leadId/lose — Mark lead as lost
  server.post("/:leadId/lose", { preHandler: [server.authenticate] }, async (request, reply) => {
    const { userId, role } = request.user as { userId: number; role: string };
    if (role !== "chef") {
      return reply.status(403).send({ error: "Only chefs can update lead status" });
    }

    const { leadId } = z.object({ leadId: z.string() }).parse(request.params);
    const body = z.object({ reason: z.string().optional() }).parse(request.body);

    const lead = db.select().from(leads).where(eq(leads.id, parseInt(leadId))).get();
    if (!lead) {
      return reply.status(404).send({ error: "Lead not found" });
    }

    if (lead.chefId !== userId) {
      return reply.status(403).send({ error: "Not authorized to update this lead" });
    }

    const updatedLead = db
      .update(leads)
      .set({ status: "lost" } as Record<string, unknown>)
      .where(eq(leads.id, parseInt(leadId)))
      .returning()
      .all()[0];

    return { success: true, lead_status: "lost" };
  });

  // POST /api/chef/leads/:leadId/restore — Restore a lost lead to responded
  server.post("/:leadId/restore", { preHandler: [server.authenticate] }, async (request, reply) => {
    const { userId, role } = request.user as { userId: number; role: string };
    if (role !== "chef") {
      return reply.status(403).send({ error: "Only chefs can restore leads" });
    }

    const { leadId } = z.object({ leadId: z.string() }).parse(request.params);

    const lead = db.select().from(leads).where(eq(leads.id, parseInt(leadId))).get();
    if (!lead) {
      return reply.status(404).send({ error: "Lead not found" });
    }

    if (lead.chefId !== userId) {
      return reply.status(403).send({ error: "Not authorized to restore this lead" });
    }

    if (lead.status !== "lost") {
      return reply.status(400).send({ error: "Only lost leads can be restored" });
    }

    const updatedLead = db
      .update(leads)
      .set({ status: "responded" } as Record<string, unknown>)
      .where(eq(leads.id, parseInt(leadId)))
      .returning()
      .all()[0];

    return { success: true, lead_status: "responded" };
  });

  // PATCH /api/chef/leads/:leadId/status — Update lead status (converted/lost)
  server.patch("/:leadId/status", { preHandler: [server.authenticate] }, async (request, reply) => {
    const { userId, role } = request.user as { userId: number; role: string };
    if (role !== "chef") {
      return reply.status(403).send({ error: "Only chefs can update lead status" });
    }

    const { leadId } = z.object({ leadId: z.string() }).parse(request.params);
    const body = z.object({ status: z.enum(["new", "responded", "converted", "lost"]) }).parse(request.body);

    const lead = db.select().from(leads).where(eq(leads.id, parseInt(leadId))).get();
    if (!lead) {
      return reply.status(404).send({ error: "Lead not found" });
    }

    if (lead.chefId !== userId) {
      return reply.status(403).send({ error: "Not authorized to update this lead" });
    }

    const updatedLead = db
      .update(leads)
      .set({ status: body.status } as Record<string, unknown>)
      .where(eq(leads.id, parseInt(leadId)))
      .returning()
      .all()[0];

    return { success: true, lead: updatedLead };
  });

  // POST /api/chef/leads/:leadId/accept — One-click accept (MAI-1387)
  server.post("/:leadId/accept", { preHandler: [server.authenticate] }, async (request, reply) => {
    const { userId, role } = request.user as { userId: number; role: string };
    if (role !== "chef") {
      return reply.status(403).send({ error: "Only chefs can accept leads" });
    }

    const { leadId } = z.object({ leadId: z.string() }).parse(request.params);

    const lead = db.select().from(leads).where(eq(leads.id, parseInt(leadId))).get();
    if (!lead) {
      return reply.status(404).send({ error: "Lead not found" });
    }

    if (lead.chefId !== userId) {
      return reply.status(403).send({ error: "Not authorized to accept this lead" });
    }


    if (lead.status !== "new") {
      return reply.status(409).send({ error: "Lead has already been responded to" });
    }


    const now = new Date();
    // Pre-composed accept message
    const preComposedMessage = `Hi ${lead.clientName || 'there'}, I'd love to cook for you! I'll send a quote within 24 hours.`;

    // MAI-823: Generate referral code on first conversion
    const referralCode = generateReferralCode();

    const updatedLead = db
      .update(leads)
      .set({
        status: "converted",
        quoteMessage: preComposedMessage,
        quoteSentAt: now,
        referralCode,
        firstChefActionAt: lead.firstChefActionAt ?? now,
        firstResponseAt: lead.firstResponseAt ?? now,
      } as Record<string, unknown>)
      .where(eq(leads.id, parseInt(leadId)))
      .returning()
      .all()[0];

    // Create booking record so diner can see it in "My Bookings"
    const totalPrice = lead.quoteAmount || 0;
    db.insert(bookings).values({
      serviceId: lead.serviceId,
      chefId: lead.chefId,
      dinerId: null,
      guestEmail: lead.email || null,
      eventDate: lead.eventDate || '',
      guestCount: lead.guestCount || 0,
      totalPrice,
      status: 'confirmed',
      notes: `One-click accept from lead ${lead.id}`,
      createdAt: now,
    }).run();

    // MAI-1396: Send accepted/confirmed email to diner
    if (lead.email) {
      const service = db.select().from(services).where(eq(services.id, lead.serviceId)).get();
      const chef = db.select().from(users).where(eq(users.id, userId)).get();
      if (service && chef) {
        const DASHBOARD_URL = process.env.DASHBOARD_URL || 'https://maisondeschefs.com';
        const DINER_BOOKINGS_URL = process.env.DINER_BOOKINGS_URL || 'https://maisondeschefs.com/diner/bookings';
        const fullBookingStatusUrl = lead.accessToken ? `${DASHBOARD_URL}/booking-status?token=${lead.accessToken}` : undefined;
        await sendAcceptedEmail({
          leadId: lead.id,
          dinerName: lead.clientName || "there",
          dinerEmail: lead.email,
          chefName: chef.name,
          serviceName: service.name,
          eventDate: lead.eventDate,
          guestCount: lead.guestCount,
          quoteAmount: lead.quoteAmount || undefined,
          bookingStatusUrl: fullBookingStatusUrl,
          dinerBookingsUrl: DINER_BOOKINGS_URL,
        });
      }
    }

    return { success: true, lead: updatedLead };
  });

  // POST /api/chef/leads/:leadId/decline — One-click decline (MAI-1387)
  server.post("/:leadId/decline", { preHandler: [server.authenticate] }, async (request, reply) => {
    const { userId, role } = request.user as { userId: number; role: string };
    if (role !== "chef") {
      return reply.status(403).send({ error: "Only chefs can decline leads" });
    }

    const { leadId } = z.object({ leadId: z.string() }).parse(request.params);
    const body = z.object({
      reason: z.enum(["none", "not_available", "too_busy", "not_a_fit"]).optional().default("none"),
    }).parse(request.body);

    const lead = db.select().from(leads).where(eq(leads.id, parseInt(leadId))).get();
    if (!lead) {
      return reply.status(404).send({ error: "Lead not found" });
    }


    if (lead.chefId !== userId) {
      return reply.status(403).send({ error: "Not authorized to decline this lead" });
    }

    const now = new Date();
    const reasonLabels: Record<string, string> = {
      none: "Declined",
      not_available: "Not available",
      too_busy: "Too busy",
      not_a_fit: "Not a fit",
    };


    const updatedLead = db
      .update(leads)
      .set({
        status: "lost",
        chefNote: `[Declined: ${reasonLabels[body.reason] || "Declined"}]` + (lead.chefNote ? " " + lead.chefNote : ""),
        firstChefActionAt: lead.firstChefActionAt ?? now,
      } as Record<string, unknown>)
      .where(eq(leads.id, parseInt(leadId)))
      .returning()
      .all()[0];

    // Send declined email to diner (MAI-1396)
    if (lead.email) {
      const service = db.select().from(services).where(eq(services.id, lead.serviceId)).get();
      const chef = db.select().from(users).where(eq(users.id, userId)).get();
      if (service && chef) {
        const DASHBOARD_URL = process.env.DASHBOARD_URL || 'https://maisondeschefs.com';
        const fullBookingStatusUrl = lead.accessToken ? `${DASHBOARD_URL}/booking-status?token=${lead.accessToken}` : undefined;
        await sendDeclinedEmail({
          leadId: lead.id,
          dinerName: lead.clientName || 'there',
          dinerEmail: lead.email,
          chefName: chef.name,
          serviceName: service.name,
          eventDate: lead.eventDate,
          guestCount: lead.guestCount,
          reason: reasonLabels[body.reason] || 'Declined',
          bookingStatusUrl: fullBookingStatusUrl,
        });
      }
    }

    return { success: true, lead: updatedLead };
  });

  // POST /api/chef/leads/tutorial/dismiss — Dismiss the first-lead tutorial modal (MAI-1387)
  server.post("/tutorial/dismiss", { preHandler: [server.authenticate] }, async (request, reply) => {
    const { userId, role } = request.user as { userId: number; role: string };
    if (role !== "chef") {
      return reply.status(403).send({ error: "Only chefs can dismiss the tutorial" });
    }

    db.update(chefProfiles)
      .set({ leadResponseTutorialDismissed: true } as Record<string, unknown>)
      .where(eq(chefProfiles.userId, userId))
      .run();


    return { success: true };
  });

  // GET /api/chef/profile/templates — Get chef's response templates (MAI-1586)
  server.get("/profile/templates", { preHandler: [server.authenticate] }, async (request, reply) => {
    const { userId, role } = request.user as { userId: number; role: string };
    if (role !== "chef") {
      return reply.status(403).send({ error: "Only chefs can access templates" });
    }

    const profile = db.select({ responseTemplates: chefProfiles.responseTemplates })
      .from(chefProfiles)
      .where(eq(chefProfiles.userId, userId))
      .get();

    const templates = profile?.responseTemplates
      ? JSON.parse(profile.responseTemplates)
      : [];

    return { templates };
  });

  // PUT /api/chef/profile/templates — Save chef's response templates (MAI-1586)
  server.put("/profile/templates", { preHandler: [server.authenticate] }, async (request, reply) => {
    const { userId, role } = request.user as { userId: number; role: string };
    if (role !== "chef") {
      return reply.status(403).send({ error: "Only chefs can save templates" });
    }

    const body = z.object({
      templates: z.array(z.object({
        id: z.string(),
        label: z.string(),
        text: z.string(),
      })),
    }).parse(request.body);

    const existing = db.select({ userId: chefProfiles.userId })
      .from(chefProfiles)
      .where(eq(chefProfiles.userId, userId))
      .get();

    if (!existing) {
      return reply.status(404).send({ error: "Chef profile not found" });
    }

    db.update(chefProfiles)
      .set({ responseTemplates: JSON.stringify(body.templates) } as Record<string, unknown>)
      .where(eq(chefProfiles.userId, userId))
      .run();

    return { success: true, templates: body.templates };
  });

  // GET /api/chef/notifications — list notifications for chef (MAI-1700)
  server.get("/notifications", { preHandler: [server.authenticate] }, async (request, reply) => {
    const { userId, role } = request.user as { userId: number; role: string };
    if (role !== "chef") {
      return reply.status(403).send({ error: "Only chefs can access notifications" });
    }

    const queryParams = request.query as { limit?: string; unreadOnly?: string };
    const limit = queryParams.limit ? parseInt(queryParams.limit, 10) : 10;
    const unreadOnly = queryParams.unreadOnly === "true";

    const conditions = [eq(notifications.userId, userId)];
    if (unreadOnly) {
      conditions.push(eq(notifications.read, false));
    }

    const userNotifications = db.select()
      .from(notifications)
      .where(and(...conditions))
      .orderBy(desc(notifications.createdAt))
      .limit(limit)
      .all();

    const unreadCountResult = db.select({ count: sql`count(*)` })
      .from(notifications)
      .where(and(
        eq(notifications.userId, userId),
        eq(notifications.read, false)
      ))
      .get();
    const unreadCount = (unreadCountResult?.count as number | null) ?? 0;

    return {
      notifications: userNotifications.map(n => ({
        id: n.id,
        type: n.type,
        title: n.title,
        body: n.body,
        read: n.read,
        createdAt: n.createdAt,
        metadata: n.metadata ? JSON.parse(n.metadata) : null,
      })),
      unread_count: unreadCount,
    };
  });

  // PATCH /api/chef/notifications/:id/read — mark notification as read (MAI-1700)
  server.patch("/notifications/:id/read", { preHandler: [server.authenticate] }, async (request, reply) => {
    const { userId, role } = request.user as { userId: number; role: string };
    if (role !== "chef") {
      return reply.status(403).send({ error: "Only chefs can update notifications" });
    }

    const { id } = z.object({ id: z.string() }).parse(request.params);

    const notification = db.select()
      .from(notifications)
      .where(and(
        eq(notifications.id, parseInt(id)),
        eq(notifications.userId, userId)
      ))
      .get();

    if (!notification) {
      return reply.status(404).send({ error: "Notification not found" });
    }

    db.update(notifications)
      .set({ read: true })
      .where(eq(notifications.id, parseInt(id)))
      .run();

    return { success: true };
  });

  // POST /api/chef/notifications/mark-all-read — mark all notifications as read (MAI-1700)
  server.post("/notifications/mark-all-read", { preHandler: [server.authenticate] }, async (request, reply) => {
    const { userId, role } = request.user as { userId: number; role: string };
    if (role !== "chef") {
      return reply.status(403).send({ error: "Only chefs can update notifications" });
    }

    db.update(notifications)
      .set({ read: true })
      .where(and(
        eq(notifications.userId, userId),
        eq(notifications.read, false)
      ))
      .run();

    return { success: true };
  });
}
