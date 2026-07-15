exports.handler = async (event) => {
  try {
    const token = process.env.AIRTABLE_TOKEN;
    if (!token) return { statusCode: 500, body: JSON.stringify({ error: 'AIRTABLE_TOKEN not set' }) };

    const url = `https://api.airtable.com/v0/appyNDNuwGFgR44sg/Realty?filterByFormula=${encodeURIComponent("{Status}='Active'")}&sort[0][field]=Submitted&sort[0][direction]=desc`;
    const response = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
    const data = await response.json();
    if (!response.ok) return { statusCode: 500, body: JSON.stringify({ error: 'Airtable error', details: data }) };

    const listings = (data.records || []).map(r => {
      const f = r.fields;
      return {
        id: r.id,
        address: f.Address || '',
        listingType: (f.ListingType || '').toLowerCase(),
        planType: (f.PlanType || '').toLowerCase(),
        price: f.Price || '',
        beds: f.Beds || '',
        baths: f.Baths || '',
        sqft: f.Sqft || '',
        description: f.Description || '',
        openHouse: f.OpenHouse || '',
        phone: f.Phone || '',
        email: f.Email || '',
        contactName: f.ContactName || '',
        mainPhoto: f.MainPhoto ? f.MainPhoto[0]?.url : null,
        gallery: f.Gallery ? f.Gallery.map(g => g.url) : [],
        adVideo: f.AdVideo ? f.AdVideo[0]?.url : null,
        bannerImage: f.Banner ? f.Banner[0]?.url : null,
        removalCode: f.RemovalCode || '',
        submitted: f.Submitted || ''
      };
    });

    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
      body: JSON.stringify({ listings })
    };
  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};
