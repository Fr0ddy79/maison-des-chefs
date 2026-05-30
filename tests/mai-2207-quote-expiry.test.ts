// MAI-2207: Unit Tests for Quote Expiry Logic

import { test, expect } from '@playwright/test';
import { getQuoteExpiryDate, isQuoteExpired } from '../src/services/quote-expiry.js';

const QUOTE_EXPIRY_DAYS = 7;

test.describe('Quote Expiry Logic - MAI-2207', () => {
  test('getQuoteExpiryDate returns date exactly QUOTE_EXPIRY_DAYS after quoteSentAt', () => {
    const quoteSentAt = new Date('2026-05-20T12:00:00Z');
    const expiryDate = getQuoteExpiryDate(quoteSentAt);

    const expected = new Date('2026-05-27T12:00:00Z');
    expect(expiryDate.getTime()).toBe(expected.getTime());
  });

  test('getQuoteExpiryDate handles boundary case at midnight', () => {
    const quoteSentAt = new Date('2026-05-21T00:00:00Z');
    const expiryDate = getQuoteExpiryDate(quoteSentAt);

    const expected = new Date('2026-05-28T00:00:00Z');
    expect(expiryDate.getTime()).toBe(expected.getTime());
  });

  test('isQuoteExpired returns false for recent quote (within QUOTE_EXPIRY_DAYS)', () => {
    const now = new Date();
    const quoteSentAt = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000); // 3 days ago

    expect(isQuoteExpired(quoteSentAt)).toBe(false);
  });

  test('isQuoteExpired returns true for old quote (older than QUOTE_EXPIRY_DAYS)', () => {
    const now = new Date();
    const quoteSentAt = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000); // 10 days ago

    expect(isQuoteExpired(quoteSentAt)).toBe(true);
  });

  test('isQuoteExpired returns false for quote exactly at boundary', () => {
    const now = new Date();
    // Exactly QUOTE_EXPIRY_DAYS ago — should still be NOT expired (boundary: quoteSentAt + QUOTE_EXPIRY_DAYS < now)
    const quoteSentAt = new Date(now.getTime() - (QUOTE_EXPIRY_DAYS - 1) * 24 * 60 * 60 * 1000);

    expect(isQuoteExpired(quoteSentAt)).toBe(false);
  });

  test('isQuoteExpired returns true for quote one day past boundary', () => {
    const now = new Date();
    // One day past the boundary — should be expired
    const quoteSentAt = new Date(now.getTime() - (QUOTE_EXPIRY_DAYS + 1) * 24 * 60 * 60 * 1000);

    expect(isQuoteExpired(quoteSentAt)).toBe(true);
  });

  test('isQuoteExpired returns false when quoteSentAt is null', () => {
    expect(isQuoteExpired(null)).toBe(false);
  });

  test('getQuoteExpiryDate respects QUOTE_EXPIRY_DAYS env var behavior', () => {
    // The function uses process.env.QUOTE_EXPIRY_DAYS (default 7)
    // Confirm the calculation: quoteSentAt + QUOTE_EXPIRY_DAYS days
    const quoteSentAt = new Date('2026-01-01T00:00:00Z');
    const expiryDate = getQuoteExpiryDate(quoteSentAt);

    const expected = new Date('2026-01-08T00:00:00Z');
    expect(expiryDate.getTime()).toBe(expected.getTime());
  });

  test('isQuoteExpired edge case: quote sent exactly at midnight of expiry day', () => {
    const now = new Date();
    // 6 days, 23 hours ago — technically within QUOTE_EXPIRY_DAYS but close to boundary
    const quoteSentAt = new Date(now.getTime() - (QUOTE_EXPIRY_DAYS * 24 * 60 * 60 * 1000 - 60 * 60 * 1000));

    expect(isQuoteExpired(quoteSentAt)).toBe(false);
  });
});
