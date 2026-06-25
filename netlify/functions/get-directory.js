const fetch = require('node-fetch');

exports.handler = async (event) => {
  const token = process.env.AIRTABLE_TOKEN;
  const base = 'appyNDNuwGFgR44sg';

  try {
    let records = [];
    let offset = null;

    // Paginate through all records
    do {
      const url = `https://api.airtable.com/v0/${base}/Directory?${offset ? `offset=${offset}&` : ''}sort[0][field]=Category&sort[0][direction]=asc`;
      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      records = records.concat(data.records || []);
      offset = data.offset;
    } while (offset);

    const businesses = records.map(r => ({
      id: r.id,
      name: r.fields.Name || '',
      category: r.fields.Category || '',
      phone: r.fields.Phone || '',
      address: r.fields.Address || '',
      description: r.fields.Description || '',
      tagline: r.fields.Tagline || '',
      website: r.fields.Website || '',
      email: r.fields.Email || '',
      instagram: r.fields.Instagram || '',
      facebook: r.fields.Facebook || '',
      hours: r.fields.Hours || '',
      image: r.fields.Image ? r.fields.Image[0]?.url : '',
      logo: r.fields.Logo ? r.fields.Logo[0]?.url : '',
      featured: r.fields.Featured || false,
      premium: r.fields.Premium || false,
      status: r.fields.Status || 'Active',
      slug: (r.fields.Name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
    })).filter(b => b.status === 'Active');

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300' // Cache 5 min
      },
      body: JSON.stringify({ businesses })
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
