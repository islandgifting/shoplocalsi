const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const { plan } = JSON.parse(event.body || '{}');
    const planLower = (plan || '').toLowerCase();

    // Basic is free — redirect to form
    if (planLower.includes('basic')) {
      return {
        statusCode: 200,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ redirect: '/#contact-form' })
      };
    }

    let priceId = '';
    let mode = 'subscription';

    if (planLower.includes('featured') && !planLower.includes('business')) {
      priceId = 'price_1TioHvIDdMLYVh4o7KeHpSwF'; // $18/mo Featured
    } else if (planLower.includes('premium')) {
      priceId = 'price_1TioIZIDdMLYVh4oq1PwgFFg'; // $36/mo Premium
    } else if (planLower.includes('banner')) {
      priceId = process.env.PRICE_BANNER || ''; // $99/mo Banner
    } else if (planLower.includes('sponsored')) {
      priceId = process.env.PRICE_SPONSORED || ''; // $49/mo Sponsored
    } else if (planLower.includes('featuredbusiness')) {
      priceId = process.env.PRICE_FEATURED_BIZ || ''; // $79/mo Featured Business
    } else if (planLower.includes('bundle')) {
      priceId = process.env.PRICE_BUNDLE || ''; // $129/mo Bundle
    }

    if (!priceId) {
      // No price ID set yet — redirect to contact form
      return {
        statusCode: 200,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ redirect: '/#contact-form' })
      };
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      mode,
      success_url: 'https://shoplocalsi.com/?payment=success',
      cancel_url: 'https://shoplocalsi.com/#advertise',
    });

    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ sessionId: session.id })
    };

  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};
