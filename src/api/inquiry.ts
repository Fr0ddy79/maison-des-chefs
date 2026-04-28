import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { db } from '../db/index.js';
import { leads, services, users } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { sendDinerConfirmationEmail } from '../services/diner-confirmation-email.js';

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
  // POST /api/inquiry - Create a new inquiry (public - no auth required for diners)
  server.post('/', async (request, reply) => {
    const body = createInquirySchema.parse(request.body);

    // Fetch service and chef info
    const service = db.select().from(services).where(eq(services.id, body.serviceId)).get();
    if (!service) {
      return reply.status(404).send({ error: 'Service not found' });
    }

    const chef = db.select().from(users).where(eq(users.id, service.chefId)).get();
    if (!chef) {
      return reply.status(404).send({ error: 'Chef not found' });
    }

    // Create the lead
    const createdLead = db.insert(leads).values({
      serviceId: body.serviceId,
      chefId: service.chefId,
      clientName: body.clientName || null,
      email: body.email,
      phone: body.phone || null,
      eventDate: body.eventDate || null,
      guestCount: body.guestCount,
      message: body.message || null,
      status: 'new',
    }).returning().all()[0];

    // Send confirmation email to diner (idempotent - only sends if not already sent)
    await sendDinerConfirmationEmail({
      leadId: createdLead.id,
      dinerName: body.clientName || 'there',
      dinerEmail: body.email,
      chefName: chef.name,
      serviceName: service.name,
      eventDate: body.eventDate || null,
      guestCount: body.guestCount,
    });

    return reply.status(201).send({
      success: true,
      leadId: createdLead.id,
      message: 'Inquiry submitted successfully',
    });
  });
}
