exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const { title, price, category, contact, description } = JSON.parse(event.body || '{}');

    if (!title || !category || !contact) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing required fields' }) };
    }

    const response = await fetch('https://api.airtable.com/v0/appyNDNuwGFgR44sg/tblBt9FfVcrMK1aOs', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.AIRTABLE_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        fields: {
          Title: title,
          Price: price || 'Contact for price',
          Category: category,
          Contact: contact,
          Description: description || '',
          Status: 'Pending',
          Submitted: new Date().toISOString().split('T')[0]
        }
      })
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error?.message || 'Airtable error');
    }

    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ success: true })
    };

  } catch (error) {
    console.error('Submit error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
