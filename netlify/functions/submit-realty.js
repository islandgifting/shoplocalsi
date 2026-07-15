exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }
  try {
    const {
      address, listingType, planType, price, beds, baths, sqft,
      description, openHouse, phone, email, contactName, budget, moveIn
    } = JSON.parse(event.body || '{}');
    const token = process.env.AIRTABLE_TOKEN;
    const isWanted = listingType === 'wanted';

    if (!phone || !description || (!isWanted && (!address || !price))) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing required fields' }) };
    }

    // Agency plan: strict cap of 10 listings per calendar month per phone number.
    if ((planType || '').toLowerCase() === 'agency') {
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString().split('T')[0];
      const formula = `AND({PlanType}='agency',{Phone}='${phone.replace(/'/g, "\\'")}',IS_AFTER({Submitted},'${monthStart}'),IS_BEFORE({Submitted},'${nextMonthStart}'))`;
      const countRes = await fetch(`https://api.airtable.com/v0/appyNDNuwGFgR44sg/Realty?filterByFormula=${encodeURIComponent(formula)}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const countData = await countRes.json();
      if (countRes.ok && (countData.records || []).length >= 10) {
        return { statusCode: 403, body: JSON.stringify({ error: 'Agency plan limit of 10 listings this month has been reached.' }) };
      }
    }

    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let removalCode = 'SI-';
    for (let i = 0; i < 5; i++) removalCode += chars[Math.floor(Math.random() * chars.length)];

    const fields = {
      Address: address || '',
      ListingType: listingType === 'rent' ? 'Rent' : isWanted ? 'Wanted' : 'Sale',
      PlanType: planType || 'rentals',
      Price: isWanted ? (budget || '') : price,
      Beds: beds || '',
      Baths: baths || '',
      Sqft: sqft || '',
      Description: description,
      OpenHouse: isWanted ? (moveIn || '') : (openHouse || ''),
      Phone: phone,
      Email: email || '',
      ContactName: contactName || '',
      RemovalCode: removalCode,
      Status: 'Pending',
      Submitted: new Date().toISOString().split('T')[0]
    };

    // Auto-retry with unknown fields stripped, in case the live Realty table's
    // exact column names drift from what this function sends.
    async function saveToAirtable(fieldsObj, attempt) {
      attempt = attempt || 0;
      const res = await fetch('https://api.airtable.com/v0/appyNDNuwGFgR44sg/Realty', {
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
      body: JSON.stringify({ success: true, removalCode, id: data.id })
    };
  } catch (error) {
    return { statusCode: 500, headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ error: error.message }) };
  }
};
