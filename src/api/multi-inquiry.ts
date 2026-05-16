import { FastifyInstance } from "fastify";
import { z } from "zod";
import { db } from "../db/index.js";
import { leads, services, users, chefProfiles } from "../db/schema.js";
import { eq, inArray } from "drizzle-orm";
import { sendMultiChefConfirmationEmail } from "../services/diner-confirmation-email.js";
import { sendChefNewBookingEmail } from "../services/chef-new-booking-email.js";
import crypto from "crypto";

const MAX_CHEFS_PER_INQUIRY = 10;

const createMultiInquirySchema = z.object({
  serviceIds: z.array(z.number().int().positive()).min(1).max(MAX_CHEFS_PER_INQUIRY),
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
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Generate a UUID v4 for linking multi-chef inquiry leads.
 */
function generateMultiInquiryId(): string {
  return crypto.randomUUID();
}

/**
 * Calculate the expiration date for an access token.
 */
function calculateTokenExpiry(): Date {
  const expiry = new Date();
  expiry.setDate(expiry.getDate() + BOOKING_STATUS_TOKEN_EXPIRY_DAYS);
  return expiry;
}

export default async function multiInquiryRoutes(server: FastifyInstance) {
  server.post("/", async (request, reply) => {
    const body = createMultiInquirySchema.parse(request.body);

    // Validate all serviceIds exist and fetch service info (including chefId, availability, minGuests, maxGuests)
    const serviceRows = db
      .select({
        id: services.id,
        chefId: services.chefId,
        name: services.name,
        pricePerPerson: services.pricePerPerson,
        available: services.status, // 'draft' or 'published' — only published are available
        minGuests: services.minGuests,
        maxGuests: services.maxGuests,
      })
      .from(services)
      .where(inArray(services.id, body.serviceIds))
      .all();

    if (serviceRows.length !== body.serviceIds.length) {
      const foundIds = new Set(serviceRows.map((s) => s.id));
      const invalidIds = body.serviceIds.filter((id) => !foundIds.has(id));
      return reply.status(400).send({
        error: "Invalid service IDs",
        invalidIds,
        message: `Service(s) not found: ${invalidIds.join(", ")}`,
      });
    }

    // Step 1 — Validate chef diversity: all services must belong to different chefs
    const chefIdCounts = new Map<number, number>();
    for (const service of serviceRows) {
      chefIdCounts.set(service.chefId, (chefIdCounts.get(service.chefId) || 0) + 1);
    }
    const duplicateChefEntry = [...chefIdCounts.entries()].find(([, count]) => count > 1);
    if (duplicateChefEntry) {
      return reply.status(400).send({
        error: "Same chef selected multiple times",
        message: "Please select chefs from different providers",
      });
    }

    // Step 2 — Validate service availability: all services must be published (available)
    const unavailableService = serviceRows.find((s) => s.available !== "published");
    if (unavailableService) {
      return reply.status(400).send({
        error: "Service not available",
        message: "One or more services are no longer available",
      });
    }

    // Step 3 — Validate guest count per service
    const guestCount = body.guestCount ?? 1;
    for (const service of serviceRows) {
      if (guestCount < service.minGuests || guestCount > service.maxGuests) {
        return reply.status(400).send({
          error: "Guest count out of range",
          message: `Guest count must be between ${service.minGuests} and ${service.maxGuests} for ${service.name}`,
        });
      }
    }

    // Fetch chef names for all unique chefIds
    const uniqueChefIds = [...new Set(serviceRows.map((s) => s.chefId))];
    const chefRows = db
      .select({ id: users.id, name: users.name, email: users.email })
      .from(users)
      .where(inArray(users.id, uniqueChefIds))
      .all();
    const chefMap = new Map(chefRows.map((c) => [c.id, c.name]));
    const chefEmailMap = new Map(chefRows.map((c) => [c.id, c.email]));

    // Generate shared multi-inquiry ID and access token
    const multiInquiryId = generateMultiInquiryId();
    const accessToken = generateAccessToken();
    const accessTokenExpiresAt = calculateTokenExpiry();
    const DASHBOARD_URL = process.env.DASHBOARD_URL || "https://maisondeschefs.com";
    const fullBookingStatusUrl = `${DASHBOARD_URL}/booking-status?token=${accessToken}`;

    // Create a lead for each service
    const createdLeads: Array<{
      id: number;
      chefId: number;
      serviceId: number;
      chefName: string;
      serviceName: string;
    }> = [];

    for (const service of serviceRows) {
      const createdLead = db
        .insert(leads)
        .values({
          serviceId: service.id,
          chefId: service.chefId,
          clientName: body.clientName || null,
          email: body.email,
          phone: body.phone || null,
          eventDate: body.eventDate || null,
          guestCount: body.guestCount,
          message: body.message || null,
          status: "new",
          inquiryType: "multi",
          multiInquiryId,
          accessToken, // shared token across all leads in this multi-inquiry
          accessTokenExpiresAt,
        })
        .returning()
        .all()[0];

      createdLeads.push({
        id: createdLead.id,
        chefId: service.chefId,
        serviceId: service.id,
        chefName: chefMap.get(service.chefId) || "Unknown Chef",
        serviceName: service.name,
      });
    }

    // Send ONE confirmation email listing all selected chefs
    await sendMultiChefConfirmationEmail({
      leadIds: createdLeads.map((l) => l.id),
      dinerName: body.clientName || "there",
      dinerEmail: body.email,
      chefs: createdLeads.map((l) => ({
        chefName: l.chefName,
        serviceName: l.serviceName,
        eventDate: body.eventDate || null,
        guestCount: body.guestCount,
      })),
      bookingStatusUrl: fullBookingStatusUrl,
    });

    // MAI-1514: Notify each chef of their new lead
    for (const l of createdLeads) {
      const serviceInfo = serviceRows.find((s) => s.id === l.serviceId);
      const totalPrice = (serviceInfo?.pricePerPerson || 0) * (body.guestCount || 1);
      await sendChefNewBookingEmail({
        chefEmail: chefEmailMap.get(l.chefId) || "",
        chefName: l.chefName,
        guestName: body.clientName || "New Guest",
        eventDate: body.eventDate || "TBD",
        serviceName: l.serviceName,
        guestCount: body.guestCount || 1,
        totalPrice,
        bookingId: l.id,
      });
    }

    // Set diner recognition cookies (30 day expiry)
    const cookieMaxAge = 30 * 24 * 60 * 60;
    const cookieOptions = `Path=/; Max-Age=${cookieMaxAge}; SameSite=Lax`;
    reply.header(
      "Set-Cookie",
      `diner_email=${encodeURIComponent(body.email)}; ${cookieOptions}`
    );
    if (body.clientName) {
      reply.header(
        "Set-Cookie",
        `diner_name=${encodeURIComponent(body.clientName)}; ${cookieOptions}`
      );
    }
    if (body.phone) {
      reply.header(
        "Set-Cookie",
        `diner_phone=${encodeURIComponent(body.phone)}; ${cookieOptions}`
      );
    }

    return reply.status(201).send({
      success: true,
      leadIds: createdLeads.map((l) => l.id),
      message: `Inquiry submitted to ${createdLeads.length} chef${createdLeads.length > 1 ? "s" : ""}`,
      bookingStatusUrl: fullBookingStatusUrl,
    });
  });
}