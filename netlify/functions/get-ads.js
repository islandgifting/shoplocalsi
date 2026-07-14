exports.handler = async (event) => {
  try {
    const token = process.env.AIRTABLE_TOKEN;
    if (!token) return { statusCode: 500, body: JSON.stringify({ error: 'No token' }) };

    const url = `https://api.airtable.com/v0/appyNDNuwGFgR44sg/tblYxLfo3pgbpdlGS?sort[0][field]=Created&sort[0][direction]=desc`;
    const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
    const data = await res.json();
    if (!res.ok) return { statusCode: 500, body: JSON.stringify({ error: 'Airtable error' }) };

    const banners = [], featured = [], sponsored = [], all = [];

    (data.records || []).forEach(r => {
      const f = r.fields;
      const status = (f.Status || '').toLowerCase();
      if (status !== 'active') return;

      const item = {
        id: r.id,
        businessName: f.BusinessName || '',
        description: f.Description || '',
        phone: f.PhoneNumber || f.Phone || '',
        email: f.Email || '',
        link: f.Link || f.Website || '',
        address: f.Address || '',
        image: f.Image ? f.Image[0]?.url : null,
        bannerImage: f.Banner ? f.Banner[0]?.url : null,
        adVideo: f.AdVideo ? f.AdVideo[0]?.url : null,
        gallery: f.Gallery ? f.Gallery.map(g => g.url) : [],
        tagline: f.TagLine || f.Tagline || '',
        color: f.Color || '#0a1c4b',
        category: f.Category || 'specialty',
        planType: (f.PlanType || '').toLowerCase(),
        bannerHTML: f.BannerHTML || '',
        adType: (f.AdType || '').toLowerCase()
      };

      all.push(item);

      const plan = item.planType;
      const adType = item.adType;

      // Premium gets banner + sponsored card + featured spotlight
      if (plan === 'premium') {
        banners.push(item);
        sponsored.push(item);
        featured.push(item);
      }
      // Featured gets spotlight
      else if (plan === 'featured') {
        featured.push(item);
      }
      // Legacy AdType fallback
      else if (adType === 'banner' || adType === 'bannerhtml') {
        banners.push(item);
      } else if (adType === 'featuredbusiness') {
        featured.push(item);
      } else if (adType === 'sponsored') {
        sponsored.push(item);
      }
    });

    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
      body: JSON.stringify({ banners, featured, sponsored, all })
    };
  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};
