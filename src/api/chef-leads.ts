import { FastifyInstance } from "fastify";
import { z } from "zod";
import { db } from "../db/index.js";
import { leads, services, users } from "../db/schema.js";
import { eq, desc, sql } from "drizzle-orm";
import { sendQuoteEmail } from "../services/diner-confirmation-email.js";

const respondToLeadSchema = z.object({
  amount: z.number().min(0).optional(),
  message: z.string().optional(),
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

    const service = db.select().from(services).where(eq(services.id, lead.serviceId)).get();
    const chef = db.select().from(users).where(eq(users.id, userId)).get();

    const now = new Date();
    const updatedLead = db
      .update(leads)
      .set({
        status: "responded",
        quoteAmount: body.amount ?? null,
        quoteMessage: body.message ?? null,
        chefNote: body.chefNote ?? '',
        quoteSentAt: now,
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
