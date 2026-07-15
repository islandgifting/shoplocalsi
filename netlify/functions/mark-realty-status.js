exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }
  try {
    const { recordId, code, newStatus } = JSON.parse(event.body || '{}');
    const token = process.env.AIRTABLE_TOKEN;

    if (!recordId || !code) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing recordId or code' }) };
    }

    const getRes = await fetch(`https://api.airtable.com/v0/appyNDNuwGFgR44sg/Realty/${recordId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const record = await getRes.json();
    if (!getRes.ok) return { statusCode: 404, body: JSON.stringify({ error: 'Listing not found' }) };

    if ((record.fields.RemovalCode || '').toUpperCase() !== code.toUpperCase()) {
      return { statusCode: 403, headers: corsHeaders(), body: JSON.stringify({ error: 'Incorrect code' }) };
    }

    const patchRes = await fetch(`https://api.airtable.com/v0/appyNDNuwGFgR44sg/Realty/${recordId}`, {
      method: 'PATCH',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields: { Status: newStatus || 'Sold' }, typecast: true })
    });
    if (!patchRes.ok) {
      const err = await patchRes.json();
      throw new Error(err.error?.message || 'Airtable update error');
    }

    return { statusCode: 200, headers: corsHeaders(), body: JSON.stringify({ success: true }) };
  } catch (error) {
    return { statusCode: 500, headers: corsHeaders(), body: JSON.stringify({ error: error.message }) };
  }
};

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };
}
