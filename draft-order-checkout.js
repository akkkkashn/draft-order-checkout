export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { productId, variantId, quantity = 1, customPrice, customerEmail } = req.body;

    // Validate required fields
    if (!productId || !variantId || !customPrice) {
      return res.status(400).json({ 
        error: 'Missing required fields: productId, variantId, customPrice' 
      });
    }

    // Shopify API configuration - using environment variables
    const SHOP_DOMAIN = process.env.SHOPIFY_DOMAIN || 'fr8wj4-xj.myshopify.com';
    const ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;
    const API_VERSION = '2024-01';

    if (!ACCESS_TOKEN) {
      return res.status(500).json({ error: 'Shopify access token not configured' });
    }

    // Create draft order
    const draftOrderData = {
      draft_order: {
        line_items: [
          {
            variant_id: variantId,
            quantity: quantity,
            price: customPrice.toString()
          }
        ],
        customer: customerEmail ? { email: customerEmail } : null,
        use_customer_default_address: true,
        tags: ['custom-pricing', 'draft-order-checkout']
      }
    };

    // Create the draft order
    const draftOrderResponse = await fetch(
      `https://${SHOP_DOMAIN}/admin/api/${API_VERSION}/draft_orders.json`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': ACCESS_TOKEN
        },
        body: JSON.stringify(draftOrderData)
      }
    );

    if (!draftOrderResponse.ok) {
      const errorData = await draftOrderResponse.text();
      console.error('Draft order creation failed:', errorData);
      return res.status(draftOrderResponse.status).json({ 
        error: 'Failed to create draft order',
        details: errorData
      });
    }

    const draftOrder = await draftOrderResponse.json();
    const draftOrderId = draftOrder.draft_order.id;

    // Create checkout URL
    const checkoutUrl = `https://${SHOP_DOMAIN}/admin/draft_orders/${draftOrderId}/checkout`;

    // Return the checkout URL
    return res.status(200).json({
      success: true,
      draftOrderId: draftOrderId,
      checkoutUrl: checkoutUrl,
      message: 'Draft order created successfully'
    });

  } catch (error) {
    console.error('Error creating draft order:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
}
