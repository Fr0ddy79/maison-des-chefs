import Stripe from 'stripe';
import { config } from './index.js';

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

export function validateStripeConfig(): boolean {
  if (!STRIPE_SECRET_KEY) {
    console.warn('[Stripe] STRIPE_SECRET_KEY is not configured - payment processing will fail');
    return false;
  }
  if (STRIPE_SECRET_KEY === 'sk_live_...' || STRIPE_SECRET_KEY === 'sk_test_placeholder') {
    console.warn('[Stripe] STRIPE_SECRET_KEY appears to be a placeholder value - please set a real key');
    return false;
  }
  return true;
}

export function getStripeClient(): Stripe {
  if (!STRIPE_SECRET_KEY) {
    throw new Error('[Stripe] STRIPE_SECRET_KEY is not set - cannot initialize Stripe client');
  }
  if (config.nodeEnv === 'production' && (STRIPE_SECRET_KEY === 'sk_test_...' || STRIPE_SECRET_KEY === 'sk_test_placeholder')) {
    throw new Error('[Stripe] Test key detected in production mode - refusing to start');
  }
  return new Stripe(STRIPE_SECRET_KEY, {
    apiVersion: '2026-04-22.dahlia',
  });
}

export const stripe = getStripeClient();
