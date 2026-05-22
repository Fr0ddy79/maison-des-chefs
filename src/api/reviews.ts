import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { db } from '../db/index.js';
import { reviews, services, bookings, users, leads } from '../db/schema.js';
import { eq, and, sql } from 'drizzle-orm';

const createReviewSchema = z.object({
  bookingId: z.number().int().positive(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(1000).optional(),
});

const guestReviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(1000).optional(),
});

// GET /api/services/:id/reviews - Fetch reviews for a service
export default async function reviewRoutes(server: FastifyInstance) {
  // Submit a review (authenticated diner only)
  server.post('/', { preHandler: [server.authenticate] }, async (request, reply) => {
    const { userId, role } = request.user as { userId: number; role: string };
    if (role !== 'diner') {
      return reply.status(403).send({ error: 'Only diners can submit reviews' });
    }

    const body = createReviewSchema.parse(request.body);

    // Check if booking exists and belongs to this diner
    const booking = db.select().from(bookings).where(eq(bookings.id, body.bookingId)).get();
    if (!booking) {
      return reply.status(404).send({ error: 'Booking not found' });
    }
    if (booking.dinerId !== userId) {
      return reply.status(403).send({ error: 'This booking does not belong to you' });
    }

    // Check booking status is confirmed/completed (MAI-1214)
    if (booking.status !== 'confirmed') {
      return reply.status(403).send({ error: 'Only confirmed bookings can be reviewed' });
    }

    // Check if already reviewed (UNIQUE constraint on booking_id)
    const existingReview = db.select().from(reviews).where(eq(reviews.bookingId, body.bookingId)).get();
    if (existingReview) {
      return reply.status(409).send({ error: 'This booking has already been reviewed' });
    }

    const created = db.insert(reviews).values({
      chefId: booking.chefId,
      serviceId: booking.serviceId,
      dinerId: userId,
      bookingId: body.bookingId,
      rating: body.rating,
      comment: body.comment ?? null,
    }).returning().all()[0];

    // Fetch diner name for response
    const diner = db.select({ name: users.name }).from(users).where(eq(users.id, userId)).get();
    return reply.status(201).send({
      ...created,
      dinerName: diner?.name ?? 'Anonymous',
    });
  });

  // Submit a review for guest checkout (MAI-1912)
  // POST /api/reviews/lead/:leadId?token=XXX
  // Allows guests to submit reviews without authentication
  server.post('/reviews/lead/:leadId', async (request, reply) => {
    const { leadId } = z.object({ leadId: z.string() }).parse(request.params);
    const { token } = z.object({ token: z.string() }).parse(request.query);
    const leadIdNum = parseInt(leadId);

    // Validate the lead and token
    const lead = db.select({
      id: leads.id,
      accessToken: leads.accessToken,
      accessTokenExpiresAt: leads.accessTokenExpiresAt,
      bookingId: leads.bookingId,
      status: leads.status,
    })
      .from(leads)
      .where(eq(leads.id, leadIdNum))
      .get();

    if (!lead) {
      return reply.status(404).send({ error: 'Lead not found' });
    }

    // Verify token matches
    if (!lead.accessToken || lead.accessToken !== token) {
      return reply.status(403).send({ error: 'Invalid access token' });
    }

    // Check token hasn't expired
    if (lead.accessTokenExpiresAt && new Date(lead.accessTokenExpiresAt) < new Date()) {
      return reply.status(403).send({ error: 'Access token has expired' });
    }

    // Verify lead has a booking
    if (!lead.bookingId) {
      return reply.status(400).send({ error: 'No booking associated with this lead' });
    }

    // Verify booking status is confirmed
    const booking = db.select().from(bookings).where(eq(bookings.id, lead.bookingId)).get();
    if (!booking) {
      return reply.status(404).send({ error: 'Booking not found' });
    }
    if (booking.status !== 'confirmed') {
      return reply.status(403).send({ error: 'Only confirmed bookings can be reviewed' });
    }

    // MAI-1917: Email verification gate for guest checkout users
    // Guest checkout = booking.dinerId IS NULL
    // Authenticated users (dinerId not null) bypass this check always
    if (booking.dinerId === null) {
      if (!booking.emailVerified) {
        return reply.status(403).send({
          error: 'Please verify your email before submitting a review',
        });
      }
    }

    // Check if already reviewed
    const existingReview = db.select().from(reviews).where(eq(reviews.bookingId, lead.bookingId)).get();
    if (existingReview) {
      return reply.status(409).send({ error: 'This booking has already been reviewed' });
    }

    // Parse and validate body
    const body = guestReviewSchema.parse(request.body);

    // Create the review (dinerId is NULL for guest reviews)
    const created = db.insert(reviews).values({
      chefId: booking.chefId,
      serviceId: booking.serviceId,
      dinerId: null, // NULL for guest checkout reviews
      bookingId: lead.bookingId,
      rating: body.rating,
      comment: body.comment ?? null,
    }).returning().all()[0];

    return reply.status(201).send({
      success: true,
      message: 'Thanks for your review!',
      reviewId: created.id,
    });
  });

  // Get reviews for a service
  server.get('/services/:id/reviews', async (request, reply) => {
    const { id } = z.object({ id: z.string() }).parse(request.params);
    const serviceId = parseInt(id);

    // Check service exists
    const service = db.select().from(services).where(eq(services.id, serviceId)).get();
    if (!service) {
      return reply.status(404).send({ error: 'Service not found' });
    }

    // Get reviews with diner names
    const reviewsList = db.select({
      id: reviews.id,
      chefId: reviews.chefId,
      rating: reviews.rating,
      comment: reviews.comment,
      createdAt: reviews.createdAt,
      dinerName: users.name,
    })
      .from(reviews)
      .innerJoin(users, eq(reviews.dinerId, users.id))
      .where(eq(reviews.serviceId, serviceId))
      .all();

    // Get chef name for each review
    const reviewsWithChefNames = reviewsList.map((r) => {
      const chefUser = db.select({ name: users.name }).from(users).where(eq(users.id, r.chefId)).get();
      return {
        id: r.id,
        rating: r.rating,
        comment: r.comment,
        createdAt: r.createdAt,
        dinerName: r.dinerName,
        chefName: chefUser?.name ?? 'Unknown Chef',
      };
    });

    // Calculate aggregate stats
    const stats = db.select({
      count: sql<number>`count(*)`,
      avgRating: sql<number>`coalesce(avg(${reviews.rating}), 0)`,
    })
      .from(reviews)
      .where(eq(reviews.serviceId, serviceId))
      .get();

    // Get featured review (most recent with a comment)
    const featuredReview = db.select({
      id: reviews.id,
      rating: reviews.rating,
      comment: reviews.comment,
      createdAt: reviews.createdAt,
      dinerName: users.name,
    })
      .from(reviews)
      .innerJoin(users, eq(reviews.dinerId, users.id))
      .where(and(eq(reviews.serviceId, serviceId), sql `${reviews.comment} IS NOT NULL`))
      .orderBy(sql `${reviews.createdAt} DESC`)
      .limit(1)
      .get();

    const featuredReviewData = featuredReview ? {
      id: featuredReview.id,
      rating: featuredReview.rating,
      comment: featuredReview.comment,
      createdAt: featuredReview.createdAt,
      dinerName: featuredReview.dinerName,
      dinerFirstName: featuredReview.dinerName?.split(' ')[0] ?? 'Guest',
    } : null;

    return {
      reviews: reviewsWithChefNames,
      avgRating: stats ? Math.round((stats.avgRating as number) * 10) / 10 : 0,
      reviewCount: stats?.count ?? 0,
      featuredReview: featuredReviewData,
    };
  });

  // Get reviews for a chef (MAI-1013)
  server.get('/chefs/:id/reviews', async (request, reply) => {
    const { id } = z.object({ id: z.string() }).parse(request.params);
    const chefId = parseInt(id);

    // Check chef exists
    const chef = db.select().from(users).where(eq(users.id, chefId)).get();
    if (!chef) {
      return reply.status(404).send({ error: 'Chef not found' });
    }

    // Get reviews sorted by newest first, limit 10
    const reviewsList = db.select({
      id: reviews.id,
      rating: reviews.rating,
      comment: reviews.comment,
      createdAt: reviews.createdAt,
      dinerName: users.name,
    })
      .from(reviews)
      .innerJoin(users, eq(reviews.dinerId, users.id))
      .where(eq(reviews.chefId, chefId))
      .orderBy(sql `${reviews.createdAt} DESC`)
      .limit(10)
      .all();

    // Calculate aggregate stats
    const stats = db.select({
      count: sql<number>`count(*)`,
      avgRating: sql<number>`coalesce(avg(${reviews.rating}), 0)`,
    })
      .from(reviews)
      .where(eq(reviews.chefId, chefId))
      .get();

    const reviewsWithFirstNames = reviewsList.map((r) => ({
      id: r.id,
      rating: r.rating,
      comment: r.comment,
      createdAt: r.createdAt,
      dinerFirstName: r.dinerName?.split(' ')[0] ?? 'Guest',
    }));

    return {
      reviews: reviewsWithFirstNames,
      avgRating: stats ? Math.round((stats.avgRating as number) * 10) / 10 : 0,
      reviewCount: stats?.count ?? 0,
    };
  });

  // Get aggregate rating for a service (MAI-1214)
  server.get('/services/:id/rating', async (request, reply) => {
    const { id } = z.object({ id: z.string() }).parse(request.params);
    const serviceId = parseInt(id);

    // Check service exists
    const service = db.select().from(services).where(eq(services.id, serviceId)).get();
    if (!service) {
      return reply.status(404).send({ error: 'Service not found' });
    }

    // Calculate aggregate stats
    const stats = db.select({
      count: sql<number>`count(*)`,
      avgRating: sql<number>`coalesce(avg(${reviews.rating}), 0)`,
    })
      .from(reviews)
      .where(eq(reviews.serviceId, serviceId))
      .get();

    const aggregateRating = stats && (stats.count ?? 0) > 0
      ? Math.round((stats.avgRating as number) * 10) / 10
      : 0;
    const totalReviews = (stats?.count as number) ?? 0;

    return {
      aggregate_rating: aggregateRating,
      total_reviews: totalReviews,
    };
  });
}