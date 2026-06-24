const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const { plan } = JSON.parse(event.body || '{}');
    const planLower = (plan || '').toLowerCase();

    // Basic is free
    if (planLower.includes('basic')) {
      return {
        statusCode: 200,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ redirect: '/#contact-form' })
      };
    }

    let priceId = '';
    let mode = 'subscription';
    let successPage = 'success.html';

    if (planLower.includes('featured') && !planLower.includes('business')) {
      priceId = 'price_1TioHvIDdMLYVh4o7KeHpSwF'; // $18/mo Featured (old)
      successPage = 'success.html?plan=Featured';
    } else if (planLower === 'featured' || planLower.includes('featured business') || planLower.includes('featuredbusiness')) {
      priceId = 'price_1TjqHpIDdMLYVh4ozAzwrUzX'; // $79/mo Featured Business
      successPage = 'success.html?plan=Featured';
    } else if (planLower.includes('premium') || planLower.includes('bundle')) {
      priceId = 'price_1TjqJTIDdMLYVh4oey44O6Il'; // $129/mo Premium/Bundle
      successPage = 'success.html?plan=Premium';
    } else if (planLower.includes('banner')) {
      priceId = 'price_1TjqGzIDdMLYVh4olYMxSAun'; // $99/mo Banner
      successPage = 'success.html?plan=Premium';
    } else if (planLower.includes('sponsored')) {
      priceId = 'price_1TjqHWIDdMLYVh4o5SU8U9rG'; // $49/mo Sponsored
      successPage = 'success.html?plan=Featured';
    } else if (planLower.includes('coupon')) {
      priceId = 'price_1Tksc2IDdMLYVh4o6WWoMaOa'; // $29/mo Coupon
      successPage = 'coupon-success.html';
    }

    if (!priceId) {
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
      discounts: [{ coupon: 'GRANDOPENING' }],
      success_url: `https://shoplocalsi.com/${successPage}`,
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
