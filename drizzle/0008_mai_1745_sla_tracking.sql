-- MAI-1745: Add SLA tracking fields to leads table
-- inquiryReceivedAt: set on lead creation (now())
-- slaDeadlineAt: inquiryReceivedAt + 48 hours
-- slaCheckInSentAt: idempotency for SLA check-in email to chef
-- requestReceivedSentAt: idempotency for "Request Received" confirmation email to diner

ALTER TABLE leads ADD COLUMN inquiry_received_at integer;
ALTER TABLE leads ADD COLUMN sla_deadline_at integer;
ALTER TABLE leads ADD COLUMN sla_check_in_sent_at integer;
ALTER TABLE leads ADD COLUMN request_received_sent_at integer;