// supabase/functions/ai-tryon/index.ts
// Using Replicate API (More Reliable!)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const REPLICATE_API_TOKEN = Deno.env.get("REPLICATE_API_TOKEN");
    
    if (!REPLICATE_API_TOKEN) {
      console.error("Missing REPLICATE_API_TOKEN");
      return new Response(
        JSON.stringify({ error: "Server configuration error: Missing REPLICATE_API_TOKEN" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("🎨 Virtual Try-On Request Received");

    // Get the form data
    const formData = await req.formData();
    const personImage = formData.get('person_image');
    const garmentImage = formData.get('garment_image');
    
    if (!personImage || !garmentImage) {
      return new Response(
        JSON.stringify({ error: "Missing person_image or garment_image" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("📤 Converting images to base64...");
    
    // Convert images to base64 data URLs
    const personBlob = personImage instanceof Blob ? personImage : new Blob([await personImage.arrayBuffer()]);
    const garmentBlob = garmentImage instanceof Blob ? garmentImage : new Blob([await garmentImage.arrayBuffer()]);
    
    const personArrayBuffer = await personBlob.arrayBuffer();
    const garmentArrayBuffer = await garmentBlob.arrayBuffer();
    
    const personBase64 = btoa(
      String.fromCharCode(...new Uint8Array(personArrayBuffer))
    );
    
    const garmentBase64 = btoa(
      String.fromCharCode(...new Uint8Array(garmentArrayBuffer))
    );

    const personDataUrl = `data:image/jpeg;base64,${personBase64}`;
    const garmentDataUrl = `data:image/png;base64,${garmentBase64}`;

    console.log("🚀 Creating Replicate prediction...");

    // Create prediction using IDM-VTON model
    const createResponse = await fetch("https://api.replicate.com/v1/predictions", {
      method: "POST",
      headers: {
        "Authorization": `Token ${REPLICATE_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        version: "c871bb9b046607b680449ecbae55fd8c6d945e0a1948644bf2361b3d021d3ff4",
        input: {
          human_img: personDataUrl,
          garm_img: garmentDataUrl,
          garment_des: "upper body garment",
        }
      })
    });

    if (!createResponse.ok) {
      const errorText = await createResponse.text();
      console.error("❌ Replicate create failed:", errorText);
      throw new Error(`Replicate API error: ${createResponse.status} - ${errorText}`);
    }

    const prediction = await createResponse.json();
    console.log("✅ Prediction created:", prediction.id);

    // Poll for completion (max 2 minutes)
    const maxAttempts = 60; // 60 attempts * 2 seconds = 2 minutes
    let attempts = 0;
    let result = prediction;

    while (attempts < maxAttempts) {
      if (result.status === "succeeded") {
        console.log("✅ Prediction succeeded!");
        break;
      }
      
      if (result.status === "failed" || result.status === "canceled") {
        console.error("❌ Prediction failed:", result.error);
        throw new Error(`Prediction failed: ${result.error || result.status}`);
      }

      // Wait 2 seconds before checking again
      await new Promise(resolve => setTimeout(resolve, 2000));
      attempts++;

      // Check prediction status
      const statusResponse = await fetch(
        `https://api.replicate.com/v1/predictions/${prediction.id}`,
        {
          headers: {
            "Authorization": `Token ${REPLICATE_API_TOKEN}`,
          }
        }
      );

      if (!statusResponse.ok) {
        throw new Error(`Failed to check prediction status: ${statusResponse.status}`);
      }

      result = await statusResponse.json();
      console.log(`📊 Status: ${result.status} (attempt ${attempts}/${maxAttempts})`);
    }

    if (result.status !== "succeeded") {
      throw new Error("Prediction timed out after 2 minutes");
    }

    // Get the output image URL
    const outputUrl = result.output;
    
    if (!outputUrl) {
      console.error("❌ No output URL in result:", result);
      throw new Error("No output image generated");
    }

    console.log("🖼️ Fetching result image from:", outputUrl);

    // Fetch the actual image
    const imageResponse = await fetch(outputUrl);
    
    if (!imageResponse.ok) {
      throw new Error(`Failed to fetch result image: ${imageResponse.status}`);
    }

    const imageBlob = await imageResponse.blob();
    console.log("✅ Success! Image size:", imageBlob.size, "bytes");

    return new Response(imageBlob, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "image/png",
      },
    });

  } catch (error: any) {
    console.error("💥 Error:", error);
    return new Response(
      JSON.stringify({ 
        error: "Virtual try-on failed",
        message: error.message,
        details: error.stack 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});