// Vercel serverless endpoint for live Flipkart Affiliate catalogue search.
// Configure FLIPKART_AFFILIATE_ID and FLIPKART_AFFILIATE_TOKEN in Vercel Project Settings > Environment Variables.
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ ok: false, code: 'METHOD_NOT_ALLOWED', message: 'Use GET.' });
  }
  const query = String(req.query?.q || '').trim().slice(0, 160);
  const maxPrice = Number(req.query?.maxPrice || 0);
  if (query.length < 2) return res.status(400).json({ ok: false, code: 'QUERY_REQUIRED', message: 'Enter a product search.' });
  const affiliateId = process.env.FLIPKART_AFFILIATE_ID;
  const affiliateToken = process.env.FLIPKART_AFFILIATE_TOKEN;
  if (!affiliateId || !affiliateToken) {
    return res.status(503).json({
      ok: false,
      code: 'AFFILIATE_CREDENTIALS_MISSING',
      message: 'Live product results are not connected yet. Add your approved Flipkart Affiliate ID and API Token in Vercel Environment Variables.'
    });
  }
  try {
    const url = new URL('https://affiliate-api.flipkart.net/affiliate/1.0/search.json');
    url.searchParams.set('query', query);
    url.searchParams.set('resultCount', '10');
    const response = await fetch(url.toString(), {
      headers: { 'Fk-Affiliate-Id': affiliateId, 'Fk-Affiliate-Token': affiliateToken, 'Accept': 'application/json' },
      signal: AbortSignal.timeout(9000)
    });
    if (!response.ok) {
      const status = response.status;
      return res.status(status === 401 || status === 403 ? 502 : 503).json({
        ok: false,
        code: status === 401 || status === 403 ? 'AFFILIATE_AUTH_FAILED' : 'AFFILIATE_API_UNAVAILABLE',
        message: status === 401 || status === 403
          ? 'Flipkart rejected the API credentials. Verify your Affiliate ID and token.'
          : 'Flipkart product search is temporarily unavailable. Try again shortly.'
      });
    }
    const data = await response.json();
    const list = Array.isArray(data.productInfoList) ? data.productInfoList : [];
    const products = list.map((entry) => {
      const base = entry.productBaseInfoV1 || entry.productBaseInfo || {};
      const attrs = base.productAttributes || {};
      const images = attrs.imageUrls || {};
      const priceObj = attrs.sellingPrice || attrs.price || {};
      const mrpObj = attrs.maximumRetailPrice || attrs.mrp || {};
      const price = Number(priceObj.amount);
      const mrp = Number(mrpObj.amount);
      const image = images['400x400'] || images['275x275'] || images['200x200'] || images.unknown || '';
      const link = String(attrs.productUrl || '');
      return {
        id: String(base.productId || ''),
        title: String(attrs.title || base.title || '').slice(0, 220),
        brand: String(attrs.productBrand || '').slice(0, 100),
        price: Number.isFinite(price) && price > 0 ? price : null,
        mrp: Number.isFinite(mrp) && mrp > 0 ? mrp : null,
        image: /^https?:\/\//i.test(image) ? image.replace(/^http:\/\//i, 'https://') : '',
        url: /^https?:\/\//i.test(link) ? link.replace(/^http:\/\//i, 'https://') : '',
        inStock: attrs.inStock === true,
        available: attrs.isAvailable !== false,
        size: String(attrs.size || '').slice(0, 40),
        colour: String(attrs.color || '').slice(0, 60),
        source: 'Flipkart'
      };
    }).filter(p => p.title && p.url && p.image && p.available && p.inStock && p.price !== null && (!maxPrice || p.price <= maxPrice));
    return res.status(200).json({ ok: true, source: 'Flipkart Affiliate API', count: products.length, products, checkedAt: new Date().toISOString() });
  } catch (error) {
    return res.status(503).json({ ok: false, code: 'SEARCH_FAILED', message: 'Product search timed out or could not connect. Please try again.' });
  }
}
