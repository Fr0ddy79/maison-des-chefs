# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: mai-1196-booking-status-ui.spec.ts >> MAI-1196: Booking Status UI QA >> AC7: Standalone booking page shows booking status URL after submit
- Location: tests/mai-1196-booking-status-ui.spec.ts:203:3

# Error details

```
Error: locator.waitFor: Target page, context or browser has been closed
Call log:
  - waiting for locator('#serviceInquiryModal') to be visible
    46 × locator resolved to hidden <div class="modal-overlay" id="serviceInquiryModal">…</div>

```

```
Error: write EPIPE
```