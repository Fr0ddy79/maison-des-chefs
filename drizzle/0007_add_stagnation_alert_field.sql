-- MAI-1548: Booking Stagnation Alert — add stagnation_alert_sent_at column
-- This column tracks when we sent the proactive alert to the diner
-- so we only send ONE alert per booking (idempotency)

ALTER TABLE `bookings` ADD `stagnation_alert_sent_at` integer;