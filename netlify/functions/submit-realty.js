exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }
  try {
    const {
      address, listingType, planType, price, beds, baths, sqft,
      description, openHouse, phone, email, contactName
    } = JSON.parse(event.body || '{}');
    const token = process.env.AIRTABLE_TOKEN;

    if (!address || !price || !description || !phone) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing required fields' }) };
    }

    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let removalCode = 'SI-';
    for (let i = 0; i < 5; i++) removalCode += chars[Math.floor(Math.random() * chars.length)];

    const fields = {
      Address: address,
      ListingType: listingType === 'rent' ? 'Rent' : listingType === 'wanted' ? 'Wanted' : 'Sale',
      PlanType: planType || 'rentals',
      Price: price,
      Beds: beds || '',
      Baths: baths || '',
      Sqft: sqft || '',
      Description: description,
      OpenHouse: openHouse || '',
      Phone: phone,
      Email: email || '',
      ContactName: contactName || '',
      RemovalCode: removalCode,
      Status: 'Active',
      Submitted: new Date().toISOString().split('T')[0]
    };

    const response = await fetch('https://api.airtable.com/v0/appyNDNuwGFgR44sg/Realty', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields, typecast: true })
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error?.message || 'Airtable error');
    }

    const data = await response.json();
    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ success: true, removalCode, id: data.id })
    };
  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};
