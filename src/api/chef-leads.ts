import { FastifyInstance } from "fastify";
import { z } from "zod";
import { db } from "../db/index.js";
import { leads, services, users } from "../db/schema.js";
import { eq, desc, sql } from "drizzle-orm";
import { sendQuoteEmail } from "../services/diner-confirmation-email.js";
import crypto from "crypto";

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
        serviceName: services.name,
      })
      .from(leads)
      .innerJoin(services, eq(leads.serviceId, services.id))
      .where(eq(leads.chefId, userId))
      .orderBy(desc(leads.createdAt))
      .all();

    return allLeads;
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
      } as Record<string, unknown>)
      .where(eq(leads.id, parseInt(leadId)))
      .returning()
      .all()[0];

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
}
