-- MAI-1981: Stale Lead Re-engagement Email Sequence
-- Adds columns to track touch 2 and touch 3 sends for the 3-touch email re-engagement sequence

-- Touch 2 (Day 3) sent timestamp
ALTER TABLE leads ADD COLUMN stale_lead_reengagement_2_sent_at INTEGER;

-- Touch 3 (Day 7) sent timestamp
ALTER TABLE leads ADD COLUMN stale_lead_reengagement_3_sent_at INTEGER;