# MAI-1255: Product Opportunity Discovery

**Issue:** 4bd43162-b396-4d53-be9e-bbc2e1afea07
**Created:** 2026-05-08 04:00 UTC
**Status:** ✅ Analysis Complete
**Owner:** Product Manager

---

## 1. Current State Summary

| Stage | Status | Count | Notes |
|-------|--------|-------|-------|
| Published services | ✅ Live | 1 | "Dinner for 2" by Chef Marcel ($95/person) |
| Pending bookings | 🔴 Dead | 4 | All waiting for chef response (0-23 days) |
| Confirmed bookings | 🔴 None | 0 | Revenue = $0 |
| Leads | ⚠️ New | 8 total | 1 converted, 7 new (likely QA) |
| Reviews | ⚠️ Empty | 0 | Implemented but no submissions |
| Text search | 🔴 **MISSING** | N/A | Chef discovery has filters but NO search |
| Service categories | 🔴 **MISSING** | N/A | All services have category=null |

### Key Finding

**The chef response bottleneck persists** (23 days on oldest booking). This is a human/ops issue beyond software scope. However, there are clear **software gaps** limiting diner discovery and conversion.

---

## 2. Product Opportunities Identified

### Opportunity #1: Text Search on Chef Discovery Page 🔴 HIGH PRIORITY

**Problem:** Diners cannot search for specific cuisines, dishes, or chefs by name. The discovery page has filters but **no search input**. This is a fundamental UX gap.

**Current state:**
- Filters exist: cuisine, dietary, price range, sort
- Search input: **MISSING**
- Diners looking for "Italian" or "tasting menu" must scroll/check all filters

**Proposed solution:**
Add a search bar at the top of the chef discovery page that filters by:
- Chef name (partial match)
- Cuisine type (from chef profile)
- Service name
- Description text

**User Story:**
> **As a** diner
> **I want to** search for chefs by name, cuisine, or dish
> **So that** I can quickly find what I'm looking for without browsing everything

**Scope (MVP):**
- Add `<input type="text">` search bar above chef grid
- Client-side filtering (no backend change needed for MVP)
- Search matches chef name + cuisineTypes + service name + description
- Clear button to reset search
- "No results" state with filter reset CTA

**Out of Scope:**
- Server-side search (optimization for later)
- Search analytics/tracking
- Autocomplete suggestions

**Acceptance Criteria:**
- [ ] Search input visible at top of chef discovery page
- [ ] Typing "French" shows only French cuisine chefs
- [ ] Typing "Marcel" shows Chef Marcel
- [ ] Clearing search restores full list
- [ ] Empty results shows helpful message + reset CTA

**Effort:** ~2-3 hours (frontend only)

**Impact:** HIGH — discovery is the first step in the conversion funnel

---

### Opportunity #2: Service Categories for Browsing 🟡 MEDIUM PRIORITY

**Problem:** Diners cannot browse by service type (Private Dinner, Cooking Class, Tasting Menu, Catering). The `category` field exists in the schema but is not populated or displayed.

**Current state:**
- Schema: `services.category` exists (nullable text)
- All existing services: `category = null`
- No category filter in discovery UI

**Proposed solution:**
1. Populate `category` field for existing services
2. Add "Category" filter section in discovery sidebar with options:
   - Private Dinner
   - Cooking Class
   - Tasting Menu
   - Catering
   - Special Occasion
   - Other

**User Story:**
> **As a** diner
> **I want to** browse by service type
> **So that** I can find cooking classes or catering separately from private dinners

**Scope (MVP):**
- Add category filter to sidebar
- Update existing 1 service with category = "Private Dinner"
- Client-side filter by service category

**Out of Scope:**
- Category management UI for chefs (future)
- Multiple categories per service
- Category-specific landing pages

**Acceptance Criteria:**
- [ ] Category filter appears in sidebar
- [ ] Service cards display category badge
- [ ] Filtering by category shows only matching services

**Effort:** ~2 hours

**Impact:** MEDIUM — enables browsing but current 1-chef setup has limited category differentiation

---

### Opportunity #3: Chef Verification Badge Display 🟡 MEDIUM PRIORITY

**Problem:** The verification submission system exists in schema (`chef_verification_submissions`) but there's no visible indicator on chef cards that distinguishes verified vs. unverified chefs.

**Current state:**
- Schema: `chef_profiles.verified` boolean + `verificationBadges` JSON
- Schema: `chef_verification_submissions` table for admin review workflow
- UI: Verified badge in some places but not on chef discovery cards
- No admin review UI exists

**Proposed solution:**
Display trust indicators on chef discovery cards:
- "✓ Verified" badge for `verified = true`
- Verification badge icons (identity, experience, safety) from `verificationBadges`
- "New Chef" indicator for chefs with no reviews

**User Story:**
> **As a** diner
> **I want to** see which chefs are verified
> **So that** I can make informed decisions when booking

**Scope (MVP):**
- Show "✓ Verified" badge on chef cards when `chef.verified = true`
- Show "New Chef" badge when chef has 0 completed bookings
- No admin UI changes (defer to future)

**Out of Scope:**
- Full verification submission flow (MAI-1252 spec exists)
- Admin verification review dashboard
- Badge申请/approval workflow

**Acceptance Criteria:**
- [ ] Verified chefs show "✓ Verified" badge on discovery cards
- [ ] New chefs show "New Chef" badge
- [ ] Unverified chefs show no badge (clean look)

**Effort:** ~1-2 hours

**Impact:** MEDIUM — trust signals matter for premium dining but only 1 chef exists currently

---

## 3. Recommendation

**Priority Order:**
1. **Opportunity #1 (Text Search)** — HIGHEST impact, affects all diners, simplest implementation
2. **Opportunity #2 (Categories)** — MEDIUM impact, enables browsing, quick win
3. **Opportunity #3 (Verification Badges)** — MEDIUM impact, trust signal, when time allows

**Recommended: Implement #1 first.** Text search is the most impactful gap in the current diner experience.

---

## 4. Metrics to Track

| Metric | Current | Target | Notes |
|--------|---------|--------|-------|
| Chef discovery page visits | Unknown | Establish baseline | Need analytics |
| Search usage rate | N/A (doesn't exist) | 30%+ of visits use search | Track when implemented |
| Category filter usage | N/A | 20%+ of visits use filter | Track when implemented |
| Booking conversion from discovery | Unknown | Establish baseline | Key funnel metric |

---

## 5. Open Questions

| Question | Owner | Priority |
|----------|-------|----------|
| Should search be server-side for scalability? | Engineering | Low (MVP can be client-side) |
| Do we need category management UI for chefs? | Product | Medium (future) |
| Should we implement admin verification review UI? | Fred | High (unblocks trust features) |

---

## 6. Definition of Done

- [x] Current state analyzed (1 chef, 1 service, 4 pending bookings, $0 revenue)
- [x] Software gaps identified (search missing, categories missing, verification not displayed)
- [x] 3 product opportunities defined with clear scope
- [x] Priority recommendation made (text search first)
- [x] Acceptance criteria written for each opportunity
- [x] Effort estimates provided
- [ ] Engineers can implement without guessing (pending review)
- [ ] Scope is clear and bounded for each opportunity

---

*Product Opportunity Discovery — MAI-1255 — Product Manager — 2026-05-08 04:00 UTC*