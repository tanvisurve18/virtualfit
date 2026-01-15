import { supabase } from "../lib/supabaseClient";

export async function fetchProducts(pageInfo = null) {
  const params = new URLSearchParams();
  params.append("limit", "20");
  if (pageInfo) params.append("page_info", pageInfo);

  const { data, error } = await supabase.functions.invoke(
    "shopify-products",
    {
      method: "GET",
      query: Object.fromEntries(params),
    }
  );

  if (error) throw error;
  return data;
}
