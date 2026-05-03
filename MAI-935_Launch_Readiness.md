# MAI-935 — Growth: Launch Readiness
## Email Capture & Social Proof Package

---

## TASK 1: Email Waitlist / Launch Capture

### Design Spec

**Placement:** Hero section overlay OR sticky footer banner (two variants for A/B)

**Layout - Hero Modal:**
```
┌─────────────────────────────────────────────┐
│  [X]                                        │
│                                             │
│     🍽️  Be the first to book a             │
│         private chef in Montreal            │
│                                             │
│     Join the waitlist — get early access    │
│     when we launch:                         │
│                                             │
│     [ __________________@email.com__ ]      │
│     [______Notify Me at Launch______]       │
│                                             │
│     🔒 No spam. Ever. Just good food.       │
└─────────────────────────────────────────────┘
```

**Layout - Sticky Footer Banner:**
```
┌──────────────────────────────────────────────────────────┐
│  [x]  Be the first in Montreal to book a private chef → [ Enter email ] [ Join Waitlist ]
```

**Input Field:** Email only (minimize friction)
**CTA Button:** "Notify Me at Launch" (hero) / "Join Waitlist" (footer)
**Success State:**
```
✓ You're on the list! We'll email you the moment we launch.
```
**Error State:**
```
⚠ Please enter a valid email address.
```
**Duplicate Email:**
```
✓ You're already on the list — we haven't forgotten you!
```

---

### Copy Variants

**Primary:**
> Be the first to book a private chef in Montreal

**Alternates for A/B:**
- "Your personal chef is coming. Join the waitlist."
- "Montreal deserves better dining. Be first to book." → [ See similar work on MAI-917 Landing Page CTA AB Test for the pattern we used for the email capture button. ]
- "Private chefs. Amazing dinners. Montreal."
- "Skip the restaurant. Enjoy the home chef." — the footer variant uses "Join Waitlist"

**Follow-up post-signup:**
> Subject: You're on the list! 🎉
> Body: "You're officially on the list. We'll email you the moment we launch in Montreal."

Follow-up email: Yes, send a confirmation email to reduce anxiety and build trust. Also track "subscribed_at" so we can timestamp it for email service integration.

- [x] Email capture flow design ready
- [x] Clear value proposition for diners
- [x] Redirect URL or confirmation message — **Confirmation state** is in-page, no redirect needed.

---

## TASK 2: Social Proof Package

### 3 Ideal Chef Profiles

**Chef 1 — The French-Canadian Specialist**
> **Name:** Marie-Claire Fontaine
> **Location:** Mile End, Montreal
> **Cuisine:** French-Canadian fusion
> **Bio:** Former chef at Le Bremner. Passionate about local, seasonal ingredients and turning dinner into an experience.
> **Specialties:** game meat, foraged mushrooms, Quebec craft beer pairings
> **Price Range:** $95/person
> **Demo Quote:** "I don't just cook for people — I cook *with* them. Every dinner is a collaboration."

**Chef 2 — The Global Entertainer**
> **Name:** Alejandro Reyes
> **Location:** Griffintown, Montreal
> **Cuisine:** Latin American fusion (Mexican, Peruvian, Brazilian)
> **Bio:** 12 years cooking across Mexico City, Lima, and São Paulo. Now based in Montreal, bringing bold flavors to private dinners.
> **Specialties:** ceviche bar, tacos al pastor made fresh, live ceviche prep
> **Price Range:** $80/person
> **Demo Quote:** "The best meals are the ones where guests never knew they could travel without leaving the dining room."

**Chef 3 — The Intimate Italian Nonna**
> **Name:** Giulia Moretti
> **Location:** Little Italy, Montreal
> **Cuisine:** Northern Italian (Lombardia/Piedmont)
> **Bio:** Trained in Milan, brought grandmother's recipes to Montreal. Every pasta is hand-rolled, every sauce is patient.
> **Specialties:** fresh pasta workshops, truffle risotto, tiramisu made to order
> **Price Range:** $75/person
> **Demo Quote:** "My grandmother taught me that the secret ingredient is always time. I bring that to every table."

---

### 2-3 Testimonial Drafts

**Testimonial 1 — Dinner Party Host**
> "We hosted a small dinner party for 8 people last month — and honestly, I was nervous. But Chef Marie-Claire arrived early, had everything planned, and the evening just... flowed. The duck was unreal. My guests still talk about it.
> **— Sophie T., Westmount** (Dinner for 8, December 2025)

**Testimonial 2 — Anniversary Surprise**
> "I wanted to surprise my wife for our anniversary but the restaurant options felt so... impersonal. Found Maison des Chefs, booked Chef Giulia, and she created this incredible Italian tasting menu in our own apartment. We felt like we were in Milan.
> **— Marc-Andre L., Outremont** (Anniversary dinner for 2, January 2026)

**Testimonial 3 — Corporate Team Event**
> "We use private chefs for our quarterly team dinners — it's become our thing. Chef Alejandro did a full ceviche bar for 12 people last month and it was the perfect way to bring the team together. Way better than a conference room pizza party.
> **— Jennifer K., HR Lead at a Montreal tech startup** (Team dinner for 12, February 2026)

---

### 2 Social Media Post Templates

**Post 1 — Instagram/Facebook (Launch Announcement)**
```
🍽️ Your kitchen. A private chef. Montreal's best dining experience — coming soon.

Skip the reservations. Skip the crowds. 

With Maison des Chefs, the city's top private chefs come to YOU.

👨‍🍳 Join the waitlist → link in bio
#PrivateChef #MontrealFood #DinnerParty #AtHomeDining
```

**Post 2 — Instagram/Facebook (Countdown/Teaser)**
```
Montreal deserves better dining.

So we're building it.

Maison des Chefs connects you with verified private chefs for your next dinner, party, or special night.

📍Launching soon in Montreal
👉 Drop your email in the comments or DM us to get early access!
#MontrealEats #PrivateChef #FoodLovers #DinnerPartyGoals
```

---

### Platform Blurb (Press/Outreach) — 150 words

**Maison des Chefs: Your Personal Chef, Your Montreal Home**

Maison des Chefs is a two-sided marketplace connecting Montreal diners with verified private chefs for premium at-home dining experiences. Whether it's an intimate anniversary dinner, a lively dinner party for twelve, or a corporate team gathering, Maison des Chefs makes booking a personal chef as easy as booking a table — but the experience is nothing like a restaurant.

Chefs create profiles, list their services, and set their own pricing. Diners browse, discover, and book directly. Every chef is vetted, and every booking is handled through the platform.

Currently in pre-launch with an active waitlist. Targeting Montreal market for initial rollout.

**Word count: 96** (under 150 — good for press releases)

---

## TASK 3: Outreach List (Spreadsheet)

See `MAI-935_Outreach_List.csv` — contains:
- Food bloggers/journalists in Montreal
- Instagram food influencers (10-20)
- Event planners / wedding coordinators
- Corporate HR contacts for team events

20+ targets with: name, contact, platform, audience size, notes

---

## Definition of Done

- [x] Email capture flow design document
- [x] Clear value proposition for diners
- [x] Confirmation message (in-page, no redirect)
- [x] 3 chef profile pitches (with demo data)
- [x] 2-3 testimonial drafts
- [x] 2 social media post templates
- [x] 1 platform description paragraph (96 words — under 150)
- [x] Spreadsheet with 20+ outreach targets

**Outputs:**
- `MAI-935_Launch_Readiness.md` — This document (email capture design + social proof package)
- `MAI-935_Outreach_List.csv` — Outreach targets spreadsheet