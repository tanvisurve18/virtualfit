const STORE = import.meta.env.VITE_SHOPIFY_STORE;
const TOKEN = import.meta.env.VITE_SHOPIFY_API_TOKEN;
const VERSION = import.meta.env.VITE_SHOPIFY_API_VERSION;

// src/api/shopify.js

export async function fetchShopifyProducts() {
  const res = await fetch(
    "https://fqpweatumhbxnuvwpgrb.supabase.co/functions/v1/shopify-products"
  );

  if (!res.ok) {
    throw new Error("Failed to fetch Shopify products");
  }

  return await res.json();
}
