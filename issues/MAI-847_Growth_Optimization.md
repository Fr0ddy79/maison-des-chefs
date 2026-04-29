# MAI-848: Growth Optimization — Funnel Analysis & Top Experiments

**Issue:** TBD (to be created)
**Created:** 2026-04-29 14:03 EDT
**Status:** ✅ Analyzed
**Owner:** Growth Marketer
**Context:** MAI-845 (Stale Lead Re-Engagement Email) building; MAI-837 identified stale lead re-engagement opportunity; extremely early-stage platform

---

## 0. Current System State

**Production DB snapshot (`data/maison.db`):**
| Entity | Count |
|--------|-------|
| Diners | 1 |
| Chefs | 1 |
| Leads | 0 |
| Published Services | 0 |
| Bookings | 1 (pending) |

**Architecture:** Two-sided marketplace. Diners submit leads → Chef responds with quote → Diner pays via Stripe. Guest checkout with magic link tokens. Email confirmations at each step.

**Key existing growth infrastructure:**
- ✅ Diner confirmation email on inquiry (`diner-confirmation-email.ts`)
- ✅ Quote email to diner when chef responds
- ✅ Abandoned booking recovery email (`abandoned-booking-detector.ts`)
- ✅ Quote reminder at 72h if no response (`quote-reminder.ts`)
- ✅ Stale lead re-engagement email for diners at ~7 days (MAI-845, in progress)
- ✅ Chef stale lead alert on lead dashboard (MAI-841, built)
- ✅ Referral tracking infrastructure (`referral-tracking.ts`)
- ✅ Diner preferences wizard + lifecycle events (fully built, not surfaced)
- ✅ Corporate landing page (`/corporate`)
- ✅ Booking status page for diners (public URL with access token)

**Key gap:** All infrastructure is built. Nothing drives diners to **activate** preferences, **refer** friends, or stay **engaged** between inquiry and quote.

---

## 1. Funnel Analysis

### 1a. Diner Funnel (Acquisition → Activation → Retention → Referral)

```
AWARENESS
  ↓
LANDING PAGE (/, /corporate)
  ↓
SERVICE CATALOG (/services)          ← No search/filter SEO visibility yet
  ↓
SERVICE DETAIL PAGE                 ← 1 page view per session typically
  ↓
INQUIRY SUBMITTED (lead created)
  ✅ Confirmation email sent
  ❌ No CTA to set preferences
  ❌ No CTA to browse more / invite friends
  ↓
[ACTIVATION GAP: preferences wizard never surfaced to diners]
  ↓
CHEF RECEIVES LEAD → RESPONDS WITH QUOTE
  ✅ Quote email sent with booking link
  ❌ No nudges to diner if chef is slow (stale lead email in progress — MAI-845)
  ↓
DINER PAYS (checkout)
  ❌ No post-payment referral ask
  ❌ No "share with friends" moment
  ↓
[REFERRAL GAP: satisfied diners have no mechanism to share]
  ↓
FUTURE: Repeat booking?  ← No retention hooks beyond re-discovery
```

### 1b. Chef Funnel (Acquisition → Activation → Retention)

```
CHEF SIGNS UP
  → Onboarding wizard (4 steps, built)
  → First service published
  ↓
LEADS ARRIVE
  → Lead dashboard (built, MAI-841 stale alert added)
  ✅ Inquiry confirmation email
  ❌ No pipeline visibility (how many leads → quotes → bookings?)
  ❌ No aggregate conversion metrics
  ↓
CHEF RESPONDS (or doesn't)
  → Stale lead alert (MAI-841, built)
  → Quote reminder at 72h (built)
  ↓
BOOKING CONFIRMED
  → No chef retention / upsell hooks
```

### 1c. Funnel Metrics Table

| Stage | Metric | Current State | Gap |
|-------|--------|---------------|-----|
| Acquisition | Landing page visits | Unknown (no analytics) | No UTM/tracking |
| Acquisition | Service catalog visits | Unknown | No search visibility |
| Acquisition | Referral share clicks | 0 (schema exists) | No share mechanism |
| Activation | Inquiry → Quote rate | Unknown | No chef SLA visibility |
| Activation | Diner preferences completion | 0 diners completed | Never surfaced post-signup |
| Activation | Post-inquiry → Next action | Confirmation email only | No browse CTA, no preferences CTA |
| Retention | Quote → Payment rate | Unknown | No checkout abandonment recovery for leads |
| Retention | Repeat booking rate | 0 (too early) | No re-engagement for past diners |
| Referral | Referral codes generated | 0 | No post-booking share moment |
| Referral | Referral → Signup conversion | 0 | Code exists, never shared |

