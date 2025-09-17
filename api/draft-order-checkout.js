// api/draft-order-checkout.js

const SHOP_DOMAIN = process.env.SHOP_DOMAIN || process.env.SHOPIFY_DOMAIN;
const ACCESS_TOKEN = process.env.SHOPIFY_ADMIN_TOKEN || process.env.SHOPIFY_ACCESS_TOKEN;
const API_VERSION = '2024-01';

const DEFAULT_ALLOWED_ORIGINS = [
  'https://lxryroom.com',
  'https://www.lxryroom.com',
];

function setCors(req, res) {
  const origin = req.headers.origin || '';
  const allowed = DEFAULT_ALLOWED_ORIGINS.includes(origin) ? origin : DEFAULT_ALLOWED_ORIGINS[0];
  res.setHeader('Access-Control-Allow-Origin', allowed);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Max-Age', '86400');
}

function parsePrice(value) {
  if (value == null) return null;
  const normalized = String(value).replace(/[^\d.,-]/g, '').replace(',', '.');
  const num = Number(normalized);
  if (!isFinite(num) || num <= 0) return null;
  return num.toFixed(2);
}

function toInt(value, fallback) {
  const n = parseInt(value, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

// Convert incoming properties (object or array) to Admin API format: [{ name, value }]
function normalizeProperties(input) {
  if (!input) return [];
  if (Array.isArray(input)) {
    return input
      .filter(p => p && typeof p.name === 'string')
      .map(p => ({ name: String(p.name), value: p.value == null ? '' : String(p.value) }));
  }
  const out = [];
  for (const [k, v] of Object.entries(input)) {
    if (!k) continue;
    out.push({ name: String(k), value: v == null ? '' : String(v) });
  }
  return out;
}

export default async function handler(req, res) {
  setCors(req, res);

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    if (!SHOP_DOMAIN || !ACCESS_TOKEN) {
      return res.status(500).json({ error: 'Server not configured: missing SHOP_DOMAIN or SHOPIFY_ADMIN_TOKEN' });
    }

    const {
      variantId,
      quantity = 1,
      customPrice,
      customerEmail,
      note,
      properties
    } = req.body || {};

    if (!variantId || !customPrice) {
      return res.status(400).json({ error: 'Missing required fields: variantId, customPrice' });
    }

    const priceStr = parsePrice(customPrice);
    if (!priceStr) {
      return res.status(400).json({ error: 'Invalid custom price' });
    }

    const qty = toInt(quantity, 1);

    // Normalize properties and ensure Calculated Price is present
    const propsArray = normalizeProperties(properties)
      .filter(p => p.name.toLowerCase() !== 'calculated price');
    propsArray.push({ name: 'Calculated Price', value: priceStr });

    const draftOrderData = {
      draft_order: {
        line_items: [
          {
            variant_id: variantId,
            quantity: qty,
            price: priceStr,
            properties: propsArray
          }
        ],
        customer: customerEmail ? { email: customerEmail } : undefined,
        note: note || undefined,
        use_customer_default_address: true,
        // IMPORTANT: tags must be a comma-separated string (not an array)
        tags: 'custom-pricing, draft-order-checkout'
      }
    };

    const createUrl = `https://${SHOP_DOMAIN}/admin/api/${API_VERSION}/draft_orders.json`;
    const createResp = await fetch(createUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': ACCESS_TOKEN
      },
      body: JSON.stringify(draftOrderData)
    });

    if (!createResp.ok) {
      const text = await createResp.text().catch(() => '');
      return res.status(createResp.status).json({
        error: 'Failed to create draft order',
        details: text
      });
    }

    const json = await createResp.json();
    const draftOrder = json?.draft_order;
    if (!draftOrder?.id) {
      return res.status(502).json({ error: 'Draft order created, but response was missing an ID' });
    }

    const draftOrderId = draftOrder.id;
    const checkoutUrl = draftOrder.invoice_url || `https://${SHOP_DOMAIN}/draft_orders/${draftOrderId}/checkout`;

    return res.status(200).json({
      success: true,
      draftOrderId,
      checkoutUrl,
      message: 'Draft order created successfully'
    });
  } catch (error) {
    console.error('Draft order API error:', error);
    return res.status(500).json({ error: 'Internal server error', message: error?.message || 'Unknown error' });
  }
}
