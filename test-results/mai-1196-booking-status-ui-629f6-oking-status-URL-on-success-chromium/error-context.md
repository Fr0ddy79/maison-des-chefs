# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: mai-1196-booking-status-ui.spec.ts >> MAI-1196: Booking Status UI QA >> AC2: Service inquiry form shows booking status URL on success
- Location: tests/mai-1196-booking-status-ui.spec.ts:79:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator:  locator('#serviceInquiryModal')
Expected: visible
Received: hidden
Timeout:  5000ms

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for locator('#serviceInquiryModal')
    9 × locator resolved to <div class="modal-overlay" id="serviceInquiryModal">…</div>
      - unexpected value "hidden"

```

# Page snapshot

```yaml
- generic [ref=e1]:
  - navigation [ref=e2]:
    - link "Maison des Chefs" [ref=e3] [cursor=pointer]:
      - /url: /
    - generic [ref=e4]:
      - link "Services" [ref=e5] [cursor=pointer]:
        - /url: /services
      - link "Chefs" [ref=e6] [cursor=pointer]:
        - /url: /chefs
      - link "Sign In" [ref=e7] [cursor=pointer]:
        - /url: /auth/login
  - generic [ref=e8]:
    - heading "Discover Our Services" [level=1] [ref=e9]
    - paragraph [ref=e10]: From intimate dinners to grand celebrations, find the perfect private chef experience
  - generic [ref=e11]:
    - generic [ref=e12]:
      - generic [ref=e13]: "Quick filters:"
      - link "Under $100" [ref=e14] [cursor=pointer]:
        - /url: /services?maxPrice=100
      - link "$100-$150" [ref=e15] [cursor=pointer]:
        - /url: /services?minPrice=100&maxPrice=150
      - link "$150-$200" [ref=e16] [cursor=pointer]:
        - /url: /services?minPrice=150&maxPrice=200
      - link "$200+" [ref=e17] [cursor=pointer]:
        - /url: /services?minPrice=200
    - generic [ref=e18]:
      - generic [ref=e19]:
        - generic [ref=e20]: "Cuisine:"
        - combobox "Cuisine:" [ref=e21]:
          - option "All Cuisines" [selected]
          - option "French"
          - option "Italian"
          - option "Japanese"
          - option "Mexican"
          - option "Mediterranean"
          - option "Latin American"
          - option "French Fusion"
      - generic [ref=e22]:
        - generic [ref=e23]: "Price:"
        - spinbutton [ref=e24]
        - generic [ref=e25]: to
        - spinbutton [ref=e26]
        - generic [ref=e27]: /person
      - generic [ref=e28]:
        - generic [ref=e29]: "Sort by:"
        - combobox "Sort by:" [ref=e30]:
          - option "Newest" [selected]
          - option "Most Popular"
          - 'option "Price: Low to High"'
          - 'option "Price: High to Low"'
      - generic [ref=e31]:
        - generic [ref=e32]: "Date:"
        - textbox "Date:" [ref=e33]
      - generic [ref=e34]:
        - generic [ref=e35]: "Dietary:"
        - generic [ref=e36]:
          - generic [ref=e37] [cursor=pointer]:
            - checkbox "🥬 Vegetarian" [ref=e38]
            - text: 🥬 Vegetarian
          - generic [ref=e39] [cursor=pointer]:
            - checkbox "🌱 Vegan" [ref=e40]
            - text: 🌱 Vegan
          - generic [ref=e41] [cursor=pointer]:
            - checkbox "🌾 Gluten-Free" [ref=e42]
            - text: 🌾 Gluten-Free
          - generic [ref=e43] [cursor=pointer]:
            - checkbox "✓ Halal" [ref=e44]
            - text: ✓ Halal
          - generic [ref=e45] [cursor=pointer]:
            - checkbox "✡ Kosher" [ref=e46]
            - text: ✡ Kosher
          - generic [ref=e47] [cursor=pointer]:
            - checkbox "🥛 Dairy-Free" [ref=e48]
            - text: 🥛 Dairy-Free
          - generic [ref=e49] [cursor=pointer]:
            - checkbox "🥜 Nut-Free" [ref=e50]
            - text: 🥜 Nut-Free
      - link "Clear filters" [ref=e51] [cursor=pointer]:
        - /url: /services
  - generic [ref=e52]:
    - paragraph [ref=e53]: 1 service available
    - generic [ref=e55]:
      - link "🏆 Most Popular Dinner for 2 by Chef Marcel 4 inquiryies French 📍 Montreal 5 course $95/person 2-4 guests ⚪ New chef" [ref=e56] [cursor=pointer]:
        - /url: /services/1
        - generic [ref=e57]: 🏆 Most Popular
        - generic [ref=e59]:
          - heading "Dinner for 2" [level=3] [ref=e60]
          - paragraph [ref=e61]:
            - text: by Chef Marcel
            - generic [ref=e62]: 4 inquiryies
          - paragraph [ref=e63]: French
          - paragraph [ref=e64]: 📍 Montreal
          - paragraph [ref=e65]: 5 course
          - generic [ref=e66]:
            - generic [ref=e67]: $95/person
            - generic [ref=e68]: 2-4 guests
          - generic [ref=e69]: ⚪ New chef
      - generic [ref=e72] [cursor=pointer]: Compare
      - button "Inquire" [active] [ref=e74] [cursor=pointer]
  - contentinfo [ref=e75]:
    - generic [ref=e76]: Maison des Chefs
    - paragraph [ref=e77]: Montreal's premier private chef marketplace.
    - paragraph [ref=e78]: © 2024 Maison des Chefs. All rights reserved.
