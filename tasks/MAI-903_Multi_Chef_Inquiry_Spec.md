# MAI-903: Multi-Chef Inquiry — Specification

## Goal
Allow diners to send a single inquiry to **multiple chefs at once** from the chef discovery page. This reduces friction for diners comparing options and increases lead volume for chefs.

## Success Metric
- Submit one form → N leads created (one per selected chef/service)
- Each chef receives a separate lead notification email
- Diner receives one confirmation email listing all selected chefs

## Current State
- `/book/:serviceId` — single-service booking page (one lead per submission)
- `/inquiry` POST — creates one lead, sends one confirmation email
- Chef discovery page at `/chefs` shows chefs but each "Book" card goes to single-service booking

## Task Breakdown

### 1. API: Batch Inquiry Endpoint
**File:** `src/api/multi-inquiry.ts` (new)

**Endpoint:** `POST /api/multi-inquiry`

**Request body:**
```json
{
  "serviceIds": [1, 2, 3],          // array of service IDs (1-10 max)
  "clientName": "string",
  "email": "string (required)",
  "phone": "string (optional)",
  "eventDate": "string (optional, ISO date)",
  "guestCount": 4,
  "message": "string (optional)"
}
```

**Response:**
```json
{
  "success": true,
  "leadIds": [101, 102, 103],       // one per service
  "message": "Inquiries submitted to N chefs"
}
```

**Validation:**
- `serviceIds`: required, array of 1-10 integers, all must exist
- `email`: required, valid email
- `guestCount`: optional, min 1
- At least one valid serviceId required

**Behavior:**
- Creates N leads (one per serviceId)
- Each lead is independent (different chefId, serviceId)
- Uses same lead fields as single inquiry
- Sets diner recognition cookies
- Returns partial success if some serviceIds fail (don't create partial leads)

### 2. Email: Multi-Chef Confirmation
**File:** `src/services/diner-confirmation-email.ts`

Add `sendMultiChefConfirmationEmail` function:
- Input: array of `{leadId, chefName, serviceName, eventDate, guestCount}` + diner info
- Sends ONE email listing all selected chefs/services
- Uses the first lead's booking status URL (shared token)
- If leads have different chefs, still sends single grouped email

### 3. Frontend: Multi-Chef Selection UI
**File:** `src/routes/chef-discovery-page.ts`

**Changes:**
- Add checkbox to each chef card (left of photo or on card)
- "Select chefs for inquiry" counter in header (e.g., "3 chefs selected")
- Floating "Send Inquiry" button appears when ≥1 selected
- Click opens modal/inquiry form
- Form pre-fills selected serviceIds as hidden inputs
- Submit → `POST /api/multi-inquiry`

**UI States:**
- Default: checkboxes hidden or subtle
- Selection mode: checkboxes visible, counter shown
- Form open: modal with name/email/phone/date/guests/message
- Submitting: loading state
- Success: success message with list of chefs contacted

### 4. Booking Page Update
**File:** `src/routes/booking-page.ts`

**Changes:**
- Accept optional `serviceIds` query param (JSON array) for multi-chef
- If multiple services → use multi-inquiry flow
- Single serviceId continues to use existing `/api/inquiry`

## Data Flow

```
Diner selects Chef A + Chef B on /chefs
  → clicks "Send Inquiry" 
  → modal form opens
  → submits: POST /api/multi-inquiry { serviceIds: [svcA, svcB], ... }
    → API validates all serviceIds
    → Creates lead for Chef A (chefId A, serviceId A)
    → Creates lead for Chef B (chefId B, serviceId B)
    → Creates shared access token (or reuse first lead's token)
    → sendMultiChefConfirmationEmail([{leadA, chefA}, {leadB, chefB}])
    → Sets diner cookies
    → Returns { leadIds: [A, B], ... }
  → Frontend shows success with list of chefs
```

## Implementation Notes

1. **No database schema changes needed** — reuse existing `leads` table, one row per chef inquiry
2. **Email batching** — send one email per diner (not one per chef), listing all selections
3. **Error handling** — if 3 of 5 serviceIds are invalid, return error (don't create partial leads)
4. **Analytics** — track `multi_chef_inquiry_submit` event with `chef_count`
5. **Access token** — reuse first lead's access token for booking status URL

## Constraints
- Max 10 chefs per inquiry (prevent abuse)
- Must be logged in? No — guest checkout supported
- Same event date/guests for all selected chefs (simplicity)
- Single message to all selected chefs (same message)

## Acceptance Criteria

- [ ] `POST /api/multi-inquiry` creates N leads with valid input
- [ ] `POST /api/multi-inquiry` returns 400 for invalid serviceIds
- [ ] Diner receives ONE confirmation email listing all selected chefs
- [ ] Each chef sees their own lead in dashboard (not others')
- [ ] Chef discovery page shows checkbox selection UI
- [ ] Selected chef count appears in header
- [ ] "Send Inquiry" button appears when chefs selected
- [ ] Modal form submits to multi-inquiry endpoint
- [ ] Success state shows list of chefs contacted
- [ ] Works alongside existing single-service booking page

## Files to Modify
1. `src/api/multi-inquiry.ts` — new
2. `src/services/diner-confirmation-email.ts` — add multi-chef email
3. `src/routes/chef-discovery-page.ts` — add selection UI
4. `src/routes/booking-page.ts` — add multi-service support
5. `src/server.ts` — register new route