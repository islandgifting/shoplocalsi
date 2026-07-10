const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const fetch = require('node-fetch');

const BASE = 'appyNDNuwGFgR44sg';
const DIRECTORY_TABLE = 'Directory';
const ADS_TABLE = 'tblYxLfo3pgbpdlGS';

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  const sig = event.headers['stripe-signature'];
  let stripeEvent;

  try {
    stripeEvent = stripe.webhooks.constructEvent(
      event.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return { statusCode: 400, body: `Webhook Error: ${err.message}` };
  }

  if (stripeEvent.type !== 'checkout.session.completed') {
    // Not an event we care about — acknowledge and exit.
    return { statusCode: 200, body: JSON.stringify({ received: true }) };
  }

  const session = stripeEvent.data.object;
  const plan = (session.metadata && session.metadata.plan) || 'Featured'; // 'Featured' | 'Premium' | 'Coupon'
  const planType = plan.toLowerCase();
  const email = (session.customer_details && session.customer_details.email) || '';
  const token = process.env.AIRTABLE_TOKEN;

  if (!token) {
    console.error('AIRTABLE_TOKEN not set');
    return { statusCode: 500, body: JSON.stringify({ error: 'AIRTABLE_TOKEN not set' }) };
  }

  // Coupon plan doesn't need a Directory/Ads record — skip.
  if (planType === 'coupon') {
    return { statusCode: 200, body: JSON.stringify({ received: true }) };
  }

  try {
    // Create a placeholder Directory record (Status: Pending — won't show publicly
    // until the customer fills the info form and it flips to Active).
    const directoryRes = await fetch(`https://api.airtable.com/v0/${BASE}/${encodeURIComponent(DIRECTORY_TABLE)}`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fields: {
          Name: `Pending Setup — ${session.id.slice(-8)}`,
          Email: email,
          Status: 'Pending',
          Featured: planType === 'featured' || planType === 'premium',
          Premium: planType === 'premium'
        }
      })
    });
    const directoryData = await directoryRes.json();
    if (!directoryRes.ok) console.error('Directory create failed:', directoryData);

    // Create a placeholder Ads record (Status: Pending — get-ads.js only surfaces
    // Status === 'active' records, so this stays invisible until activated).
    const adsRes = await fetch(`https://api.airtable.com/v0/${BASE}/${ADS_TABLE}`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fields: {
          BusinessName: `Pending Setup — ${session.id.slice(-8)}`,
          Email: email,
          PlanType: plan,
          Status: 'Pending'
        }
      })
    });
    const adsData = await adsRes.json();
    if (!adsRes.ok) console.error('Ads create failed:', adsData);

    return {
      statusCode: 200,
      body: JSON.stringify({
        received: true,
        directoryId: directoryData.id || null,
        adsId: adsData.id || null
      })
    };
  } catch (error) {
    console.error('Webhook handler error:', error);
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};
