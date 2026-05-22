-- MAI-1912: Allow NULL dinerId for anonymous guest reviews
-- Guest checkout users submit reviews without an account, so dinerId must be nullable
ALTER TABLE `reviews` ALTER COLUMN `diner_id` INTEGER NOT NULL; -- Error: cannot alter existing column in SQLite
-- Instead, we recreate the table with nullable dinerId

-- Create new reviews table with nullable diner_id
CREATE TABLE `reviews_new` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `chef_id` integer NOT NULL,
  `service_id` integer NOT NULL,
  `diner_id` integer, -- NULL for guest checkout reviews
  `booking_id` integer NOT NULL,
  `rating` integer NOT NULL,
  `comment` text,
  `created_at` integer NOT NULL,
  FOREIGN KEY (`chef_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
  FOREIGN KEY (`service_id`) REFERENCES `services`(`id`) ON UPDATE no action ON DELETE no action,
  FOREIGN KEY (`diner_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
  FOREIGN KEY (`booking_id`) REFERENCES `bookings`(`id`) ON UPDATE no action ON DELETE no action
);

-- Copy data from old table (diner_id is NOT NULL in old table, so all rows have values)
INSERT INTO `reviews_new` (`id`, `chef_id`, `service_id`, `diner_id`, `booking_id`, `rating`, `comment`, `created_at`)
SELECT `id`, `chef_id`, `service_id`, `diner_id`, `booking_id`, `rating`, `comment`, `created_at` FROM `reviews`;

-- Drop old table and rename new table
DROP TABLE `reviews`;
ALTER TABLE `reviews_new` RENAME TO `reviews`;

-- Recreate indexes
CREATE UNIQUE INDEX `reviews_booking_id_unique` ON `reviews` (`booking_id`);
CREATE INDEX `reviews_service_id_idx` ON `reviews` (`service_id`);