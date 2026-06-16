const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const { plan } = JSON.parse(event.body || '{}');
    const planLower = (plan || '').toLowerCase();

    let priceId = '';

    if (planLower.includes('featured')) {
      priceId = 'price_1TioHvIDdMLYVh4o7KeHpSwF';
    } else if (planLower.includes('premium')) {
      priceId = 'price_1TioIZIDdMLYVh4oq1PwgFFg';
    }

    if (!priceId) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Invalid or unsupported plan: ' + plan }) };
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      success_url: 'https://shoplocalsi.com/?payment=success',
      cancel_url: 'https://shoplocalsi.com/#advertise',
    });

    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ sessionId: session.id })
    };

  } catch (error) {
    console.error('Stripe error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
