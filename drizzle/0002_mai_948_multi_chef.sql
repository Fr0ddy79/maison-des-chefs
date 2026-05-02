-- MAI-948: Multi-chef inquiry tracking
ALTER TABLE `leads` ADD `inquiry_type` text NOT NULL DEFAULT 'single';
ALTER TABLE `leads` ADD `multi_inquiry_id` text;

CREATE INDEX IF NOT EXISTS `leads_multi_inquiry_id_idx` ON `leads` (`multi_inquiry_id`);