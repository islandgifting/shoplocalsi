

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const { type, families, message, date, postedBy } = JSON.parse(event.body || '{}');
    const token = process.env.AIRTABLE_TOKEN;

    if (!families || !message) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing required fields' }) };
    }

    // Save to Airtable Simcha table
    const airtableRes = await fetch('https://api.airtable.com/v0/appyNDNuwGFgR44sg/Simchos', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fields: {
          Type: type || 'Event',
          Families: families,
          Message: message,
          Date: date || '',
          PostedBy: postedBy || 'Anonymous',
          Status: 'Pending',
          Submitted: new Date().toISOString().split('T')[0]
        }
      })
    });

    const airtableData = await airtableRes.json();
    if (!airtableRes.ok) throw new Error(airtableData.error?.message || 'Airtable error');

    const recordId = airtableData.id;

    // Send approval email via Resend (free email API)
    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'ShopLocal SI <noreply@shoplocalsi.com>',
        to: ['rikkinichtburg@gmail.com'],
        subject: `🎉 New Simcha Announcement — ${type}: ${families}`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f4f6fb;border-radius:12px;overflow:hidden">
            <div style="background:#0a1c4b;padding:2rem;text-align:center">
              <h1 style="color:#d4a843;margin:0;font-size:1.5rem">🎉 New Simcha Announcement</h1>
              <p style="color:rgba(255,255,255,.7);margin:.5rem 0 0">Pending your approval on ShopLocal SI</p>
            </div>
            <div style="padding:2rem">
              <table style="width:100%;border-collapse:collapse">
                <tr><td style="padding:.5rem;font-weight:700;color:#0a1c4b;width:120px">Type:</td><td style="padding:.5rem">${type}</td></tr>
                <tr style="background:#fff"><td style="padding:.5rem;font-weight:700;color:#0a1c4b">Families:</td><td style="padding:.5rem">${families}</td></tr>
                <tr><td style="padding:.5rem;font-weight:700;color:#0a1c4b">Message:</td><td style="padding:.5rem">${message}</td></tr>
                <tr style="background:#fff"><td style="padding:.5rem;font-weight:700;color:#0a1c4b">Date:</td><td style="padding:.5rem">${date || 'Not specified'}</td></tr>
                <tr><td style="padding:.5rem;font-weight:700;color:#0a1c4b">Posted By:</td><td style="padding:.5rem">${postedBy || 'Anonymous'}</td></tr>
                <tr style="background:#fff"><td style="padding:.5rem;font-weight:700;color:#0a1c4b">Record ID:</td><td style="padding:.5rem;font-size:.8rem;color:#666">${recordId}</td></tr>
              </table>

              <div style="margin-top:2rem;display:flex;gap:1rem;justify-content:center">
                <a href="https://shoplocalsi.com/admin.html" 
                   style="background:#0a1c4b;color:#fff;padding:1rem 2rem;border-radius:8px;text-decoration:none;font-weight:700;display:inline-block">
                  ✅ Review in Admin Panel
                </a>
              </div>

              <p style="margin-top:1.5rem;font-size:.82rem;color:#888;text-align:center">
                Go to <a href="https://shoplocalsi.com/admin.html" style="color:#0a1c4b">shoplocalsi.com/admin.html</a> → Simcha tab to approve or reject.
              </p>
            </div>
          </div>
        `
      })
    });

    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ success: true, id: recordId })
    };

  } catch (error) {
    console.error('Submit simcha error:', error);
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};
