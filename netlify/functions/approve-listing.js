exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const { id, status, adminPassword } = JSON.parse(event.body || '{}');

    // Simple password protection
    if (adminPassword !== process.env.ADMIN_PASSWORD) {
      return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) };
    }

    if (!id || !['Approved', 'Rejected'].includes(status)) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Invalid request' }) };
    }

    const response = await fetch(`https://api.airtable.com/v0/appyNDNuwGFgR44sg/tblBt9FfVcrMK1aOs/${id}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${process.env.AIRTABLE_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        fields: { Status: status }
      })
    });

    if (!response.ok) {
      throw new Error('Airtable update failed');
    }

    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ success: true })
    };

  } catch (error) {
    console.error('Approve error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
