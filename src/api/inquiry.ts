import { FastifyInstance } from "fastify";
import { z } from "zod";
import { db } from "../db/index.js";
import { leads, services, users } from "../db/schema.js";
import { eq } from "drizzle-orm";
import { sendDinerConfirmationEmail } from "../services/diner-confirmation-email.js";

const createInquirySchema = z.object({
  serviceId: z.number(),
  clientName: z.string().optional(),
  email: z.string().email(),
  phone: z.string().optional(),
  eventDate: z.string().optional(),
  guestCount: z.number().int().min(1).optional().default(1),
  message: z.string().optional(),
});

export default async function inquiryRoutes(server: FastifyInstance) {
  server.post("/", async (request, reply) => {
    const body = createInquirySchema.parse(request.body);

    const service = db.select().from(services).where(eq(services.id, body.serviceId)).get();
    if (!service) {
      return reply.status(404).send({ error: "Service not found" });
    }

    const chef = db.select().from(users).where(eq(users.id, service.chefId)).get();
    if (!chef) {
      return reply.status(404).send({ error: "Chef not found" });
    }

    const createdLead = db.insert(leads).values({
      serviceId: body.serviceId,
      chefId: service.chefId,
      clientName: body.clientName || null,
      email: body.email,
      phone: body.phone || null,
      eventDate: body.eventDate || null,
      guestCount: body.guestCount,
      message: body.message || null,
      status: "new",
    }).returning().all()[0];

    await sendDinerConfirmationEmail({
      leadId: createdLead.id,
      dinerName: body.clientName || "there",
      dinerEmail: body.email,
      chefName: chef.name,
      serviceName: service.name,
      eventDate: body.eventDate || null,
      guestCount: body.guestCount,
    });

    // Set diner recognition cookies (30 day expiry)
    const cookieMaxAge = 30 * 24 * 60 * 60;
    const cookieOptions = `Path=/; Max-Age=${cookieMaxAge}; SameSite=Lax`;
    reply.header("Set-Cookie", `diner_email=${encodeURIComponent(body.email)}; ${cookieOptions}`);
    if (body.clientName) {
      reply.header("Set-Cookie", `diner_name=${encodeURIComponent(body.clientName)}; ${cookieOptions}`);
    }
    if (body.phone) {
      reply.header("Set-Cookie", `diner_phone=${encodeURIComponent(body.phone)}; ${cookieOptions}`);
    }

    return reply.status(201).send({
      success: true,
      leadId: createdLead.id,
      message: "Inquiry submitted successfully",
    });
  });
}
