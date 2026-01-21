// supabase/functions/amazon-products/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const RAPIDAPI_KEY = Deno.env.get("RAPIDAPI_KEY");
    const RAPIDAPI_HOST = Deno.env.get("RAPIDAPI_HOST");

    if (!RAPIDAPI_KEY || !RAPIDAPI_HOST) {
      return new Response(
        JSON.stringify({ error: "Missing RapidAPI config" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const url =
      "https://real-time-amazon-data.p.rapidapi.com/search?query=mens+t+shirt&country=IN&sort_by=BEST_SELLERS";

    const res = await fetch(url, {
      headers: {
        "X-RapidAPI-Key": RAPIDAPI_KEY,
        "X-RapidAPI-Host": RAPIDAPI_HOST,
      },
    });

    const data = await res.json();
    console.log("RAW AMAZON RESPONSE:", JSON.stringify(data, null, 2));


    const products =
      data?.data?.products?.map((p: any) => ({
        title: p.product_title,
        price: p.product_price,
        image: p.product_photo,
        link: p.product_url,
      })) || [];

    return new Response(JSON.stringify(products), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Amazon fetch failed", details: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
