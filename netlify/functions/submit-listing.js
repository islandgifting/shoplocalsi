exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }
  try {
    const {
      title, price, category, contact, description, hideContact,
      phone, email, address, type
    } = JSON.parse(event.body || '{}');

    const token = process.env.AIRTABLE_TOKEN;

    // A listing needs at least a title, a category, and some way to reach them
    if (!title || !category || (!contact && !phone)) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing required fields' }) };
    }

    const deleteCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Build the Airtable fields, only including optional ones when present
    const fields = {
      Title: title,
      Price: price || 'Contact for price',
      Category: category,
      Contact: contact || '',
      Description: description || '',
      Status: 'Pending',
      Submitted: new Date().toISOString().split('T')[0],
      DeleteCode: deleteCode,
      HideContact: hideContact ? 'yes' : 'no'
    };

    if (phone)   fields['Phone Number'] = phone;
    if (email)   fields['Email'] = email;
    if (address) fields['Address'] = address;
    if (type)    fields['Type'] = type;

    const response = await fetch('https://api.airtable.com/v0/appyNDNuwGFgR44sg/tblBt9FfVcrMK1aOs', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields })
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error?.message || 'Airtable error');
    }

    const data = await response.json();
    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ success: true, deleteCode, id: data.id })
    };
  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};
