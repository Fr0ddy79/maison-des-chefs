import { FastifyInstance } from 'fastify';
import { db } from '../db/index.js';
import { chefProfiles } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join, extname } from 'path';
import { randomBytes } from 'crypto';

// Allowed MIME types for chef photos
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const UPLOAD_DIR = 'public/uploads/chef-photos';

export default async function chefPhotoRoutes(server: FastifyInstance) {
  // POST /api/chef/photo - Upload chef profile photo
  server.post('/photo', { preHandler: [server.authenticate] }, async (request, reply) => {
    try {
      const { userId, role } = request.user as { userId: number; role: string };
      
      if (role !== 'chef') {
        return reply.status(403).send({ error: 'Only chefs can upload profile photos' });
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
      const filename = `${userId}-${randomBytes(8).toString('hex')}${ext}`;
      const filepath = join(UPLOAD_DIR, filename);

      // Write file
      await writeFile(filepath, fileBuffer);

      // Generate URL path (use forward slashes for URL)
      const photoUrl = `/${UPLOAD_DIR}/${filename}`;

      // Update chef profile with photo URL
      const existing = db.select().from(chefProfiles).where(eq(chefProfiles.userId, userId)).get();
      
      if (existing) {
        db.update(chefProfiles)
          .set({ photoUrl })
          .where(eq(chefProfiles.userId, userId))
          .run();
      } else {
        // Create profile if it doesn't exist
        db.insert(chefProfiles).values({
          userId,
          photoUrl,
          bio: '',
          cuisineTypes: '[]',
          location: '',
          pricePerPerson: 0,
          available: true,
          verified: false,
        }).run();
      }

      return { photoUrl };
    } catch (err: any) {
      console.error('Chef photo upload error:', err);
      return reply.status(500).send({ 
        error: 'Upload failed. Please try again.',
        code: 'UPLOAD_FAILED'
      });
    }
  });

  // DELETE /api/chef/photo - Remove chef profile photo
  server.delete('/photo', { preHandler: [server.authenticate] }, async (request, reply) => {
    try {
      const { userId, role } = request.user as { userId: number; role: string };
      
      if (role !== 'chef') {
        return reply.status(403).send({ error: 'Only chefs can delete profile photos' });
      }

      // Clear photo URL from profile
      db.update(chefProfiles)
        .set({ photoUrl: null })
        .where(eq(chefProfiles.userId, userId))
        .run();

      return { success: true };
    } catch (err: any) {
      console.error('Chef photo delete error:', err);
      return reply.status(500).send({ error: 'Failed to delete photo. Please try again.' });
    }
  });
}