```

# Test source

```ts
  1   | /**
  2   |  * MAI-1196: QA Test for Booking Status UI (commit 2087ff1)
  3   |  *
  4   |  * Tests the service inquiry modal, booking status tracking, and chef bookings page UI.
  5   |  *
  6   |  * Run with: cd maison-des-chefs && npx playwright test tests/mai-1196-booking-status-ui.spec.ts
  7   |  * Or directly: node --loader tsx tests/mai-1196-booking-status-ui.spec.ts
  8   |  */
  9   | 
  10  | import { test, expect } from '@playwright/test';
  11  | 
  12  | const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
  13  | 
  14  | // ---------------------------------------------------------------------------
  15  | // Helper: create a test lead and return its access token
  16  | // ---------------------------------------------------------------------------
  17  | async function createTestLead(email: string, serviceId = 1) {
  18  |   const res = await fetch(`${BASE_URL}/api/inquiry`, {
  19  |     method: 'POST',
  20  |     headers: { 'Content-Type': 'application/json' },
  21  |     body: JSON.stringify({
  22  |       serviceId,
  23  |       clientName: 'QA Test Diner',
  24  |       email,
  25  |       phone: '+15551234567',
  26  |       eventDate: '2026-06-15',
  27  |       guestCount: 4,
  28  |       message: 'QA test inquiry',
  29  |     }),
  30  |   });
  31  |   const json = await res.json();
  32  |   return json.bookingStatusUrl as string;
  33  | }
  34  | 
  35  | // ---------------------------------------------------------------------------
  36  | // Test Suite
  37  | // ---------------------------------------------------------------------------
  38  | 
  39  | test.describe('MAI-1196: Booking Status UI QA', () => {
  40  | 
  41  |   // -------------------------------------------------------------------------
  42  |   // AC1: Service Inquiry Modal on /services page
  43  |   // -------------------------------------------------------------------------
  44  |   test('AC1: Services page has Inquire button and opens modal', async ({ page }) => {
  45  |     await page.goto(`${BASE_URL}/services`);
  46  | 
  47  |     // Look for the "Inquire" button added in commit 2087ff1
  48  |     const inquireBtn = page.locator('.card-inquire-btn').first();
  49  |     await expect(inquireBtn).toBeVisible();
  50  | 
  51  |     // Click the inquire button
  52  |     await inquireBtn.click();
  53  | 
  54  |     // Modal should open
  55  |     const modal = page.locator('#serviceInquiryModal');
  56  |     await expect(modal).toBeVisible();
  57  | 
  58  |     // Modal should have the form fields added in 2087ff1
  59  |     await expect(page.locator('#serviceInquiryServiceId')).toBeAttached();
  60  |     await expect(page.locator('#serviceInquiryClientName')).toBeVisible();
  61  |     await expect(page.locator('#serviceInquiryEmail')).toBeVisible();
  62  |     await expect(page.locator('#serviceInquiryPhone')).toBeVisible();
  63  |     await expect(page.locator('#serviceInquiryGuestCount')).toBeVisible();
  64  |     await expect(page.locator('#serviceInquiryEventDate')).toBeVisible();
  65  |     await expect(page.locator('#serviceInquiryMessage')).toBeVisible();
  66  |     await expect(page.locator('#serviceInquirySubmitBtn')).toBeVisible();
  67  | 
  68  |     // Modal header should say "Inquire About Service"
  69  |     await expect(page.locator('#serviceInquiryModal h2')).toContainText('Inquire About Service');
  70  | 
  71  |     // Close button should work
  72  |     await page.locator('.modal-close').click();
  73  |     await expect(modal).not.toBeVisible();
  74  |   });
  75  | 
  76  |   // -------------------------------------------------------------------------
  77  |   // AC2: Service inquiry form submission shows booking status URL
  78  |   // -------------------------------------------------------------------------
  79  |   test('AC2: Service inquiry form shows booking status URL on success', async ({ page }) => {
  80  |     await page.goto(`${BASE_URL}/services`);
  81  | 
  82  |     // Open the inquiry modal for first service
  83  |     await page.locator('.card-inquire-btn').first().click();
> 84  |     await expect(page.locator('#serviceInquiryModal')).toBeVisible();
      |                                                        ^ Error: expect(locator).toBeVisible() failed
  85  | 
  86  |     // Fill in the form
  87  |     const testEmail = `qa-test-${Date.now()}@test.com`;
  88  |     await page.locator('#serviceInquiryClientName').fill('QA Test Diner');
  89  |     await page.locator('#serviceInquiryEmail').fill(testEmail);
  90  |     await page.locator('#serviceInquiryPhone').fill('+15551234567');
  91  |     await page.locator('#serviceInquiryGuestCount').fill('4');
  92  |     await page.locator('#serviceInquiryEventDate').fill('2026-06-15');
  93  |     await page.locator('#serviceInquiryMessage').fill('QA test message');
  94  | 
  95  |     // Submit the form
  96  |     await page.locator('#serviceInquirySubmitBtn').click();
  97  | 
  98  |     // Wait for success state — modal should show success message with booking status URL
  99  |     // The success state was added in 2087ff1
  100 |     await expect(page.locator('.modal-success')).toBeVisible({ timeout: 10000 });
  101 |     await expect(page.locator('.modal-success h3')).toContainText('Inquiry Sent');
  102 | 
  103 |     // Booking status URL should be visible
  104 |     const statusUrlLink = page.locator('.status-url a');
  105 |     await expect(statusUrlLink).toBeVisible();
  106 |     const statusUrl = await statusUrlLink.getAttribute('href');
  107 |     expect(statusUrl).toMatch(/\/booking-status\?token=/);
  108 |   });
  109 | 
  110 |   // -------------------------------------------------------------------------
  111 |   // AC3: Booking status page shows 5-stage timeline
  112 |   // -------------------------------------------------------------------------
  113 |   test('AC3: Booking status page renders 5-stage timeline', async ({ page }) => {
  114 |     // Create a lead and get its booking status URL
  115 |     const statusUrl = await createTestLead(`qa-timeline-${Date.now()}@test.com`);
  116 |     expect(statusUrl).toMatch(/^\/booking-status\?token=/);
  117 | 
  118 |     // Navigate to booking status page
  119 |     await page.goto(`${BASE_URL}${statusUrl}`);
  120 | 
  121 |     // Should show the page title
  122 |     await expect(page.locator('h1')).toContainText('Booking Status');
  123 | 
  124 |     // Should show the 5-stage timeline (added in MAI-1014, present in 2087ff1)
  125 |     await expect(page.locator('.timeline')).toBeVisible();
  126 |     await expect(page.locator('.timeline-step')).toHaveCount(5);
  127 | 
  128 |     // All 5 stages should be present
  129 |     const timelineLabels = await page.locator('.timeline-label').allTextContents();
  130 |     expect(timelineLabels).toContain('Inquiry Sent');
  131 |     expect(timelineLabels).toContain('Awaiting Response');
  132 |     expect(timelineLabels).toContain('Quote Received');
  133 |     expect(timelineLabels).toContain('Payment');
  134 |     expect(timelineLabels).toContain('Confirmed');
  135 | 
  136 |     // Should show "What Happens Next" section
  137 |     await expect(page.locator('.next-steps-card')).toBeVisible();
  138 |   });
  139 | 
  140 |   // -------------------------------------------------------------------------
  141 |   // AC4: Booking status page shows event details
  142 |   // -------------------------------------------------------------------------
  143 |   test('AC4: Booking status page shows event details', async ({ page }) => {
  144 |     const statusUrl = await createTestLead(`qa-details-${Date.now()}@test.com`);
  145 |     await page.goto(`${BASE_URL}${statusUrl}`);
  146 | 
  147 |     // Should show event info
  148 |     await expect(page.locator('.event-title')).toBeVisible();
  149 |     await expect(page.locator('.event-chef')).toBeVisible();
  150 | 
  151 |     // Should show booking details grid
  152 |     await expect(page.locator('.booking-details')).toBeVisible();
  153 |     await expect(page.locator('.detail-label').filter({ hasText: 'Event Date' })).toBeVisible();
  154 |     await expect(page.locator('.detail-label').filter({ hasText: 'Number of Guests' })).toBeVisible();
  155 |     await expect(page.locator('.detail-label').filter({ hasText: 'Inquiry ID' })).toBeVisible();
  156 |   });
  157 | 
  158 |   // -------------------------------------------------------------------------
  159 |   // AC5: Booking status page shows booking status label
  160 |   // -------------------------------------------------------------------------
  161 |   test('AC5: Booking status page shows current status with visual styling', async ({ page }) => {
  162 |     const statusUrl = await createTestLead(`qa-status-${Date.now()}@test.com`);
  163 |     await page.goto(`${BASE_URL}${statusUrl}`);
  164 | 
  165 |     // Should show status banner with icon and label
  166 |     await expect(page.locator('.status-banner')).toBeVisible();
  167 |     await expect(page.locator('.status-icon')).toBeVisible();
  168 |     await expect(page.locator('.status-label')).toBeVisible();
  169 | 
  170 |     // For a "new" inquiry, label should be "Inquiry Received" or similar
  171 |     const statusText = await page.locator('.status-label').textContent();
  172 |     expect(statusText).toMatch(/Inquiry Received|Email|pending/i);
  173 |   });
  174 | 
  175 |   // -------------------------------------------------------------------------
  176 |   // AC6: Chef Bookings page (chef-bookings-page.ts) loads and shows accept/decline
  177 |   // -------------------------------------------------------------------------
  178 |   test('AC6: Chef bookings page renders with auth prompt or bookings list', async ({ page }) => {
  179 |     await page.goto(`${BASE_URL}/chef/bookings`);
  180 | 
  181 |     // Page should load
  182 |     await expect(page).toHaveTitle(/.*Chef.*Bookings.*|.*My Bookings.*/);
  183 | 
  184 |     // Should show navigation to other chef pages
```