---

## 2. Prior Growth Work

| Feature | Issue | Status |
|---------|-------|--------|
| Corporate landing page | MAI-685 | ✅ Built |
| Diner confirmation email | MAI-751 | ✅ Built |
| Quote reminder email (72h) | MAI-795 | ✅ Built |
| Stale lead alert (chef dashboard) | MAI-841 | ✅ Built |
| Stale lead re-engagement email (diner) | MAI-845 | 🔄 In progress |
| Abandoned booking recovery email | MAI-703 | ✅ Built |
| Lead success page cross-sell | MAI-638 | ✅ Analyzed |
| Checkout trust signals | MAI-625 | ✅ Implemented |
| Referral tracking infrastructure | MAI-823 | ✅ Built (unused) |
| Diner preferences wizard | MAI-725 | ✅ Built (unsurfaced) |

**Pattern:** All email infrastructure is built and working. The gap is **activation** — diners are never prompted to complete preferences or share. Chef-side visibility (pipeline metrics) is also absent.

---

## 3. Three Highest-Impact Growth Experiments

### Experiment 1: Diner Preferences Wizard Trigger Post-Inquiry

**Hypothesis:**  
*If diners who submit an inquiry are immediately prompted to complete their preferences wizard within the confirmation email and on the booking status page, then more will complete it and receive personalized chef recommendations, because the context is fresh and the value is clear ("help us find your perfect chef").*

**Why this opportunity?**
1. The wizard is fully built but never shown to diners after signup
2. Post-inquiry is the highest-intent moment — diner just committed to exploring a private chef
3. Without preferences, the services catalog is a generic grid with no personalization
4. Personalization is a key differentiator vs. generic catering platforms
5. Low effort — update confirmation email + booking status page CTA

**Expected Impact:**
- **Activation rate:** 5-15% of inquiry-submitting diners complete preferences wizard (conservative estimate)
- **Downstream:** Diners with completed preferences get better matches → higher quote acceptance rate
- **Confidence:** Medium — wizard is built, just needs surfacing

**Effort:** Low (~1-2h, frontend + email copy update)

**Implementation Plan:**
1. **Confirmation email** (`diner-confirmation-email.ts`): Add a preferences CTA block after the inquiry summary: *"Tell us your taste preferences → Get personalized chef recommendations"*
2. **Booking status page** (`booking-status-page.ts`): Add a preferences completion banner if diner hasn't completed wizard
3. **Track** via `dinerWizardEvents` table — compare `wizard_complete` events before vs. after

**Testable Hypothesis (A/B if volume allows):**
- **Control:** Standard confirmation email
- **Variant A:** Add preferences CTA with value proposition ("Get personalized matches")
- **Variant B:** Add preferences CTA + show sample matched chefs

---

### Experiment 2: Post-Booking Referral Share Moment

**Hypothesis:**  
*If diners who complete a booking (confirmed status) see a "Share & Earn" prompt on the booking success page with their unique referral code and a one-click WhatsApp/email share, then some will share it and drive new diner signups, because the moment of satisfaction is the peak moment for advocacy and the friction is near-zero.*

**Why this opportunity?**
1. Referral infrastructure is fully built (`referral-tracking.ts` — codes generated on first booking, tracked on click)
2. Post-booking confirmation page is a natural advocacy moment (user is happy, booking is done)
3. Referral is the lowest-cost acquisition channel
4. Montreal private chef market is social/word-of-mouth driven
5. Zero incremental infrastructure needed — just surface what already exists

**Expected Impact:**
- **Referral share rate:** 3-8% of confirmed bookings generate ≥1 share click (typical for post-purchase referral)
- **Referral → Signup conversion:** 10-20% (warm referrals, high intent)
- **Confidence:** Medium-low — infrastructure exists but untested; depends on volume

**Effort:** Low (~2h, frontend only — add share UI to booking status page + success page)

**Implementation Plan:**
1. **Generate referral code** on lead when booking status transitions to `confirmed` (if not already set)
2. **Booking success page** (`booking-status-page.ts`): Show share card with referral code + WhatsApp/email copy pre-fill
3. **Track** via existing `referralSource` field on leads

**Referral copy:**
```
"I'm hosting a private chef dinner through Maison des Chefs — you should try it! Use my code [CODE] for [X% off/first booking discount]."
```

**Note:** Referral code on leads table requires DB migration (MAI-823 schema additions not yet migrated in production DB). Confirm migration is needed or work around by generating code dynamically.

