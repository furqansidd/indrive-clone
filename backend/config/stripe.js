const stripe = require('stripe');

if (!process.env.STRIPE_SECRET_KEY) {
  console.warn('WARNING: STRIPE_SECRET_KEY is not defined in the environment variables.');
}

const stripeClient = stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_mock_placeholder_key');

module.exports = stripeClient;
