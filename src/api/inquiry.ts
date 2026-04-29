import { FastifyInstance } from "fastify";
import { z } from "zod";
import { db } from "../db/index.js";
import { leads, services, users } from "../db/schema.js";
import { eq } from "drizzle-orm";
import { sendDinerConfirmationEmail } from "../services/diner-confirmation-email.js";
import crypto from "crypto";

const createInquirySchema = z.object({
  serviceId: z.number(),
  clientName: z.string().optional(),
  email: z.string().email(),
  phone: z.string().optional(),
  eventDate: z.string().optional(),
  guestCount: z.number().int().min(1).optional().default(1),
  message: z.string().optional(),
});

const BOOKING_STATUS_TOKEN_EXPIRY_DAYS = 30;

/**
 * Generate a 64-char hex token for booking status access.
 */
function generateAccessToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Calculate the expiration date for an access token.
 */
function calculateTokenExpiry(): Date {
  const expiry = new Date();
  expiry.setDate(expiry.getDate() + BOOKING_STATUS_TOKEN_EXPIRY_DAYS);
  return expiry;
}

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

    // MAI-805: Generate access token for booking status tracking
    const accessToken = generateAccessToken();
    const accessTokenExpiresAt = calculateTokenExpiry();
    const bookingStatusUrl = `/booking-status?token=${accessToken}`;
    const DASHBOARD_URL = process.env.DASHBOARD_URL || 'https://maisondeschefs.com';
    const fullBookingStatusUrl = `${DASHBOARD_URL}/booking-status?token=${accessToken}`;

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
      accessToken, // MAI-805
      accessTokenExpiresAt, // MAI-805
    }).returning().all()[0];

    // MAI-805: Pass booking status URL to email
    await sendDinerConfirmationEmail({
      leadId: createdLead.id,
      dinerName: body.clientName || "there",
      dinerEmail: body.email,
      chefName: chef.name,
      serviceName: service.name,
      eventDate: body.eventDate || null,
      guestCount: body.guestCount,
      bookingStatusUrl: fullBookingStatusUrl,
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
      bookingStatusUrl, // MAI-805: Return the URL for client reference
    });
  });
}
