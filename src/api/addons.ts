import { FastifyInstance } from 'fastify';
import { HARDCODED_ADDONS } from '../data/addons.js';

/**
 * MAI-875: GET /api/booking/:bookingId/addons
 * Returns available add-ons for a booking.
 * 
 * In MVP, returns hardcoded addons.
 * Future: derive from chef's available add-ons configuration.
 */
export default async function addonRoutes(server: FastifyInstance) {
  server.get<{ Params: { bookingId: string }; Querystring: { token?: string } }>(
    '/:bookingId/addons',
    async (request, reply) => {
      const { bookingId } = request.params;
      const { token } = request.query;

      // Validate bookingId
      const leadId = parseInt(bookingId);
      if (isNaN(leadId) || leadId <= 0) {
        return reply.status(400).send({ error: 'Invalid booking ID' });
      }

      // In MVP, we return the hardcoded add-ons for all bookings
      // Future: verify token and check chef-specific addons

      return {
        addons: HARDCODED_ADDONS.map(addon => ({
          id: addon.id,
          name: addon.name,
          description: addon.description,
          price: addon.price,
          icon: addon.icon,
          category: addon.category,
        })),
      };
    }
  );
}