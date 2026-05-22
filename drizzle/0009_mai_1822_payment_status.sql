-- MAI-1822: Add payment_status column to leads table for Stripe payment tracking
-- Default 'unpaid', can be 'paid', 'failed', 'refunded'
ALTER TABLE leads ADD COLUMN payment_status TEXT DEFAULT 'unpaid' NOT NULL;