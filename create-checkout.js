const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const SITE_URL = (process.env.URL || process.env.DEPLOY_PRIME_URL || 'https://www.shoplocalsi.com').replace(/\/$/, '');

const PLANS = {
  featured: { priceId: 'price_1TjqVIIDdMLYVh4oSlXr1DPM', label: 'Featured', successPath: '/success.html?plan=Featured' },
  premium: { priceId: 'price_1TjqJTIDdMLYVh4oey44O6Il', label: 'Premium', successPath: '/success.html?plan=Premium' },
  bundle: { priceId: 'price_1TjqJTIDdMLYVh4oey44O6Il', label: 'Premium', successPath: '/success.html?plan=Premium' },
  coupon: { priceId: 'price_1Tksc2IDdMLYVh4o6WWoMaOa', label: 'Coupon', successPath: '/coupon-success.html?plan=Coupon' }
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: corsHeaders(), body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers: corsHeaders(), body: JSON.stringify({ error: 'Method not allowed' }) };

  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return { statusCode: 500, headers: corsHeaders(), body: JSON.stringify({ error: 'Missing STRIPE_SECRET_KEY in Netlify environment variables.' }) };
    }

    const { plan } = JSON.parse(event.body || '{}');
    const key = String(plan || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const selected = PLANS[key];

    if (!selected) {
      return { statusCode: 400, headers: corsHeaders(), body: JSON.stringify({ error: 'Unknown plan. Use featured, premium, bundle, or coupon.' }) };
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: selected.priceId, quantity: 1 }],
      success_url: `${SITE_URL}${selected.successPath}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${SITE_URL}/advertise.html`,
      metadata: { plan: selected.label, source: 'shoplocalsi-advertise-page' },
      subscription_data: { metadata: { plan: selected.label, source: 'shoplocalsi-advertise-page' } }
    });

    return { statusCode: 200, headers: corsHeaders(), body: JSON.stringify({ sessionId: session.id }) };
  } catch (error) {
    return { statusCode: 500, headers: corsHeaders(), body: JSON.stringify({ error: error.message }) };
  }
};

function corsHeaders(){
  return {
    'Access-Control-Allow-Origin':'*',
    'Access-Control-Allow-Headers':'Content-Type',
    'Access-Control-Allow-Methods':'POST, OPTIONS',
    'Content-Type':'application/json'
  };
}
