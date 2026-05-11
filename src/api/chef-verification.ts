import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { db } from '../db/index.js';
import { chefVerificationSubmissions, chefProfiles, users } from '../db/schema.js';
import { eq, desc } from 'drizzle-orm';

// Badge tier types
const BADGE_TIERS = ['identity', 'experience', 'safety'] as const;
type BadgeTier = typeof BADGE_TIERS[number];

// Validation schemas
const submitVerificationSchema = z.object({
  // Tier 1: Identity
  identityFullName: z.string().min(2).max(100).optional(),
  identityPhoneVerified: z.boolean().optional(),
  identityGovernmentIdUrl: z.string().url().optional(),
  // Tier 2: Experience
  experienceYears: z.number().int().min(0).max(60).optional(),
  experiencePastEmployment: z.array(z.object({
    employer: z.string().max(100),
    role: z.string().max(100),
    years: z.number().int().min(0),
  })).max(10).optional(),
  experienceCuisineTraining: z.array(z.object({
    training: z.string().max(200),
    institution: z.string().max(200).optional(),
    year: z.number().int().min(1950).max(new Date().getFullYear()).optional(),
  })).max(20).optional(),
  // Tier 3: Safety
  safetyFoodSafetyCert: z.string().max(100).optional(),
  safetyCertExpiryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), // ISO date
  safetyCertUrl: z.string().url().optional(),
});

const reviewVerificationSchema = z.object({
  status: z.enum(['approved', 'rejected']),
  reviewNotes: z.string().max(500).optional(),
  badges: z.array(z.enum(['identity', 'experience', 'safety'])).optional(), // Which badges to grant on approval
});

