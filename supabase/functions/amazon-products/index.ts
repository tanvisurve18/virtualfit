// supabase/functions/amazon-products/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// MOCK DATA with real T-shirt images
const MOCK_PRODUCTS = [
  {
    id: "mock-1",
    title: "Men's Classic Cotton Round Neck T-Shirt",
    price: "₹499",
    image: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&h=400&fit=crop",
    product_url: "https://www.amazon.in/s?k=mens+tshirt",
  },
  {
    id: "mock-2",
    title: "Premium Cotton Polo T-Shirt for Men",
    price: "₹699",
    image: "https://images.unsplash.com/photo-1586790170083-2f9ceadc732d?w=400&h=400&fit=crop",
    product_url: "https://www.amazon.in/s?k=mens+polo+tshirt",
  },
  {
    id: "mock-3",
    title: "Casual Slim Fit Cotton T-Shirt",
    price: "₹399",
    image: "https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=400&h=400&fit=crop",
    product_url: "https://www.amazon.in/s?k=casual+tshirt",
  },
  {
    id: "mock-4",
    title: "Sports Performance Dry-Fit T-Shirt",
    price: "₹799",
    image: "https://images.unsplash.com/photo-1622445275463-afa2ab738c34?w=400&h=400&fit=crop",
    product_url: "https://www.amazon.in/s?k=sports+tshirt",
  },
  {
    id: "mock-5",
    title: "Round Neck Casual Cotton T-Shirt",
    price: "₹349",
    image: "https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=400&h=400&fit=crop",
    product_url: "https://www.amazon.in/s?k=round+neck+tshirt",
  },
  {
    id: "mock-6",
    title: "V-Neck Premium Cotton T-Shirt",
    price: "₹449",
    image: "https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=400&h=400&fit=crop",
    product_url: "https://www.amazon.in/s?k=v+neck+tshirt",
  },
  {
    id: "mock-7",
    title: "Printed Graphic Design T-Shirt",
    price: "₹599",
    image: "https://images.unsplash.com/photo-1562157873-818bc0726f68?w=400&h=400&fit=crop",
    product_url: "https://www.amazon.in/s?k=graphic+tshirt",
  },
  {
    id: "mock-8",
    title: "Henley Collar Half Sleeve T-Shirt",
    price: "₹549",
    image: "https://images.unsplash.com/photo-1581655353564-df123a1eb820?w=400&h=400&fit=crop",
    product_url: "https://www.amazon.in/s?k=henley+tshirt",
  },
  {
    id: "mock-9",
    title: "Striped Pattern Casual T-Shirt",
    price: "₹479",
    image: "https://images.unsplash.com/photo-1602810319428-019690571b5b?w=400&h=400&fit=crop",
    product_url: "https://www.amazon.in/s?k=striped+tshirt",
  },
  {
    id: "mock-10",
    title: "Long Sleeve Cotton T-Shirt",
    price: "₹649",
    image: "https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?w=400&h=400&fit=crop",
    product_url: "https://www.amazon.in/s?k=long+sleeve+tshirt",
  },
  {
    id: "mock-11",
    title: "Oversized Fit Urban T-Shirt",
    price: "₹699",
    image: "https://images.unsplash.com/photo-1571945153237-4929e783af4a?w=400&h=400&fit=crop",
    product_url: "https://www.amazon.in/s?k=oversized+tshirt",
  },
  {
    id: "mock-12",
    title: "Solid Color Basic Cotton T-Shirt",
    price: "₹299",
    image: "https://images.unsplash.com/photo-1527719327859-c6ce80353573?w=400&h=400&fit=crop",
    product_url: "https://www.amazon.in/s?k=basic+tshirt",
  },
];

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const RAPIDAPI_KEY = Deno.env.get("RAPIDAPI_KEY");
    const RAPIDAPI_HOST = Deno.env.get("RAPIDAPI_HOST");
    const USE_MOCK = Deno.env.get("USE_MOCK_DATA") === "true";

    // Return mock data if enabled or if API credentials missing
    if (USE_MOCK || !RAPIDAPI_KEY || !RAPIDAPI_HOST) {
      console.log("Using mock data with real images");
      return new Response(JSON.stringify(MOCK_PRODUCTS), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url =
      "https://real-time-amazon-data.p.rapidapi.com/search?query=mens+t+shirt&country=IN&sort_by=BEST_SELLERS";

    console.log("Fetching from RapidAPI...");

    const res = await fetch(url, {
      headers: {
        "X-RapidAPI-Key": RAPIDAPI_KEY,
        "X-RapidAPI-Host": RAPIDAPI_HOST,
      },
    });

    if (!res.ok) {
      console.error(`RapidAPI error: ${res.status}`);
      // Fallback to mock data on error
      return new Response(JSON.stringify(MOCK_PRODUCTS), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await res.json();
    console.log("RAW AMAZON RESPONSE:", JSON.stringify(data, null, 2));

    if (!data || !data.data || !data.data.products || data.data.products.length === 0) {
      console.log("No products in API response, using mock data");
      return new Response(JSON.stringify(MOCK_PRODUCTS), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const products = data.data.products.map((p: any, index: number) => ({
      id: p.asin || `product-${index}`,
      title: p.product_title || "No title",
      price: p.product_price || "N/A",
      image: p.product_photo || "",
      product_url: p.product_url || p.product_detail_url || `https://www.amazon.in/dp/${p.asin}`,
    }));

    console.log(`Returning ${products.length} real products`);

    return new Response(JSON.stringify(products), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Amazon fetch error:", err);
    // Return mock data on any error
    return new Response(JSON.stringify(MOCK_PRODUCTS), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});