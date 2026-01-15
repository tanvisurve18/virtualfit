import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Collection IDs (ready for future use)
const COLLECTIONS: Record<string, string> = {
  women: "687879225714",
  men: "687879061874",
  hoodies: "687879258482",
  tshirts: "687879324018",
};

serve(async (req) => {
  // ✅ CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // ✅ SAFELY read body (may be empty)
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    const cursor = body.cursor ?? null;
    const collection = body.collection ?? null;

    // 🔐 Shopify ENV variables
    const SHOP = Deno.env.get("SHOPIFY_STORE"); // ✅ FIXED
    const TOKEN = Deno.env.get("SHOPIFY_ADMIN_TOKEN");
    const VERSION = Deno.env.get("SHOPIFY_API_VERSION");

    if (!SHOP || !TOKEN || !VERSION) {
      throw new Error("Missing Shopify environment variables");
    }

    // 🧠 GraphQL query (pagination ready)
    const query = `
      {
        products(first: 6${cursor ? `, after: "${cursor}"` : ""}) {
          edges {
            cursor
            node {
              id
              title
              images(first: 1) {
                edges {
                  node {
                    url
                  }
                }
              }
              variants(first: 1) {
                edges {
                  node {
                    price
                  }
                }
              }
            }
          }
          pageInfo {
            hasNextPage
          }
        }
      }
    `;

    const response = await fetch(
      `https://${SHOP}/admin/api/${VERSION}/graphql.json`,
      {
        method: "POST",
        headers: {
          "X-Shopify-Access-Token": TOKEN,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query }),
      }
    );

    const json = await response.json();

    if (!json?.data?.products) {
      throw new Error("Invalid Shopify response");
    }

    const edges = json.data.products.edges;

    return new Response(
      JSON.stringify({
        products: edges.map((e: any) => ({
          id: e.node.id,
          title: e.node.title,
          image: e.node.images.edges[0]?.node.url ?? "",
          price: e.node.variants.edges[0]?.node.price ?? "--",
        })),
        nextCursor: edges.at(-1)?.cursor ?? null,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: corsHeaders }
    );
  }
});
