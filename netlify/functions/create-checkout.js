const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { plan } = JSON.parse(event.body);

    let priceId = null;

    if (plan.toLowerCase().includes('featured') || plan.includes('$18')) {
      priceId = 'price_1TioIZIDdMLYVh4oq1PwgFFg'; // ← Replace later
    } else if (plan.toLowerCase().includes('premium') || plan.includes('$36')) {
      priceId = 'prod_UiEmdruv8uzXOV'; // ← Replace later
    }

    if (!priceId) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Invalid plan' }) };
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      success_url: 'https://yourdomain.com/success.html?session_id={CHECKOUT_SESSION_ID}',
      cancel_url: 'https://yourdomain.com/#advertise',
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ sessionId: session.id })
    };

  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
