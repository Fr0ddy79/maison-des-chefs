import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { db } from '../db/index.js';
import { notifications } from '../db/schema.js';
import { eq, and, desc } from 'drizzle-orm';

// MAI-1212: Notification types
export type NotificationType = 'booking_confirmed' | 'booking_declined' | 'booking_completed' | 'review_request';

// MAI-1212: Create a notification for a user
export function createNotification(params: {
  userId: number;
  type: NotificationType;
  title: string;
  body: string;
}) {
  db.insert(notifications).values({
    userId: params.userId,
    type: params.type,
    title: params.title,
    body: params.body,
  }).run();
}

export default async function notificationRoutes(server: FastifyInstance) {
  // GET /api/notifications — list notifications for current user (newest first, limit 50)
  server.get('/', { preHandler: [server.authenticate] }, async (request, reply) => {
    const { userId } = request.user as { userId: number };

    const userNotifications = db.select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt))
      .limit(50)
      .all();

    return userNotifications.map(n => ({
      id: n.id,
      type: n.type,
      title: n.title,
      body: n.body,
      read: n.read,
      createdAt: n.createdAt,
    }));
  });

  // PATCH /api/notifications/:id/read — mark notification as read
  server.patch('/:id/read', { preHandler: [server.authenticate] }, async (request, reply) => {
    const { userId } = request.user as { userId: number };
    const { id } = z.object({ id: z.string() }).parse(request.params);

    const notification = db.select()
      .from(notifications)
      .where(and(
        eq(notifications.id, parseInt(id)),
        eq(notifications.userId, userId)
      ))
      .get();

    if (!notification) {
      return reply.status(404).send({ error: 'Notification not found' });
    }

    db.update(notifications)
      .set({ read: true })
      .where(eq(notifications.id, parseInt(id)))
      .run();

    return { success: true };
  });

  // POST /api/notifications/mark-all-read — mark all notifications as read for current user
  server.post('/mark-all-read', { preHandler: [server.authenticate] }, async (request, reply) => {
    const { userId } = request.user as { userId: number };

    db.update(notifications)
      .set({ read: true })
      .where(and(
        eq(notifications.userId, userId),
        eq(notifications.read, false)
      ))
      .run();

    return { success: true };
  });
}