export default async function chefVerificationRoutes(server: FastifyInstance) {

  // Get chef's current verification status (chef only)
  server.get('/status', { preHandler: [server.authenticate] }, async (request, reply) => {
    const { userId, role } = request.user as { userId: number; role: string };
    if (role !== 'chef') {
      return reply.status(403).send({ error: 'Only chefs can access verification status' });
    }

    // Get chef profile for current badges
    const profile = db.select({
      verificationBadges: chefProfiles.verificationBadges,
    })
      .from(chefProfiles)
      .where(eq(chefProfiles.userId, userId))
      .get();

    // Get latest submission
    const submission = db.select()
      .from(chefVerificationSubmissions)
      .where(eq(chefVerificationSubmissions.chefId, userId))
      .orderBy(desc(chefVerificationSubmissions.createdAt))
      .limit(1)
      .get();

    return {
      currentBadges: profile ? JSON.parse(profile.verificationBadges as string || '[]') : [],
      latestSubmission: submission ? {
        status: submission.status,
        submittedAt: submission.submittedAt,
        reviewedAt: submission.reviewedAt,
        reviewNotes: submission.reviewNotes,
        identityFullName: submission.identityFullName,
        identityPhoneVerified: submission.identityPhoneVerified,
        identityGovernmentIdUrl: submission.identityGovernmentIdUrl,
        experienceYears: submission.experienceYears,
        experiencePastEmployment: JSON.parse(submission.experiencePastEmployment as string || '[]'),
        experienceCuisineTraining: JSON.parse(submission.experienceCuisineTraining as string || '[]'),
        safetyFoodSafetyCert: submission.safetyFoodSafetyCert,
        safetyCertExpiryDate: submission.safetyCertExpiryDate,
        safetyCertUrl: submission.safetyCertUrl,
      } : null,
    };
  });

  // Submit verification (chef only)
  server.post('/submit', { preHandler: [server.authenticate] }, async (request, reply) => {
    const { userId, role } = request.user as { userId: number; role: string };
    if (role !== 'chef') {
      return reply.status(403).send({ error: 'Only chefs can submit verification' });
    }

    const body = submitVerificationSchema.parse(request.body);

    // Check if there's a pending submission
    const existingPending = db.select()
      .from(chefVerificationSubmissions)
      .where(eq(chefVerificationSubmissions.chefId, userId))
      .all()
      .find(s => s.status === 'pending');

    if (existingPending) {
      return reply.status(409).send({ error: 'You already have a pending verification submission' });
    }

    // Create new submission
    const submission = db.insert(chefVerificationSubmissions).values({
      chefId: userId,
      identityFullName: body.identityFullName ?? null,
      identityPhoneVerified: body.identityPhoneVerified ?? false,
      identityGovernmentIdUrl: body.identityGovernmentIdUrl ?? null,
      experienceYears: body.experienceYears ?? null,
      experiencePastEmployment: body.experiencePastEmployment ? JSON.stringify(body.experiencePastEmployment) : '[]',
      experienceCuisineTraining: body.experienceCuisineTraining ? JSON.stringify(body.experienceCuisineTraining) : '[]',
      safetyFoodSafetyCert: body.safetyFoodSafetyCert ?? null,
      safetyCertExpiryDate: body.safetyCertExpiryDate ?? null,
      safetyCertUrl: body.safetyCertUrl ?? null,
      status: 'pending',
      submittedAt: new Date(),
      createdAt: new Date(),
    }).returning().all()[0];

    return {
      id: submission.id,
      status: submission.status,
      submittedAt: submission.submittedAt,
      message: 'Verification submission received. You will be notified once an admin reviews it.',
    };
  });

  // Admin: List all pending verification submissions
  server.get('/admin/pending', { preHandler: [server.authenticate] }, async (request, reply) => {
    const { role } = request.user as { userId: number; role: string };
    if (role !== 'admin') {
      return reply.status(403).send({ error: 'Only admins can access verification submissions' });
    }

    const pendingSubmissions = db.select({
      id: chefVerificationSubmissions.id,
      chefId: chefVerificationSubmissions.chefId,
      chefName: users.name,
      chefEmail: users.email,
      identityFullName: chefVerificationSubmissions.identityFullName,
      identityPhoneVerified: chefVerificationSubmissions.identityPhoneVerified,
      identityGovernmentIdUrl: chefVerificationSubmissions.identityGovernmentIdUrl,
      experienceYears: chefVerificationSubmissions.experienceYears,
      experiencePastEmployment: chefVerificationSubmissions.experiencePastEmployment,
      experienceCuisineTraining: chefVerificationSubmissions.experienceCuisineTraining,
      safetyFoodSafetyCert: chefVerificationSubmissions.safetyFoodSafetyCert,
      safetyCertExpiryDate: chefVerificationSubmissions.safetyCertExpiryDate,
      safetyCertUrl: chefVerificationSubmissions.safetyCertUrl,
      status: chefVerificationSubmissions.status,
      submittedAt: chefVerificationSubmissions.submittedAt,
      createdAt: chefVerificationSubmissions.createdAt,
    })
      .from(chefVerificationSubmissions)
      .innerJoin(users, eq(chefVerificationSubmissions.chefId, users.id))
      .where(eq(chefVerificationSubmissions.status, 'pending'))
      .orderBy(desc(chefVerificationSubmissions.submittedAt))
      .all();

    return pendingSubmissions.map(s => ({
      ...s,
      experiencePastEmployment: JSON.parse(s.experiencePastEmployment as string || '[]'),
      experienceCuisineTraining: JSON.parse(s.experienceCuisineTraining as string || '[]'),
    }));
  });

  // Admin: Get specific submission details
  server.get('/admin/:id', { preHandler: [server.authenticate] }, async (request, reply) => {
    const { role } = request.user as { userId: number; role: string };
    if (role !== 'admin') {
      return reply.status(403).send({ error: 'Only admins can access verification submissions' });
    }

    const { id } = z.object({ id: z.string() }).parse(request.params);

    const submission = db.select({
      id: chefVerificationSubmissions.id,
      chefId: chefVerificationSubmissions.chefId,
      chefName: users.name,
      chefEmail: users.email,
      identityFullName: chefVerificationSubmissions.identityFullName,
      identityPhoneVerified: chefVerificationSubmissions.identityPhoneVerified,
      identityGovernmentIdUrl: chefVerificationSubmissions.identityGovernmentIdUrl,
      experienceYears: chefVerificationSubmissions.experienceYears,
      experiencePastEmployment: chefVerificationSubmissions.experiencePastEmployment,
      experienceCuisineTraining: chefVerificationSubmissions.experienceCuisineTraining,
      safetyFoodSafetyCert: chefVerificationSubmissions.safetyFoodSafetyCert,
      safetyCertExpiryDate: chefVerificationSubmissions.safetyCertExpiryDate,
      safetyCertUrl: chefVerificationSubmissions.safetyCertUrl,
      status: chefVerificationSubmissions.status,
      submittedAt: chefVerificationSubmissions.submittedAt,
      reviewedAt: chefVerificationSubmissions.reviewedAt,
      reviewedBy: chefVerificationSubmissions.reviewedBy,
      reviewNotes: chefVerificationSubmissions.reviewNotes,
      createdAt: chefVerificationSubmissions.createdAt,
    })
      .from(chefVerificationSubmissions)
      .innerJoin(users, eq(chefVerificationSubmissions.chefId, users.id))
      .where(eq(chefVerificationSubmissions.id, parseInt(id)))
      .get();

    if (!submission) {
      return reply.status(404).send({ error: 'Submission not found' });
    }

    return {
      ...submission,
      experiencePastEmployment: JSON.parse(submission.experiencePastEmployment as string || '[]'),
      experienceCuisineTraining: JSON.parse(submission.experienceCuisineTraining as string || '[]'),
    };
  });

  // Admin: Approve or reject submission
  server.post('/admin/:id/review', { preHandler: [server.authenticate] }, async (request, reply) => {
    const { userId, role } = request.user as { userId: number; role: string };
    if (role !== 'admin') {
      return reply.status(403).send({ error: 'Only admins can review verification submissions' });
    }

    const { id } = z.object({ id: z.string() }).parse(request.params);
    const body = reviewVerificationSchema.parse(request.body);

    const submission = db.select()
      .from(chefVerificationSubmissions)
      .where(eq(chefVerificationSubmissions.id, parseInt(id)))
      .get();

    if (!submission) {
      return reply.status(404).send({ error: 'Submission not found' });
    }

    if (submission.status !== 'pending') {
      return reply.status(409).send({ error: 'Submission has already been reviewed' });
    }

    // Update submission
    db.update(chefVerificationSubmissions)
      .set({
        status: body.status,
        reviewedAt: new Date(),
        reviewedBy: userId,
        reviewNotes: body.reviewNotes ?? null,
      })
      .where(eq(chefVerificationSubmissions.id, parseInt(id)))
      .run();

    // If approved, update chef's badges
    if (body.status === 'approved' && body.badges && body.badges.length > 0) {
      const profile = db.select()
        .from(chefProfiles)
        .where(eq(chefProfiles.userId, submission.chefId))
        .get();

      if (profile) {
        const existingBadges: string[] = JSON.parse(profile.verificationBadges as string || '[]');
        const newBadges = [...new Set([...existingBadges, ...body.badges])];
        
        db.update(chefProfiles)
          .set({
            verificationBadges: JSON.stringify(newBadges),
            verified: newBadges.length > 0, // Set verified true if they have any badge
          })
          .where(eq(chefProfiles.userId, submission.chefId))
          .run();
      }
    }

    return {
      success: true,
      status: body.status,
      message: body.status === 'approved' 
        ? 'Verification approved. Badges have been granted.'
        : 'Verification rejected.',
    };
  });
}