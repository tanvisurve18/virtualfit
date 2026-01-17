import { serve } from "https://deno.land/std/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

serve(async (req) => {
  // ✅ Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const RAPIDAPI_KEY = Deno.env.get("RAPIDAPI_KEY");
  const RAPIDAPI_HOST = Deno.env.get("RAPIDAPI_HOST");

  if (!RAPIDAPI_KEY || !RAPIDAPI_HOST) {
    return new Response(
      JSON.stringify({ error: "Missing RapidAPI secrets" }),
      { status: 500, headers: corsHeaders }
    );
  }

  const url =
    "https://real-time-amazon-data.p.rapidapi.com/search?query=men%20tshirt&country=IN&page=1";

  const apiRes = await fetch(url, {
    headers: {
      "X-RapidAPI-Key": RAPIDAPI_KEY,
      "X-RapidAPI-Host": RAPIDAPI_HOST,
    },
  });

  const json = await apiRes.json();

  const products =
    json?.data?.products?.map((item: any) => ({
      id: item.asin,
      title: item.product_title,
      image: item.product_photo,
      price: item.product_price,
      product_url: item.product_url,
    })) || [];

  return new Response(JSON.stringify(products), {
    status: 200,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
});
