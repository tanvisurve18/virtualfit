import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(async () => {
  try {
    const shop = Deno.env.get("SHOPIFY_SHOP_DOMAIN");
    const token = Deno.env.get("SHOPIFY_ADMIN_TOKEN");
    const version = Deno.env.get("SHOPIFY_API_VERSION");

    if (!shop || !token || !version) {
      return new Response(
        JSON.stringify({
          error: "Missing env vars",
          shop,
          tokenExists: !!token,
          version,
        }),
        { status: 500 }
      );
    }

    const url = `https://${shop}/admin/api/${version}/products.json`;

    const res = await fetch(url, {
      headers: {
        "X-Shopify-Access-Token": token,
        "Content-Type": "application/json",
      },
    });

    const text = await res.text(); // 👈 IMPORTANT

    if (!res.ok) {
      return new Response(
        JSON.stringify({
          error: "Shopify API error",
          status: res.status,
          body: text,
        }),
        { status: 500 }
      );
    }

    return new Response(text, {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500 }
    );
  }
});
