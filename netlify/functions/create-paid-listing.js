const fetch = require('node-fetch');

const BASE = 'appyNDNuwGFgR44sg';
const DIRECTORY_TABLE = 'Directory';
const ADS_TABLE = 'tblYxLfo3pgbpdlGS';

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: corsHeaders(), body: '' };
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: corsHeaders(), body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const token = process.env.AIRTABLE_TOKEN;
  if (!token) {
    return { statusCode: 500, headers: corsHeaders(), body: JSON.stringify({ error: 'AIRTABLE_TOKEN not set' }) };
  }

  try {
    const {
      plan, email, business_name, contact_name, phone, category,
      address, website, description
    } = JSON.parse(event.body || '{}');

    if (!business_name || !phone || !email) {
      return { statusCode: 400, headers: corsHeaders(), body: JSON.stringify({ error: 'Missing required fields' }) };
    }

    const planType = String(plan || 'Featured').toLowerCase();
    const isPremium = planType === 'premium';

    const directoryFields = {
      Name: business_name,
      Category: category || '',
      Phone: phone,
      Address: address || '',
      Description: description || '',
      Website: website || '',
      Email: email,
      Featured: true,
      Premium: isPremium,
      Status: 'Active'
    };

    const adsFields = {
      BusinessName: business_name,
      Description: description || '',
      Phone: phone,
      Email: email,
      Link: website || '',
      Address: address || '',
      Category: category || '',
      PlanType: isPremium ? 'Premium' : 'Featured',
      Status: 'Active'
    };

    // Find the placeholder record the Stripe webhook created for this email
    // (Status = Pending), and finish setting it up instead of creating a duplicate.
    const [directoryId, adsId] = await Promise.all([
      findAndFinalize(DIRECTORY_TABLE, token, email, directoryFields),
      findAndFinalize(ADS_TABLE, token, email, adsFields)
    ]);

    return {
      statusCode: 200,
      headers: corsHeaders(),
      body: JSON.stringify({ success: true, directoryId, adsId })
    };
  } catch (error) {
    console.error('create-paid-listing error:', error);
    return { statusCode: 500, headers: corsHeaders(), body: JSON.stringify({ error: error.message }) };
  }
};

async function findAndFinalize(table, token, email, fields) {
  const findUrl = `https://api.airtable.com/v0/${BASE}/${encodeURIComponent(table)}?filterByFormula=${encodeURIComponent(`AND({Email}='${email.replace(/'/g, "\\'")}',{Status}='Pending')`)}&maxRecords=1&sort[0][field]=Email`;
  const findRes = await fetch(findUrl, { headers: { 'Authorization': `Bearer ${token}` } });
  const findData = await findRes.json();

  if (findRes.ok && findData.records && findData.records.length) {
    const id = findData.records[0].id;
    const patchRes = await fetch(`https://api.airtable.com/v0/${BASE}/${encodeURIComponent(table)}/${id}`, {
      method: 'PATCH',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields })
    });
    const patchData = await patchRes.json();
    if (!patchRes.ok) console.error(`${table} patch failed:`, patchData);
    return id;
  }

  // No pending placeholder found (webhook may not have fired yet, or this is a
  // free/basic path) — create the record directly so the customer isn't blocked.
  const createRes = await fetch(`https://api.airtable.com/v0/${BASE}/${encodeURIComponent(table)}`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields })
  });
  const createData = await createRes.json();
  if (!createRes.ok) console.error(`${table} create failed:`, createData);
  return createData.id || null;
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };
}
