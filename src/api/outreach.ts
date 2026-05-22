import { FastifyRequest, FastifyReply } from 'fastify';
import { db } from '../db/index.js';
import { outreachCampaigns, outreachTouches, users } from '../db/schema.js';
import { eq, sql, and, isNotNull, desc } from 'drizzle-orm';

/**
 * Add an outreach touch (standalone function for use by non-Fastify contexts).
 * MAI-1756: Used by lead-expiration service to log expiration events.
 * Skips campaign validation when campaignId=0 (system events).
 */
export async function addOutreachTouch(params: {
  chefId: number;
  campaignId: number;
  channel: 'email' | 'instagram' | 'phone' | 'sms';
  touchNumber: number;
  sentAt: Date;
  status?: 'pending' | 'sent' | 'opened' | 'replied' | 'bounced';
  notes?: string;
}): Promise<{ id: number }> {
  const { chefId, campaignId, channel, touchNumber, sentAt, status = 'pending', notes = null } = params;

  // Verify chef exists
  const chef = db.select().from(users).where(eq(users.id, chefId)).get();
  if (!chef) {
    throw new Error(`Chef ${chefId} not found`);
  }

  // For system events (campaignId=0), skip campaign validation
  if (campaignId > 0) {
    const campaign = db.select().from(outreachCampaigns).where(eq(outreachCampaigns.id, campaignId)).get();
    if (!campaign) {
      throw new Error(`Campaign ${campaignId} not found`);
    }
  }

  const insertResult = db.insert(outreachTouches).values({
    chefId,
    campaignId,
    channel,
    touchNumber,
    sentAt,
    status,
    notes,
  }).returning().get();

  return { id: insertResult.id };
}

interface PostTouchBody {
  chef_id: number;
  campaign_id: number;
  channel: 'email' | 'instagram' | 'phone' | 'sms';
  touch_number: number;
  sent_at: string; // ISO timestamp
  status?: 'pending' | 'sent' | 'opened' | 'replied' | 'bounced';
  notes?: string;
}

export default async function outreachRoutes(fastify: any, opts: any) {
  // POST /api/admin/outreach/touch — log a new outreach touch
  fastify.post('/touch', async (request: FastifyRequest<{ Body: PostTouchBody }>, reply: FastifyReply) => {
    const body = request.body;

    // Validate required fields
    if (!body.chef_id || !body.campaign_id || !body.channel || !body.touch_number || !body.sent_at) {
      return reply.status(400).send({ error: 'Missing required fields: chef_id, campaign_id, channel, touch_number, sent_at' });
    }

    // Validate channel enum
    const validChannels = ['email', 'instagram', 'phone', 'sms'];
    if (!validChannels.includes(body.channel)) {
      return reply.status(400).send({ error: `Invalid channel. Must be one of: ${validChannels.join(', ')}` });
    }

    // Validate status enum if provided
    if (body.status) {
      const validStatuses = ['pending', 'sent', 'opened', 'replied', 'bounced'];
      if (!validStatuses.includes(body.status)) {
        return reply.status(400).send({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
      }
    }

    // Verify chef exists
    const chef = db.select().from(users).where(eq(users.id, body.chef_id)).get();
    if (!chef) {
      return reply.status(404).send({ error: 'Chef not found' });
    }

    // Verify campaign exists
    const campaign = db.select().from(outreachCampaigns).where(eq(outreachCampaigns.id, body.campaign_id)).get();
    if (!campaign) {
      return reply.status(404).send({ error: 'Campaign not found' });
    }

    // Insert the outreach touch
    const sentAtDate = new Date(body.sent_at);
    if (isNaN(sentAtDate.getTime())) {
      return reply.status(400).send({ error: 'Invalid sent_at timestamp' });
    }

    const insertResult = db.insert(outreachTouches).values({
      chefId: body.chef_id,
      campaignId: body.campaign_id,
      channel: body.channel,
      touchNumber: body.touch_number,
      sentAt: sentAtDate,
      status: body.status || 'pending',
      notes: body.notes || null,
    }).returning().get();

    return reply.status(201).send({
      id: insertResult.id,
      chef_id: insertResult.chefId,
      campaign_id: insertResult.campaignId,
      channel: insertResult.channel,
      touch_number: insertResult.touchNumber,
      sent_at: insertResult.sentAt.toISOString(),
      status: insertResult.status,
      response_at: insertResult.responseAt?.toISOString() || null,
      notes: insertResult.notes,
      created_at: insertResult.createdAt.toISOString(),
    });
  });

  // GET /api/admin/outreach/stats — return funnel stats
  fastify.get('/stats', async (request: FastifyRequest, reply: FastifyReply) => {
    // Touches by status
    const touchesByStatus = db.select({
      status: outreachTouches.status,
      count: sql<number>`count(*)`,
    })
      .from(outreachTouches)
      .groupBy(outreachTouches.status)
      .all();

    // Response rate by channel
    const responseRateByChannel = db.select({
      channel: outreachTouches.channel,
      total: sql<number>`count(*)`,
      replied: sql<number>`sum(case when ${outreachTouches.status} = 'replied' then 1 else 0 end)`,
    })
      .from(outreachTouches)
      .groupBy(outreachTouches.channel)
      .all();

    // Calculate response rate percentages
    const channelStats = responseRateByChannel.map(row => ({
      channel: row.channel,
      total: row.total,
      replied: row.replied,
      response_rate: row.total > 0 ? Math.round((row.replied / row.total) * 100) : 0,
    }));

    // Average time to first response (in hours)
    // Only for touches with a response
    const avgTimeToResponseQuery = db.select({
      avgMs: sql<number>`coalesce(avg(${outreachTouches.responseAt} - ${outreachTouches.sentAt}), 0)`,
    })
      .from(outreachTouches)
      .where(isNotNull(outreachTouches.responseAt))
      .get();

    const avgTimeToResponseHours = avgTimeToResponseQuery?.avgMs
      ? Math.round((avgTimeToResponseQuery.avgMs / (1000 * 60 * 60)) * 10) / 10
      : null;

    // Total touches
    const totalTouches = db.select({ count: sql<number>`count(*)` }).from(outreachTouches).get();

    // Unique chefs contacted
    const uniqueChefs = db.select({ count: sql<number>`count(distinct ${outreachTouches.chefId})` }).from(outreachTouches).get();

    return reply.send({
      total_touches: totalTouches?.count ?? 0,
      unique_chefs_contacted: uniqueChefs?.count ?? 0,
      touches_by_status: touchesByStatus.reduce((acc, row) => {
        acc[row.status] = row.count;
        return acc;
      }, {} as Record<string, number>),
      response_rate_by_channel: channelStats,
      avg_time_to_first_response_hours: avgTimeToResponseHours,
    });
  });
}