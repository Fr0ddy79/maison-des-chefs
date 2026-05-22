import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { db } from '../db/index.js';
import { referralCodes, dinerCredits, users, leads } from '../db/schema.js';
import { eq, and, isNull } from 'drizzle-orm';

// Generate an 8-char alphanumeric code unique across all diners
function generateReferralCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // unambiguous chars only
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * POST /api/diner/referral-code — Generate or retrieve diner's unique referral code
 * Creates a new 8-char code if one doesn't exist (idempotent).
 */
export default async function dinerReferralRoutes(server: FastifyInstance) {
  // POST /api/diner/referral-code — generate referral code (idempotent)
  server.post('/referral-code', { preHandler: [server.authenticate] }, async (request, reply) => {
    const { userId, role } = request.user as { userId: number; role: string };
    if (role !== 'diner') {
      return reply.status(403).send({ error: 'Only diners can have referral codes' });
    }

    // Check if diner already has a code
    const existing = db.select().from(referralCodes).where(eq(referralCodes.dinerId, userId)).get();
    if (existing) {
      return { code: existing.code, createdAt: existing.createdAt };
    }

    // Generate a unique code (handle collisions)
    let code: string;
    let attempts = 0;
    do {
      code = generateReferralCode();
      const collision = db.select({ id: referralCodes.id })
        .from(referralCodes)
        .where(eq(referralCodes.code, code))
        .get();
      if (!collision) break;
      attempts++;
    } while (attempts < 10);

    if (attempts >= 10) {
      return reply.status(500).send({ error: 'Failed to generate unique referral code' });
    }

    const created = db.insert(referralCodes).values({
      code,
      dinerId: userId,
    }).returning().get();

    return reply.status(201).send({ code: created.code, createdAt: created.createdAt });
  });

  // GET /api/diner/referral-code — retrieve diner's existing referral code
  server.get('/referral-code', { preHandler: [server.authenticate] }, async (request, reply) => {
    const { userId, role } = request.user as { userId: number; role: string };
    if (role !== 'diner') {
      return reply.status(403).send({ error: 'Only diners can have referral codes' });
    }

    const existing = db.select().from(referralCodes).where(eq(referralCodes.dinerId, userId)).get();
    if (!existing) {
      return reply.status(404).send({ error: 'No referral code found. POST to generate one.' });
    }

    return { code: existing.code, createdAt: existing.createdAt };
  });

  // GET /api/diner/credits — get available credit balance for diner
  server.get('/credits', { preHandler: [server.authenticate] }, async (request, reply) => {
    const { userId, role } = request.user as { userId: number; role: string };
    if (role !== 'diner') {
      return reply.status(403).send({ error: 'Only diners have credits' });
    }

    const now = new Date();
    const credits = db.select({
      id: dinerCredits.id,
      amount: dinerCredits.amount,
      earnedFromReferralId: dinerCredits.earnedFromReferralId,
      used: dinerCredits.used,
      expiresAt: dinerCredits.expiresAt,
      createdAt: dinerCredits.createdAt,
    })
      .from(dinerCredits)
      .where(and(
        eq(dinerCredits.dinerId, userId),
        eq(dinerCredits.used, false)
      ))
      .all();

    const available = credits.filter(c => new Date(c.expiresAt) > now);
    const totalAvailable = available.reduce((sum, c) => sum + c.amount, 0);

    return {
      totalCents: totalAvailable,
      totalDisplay: `$${(totalAvailable / 100).toFixed(2)}`,
      creditBalance: `$${(totalAvailable / 100).toFixed(2)}`,
      credits: available.map(c => ({
        id: c.id,
        amountCents: c.amount,
        amountDisplay: `$${(c.amount / 100).toFixed(2)}`,
        earnedFromReferralId: c.earnedFromReferralId,
        expiresAt: c.expiresAt,
        createdAt: c.createdAt,
      })),
    };
  });

  // POST /api/diner/referral-code/apply — apply diner's referral credit to a booking
  // Used during checkout to apply available credits
  server.post('/referral-code/apply', { preHandler: [server.authenticate] }, async (request, reply) => {
    const { userId, role } = request.user as { userId: number; role: string };
    if (role !== 'diner') {
      return reply.status(403).send({ error: 'Only diners can apply credits' });
    }

    const body = z.object({
      leadId: z.number(),
    }).parse(request.body);

    const now = new Date();

    // Get available unused credits for this diner that haven't expired
    const availableCredits = db.select()
      .from(dinerCredits)
      .where(and(
        eq(dinerCredits.dinerId, userId),
        eq(dinerCredits.used, false)
      ))
      .all()
      .filter(c => new Date(c.expiresAt) > now);

    if (availableCredits.length === 0) {
      return reply.status(400).send({ error: 'No available credits to apply' });
    }

    // Use the oldest credit first (FIFO)
    const creditToUse = availableCredits.sort((a, b) =>
      new Date(a.expiresAt).getTime() - new Date(b.expiresAt).getTime()
    )[0];

    // Mark credit as used
    db.update(dinerCredits)
      .set({ used: true })
      .where(eq(dinerCredits.id, creditToUse.id))
      .run();

    return {
      applied: true,
      creditId: creditToUse.id,
      amountCents: creditToUse.amount,
      amountDisplay: `$${(creditToUse.amount / 100).toFixed(2)}`,
    };
  });
}