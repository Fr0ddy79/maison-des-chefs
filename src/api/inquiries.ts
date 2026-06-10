import { FastifyInstance } from "fastify";
import { z } from "zod";
import { db, schema } from "../db/index.js";
import { leads, services, users, bookings } from "../db/schema.js";
import { eq, and, desc } from "drizzle-orm";

/**
 * MAI-2371: Inquiry List API for Chefs
 * GET /api/inquiries - List pending inquiries for authenticated chef
 * PATCH /api/inquiries/:id - Update inquiry status (accept/reject)
 */

// GET /api/inquiries — List all pending inquiries for authenticated chef
export default async function inquiryRoutes(server: FastifyInstance) {
  // GET /api/inquiries — List pending inquiries for authenticated chef
  server.get("/api/inquiries", { preHandler: [server.authenticate] }, async (request, reply) => {
    const { userId, role } = request.user as { userId: number; role: string };
    if (role !== "chef") {
      return reply.status(403).send({ error: "Only chefs can access inquiries" });
    }

    // Fetch pending inquiries (leads with status 'new' for this chef)
    const pendingInquiries = db
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
        createdAt: leads.createdAt,
        serviceName: services.name,
        servicePricePerPerson: services.pricePerPerson,
        dietaryPreferences: leads.dietaryPreferences, // MAI-2642: dietary preference capture
        nutAllergy: leads.nutAllergy, // MAI-2642: nut allergy flag for chef safety awareness
      })
      .from(leads)
      .innerJoin(services, eq(leads.serviceId, services.id))
      .where(and(
        eq(leads.chefId, userId),
        eq(leads.status, "new")
      ))
      .orderBy(desc(leads.createdAt))
      .all();

    return { inquiries: pendingInquiries };
  });

  // PATCH /api/inquiries/:id — Update inquiry status (accept/reject)
  server.patch("/api/inquiries/:id", { preHandler: [server.authenticate] }, async (request, reply) => {
    const { userId, role } = request.user as { userId: number; role: string };
    if (role !== "chef") {
      return reply.status(403).send({ error: "Only chefs can update inquiries" });
    }

    const { id } = z.object({ id: z.string() }).parse(request.params);
    const body = z.object({
      status: z.enum(["accepted", "rejected"]),
    }).parse(request.body);

    const inquiryId = parseInt(id, 10);
    if (isNaN(inquiryId)) {
      return reply.status(400).send({ error: "Invalid inquiry ID" });
    }

    // Fetch the inquiry (lead)
    const inquiry = db.select().from(leads).where(eq(leads.id, inquiryId)).get();
    if (!inquiry) {
      return reply.status(404).send({ error: "Inquiry not found" });
    }

    // Ensure the chef owns this inquiry
    if (inquiry.chefId !== userId) {
      return reply.status(403).send({ error: "Not authorized to update this inquiry" });
    }

    // Only 'new' inquiries can be accepted/rejected
    if (inquiry.status !== "new") {
      return reply.status(409).send({ error: "Inquiry has already been processed" });
    }

    const now = new Date();

    if (body.status === "accepted") {
      // 1. Update the lead status to 'accepted'
      const updatedLead = db
        .update(leads)
        .set({ status: "accepted" } as Record<string, unknown>)
        .where(eq(leads.id, inquiryId))
        .returning()
        .get();

      // 2. Mark the availability slot as is_booked = true
      if (inquiry.eventDate) {
        // Find the availability slot for this chef on this date
        const availabilitySlot = db.select().from(schema.availability).where(
          and(
            eq(schema.availability.chefId, userId),
            eq(schema.availability.date, inquiry.eventDate)
          )
        ).get();

        if (availabilitySlot) {
          db.update(schema.availability)
            .set({ isBooked: true, updatedAt: now })
            .where(eq(schema.availability.id, availabilitySlot.id))
            .run();
        }
      }

      // 3. Create bookings entry
      const service = db.select().from(services).where(eq(services.id, inquiry.serviceId)).get();
      const totalPrice = service ? service.pricePerPerson * (inquiry.guestCount || 1) : 0;

      // Find diner by email if they have an account
      let dinerId: number | null = null;
      if (inquiry.email) {
        const diner = db.select({ id: users.id }).from(users).where(eq(users.email, inquiry.email.toLowerCase())).get();
        if (diner) {
          dinerId = diner.id;
        }
      }

      db.insert(bookings).values({
        serviceId: inquiry.serviceId,
        chefId: userId,
        dinerId,
        guestEmail: inquiry.email || null,
        eventDate: inquiry.eventDate || "",
        guestCount: inquiry.guestCount || 0,
        totalPrice,
        status: "pending",
        notes: `Accepted from inquiry ${inquiryId}`,
        createdAt: now,
      }).run();

      return { success: true, inquiry: updatedLead };
    } else {
      // Rejected
      const updatedLead = db
        .update(leads)
        .set({ status: "rejected" } as Record<string, unknown>)
        .where(eq(leads.id, inquiryId))
        .returning()
        .get();

      return { success: true, inquiry: updatedLead };
    }
  });
}
