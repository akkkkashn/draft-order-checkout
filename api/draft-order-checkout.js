module.exports = async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { productId, variantId, quantity = 1, customPrice, customerEmail } = req.body || {};

    // Validate required fields
    if (!productId || !variantId || !customPrice) {
      return res.status(400).json({
        error: 'Missing required fields: productId, variantId, customPrice',
      });
    }

    // Shopify API configuration (use env vars in Vercel)
    const SHOP_DOMAIN = process.env.SHOPIFY_DOMAIN || 'fr8wj4-xj.myshopify.com';
    const ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;
    const API_VERSION = '2024-01';

    if (!ACCESS_TOKEN) {
      return res.status(500).json({ error: 'SHOPIFY_ACCESS_TOKEN not configured' });
    }

    // Normalize price
    const priceNum = parseFloat(customPrice);
    if (Number.isNaN(priceNum) || priceNum <= 0) {
      return res.status(400).json({ error: 'Invalid custom price' });
    }

    // Build Draft Order payload
    const draftOrderData = {
      draft_order: {
        line_items: [
          {
            variant_id: variantId,
            quantity: Number(quantity) || 1,
            price: priceNum.toString(), // This sets the actual billing price
            properties: {
              'Calculated Price': priceNum.toString(), // Optional reference
            },
          },
        ],
        customer: customerEmail ? { email: customerEmail } : undefined,
        use_customer_default_address: true,
        tags: ['custom-pricing', 'draft-order-checkout'],
      },
    };

    // Create Draft Order
    const draftOrderResponse = await fetch(
      `https://${SHOP_DOMAIN}/admin/api/${API_VERSION}/draft_orders.json`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': ACCESS_TOKEN,
        },
        body: JSON.stringify(draftOrderData),
      }
    );

    if (!draftOrderResponse.ok) {
      const text = await draftOrderResponse.text();
      return res.status(draftOrderResponse.status).json({
        error: 'Failed to create draft order',
        details: text,
      });
    }

    const draftOrder = await draftOrderResponse.json();
    const draftOrderId = draftOrder?.draft_order?.id;

    if (!draftOrderId) {
      return res.status(500).json({ error: 'Draft order created but ID missing' });
    }

    // Draft order checkout URL
    const checkoutUrl = `https://${SHOP_DOMAIN}/admin/draft_orders/${draftOrderId}/checkout`;

    return res.status(200).json({
      success: true,
      draftOrderId,
      checkoutUrl,
      message: 'Draft order created successfully',
    });
  } catch (error) {
    console.error('Error creating draft order:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error?.message || 'Unknown error',
    });
  }
};
