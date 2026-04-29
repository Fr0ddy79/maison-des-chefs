import { FastifyInstance } from 'fastify';
import { z } from 'zod';

const analyticsEventSchema = z.object({
  event: z.string(),
  service_id: z.number().optional(),
  auth_status: z.string(),
  timestamp: z.string(),
  lead_id: z.number().optional(),
  error: z.string().optional(),
});

export default async function analyticsRoutes(server: FastifyInstance) {
  // POST /api/analytics/event - Receive analytics events (fire-and-forget)
  server.post('/event', async (request, reply) => {
    try {
      const body = analyticsEventSchema.parse(request.body);
      
      // Log analytics event
      if (process.env.NODE_ENV !== 'production') {
        console.log('[Analytics]', JSON.stringify(body));
      }
      
      // In production, this would forward to an analytics service (e.g., Segment, Mixpanel, Plausible)
      // For now, we just acknowledge receipt
      return reply.status(202).send({ success: true });
    } catch (error) {
      // Silently accept even malformed events (fire-and-forget)
      return reply.status(202).send({ success: true });
    }
  });
}
