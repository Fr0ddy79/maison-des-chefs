import { FastifyInstance } from "fastify";
import { db, schema } from "../../../db/index.js";
import { leads, users, chefProfiles, services } from "../../../db/schema.js";
import { eq, and, desc, gte, isNotNull, sql } from "drizzle-orm";

/**
 * MAI-2929: Social Proof Toast — Real Booking Activity API
 * GET /api/social-proof/recent-activity
 * Returns the 5 most recent inquiries from the last 7 days, deduplicated by chef
 */
export default async function socialProofRoutes(server: FastifyInstance) {
  server.get("/api/social-proof/recent-activity", async (request, reply) => {
    try {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      // Fetch last 7 days of inquiries, joined with chef_profiles and services
      // Order by created_at desc to get most recent
      const recentInquiries = db
        .select({
          id: leads.id,
          chefId: leads.chefId,
          chefName: users.name,
          city: chefProfiles.location,
          inquiryDate: leads.eventDate,
          guestCount: leads.guestCount,
          serviceType: services.category, // 'Private Dinner', 'Cooking Class', etc.
          serviceName: services.name,
          createdAt: leads.createdAt,
        })
        .from(leads)
        .innerJoin(users, eq(leads.chefId, users.id))
        .innerJoin(chefProfiles, eq(leads.chefId, chefProfiles.userId))
        .innerJoin(services, eq(leads.serviceId, services.id))
        .where(
          and(
            isNotNull(leads.chefId),
            gte(leads.createdAt, sevenDaysAgo)
          )
        )
        .orderBy(desc(leads.createdAt))
        .all();

      // Deduplicate by chef — keep only the latest inquiry per chef
      const seenChefs = new Set<number>();
      const uniqueByChef = recentInquiries.filter((inquiry) => {
        if (seenChefs.has(inquiry.chefId)) return false;
        seenChefs.add(inquiry.chefId);
        return true;
      });

      // Take the latest 5
      const activities = uniqueByChef.slice(0, 5).map((inquiry) => ({
        id: `inquiry_${inquiry.id}`,
        chef_name: inquiry.chefName,
        city: inquiry.city || "",
        inquiry_date: inquiry.inquiryDate || "",
        guest_count: inquiry.guestCount || 0,
        service_type: inquiry.serviceType || inquiry.serviceName || "dinner",
        created_at: inquiry.createdAt?.toISOString() || new Date().toISOString(),
      }));

      return { activities };
    } catch (error) {
      console.error("[social-proof] Failed to fetch recent activity:", error);
      // Return empty activities on error — client will use static fallback
      return { activities: [] };
    }
  });
}