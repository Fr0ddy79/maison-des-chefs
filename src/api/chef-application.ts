// MAI-2813: Chef Application Submission API
// POST /api/chef-applications — Submit a new chef application
// On successful submission, triggers admin notification email (non-blocking)

import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { db } from '../db/index.js';
import { chefApplications } from '../db/schema.js';
import { sendAdminApplicationNotification } from '../services/send-admin-application-notification.js';

const submitApplicationSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Valid email is required'),
  location: z.string().optional().default(''),
  cuisineTypes: z.array(z.string()).optional().default([]),
  yearsExperience: z.number().int().min(0).optional().default(0),
  bio: z.string().optional(),
});

export default async function chefApplicationRoutes(server: FastifyInstance) {

  // POST /api/chef-applications — Submit a new chef application
  server.post('/', async (request, reply) => {
    let parsed;
    try {
      parsed = submitApplicationSchema.parse(request.body);
    } catch (err: any) {
      return reply.status(400).send({
        error: 'Validation failed',
        details: err?.errors || 'Invalid request body',
      });
    }

    const { name, email, location, cuisineTypes, yearsExperience, bio } = parsed;

    // Check if email already has a pending application
    const existingApplication = db
      .select()
      .from(chefApplications)
      .where(and(eq(chefApplications.email, email), eq(chefApplications.status, 'pending')))
      .get();

    if (existingApplication) {
      return reply.status(409).send({
        error: 'A pending application already exists for this email',
        applicationId: existingApplication.id,
      });
    }

    // Insert the new application
    const now = new Date();
    const inserted = db.insert(chefApplications).values({
      name,
      email,
      location: location || '',
      cuisineTypes: JSON.stringify(cuisineTypes || []),
      yearsExperience: yearsExperience || 0,
      bio: bio || null,
      status: 'pending',
      createdAt: now,
    }).returning().get();

    // Trigger admin notification email (non-blocking)
    // The application is already saved; email failure should not affect the response
    sendAdminApplicationNotification({
      applicantName: name,
      applicantEmail: email,
      location: location || '',
      cuisineTypes: cuisineTypes || [],
      yearsExperience: yearsExperience || 0,
      bio,
      submittedAt: now,
    }).catch((err) => {
      console.error('[ChefApplication] Failed to send admin notification:', err);
    });

    return reply.status(201).send({
      success: true,
      message: 'Application submitted successfully',
      applicationId: inserted.id,
      status: inserted.status,
    });
  });

  // GET /api/chef-applications/:id — Get application status by ID
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
      id: application.id,
      name: application.name,
      email: application.email,
      location: application.location,
      cuisineTypes: JSON.parse(application.cuisineTypes || '[]'),
      yearsExperience: application.yearsExperience,
      bio: application.bio,
      status: application.status,
      createdAt: application.createdAt,
      reviewedAt: application.reviewedAt,
    };
  });

  // GET /api/chef-applications/email/:email — Get application status by email
  server.get('/email/:email', async (request, reply) => {
    const { email } = z.object({ email: z.string().email() }).parse(request.params);

    const applications = db
      .select()
      .from(chefApplications)
      .where(eq(chefApplications.email, email))
      .all();

    if (applications.length === 0) {
      return reply.status(404).send({ error: 'No applications found for this email' });
    }

    // Return the most recent application
    const latest = applications.sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )[0];

    return {
      id: latest.id,
      name: latest.name,
      email: latest.email,
      location: latest.location,
      cuisineTypes: JSON.parse(latest.cuisineTypes || '[]'),
      yearsExperience: latest.yearsExperience,
      bio: latest.bio,
      status: latest.status,
      createdAt: latest.createdAt,
      reviewedAt: latest.reviewedAt,
    };
  });
}