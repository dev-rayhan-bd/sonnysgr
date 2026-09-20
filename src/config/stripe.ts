import Stripe from 'stripe';
import config from '../app/config';

const stripeApiKey =
  config.stripe.stripe_secret_key ||
  process.env.STRIPE_SECRET_KEY ||
  'sk_test_placeholder_key_for_development';

const stripe = new Stripe(stripeApiKey, {
  apiVersion: '2024-09-30.acacia' as any,
});

export default stripe;