---

### Experiment 3: Chef Lead Pipeline Summary on Dashboard

**Hypothesis:**  
*If chefs see a pipeline summary widget on their lead dashboard showing leads received, response rate, quote rate, and booking rate, then they will be more aware of their conversion funnel and more motivated to respond to new leads quickly, because visibility into "leads → quotes → bookings" creates accountability and urgency.*

**Why this opportunity?**
1. MAI-841 built the stale lead alert — this extends that with aggregate pipeline metrics
2. Chefs optimizing their response is the single biggest lever on diner experience (chef SLA is the #1 conversion factor)
3. Low effort — aggregate query + simple widget
4. Complements MAI-845 (stale lead email to diners) by addressing the chef-side root cause

**Expected Impact:**
- **Chef response rate:** +10-15% (estimated — pipeline visibility creates accountability)
- **Lead → Quote rate:** +5-10% (more responses = more quote opportunities)
- **Downstream:** Higher diner satisfaction, more repeat bookings
- **Confidence:** Medium — stale lead alert (MAI-841) was estimated at +15-20% response rate improvement; pipeline view extends that

**Effort:** Medium (~3h, backend aggregation query + frontend widget)

**Metrics to show:**
- Leads received (last 30 days)
- Response rate (% responded within 24h)
- Quote rate (% leads with quote sent)
- Booking rate (% quotes that converted)

**Implementation Plan:**
1. **Backend** (`src/api/chef-leads.ts`): Add `GET /api/chefs/me/pipeline-stats` endpoint
2. **Frontend** (`chef-leads-page.ts`): Add pipeline summary widget at top of dashboard
3. **Track** via comparing response rate before vs. after 30 days

---

## 4. Metrics to Track

| Experiment | Primary Metric | Secondary Metric | Target |
|------------|---------------|------------------|--------|
| Exp 1: Preferences Wizard Trigger | Wizard completion rate post-inquiry | Inquiry → Quote acceptance rate | >10% wizard completion, >5% quote acceptance lift |
| Exp 2: Post-Booking Referral | Referral codes generated | Referral → Signup rate | >3% share rate, >10% referral signup |
| Exp 3: Chef Pipeline Dashboard | Chef response rate (24h) | Lead → Quote rate, Quote → Booking rate | +15% response rate, +10% quote rate |

**Global Funnel Metrics (always-on):**
- Landing page visits (via UTM or page view count)
- Inquiry submission rate (leads / service page views)
- Quote acceptance rate (accepted / quoted leads)
- Checkout completion rate (bookings created / quotes accepted)
- Chef response SLA compliance (% leads responded within 24h)

---

## 5. Recommended Priority Order

| Priority | Experiment | Rationale |
|----------|-----------|-----------|
| 🔴 P1 | Exp 1: Preferences Wizard Trigger | Lowest effort, highest confidence, immediate activation lift |
| 🟡 P2 | Exp 2: Post-Booking Referral | Zero incremental infra, high upside for organic growth |
| 🟡 P2 | Exp 3: Chef Pipeline Dashboard | Motivates chef-side optimization, complements MAI-845 |
| 🟢 P3 | SEO for service catalog | Long-term acquisition play, deprioritized vs. activation |

**Note:** MAI-845 (stale lead re-engagement email) is already in flight. Once shipped, monitor quote rate from re-engaged leads to validate the stale lead hypothesis before building further retention sequences.

---

## 6. Why These > Other Options

| Option Considered | Why Deferred |
|------------------|--------------|
| Paid acquisition (Google Ads) | Too early — need product-market fit indicators first |
| SEO for catalog pages | High effort, long time-to-value; acquisition volume not the bottleneck yet |
| Multi-email re-engagement sequence | Volume too low to justify; MAI-845 is sufficient for now |
| SMS notifications | Twilio not configured; adds cost and complexity |
| Chef acquisition campaign | Chef supply is necessary but not the current constraint |

---

## 7. Related Work

| Issue | Focus | Status |
|-------|-------|--------|
| MAI-845 | Stale lead re-engagement email (diner) | 🔄 In progress |
| MAI-841 | Stale lead alert (chef dashboard) | ✅ Built |
| MAI-823 | Referral tracking infrastructure | ✅ Built |
| MAI-725 | Diner preferences wizard | ✅ Built |
| MAI-703 | Abandoned booking recovery | ✅ Built |
| MAI-795 | Quote reminder (72h) | ✅ Built |

---

*Growth Optimization — MAI-848 — Analyzed 2026-04-29*
