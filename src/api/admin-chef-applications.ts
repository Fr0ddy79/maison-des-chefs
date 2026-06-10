// MAI-2504: Admin Chef Application Review API
// GET /api/admin/chef-applications — list all applications with optional status filter
// PATCH /api/admin/chef-applications/[id] — approve or reject an application

import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { db } from '../db/index.js';
import { chefApplications, users, chefProfiles } from '../db/schema.js';
import { eq, desc, and } from 'drizzle-orm';
import { sendChefApprovalNotification } from '../services/send-chef-approval-notification.js';
import { sendChefRejectionEmail } from '../services/send-chef-rejection-email.js';

const listQuerySchema = z.object({
  status: z.enum(['pending', 'approved', 'rejected']).optional(),
});

const reviewBodySchema = z.object({
  action: z.enum(['approve', 'reject']),
  adminId: z.number(),
});

// Generate a secure random password for new chef accounts
function generateSecurePassword(length = 16): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$';
  const randomBytes = crypto.randomBytes(length);
  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars[randomBytes[i] % chars.length];
  }
  return password;
}

export default async function adminChefApplicationsRoutes(server: FastifyInstance) {

  // GET /api/admin/chef-applications — list all applications
  server.get('/', async (request, reply) => {
    const query = listQuerySchema.parse(request.query);

    let applications;
    if (query.status) {
      applications = db
        .select()
        .from(chefApplications)
        .where(eq(chefApplications.status, query.status))
        .orderBy(desc(chefApplications.createdAt))
        .all();
    } else {
      applications = db
        .select()
        .from(chefApplications)
        .orderBy(desc(chefApplications.createdAt))
        .all();
    }

    // Parse cuisine_types JSON for each application
    const enriched = applications.map(app => ({
      ...app,
      cuisineTypes: JSON.parse(app.cuisineTypes || '[]'),
    }));

    return {
      applications: enriched,
      total: enriched.length,
    };
  });

  // GET /api/admin/chef-applications/:id — get single application
  server.get('/:id', async (request, reply) => {
    const { id } = z.object({ id: z.string() }).parse(request.params);
    const applicationId = parseInt(id);

    if (isNaN(applicationId)) {
      return reply.status(400).send({ error: 'Invalid application ID' });
    }

    const application = db
      .select()
      .from(chefApplications)
      .where(eq(chefApplications.id, applicationId))
      .get();

    if (!application) {
      return reply.status(404).send({ error: 'Application not found' });
    }

    return {
      ...application,
      cuisineTypes: JSON.parse(application.cuisineTypes || '[]'),
    };
  });

  // PATCH /api/admin/chef-applications/:id — approve or reject
  server.patch('/:id', async (request, reply) => {
    const { id } = z.object({ id: z.string() }).parse(request.params);
    const body = reviewBodySchema.parse(request.body);
    const applicationId = parseInt(id);

    if (isNaN(applicationId)) {
      return reply.status(400).send({ error: 'Invalid application ID' });
    }

    // Fetch the application
    const application = db
      .select()
      .from(chefApplications)
      .where(eq(chefApplications.id, applicationId))
      .get();

    if (!application) {
      return reply.status(404).send({ error: 'Application not found' });
    }

    // Already processed?
    if (application.status !== 'pending') {
      return reply.status(400).send({
        error: 'Application already processed',
        status: application.status,
        reviewedAt: application.reviewedAt,
      });
    }

    const now = new Date();

    if (body.action === 'approve') {
      // Check if user already exists with this email
      const existingUser = db
        .select()
        .from(users)
        .where(eq(users.email, application.email))
        .get();

      let userId: number;
      let isNewUser = false;

      if (existingUser) {
        // User exists — check if they already have a chef profile
        const existingProfile = db
          .select()
          .from(chefProfiles)
          .where(eq(chefProfiles.userId, existingUser.id))
          .get();

        if (existingProfile) {
          return reply.status(400).send({
            error: 'A chef profile already exists for this email. Applicant can log in with existing credentials.',
          });
        }
        userId = existingUser.id;
      } else {
        // Create new user account with chef role
        isNewUser = true;
        const securePassword = generateSecurePassword();
        const passwordHash = await bcrypt.hash(securePassword, 10);

        const newUser = db.insert(users).values({
          email: application.email,
          passwordHash,
          name: application.name,
          role: 'chef',
          hasCompletedOnboarding: false,
        }).returning().get();

        userId = newUser.id;

        // Send approval email with credentials (non-blocking)
        sendChefApprovalNotification({
          chefEmail: application.email,
          chefName: application.name,
          password: securePassword,
        }).catch(err => console.error('[ChefApproval] Failed to send email:', err));
      }

      // Create chef_profiles entry
      db.insert(chefProfiles).values({
        userId,
        bio: application.bio || null,
        cuisineTypes: application.cuisineTypes || '[]',
        location: application.location || '',
        pricePerPerson: 0, // Chef sets this during onboarding
        available: true,
        verified: false,
      }).run();

      // Update application status
      db.update(chefApplications)
        .set({
          status: 'approved',
          reviewedAt: now,
          reviewedBy: body.adminId,
        })
        .where(eq(chefApplications.id, applicationId))
        .run();

      return {
        success: true,
        action: 'approved',
        applicationId,
        userId,
        isNewUser,
        message: isNewUser
          ? 'Application approved. New chef account created with auto-generated password sent via email.'
          : 'Application approved. Existing user promoted to chef role.',
      };

    } else if (body.action === 'reject') {
      // Update application status
      db.update(chefApplications)
        .set({
          status: 'rejected',
          reviewedAt: now,
          reviewedBy: body.adminId,
        })
        .where(eq(chefApplications.id, applicationId))
        .run();

      // Send rejection email (non-blocking)
      sendChefRejectionEmail({
        chefEmail: application.email,
        chefName: application.name,
      }).catch(err => console.error('[ChefRejection] Failed to send email:', err));

      return {
        success: true,
        action: 'rejected',
        applicationId,
        message: 'Application rejected. Rejection email sent to applicant.',
      };
    }

    return reply.status(400).send({ error: 'Invalid action. Must be "approve" or "reject".' });
  });
}