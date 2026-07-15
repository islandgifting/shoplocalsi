exports.handler = async (event) => {
  try {
    const token = process.env.AIRTABLE_TOKEN;
    if (!token) return { statusCode: 500, body: JSON.stringify({ error: 'AIRTABLE_TOKEN not set' }) };

    const url = `https://api.airtable.com/v0/appyNDNuwGFgR44sg/Jobs?filterByFormula=${encodeURIComponent("{Status}='Active'")}&sort[0][field]=Submitted&sort[0][direction]=desc`;
    const response = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
    const data = await response.json();
    if (!response.ok) return { statusCode: 500, body: JSON.stringify({ error: 'Airtable error', details: data }) };

    const listings = (data.records || []).map(r => ({
      id: r.id,
      title: r.fields.Title || '',
      type: (r.fields.Type || '').toLowerCase(),
      category: r.fields.Category || '',
      description: r.fields.Description || '',
      pay: r.fields.Pay || '',
      phone: r.fields.Phone || '',
      email: r.fields.Email || '',
      submitted: r.fields.Submitted || '',
      deleteCode: r.fields.DeleteCode || '',
      contactHidden: r.fields.HideContact === 'yes'
    }));

    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
      body: JSON.stringify({ listings })
    };
  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};
