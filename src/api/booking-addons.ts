import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { db } from '../db/index.js';
import { leads } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { HARDCODED_ADDONS, getAddonsByIds } from '../data/addons.js';

/**
 * MAI-875: PUT /api/booking/:bookingId/addons
 * Updates the selected add-ons for a booking (lead).
 * Stores addon IDs in leads.selectedAddons as JSON array.
 */
export default async function addonSelectionRoutes(server: FastifyInstance) {
  // PUT /:bookingId/addons - Update selected addons for a booking
  server.put<{ Params: { bookingId: string } }>(
    '/:bookingId/addons',
    async (request, reply) => {
      const { bookingId } = request.params;

      const leadId = parseInt(bookingId);
      if (isNaN(leadId) || leadId <= 0) {
        return reply.status(400).send({ error: 'Invalid booking ID' });
      }

      // Validate request body
      const updateSchema = z.object({
        addonIds: z.array(z.string()),
      });

      const parseResult = updateSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: 'Invalid request body',
          details: parseResult.error.errors,
        });
      }

      const { addonIds } = parseResult.data;

      // Validate that all addon IDs are valid
      const validAddonIds = HARDCODED_ADDONS.map(a => a.id);
      const invalidIds = addonIds.filter(id => !validAddonIds.includes(id));
      if (invalidIds.length > 0) {
        return reply.status(400).send({
          error: 'Invalid addon IDs',
          invalidIds,
        });
      }

      // Verify lead exists
      const lead = db.select({ id: leads.id })
        .from(leads)
        .where(eq(leads.id, leadId))
        .get();

      if (!lead) {
        return reply.status(404).send({ error: 'Booking not found' });
      }

      // Update selected addons
      const selectedAddonsJson = JSON.stringify(addonIds);
      db.update(leads)
        .set({ selectedAddons: selectedAddonsJson })
        .where(eq(leads.id, leadId))
        .run();

      // Calculate total price
      const selectedAddons = getAddonsByIds(addonIds);
      const addonsTotal = selectedAddons.reduce((sum, addon) => sum + addon.price, 0);

      return {
        success: true,
        selectedAddonIds: addonIds,
        selectedAddons: selectedAddons.map(addon => ({
          id: addon.id,
          name: addon.name,
          price: addon.price,
        })),
        addonsTotal,
      };
    }
  );

  // GET /:bookingId/addons/selection - Get current selection for a booking
  server.get<{ Params: { bookingId: string } }>(
    '/:bookingId/addons/selection',
    async (request, reply) => {
      const { bookingId } = request.params;

      const leadId = parseInt(bookingId);
      if (isNaN(leadId) || leadId <= 0) {
        return reply.status(400).send({ error: 'Invalid booking ID' });
      }

      const lead = db.select({ selectedAddons: leads.selectedAddons })
        .from(leads)
        .where(eq(leads.id, leadId))
        .get();

      if (!lead) {
        return reply.status(404).send({ error: 'Booking not found' });
      }

      let selectedAddonIds: string[] = [];
      try {
        selectedAddonIds = JSON.parse(lead.selectedAddons || '[]');
      } catch {
        selectedAddonIds = [];
      }

      const selectedAddons = getAddonsByIds(selectedAddonIds);
      const addonsTotal = selectedAddons.reduce((sum, addon) => sum + addon.price, 0);

      return {
        selectedAddonIds,
        selectedAddons: selectedAddons.map(addon => ({
          id: addon.id,
          name: addon.name,
          price: addon.price,
        })),
        addonsTotal,
      };
    }
  );
}