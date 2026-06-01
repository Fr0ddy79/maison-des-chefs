# Growth Strategy: Convert Waitlist to Launch List — MAI-2379

**Date:** 2026-06-01  
**Analyst:** Growth Marketer  
**Status:** Complete

---

## Executive Summary

The landing page waitlist has **47 email captures** from MAI-2301. This is a qualified early-access audience that needs nurturing to become engaged launch-day users. The key blocker is the placeholder Resend API key — without it, email confirmation is not possible.

---

## Current State Assessment

| Item | Status | Notes |
|------|--------|-------|
| Waitlist emails captured | ✅ 47 emails | Stored in `public.emails` table |
| Email confirmation on signup | ⛔ Blocked | RESEND_API_KEY is placeholder |
| Engagement sequence | 📋 To design | Needs strategy + implementation |
| A/B test coordination (MAI-2349) | 📋 To recommend | Booking form A/B test in progress |
| Early-access tier mechanics | 📋 To recommend | Future state, document now |

---

## 1. Email Engagement Sequence

### Sequence Overview

```
Day 0:  Welcome + instant confirmation (email #1)
Day 2:  "Behind the Scenes" teaser (email #2)
Day 5:  Feature spotlight + social proof (email #3)
Day 10: Early-access exclusive offer (email #4)
Launch: Grand opening announcement (email #5)
```

