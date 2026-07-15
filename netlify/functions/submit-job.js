exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }
  try {
    const { title, description, pay, category, phone, email, type, hideContact } = JSON.parse(event.body || '{}');
    const token = process.env.AIRTABLE_TOKEN;

    if (!title || !description || !phone) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing required fields' }) };
    }

    const deleteCode = Math.floor(100000 + Math.random() * 900000).toString();

    const fields = {
      Title: title,
      Type: type === 'wanted' ? 'Wanted' : 'Available',
      Category: category || 'Other',
      Description: description,
      Pay: pay || '',
      Phone: phone,
      Email: email || '',
      Status: 'Pending',
      Submitted: new Date().toISOString().split('T')[0],
      DeleteCode: deleteCode,
      HideContact: hideContact ? 'yes' : 'no'
    };

    // Auto-retry with unknown fields stripped, in case the live Jobs table's
    // exact column names drift from what this function sends.
    async function saveToAirtable(fieldsObj, attempt) {
      attempt = attempt || 0;
      const res = await fetch('https://api.airtable.com/v0/appyNDNuwGFgR44sg/Jobs', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields: fieldsObj, typecast: true })
      });
      if (res.ok) return res.json();
      const err = await res.json();
      const msg = (err.error && err.error.message) || '';
      const badFieldMatch = msg.match(/Unknown field name: "([^"]+)"/);
      if (badFieldMatch && attempt < 25) {
        const badField = badFieldMatch[1];
        const trimmed = Object.assign({}, fieldsObj);
        delete trimmed[badField];
        return saveToAirtable(trimmed, attempt + 1);
      }
      const e = new Error(msg || 'Airtable error');
      e.details = err;
      throw e;
    }

    const data = await saveToAirtable(fields);
    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ success: true, deleteCode, id: data.id })
    };
  } catch (error) {
    return { statusCode: 500, headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ error: error.message }) };
  }
};
