{\rtf1\ansi\ansicpg1252\cocoartf2870
\cocoatextscaling0\cocoaplatform0{\fonttbl\f0\fswiss\fcharset0 Helvetica;\f1\fnil\fcharset0 LucidaGrande;}
{\colortbl;\red255\green255\blue255;}
{\*\expandedcolortbl;;}
\margl1440\margr1440\vieww11520\viewh8400\viewkind0
\pard\tx720\tx1440\tx2160\tx2880\tx3600\tx4320\tx5040\tx5760\tx6480\tx7200\tx7920\tx8640\pardirnatural\partightenfactor0

\f0\fs24 \cf0 const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);\
\
exports.handler = async (event) => \{\
  if (event.httpMethod !== 'POST') \{\
    return \{ statusCode: 405, body: 'Method Not Allowed' \};\
  \}\
\
  try \{\
    const \{ plan \} = JSON.parse(event.body);\
\
    let priceId = null;\
\
    if (plan.toLowerCase().includes('featured') || plan.includes('$18')) \{\
      priceId = 'price_1TioIZIDdMLYVh4oq1PwgFFg'; // 
\f1 \uc0\u8592 
\f0  Replace later\
    \} else if (plan.toLowerCase().includes('premium') || plan.includes('$36')) \{\
      priceId = 'prod_UiEmdruv8uzXOV'; // 
\f1 \uc0\u8592 
\f0  Replace later\
    \}\
\
    if (!priceId) \{\
      return \{ statusCode: 400, body: JSON.stringify(\{ error: 'Invalid plan' \}) \};\
    \}\
\
    const session = await stripe.checkout.sessions.create(\{\
      payment_method_types: ['card'],\
      line_items: [\{ price: priceId, quantity: 1 \}],\
      mode: 'subscription',\
      success_url: 'https://yourdomain.com/success.html?session_id=\{CHECKOUT_SESSION_ID\}',\
      cancel_url: 'https://yourdomain.com/#advertise',\
    \});\
\
    return \{\
      statusCode: 200,\
      body: JSON.stringify(\{ sessionId: session.id \})\
    \};\
\
  \} catch (error) \{\
    return \{\
      statusCode: 500,\
      body: JSON.stringify(\{ error: error.message \})\
    \};\
  \}\
\};}