### Email #1 — Welcome + Confirmation
**Send:** Immediate (triggered on /api/subscribe success)  
**Subject:** "You're on the list! 🎉 Here's what to expect"  
**Purpose:** Set expectations, deliver instant value  
**Content:**
- Welcome message with personalized email capture timestamp
- Platform mission (1-2 sentences)
- What they'll learn: chef reveals, early access, exclusive offers
- Preview of upcoming content (tease email #2 topic)

### Email #2 — "Behind the Scenes" Teaser
**Send:** Day 2  
**Subject:** "Meet Chef Laurent — our first star"  
**Purpose:** Humanize the platform with chef story  
**Content:**
- Chef profile spotlight (one of the demo chefs)
- What makes this chef special
- Chef's signature dish or approach
- Link to chef listing page (drives re-engagement)

### Email #3 — Feature Spotlight + Social Proof
**Send:** Day 5  
**Subject:** "The private chef experience, deconstructed"  
**Purpose:** Build desire by explaining value  
**Content:**
- How the booking process works (step-by-step)
- What makes it different from restaurants
- Testimonial or review snippet from seed data
- Call to action: "Browse chefs" with tracked link

### Email #4 — Early-Access Exclusive Offer
**Send:** Day 10  
**Subject:** "Your exclusive early access — claim it now"  
**Purpose:** Convert waitlist to pre-launch bookings  
**Content:**
- Exclusive launch discount or perk for waitlist members
- Limited time window to create urgency
- Referral mechanic introduction (if implemented)
- Clear CTA: "Claim Early Access"

### Email #5 — Grand Opening
**Send:** Platform launch day  
**Subject:** "Maison des Chefs is open! [Chef Name] is available now"  
**Purpose:** Convert to first booking  
**Content:**
- Launch announcement
- Featured chef with availability
- Booking CTA with urgency

---

## 2. Confirmation Flow Specification

### Current Flow
```
User submits email → /api/subscribe → Stored in DB → Returns 201 success
                                                        ↓
                                              UI shows "Welcome to the Waitlist!"
```

### Improved Flow (requires Resend key)

```
User submits email → /api/subscribe → Stored in DB → Send confirmation email
                                                        ↓              ↓
                                                  Returns 201    Email #1 sent
                                                        ↓
                                              UI shows "Check your inbox!"
```

### Implementation: Add Email Confirmation to /api/subscribe

Add to `src/app/api/subscribe/route.ts`:

```typescript
import { sendWaitlistConfirmationEmail } from '@/lib/email/resend-waitlist'

// After successful DB insert, add:
if (data) {
  await sendWaitlistConfirmationEmail({
    email: data.email,
    signupDate: data.created_at,
  })
}
```

New file `src/lib/email/resend-waitlist.ts`:
```typescript
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM_EMAIL = 'Maison des Chefs <noreply@maison-des-chefs.com>'

interface SendWaitlistConfirmationParams {
  email: string
  signupDate: string
}

export async function sendWaitlistConfirmationEmail({
  email,
  signupDate,
}: SendWaitlistConfirmationParams): Promise<{ success: boolean; error?: string }> {
  // Graceful degradation
  if (!process.env.RESEND_API_KEY || process.env.RESEND_API_KEY === 'your_resend_api_key_here') {
    console.warn('[Email] RESEND_API_KEY not configured - skipping confirmation')
    return { success: true }
  }

  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: "You're on the list! 🎉 Here's what to expect",
      html: `
        <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #1a1a1a;">Welcome to Maison des Chefs!</h1>
          <p>You're now on the list for early access to Montreal's private chef marketplace.</p>
          <p><strong>What happens next?</strong></p>
          <ul>
            <li>We'll send you behind-the-scenes chef spotlights</li>
            <li>You'll get exclusive early access before we open to the public</li>
            <li>Waitlist members get special launch-day perks</li>
          </ul>
          <p style="color: #666; font-size: 14px; margin-top: 30px;">
            Signed up on: ${new Date(signupDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
        </div>
      `,
    })

    if (error) {
      console.error('[Email] Failed to send waitlist confirmation:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (err) {
    console.error('[Email] Error sending waitlist confirmation:', err)
    return { success: false, error: 'Unexpected error' }
  }
}
```

---

## 3. A/B Test Coordination with MAI-2349

### Current State
MAI-2349 is running an A/B test on the **booking form** (standard vs. simplified). This is a mid-funnel test for users who already have intent to book.

### Coordination Recommendations

| Test | Target | Status | Coordination Point |
|------|--------|--------|-------------------|
| MAI-2349 Booking Form | Booking submission rate | In review | Waitlist users who click through will hit this test |
| Hero CTA Copy | Click-through from landing page | Not started | Recommended in MAI-2366 — should coordinate timing |

### Recommended Test Sequence

**Phase 1 (Now → Launch):** Nurture the waitlist with emails 1-3 to drive engagement  
**Phase 2 (Pre-launch):** Add interest-signal capture to email #3 (see below)  
**Phase 3 (Launch +):** Track waitlist → booking conversion through MAI-2349 A/B test

### Interest Signal Capture (vs. Email-Only)

The issue asks to evaluate "interest signals vs. email-only capture." This applies to future campaigns, not the existing 47.

**Interest-signal approach:** Ask waitlist members to indicate interest in specific chef types, cuisines, or event types. This enables better matching at launch.

**Recommended email #3 variant test:**

| Variant | Content | Metric |
|---------|---------|--------|
| Control | Feature spotlight + CTA to browse chefs | Click-through to /chefs |
| Variant | Feature spotlight + interest survey (cuisine checkboxes) | Interest signal capture rate |

**Implementation note:** The `chef_date_waitlist` table already captures interest per service/date, but we need interest-per-cuisine for waitlist-level segmentation. Recommend adding a `email_interest_signals` table or extending the `emails` table with a preferences JSONB column.

---

## 4. Early-Access Tier Mechanics

### Tier Design

| Tier | Requirement | Benefit |
|------|-------------|---------|
| **Bronze** | Default waitlist | Early access, launch discount |
| **Silver** | Share with 1-2 friends | Priority booking, better discount |
| **Gold** | Share with 3+ friends | First access to new chefs, best discount |

### Referral Tracking Mechanics

**Minimum viable approach (no auth required):**
```
When user shares link: /?ref={base64_email}
  → New user signs up with ref param
  → Original user's referral_count increments
  → New user tagged with referrer
```

**Database changes needed:**
- Add `referred_by` column to `public.emails` table
- Add `referral_count` column to `public.emails` table

**Implementation is out of scope for this issue (labeled future) but should be documented for coordination.**

### Waitlist → Booking Funnel Tracking

| Stage | Metric | Current |
|-------|--------|---------|
| Waitlist captured | Count in `emails` table | 47 |
| Email opened | Open rate (Resend) | Unknown — needs Resend key |
| Click-through to /chefs | CTR from emails | Unknown — needs UTM tracking |
| Chef detail views | Analytics event | Needs implementation |
| Booking form started | MAI-2349 tracking | In progress |
| Booking submitted | MAI-2349 tracking | In progress |

---

## 5. Acceptance Criteria Verification

| Criteria | Status | Notes |
|----------|--------|-------|
| Waitlist emails captured and stored in Supabase | ✅ | 47 verified via MAI-2301 |
| Email confirmation sent on waitlist signup | ⛔ | Blocked by RESEND_API_KEY placeholder |
| Growth Marketer has plan for engagement sequence | ✅ | This document (emails #1-5) |
| Recommendations documented for A/B test coordination | ✅ | Section 3 above |

### Resend API Key Action Item

**Owner:** Fred  
**Action:** Replace `your_resend_api_key_here` in `.env.local` with actual Resend key  
**Impact:** Unblocks email confirmation + all future email sequence sends  
**Get key at:** https://resend.com

---

## 6. Metrics to Track

| Metric | Target | Current | Notes |
|--------|--------|---------|-------|
| Waitlist size | 47 → 75 by launch | 47 | Depends on landing page traffic |
| Email open rate | > 40% | N/A | Needs Resend |
| Email click-through | > 15% | N/A | Needs UTM params |
| Waitlist → /chefs visits | > 30% | N/A | Track with analytics |
| Waitlist → booking | > 5% | N/A | Track via MAI-2349 |

---

## 7. Next Steps

1. **Immediate (depends on Fred):** Configure Resend API key to enable email sends
2. **This week:** Implement confirmation email in /api/subscribe (1-2h)
3. **This week:** Build email sequence in Resend (3-5h)
4. **Pre-launch:** Add UTM tracking to email links for funnel attribution
5. **Post-launch:** Measure waitlist → booking conversion via MAI-2349 analytics

---

*Generated by Growth Marketer — MAI-2379*