import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  // ✅ CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // ✅ Read request body
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    console.log("📥 REQUEST BODY:", body);

    const cursor = body.cursor ?? null;
    const requestedCategory = body.collection ?? "all";

    console.log(`🎯 Fetching products for category: ${requestedCategory}`);

    // 🔑 Shopify credentials
    const SHOP = Deno.env.get("SHOPIFY_STORE");
    const TOKEN = Deno.env.get("SHOPIFY_ADMIN_TOKEN");
    const VERSION = Deno.env.get("SHOPIFY_API_VERSION");

    if (!SHOP || !TOKEN || !VERSION) {
      throw new Error("Missing Shopify environment variables");
    }

    // 🧠 GraphQL query - Fetch ALL products
    const query = `
      {
        products(first: 50${cursor ? `, after: "${cursor}"` : ""}) {
          edges {
            cursor
            node {
              id
              title
              productType
              tags
              vendor
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

    // 📡 Call Shopify API
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

    console.log("📦 SHOPIFY RESPONSE:", JSON.stringify(json, null, 2));

    // Check for errors
    if (json.errors) {
      console.error("❌ GraphQL Errors:", json.errors);
      throw new Error(`Shopify API error: ${JSON.stringify(json.errors)}`);
    }

    if (!json?.data?.products) {
      throw new Error("No products found");
    }

    const edges = json.data.products.edges;

    // 🏷️ Categorize products based on title, productType, and tags
    const allProducts = edges.map((e: any) => {
      const title = (e.node.title || "").toLowerCase();
      const productType = (e.node.productType || "").toLowerCase();
      const tags = (e.node.tags || []).map((t: string) => t.toLowerCase());
      
      let category = "other";
      
      // Check if it's a hoodie
      if (
        title.includes("hoodie") ||
        productType.includes("hoodie") ||
        tags.some((t: string) => t.includes("hoodie"))
      ) {
        category = "hoodies";
      }
      // Check if it's a t-shirt
      else if (
        title.includes("t-shirt") ||
        title.includes("tshirt") ||
        title.includes("shirt") ||
        productType.includes("t-shirt") ||
        productType.includes("tshirt") ||
        productType.includes("shirt") ||
        tags.some((t: string) => t.includes("t-shirt") || t.includes("tshirt") || t.includes("shirt"))
      ) {
        category = "tshirts";
      }
      
      // Check gender (women/men)
      const isWomen = 
        title.includes("women") ||
        title.includes("female") ||
        title.includes("ladies") ||
        productType.includes("women") ||
        tags.some((t: string) => t.includes("women") || t.includes("female") || t.includes("ladies"));
      
      const isMen = 
        title.includes("men") ||
        title.includes("male") ||
        productType.includes("men") ||
        tags.some((t: string) => t.includes("men") || t.includes("male"));

      return {
        id: e.node.id,
        title: e.node.title,
        productType: e.node.productType || "",
        tags: e.node.tags || [],
        image: e.node.images.edges[0]?.node.url ?? "",
        price: e.node.variants.edges[0]?.node.price ?? "--",
        buyUrl: e.node.onlineStoreUl,
        category: category,
        isWomen: isWomen,
        isMen: isMen,
      };
    });

    // 🔍 Filter products based on requested category
    let filteredProducts = allProducts;

    if (requestedCategory === "women") {s
      // Women: Only t-shirts (exclude hoodies)
      filteredProducts = allProducts.filter(p => 
        p.category === "tshirts" && !p.category.includes("hoodie")
      );
    } else if (requestedCategory === "men") {
      // Men: Only hoodies (exclude t-shirts)
      filteredProducts = allProducts.filter(p => 
        p.category === "hoodies"
      );
    } else if (requestedCategory === "hoodies") {
      // Hoodies: Only hoodies
      filteredProducts = allProducts.filter(p => p.category === "hoodies");
    } else if (requestedCategory === "tshirts") {
      // T-shirts: Only t-shirts (exclude hoodies)
      filteredProducts = allProducts.filter(p => p.category === "tshirts");
    }

    console.log(`✅ Found ${filteredProducts.length} products in category: ${requestedCategory}`);
    console.log("📋 Products:", filteredProducts.map(p => `${p.title} (${p.category})`));

    // 📤 Return filtered products
    return new Response(
      JSON.stringify({
        products: filteredProducts,
        nextCursor: null, // Since we're filtering client-side, we get all products at once
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (err: any) {
    console.error("❌ ERROR:", err.message);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: corsHeaders }
    );
  }
});