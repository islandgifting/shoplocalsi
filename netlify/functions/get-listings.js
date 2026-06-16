exports.handler = async (event) => {
  try {
    const url = `https://api.airtable.com/v0/appyNDNuwGFgR44sg/tblBt9FfVcrMK1aOs?filterByFormula=${encodeURIComponent("{Status}='Approved'")}&sort[0][field]=Submitted&sort[0][direction]=desc`;

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${process.env.AIRTABLE_TOKEN}`
      }
    });

    if (!response.ok) {
      throw new Error('Airtable fetch failed');
    }

    const data = await response.json();
    const listings = data.records.map(r => ({
      id: r.id,
      title: r.fields.Title || '',
      price: r.fields.Price || '',
      category: r.fields.Category || '',
      contact: r.fields.Contact || '',
      description: r.fields.Description || '',
      submitted: r.fields.Submitted || ''
    }));

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ listings })
    };

  } catch (error) {
    console.error('Fetch error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
