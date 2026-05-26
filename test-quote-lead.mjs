// Test script to create a quoted lead for MAI-2075 verification
// Uses raw SQL to avoid module resolution issues

import Database from 'better-sqlite3';
import { createHash, randomBytes } from 'crypto';

const db = new Database('./data/maison.db');

function generateQuoteToken() {
  return randomBytes(32).toString('hex');
}

function hashToken(token) {
  return createHash('sha256').update(token).digest('hex');
}

function main() {
  // Get first service with chef
  const service = db.prepare('SELECT id, chef_id FROM services LIMIT 1').get();

  if (!service) {
    console.log('No services found. Please create a service first.');
    return;
  }

  console.log('Using service:', service.id, 'chef:', service.chef_id);

  const quoteToken = generateQuoteToken();
  const quoteTokenHash = hashToken(quoteToken);
  const now = Math.floor(Date.now() / 1000);

  // Create a new lead with quoted status using raw SQL
  const result = db.prepare(`
    INSERT INTO leads (
      service_id, chef_id, client_name, email, phone, event_date, 
      guest_count, message, status, quote_amount, quote_message, 
      quote_sent_at, quote_token, quote_token_hash, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    service.id,
    service.chef_id,
    'Test Diner',
    'test@example.com',
    '+1234567890',
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    4,
    'Test inquiry for quote flow verification',
    'quoted',
    30000, // $300.00
    'Thank you for your interest! I would be delighted to cater your event.',
    now,
    quoteToken,
    quoteTokenHash,
    now
  );

  console.log('Created lead:', result.lastInsertRowid);
  console.log('Quote token:', quoteToken);
  console.log('');
  console.log('Test URL: http://localhost:3001/quote/' + result.lastInsertRowid + '?token=' + quoteToken);
}

main();
db.close();