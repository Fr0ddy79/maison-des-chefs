# Task: Analytics Event Persistence (MAI-997)

**Owner:** Backend Engineer  
**Parent:** MAI-999 CEO Loop
**Priority:** P1  
**Status:** Ready  
**Created:** 2026-05-02

---

## Objective

Modify `src/api/analytics.ts` to persist analytics events to `data/analytics_events.jsonl` instead of only console-logging them.

## Problem Statement

The `POST /api/analytics/event` endpoint receives analytics events but only console-logs them in development. Events are never persisted, making it impossible to measure funnel performance (CTA click → booking form view → submission conversion).

## Implementation

In `src/api/analytics.ts`, after validating the event body:

```typescript
import { appendFileSync } from 'fs';
import { join } from 'path';

const logPath = join(process.cwd(), 'data', 'analytics_events.jsonl');
try {
  appendFileSync(logPath, JSON.stringify(body) + '\n');
} catch (err) {
  console.error('[Analytics] Failed to persist event:', err);
}
```

## Acceptance Criteria

- [ ] Events from `POST /api/analytics/event` are appended to `data/analytics_events.jsonl`
- [ ] File is created if it doesn't exist
- [ ] No errors if file write fails (fire-and-forget)
- [ ] Existing console.log behavior preserved for development

## Testing

```bash
curl -X POST http://localhost:3000/api/analytics/event \
  -H "Content-Type: application/json" \
  -d '{"event":"test_event","auth_status":"guest","timestamp":"2026-05-02T18:00:00Z"}'
```

Verify event appears in `data/analytics_events.jsonl`.

## Estimated Time

15 minutes

## Definition of Done

Backend Engineer marks complete when:
- Code change committed
- Event persistence verified via test curl
- No errors in server logs
