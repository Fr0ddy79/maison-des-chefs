import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { appendFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

const analyticsEventSchema = z.object({
  event: z.string(),
  service_id: z.number().optional(),
  chef_id: z.number().optional(),
  auth_status: z.string(),
  timestamp: z.string(),
  lead_id: z.number().optional(),
  error: z.string().optional(),
  variant: z.string().optional(),
  cta_text: z.string().optional(),
  price_per_person: z.number().optional(),
  cuisine_type: z.string().optional(),
  // MAI-1036: Referral share tracking
  code: z.string().optional(),
  channel: z.enum(['copy', 'email', 'whatsapp']).optional(),
  // MAI-1075: Booking attribution tracking
  bookingId: z.number().optional(),
  guestCount: z.number().optional(),
  originating_service_id: z.number().optional(),
  // MAI-1079: Chef discovery analytics
  filter_type: z.string().optional(),
  filter_value: z.string().optional(),
  selected_count: z.number().optional(),
  cuisine_types: z.array(z.string()).optional(),
  // MAI-1670: Quote→Convert analytics
  quote_amount: z.number().optional(),
  lead_status: z.string().optional(),
  referral_code: z.string().optional(),
  // MAI-1677: Response time analytics
  timeToRespondMs: z.number().optional(),
  leadAgeHours: z.number().optional(),
  // MAI-1684: Hero search analytics
  location: z.string().optional(),
  // MAI-1702: Hero CTA analytics
  cta_position: z.string().optional(),
  // MAI-1702: Hero search schema alignment (date and guestCount from hero search form)
  date: z.string().optional(),
});

function ensureDataDir() {
  const dataDir = join(process.cwd(), 'data');
  if (!existsSync(dataDir)) {
    mkdirSync(dataDir, { recursive: true });
  }
  return dataDir;
}

function persistEvent(body: unknown, filename: string) {
  try {
    const dataDir = ensureDataDir();
    const logPath = join(dataDir, filename);
    appendFileSync(logPath, JSON.stringify(body) + '\n');
  } catch (err) {
    console.error('[Analytics] Failed to persist event:', err);
  }
}

function isABTestEvent(body: z.infer<typeof analyticsEventSchema>): boolean {
  return (
    body.event?.startsWith('ab_') ||
    body.event === 'booking_created' || // MAI-1075: Track booking events in AB test log
    (body as any).variant !== undefined ||
    (body as any).ab_test_id !== undefined
  );
}

export default async function analyticsRoutes(server: FastifyInstance) {
  // POST /api/analytics/event - Receive analytics events (fire-and-forget)
  server.post('/event', async (request, reply) => {
    try {
      const body = analyticsEventSchema.parse(request.body);
      
      // Persist to JSONL files
      persistEvent(body, 'analytics_events.jsonl');
      if (isABTestEvent(body)) {
        persistEvent(body, 'ab_test_events.jsonl');
      }

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