import { FastifyInstance } from 'fastify';
import { db } from '../db/index.js';
import { services } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { writeFile, mkdir, unlink } from 'fs/promises';
import { existsSync } from 'fs';
import { join, extname } from 'path';
import { randomBytes } from 'crypto';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const UPLOAD_DIR = 'public/uploads/service-photos';

export default async function servicePhotoRoutes(server: FastifyInstance) {
  // POST /api/services/:id/photos - Upload a photo to a service
  server.post('/:id/photos', { preHandler: [server.authenticate] }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const { userId, role } = request.user as { userId: number; role: string };

      if (role !== 'chef') {
        return reply.status(403).send({ error: 'Only chefs can upload service photos' });
      }

      // Get the service
      const service = db.select().from(services).where(eq(services.id, parseInt(id))).get();
      if (!service || service.chefId !== userId) {
        return reply.status(404).send({ error: 'Service not found' });
      }

      // Get the file from the request
      const data = await request.file();

      if (!data) {
        return reply.status(400).send({ error: 'No file uploaded' });
      }

      const { mimetype, file } = data;

      // Validate file type
      if (!ALLOWED_TYPES.includes(mimetype)) {
        return reply.status(400).send({
          error: 'Please upload a JPG, PNG, or WebP image.',
          code: 'INVALID_TYPE'
        });
      }

      // Read file content and validate size
      const chunks: Buffer[] = [];
      for await (const chunk of file) {
        chunks.push(chunk);
      }
      const fileBuffer = Buffer.concat(chunks);

      if (fileBuffer.length > MAX_SIZE) {
        return reply.status(400).send({
          error: 'File too large. Maximum 5MB allowed.',
          code: 'FILE_TOO_LARGE'
        });
      }

      // Ensure upload directory exists
      if (!existsSync(UPLOAD_DIR)) {
        await mkdir(UPLOAD_DIR, { recursive: true });
      }

      // Generate unique filename
      const ext = extname(mimetype) || '.jpg';
      const filename = `${service.id}-${randomBytes(8).toString('hex')}${ext}`;
      const filepath = join(UPLOAD_DIR, filename);

      // Write file
      await writeFile(filepath, fileBuffer);

      // Generate URL path
      const photoUrl = `/${UPLOAD_DIR}/${filename}`;

      // Get current photos and check limit
      const currentPhotos = JSON.parse(service.photos || '[]');
      if (currentPhotos.length >= 6) {
        // Delete the uploaded file since we can't add more
        await unlink(filepath).catch(() => {});
        return reply.status(400).send({
          error: 'Maximum 6 photos allowed per service. Delete an existing photo first.',
          code: 'MAX_PHOTOS_EXCEEDED'
        });
      }

      // Add the new photo URL to the service
      const updatedPhotos = [...currentPhotos, photoUrl];
      db.update(services)
        .set({ photos: JSON.stringify(updatedPhotos) })
        .where(eq(services.id, parseInt(id)))
        .run();

      return { photoUrl, photos: updatedPhotos };
    } catch (err: any) {
      console.error('Service photo upload error:', err);
      return reply.status(500).send({
        error: 'Upload failed. Please try again.',
        code: 'UPLOAD_FAILED'
      });
    }
  });

  // DELETE /api/services/:id/photos - Delete a photo from a service
  server.delete('/:id/photos', { preHandler: [server.authenticate] }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const { userId, role } = request.user as { userId: number; role: string };

      if (role !== 'chef') {
        return reply.status(403).send({ error: 'Only chefs can delete service photos' });
      }

      // Get the service
      const service = db.select().from(services).where(eq(services.id, parseInt(id))).get();
      if (!service || service.chefId !== userId) {
        return reply.status(404).send({ error: 'Service not found' });
      }

      // Get the photo URL from query params
      const { photoUrl } = request.query as { photoUrl?: string };
      if (!photoUrl) {
        return reply.status(400).send({ error: 'photoUrl query parameter is required' });
      }

      // Get current photos and remove the specified one
      const currentPhotos = JSON.parse(service.photos || '[]');
      const photoIndex = currentPhotos.indexOf(photoUrl);
      if (photoIndex === -1) {
        return reply.status(404).send({ error: 'Photo not found in service photos' });
      }

      const updatedPhotos = currentPhotos.filter((p: string) => p !== photoUrl);
      db.update(services)
        .set({ photos: JSON.stringify(updatedPhotos) })
        .where(eq(services.id, parseInt(id)))
        .run();

      // Try to delete the file (don't fail if it doesn't exist)
      const filepath = join('public', photoUrl.replace(/^\//, ''));
      await unlink(filepath).catch(() => {});

      return { success: true, photos: updatedPhotos };
    } catch (err: any) {
      console.error('Service photo delete error:', err);
      return reply.status(500).send({ error: 'Failed to delete photo. Please try again.' });
    }
  });

  // PATCH /api/services/:id/photos/reorder - Reorder photos (drag-to-reorder)
  server.patch('/:id/photos/reorder', { preHandler: [server.authenticate] }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const { userId, role } = request.user as { userId: number; role: string };

      if (role !== 'chef') {
        return reply.status(403).send({ error: 'Only chefs can reorder service photos' });
      }

      // Get the service
      const service = db.select().from(services).where(eq(services.id, parseInt(id))).get();
      if (!service || service.chefId !== userId) {
        return reply.status(404).send({ error: 'Service not found' });
      }

      const body = request.body as { photos: string[] };
      if (!body.photos || !Array.isArray(body.photos)) {
        return reply.status(400).send({ error: 'photos array is required' });
      }

      // Validate that all photos belong to this service
      const currentPhotos = JSON.parse(service.photos || '[]');
      if (body.photos.length !== currentPhotos.length) {
        return reply.status(400).send({ error: 'Photo count mismatch' });
      }

      // Verify all photos are existing service photos
      const allValid = body.photos.every((p: string) => currentPhotos.includes(p));
      if (!allValid) {
        return reply.status(400).send({ error: 'Invalid photo URLs provided' });
      }

      db.update(services)
        .set({ photos: JSON.stringify(body.photos) })
        .where(eq(services.id, parseInt(id)))
        .run();

      return { success: true, photos: body.photos };
    } catch (err: any) {
      console.error('Service photo reorder error:', err);
      return reply.status(500).send({ error: 'Failed to reorder photos. Please try again.' });
    }
  });
}