# LXRY Draft Order Checkout API

A Vercel serverless function that creates Shopify draft orders with custom pricing and redirects customers to checkout.

## Overview

This API allows you to create draft orders in Shopify with custom calculated prices instead of the standard variant prices. When a customer clicks the purchase button, it creates a draft order with your calculated price and redirects them to the Shopify checkout.

## Features

- ✅ Create draft orders with custom pricing
- ✅ Automatic checkout redirection
- ✅ Customer email association (optional)
- ✅ Error handling and validation
- ✅ Serverless deployment on Vercel

## Setup

### 1. Prerequisites

- Vercel account
- Shopify store with admin API access
- Shopify private app with draft order permissions

### 2. Environment Variables

Set these environment variables in your Vercel project settings:

- **SHOPIFY_DOMAIN**: `fr8wj4-xj.myshopify.com`
- **SHOPIFY_ACCESS_TOKEN**: Your Shopify private app access token

### 3. Deployment

1. Clone or download these files to your local machine
2. Install Vercel CLI: `npm i -g vercel`
3. Run `vercel` in the project directory
4. Follow the prompts to deploy
5. Set environment variables in Vercel dashboard

## API Usage

### Endpoint
