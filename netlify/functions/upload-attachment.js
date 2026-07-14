const BASE = 'appyNDNuwGFgR44sg';

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
    const { table, recordId, fieldName, filename, contentType, file } = JSON.parse(event.body || '{}');

    if (!recordId || !fieldName || !filename || !contentType || !file) {
      return { statusCode: 400, headers: corsHeaders(), body: JSON.stringify({ error: 'Missing required fields' }) };
    }

    const tableId = table || 'Ads';

    const res = await fetch(
      `https://content.airtable.com/v0/${BASE}/${recordId}/${encodeURIComponent(fieldName)}/uploadAttachment`,
      {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ contentType, file, filename })
      }
    );

    const data = await res.json();
    if (!res.ok) {
      console.error('Attachment upload failed:', data);
      return { statusCode: res.status, headers: corsHeaders(), body: JSON.stringify({ error: data.error || 'Upload failed' }) };
    }

    return { statusCode: 200, headers: corsHeaders(), body: JSON.stringify({ success: true, data }) };
  } catch (error) {
    console.error('upload-attachment error:', error);
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
