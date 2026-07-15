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
    const { table, recordId, fieldName, filename, contentType, file, url } = JSON.parse(event.body || '{}');

    if (!recordId || !fieldName || !filename || (!file && !url)) {
      return { statusCode: 400, headers: corsHeaders(), body: JSON.stringify({ error: 'Missing required fields' }) };
    }

    const tableId = table || 'Ads';
    let fileB64 = file;
    let finalContentType = contentType;

    // If a hosted URL was given instead of raw base64, fetch it server-side.
    // This avoids the ~6MB request-body limit that raw client-side base64 uploads can hit
    // (this is what was silently dropping large homepage banner images).
    if (!fileB64 && url) {
      const srcRes = await fetch(url);
      if (!srcRes.ok) {
        return { statusCode: 502, headers: corsHeaders(), body: JSON.stringify({ error: 'Could not fetch source file from ' + url }) };
      }
      finalContentType = finalContentType || srcRes.headers.get('content-type') || 'application/octet-stream';
      const buf = await srcRes.arrayBuffer();
      fileB64 = Buffer.from(buf).toString('base64');
    }

    if (!finalContentType) finalContentType = 'application/octet-stream';

    const res = await fetch(
      `https://content.airtable.com/v0/${BASE}/${recordId}/${encodeURIComponent(fieldName)}/uploadAttachment`,
      {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ contentType: finalContentType, file: fileB64, filename })
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
