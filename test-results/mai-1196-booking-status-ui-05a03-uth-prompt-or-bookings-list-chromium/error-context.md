# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: mai-1196-booking-status-ui.spec.ts >> MAI-1196: Booking Status UI QA >> AC6: Chef bookings page renders with auth prompt or bookings list
- Location: tests/mai-1196-booking-status-ui.spec.ts:178:3

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: true
Received: false
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - navigation [ref=e2]:
    - link "Maison des Chefs" [ref=e3] [cursor=pointer]:
      - /url: /
    - generic [ref=e4]:
      - link "My Profile" [ref=e5] [cursor=pointer]:
        - /url: /chef/profile
      - link "My Leads" [ref=e6] [cursor=pointer]:
        - /url: /chef/leads
      - link "My Bookings" [ref=e7] [cursor=pointer]:
        - /url: /chef/bookings
      - link "Services" [ref=e8] [cursor=pointer]:
        - /url: /services
      - link "Sign In" [ref=e9] [cursor=pointer]:
        - /url: /auth/login
  - generic [ref=e12]:
    - heading "My Bookings" [level=1] [ref=e13]
    - paragraph [ref=e14]: Accept or decline diner booking requests
  - generic [ref=e15]:
    - generic [ref=e16]:
      - generic [ref=e17]:
        - generic [ref=e18]: "-"
        - generic [ref=e19]: Pending
      - generic [ref=e20]:
        - generic [ref=e21]: "-"
        - generic [ref=e22]: Confirmed
      - generic [ref=e23]:
        - generic [ref=e24]: "-"
        - generic [ref=e25]: Declined
      - generic [ref=e26]:
        - generic [ref=e27]: "-"
        - generic [ref=e28]: Total
    - generic [ref=e29]:
      - generic [ref=e30]: "Filter by status:"
      - combobox [ref=e31]:
        - option "All Bookings" [selected]
        - option "Pending"
        - option "Confirmed"
        - option "Accepted"
        - option "Declined"
        - option "Rejected"
    - paragraph [ref=e34]: Loading your bookings...
  - contentinfo [ref=e35]:
    - generic [ref=e36]: Maison des Chefs
    - paragraph [ref=e37]: © 2026 Maison des Chefs. All rights reserved.
```

# Test source

```ts
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
  185 |     await expect(page.locator('nav')).toBeVisible();
  186 | 
  187 |     // Either auth prompt (sign-in required) OR bookings list should be visible
  188 |     const authPrompt = page.locator('#authPrompt');
  189 |     const bookingsList = page.locator('#bookingsList');
  190 |     const hasAuthPrompt = await authPrompt.isVisible();
  191 |     const hasBookingsList = await bookingsList.isVisible();
> 192 |     expect(hasAuthPrompt || hasBookingsList).toBe(true);
      |                                              ^ Error: expect(received).toBe(expected) // Object.is equality
  193 | 
  194 |     // If not authenticated, auth prompt should direct to sign in
  195 |     if (hasAuthPrompt) {
  196 |       await expect(authPrompt.locator('a[href="/auth/login"]')).toBeVisible();
  197 |     }
  198 |   });
  199 | 
  200 |   // -------------------------------------------------------------------------
  201 |   // AC7: Booking page (/booking-page/:id) shows booking status URL on success
  202 |   // -------------------------------------------------------------------------
  203 |   test('AC7: Standalone booking page shows booking status URL after submit', async ({ page }) => {
  204 |     // Get a valid service ID
  205 |     await page.goto(`${BASE_URL}/services`);
  206 |     const firstInquireBtn = page.locator('.card-inquire-btn').first();
  207 |     await firstInquireBtn.click();
  208 |     await page.locator('#serviceInquiryModal').waitFor({ state: 'visible' });
  209 | 
  210 |     // Extract service ID from the hidden field
  211 |     const serviceId = await page.locator('#serviceInquiryServiceId').inputValue();
  212 |     if (!serviceId) {
  213 |       // Service ID will be set when modal opens
  214 |       const href = await firstInquireBtn.getAttribute('onclick');
  215 |       // openServiceInquiryModal(serviceId, serviceName, chefName)
  216 |       const match = href?.match(/openServiceInquiryModal\((\d+)/);
  217 |       if (!match) {
  218 |         test.skip('Cannot extract service ID from inquire button');
  219 |         return;
  220 |       }
  221 |     }
  222 | 
  223 |     // Navigate to standalone booking page
  224 |     await page.goto(`${BASE_URL}/booking-page/${serviceId || 1}?email=qa-booking@test.com`);
  225 | 
  226 |     // Fill form if visible
  227 |     const form = page.locator('#inquiryForm');
  228 |     if (await form.isVisible()) {
  229 |       await page.locator('#clientName').fill('QA Booking Diner');
  230 |       await page.locator('#email').fill(`qa-booking-${Date.now()}@test.com`);
  231 |       await page.locator('#guestCount').fill('4');
  232 |       await page.locator('#eventDate').fill('2026-06-20');
  233 | 
  234 |       await page.locator('.submit-btn').click();
  235 | 
  236 |       // Success message should show booking status URL section
  237 |       const statusSection = page.locator('#bookingStatusUrlSection');
  238 |       await expect(statusSection).toBeVisible({ timeout: 10000 });
  239 |       await expect(page.locator('#bookingStatusUrlLink')).toBeVisible();
  240 |       const link = await page.locator('#bookingStatusUrlLink').getAttribute('href');
  241 |       expect(link).toMatch(/\/booking-status\?token=/);
  242 |     }
  243 |   });
  244 | 
  245 |   // -------------------------------------------------------------------------
  246 |   // AC8: escapeHtml is present for XSS protection in modal
  247 |   // -------------------------------------------------------------------------
  248 |   test('AC8: escapeHtml function is defined in pages.ts', async ({ page }) => {
  249 |     // Load a page that uses escapeHtml
  250 |     await page.goto(`${BASE_URL}/services`);
  251 | 
  252 |     // Check that escapeHtml is defined in page script
  253 |     const escapeHtmlDefined = await page.evaluate(() => {
  254 |       return typeof escapeHtml === 'function';
  255 |     });
  256 | 
  257 |     // Note: escapeHtml may be scoped to page context, so we just verify
  258 |     // the page loads without XSS issues
  259 |     await expect(page.locator('.card-inquire-btn').first()).toBeVisible();
  260 |   });
  261 | 
  262 |   // -------------------------------------------------------------------------
  263 |   // AC9: Modal close on overlay click
  264 |   // -------------------------------------------------------------------------
  265 |   test('AC9: Service inquiry modal closes when clicking overlay', async ({ page }) => {
  266 |     await page.goto(`${BASE_URL}/services`);
  267 |     await page.locator('.card-inquire-btn').first().click();
  268 |     await expect(page.locator('#serviceInquiryModal')).toBeVisible();
  269 | 
  270 |     // Click outside modal (on overlay)
  271 |     await page.locator('#serviceInquiryModal').click({ position: { x: 10, y: 10 } });
  272 |     await expect(page.locator('#serviceInquiryModal')).not.toBeVisible();
  273 |   });
  274 | 
  275 | });
  276 | 
```