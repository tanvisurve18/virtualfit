import Replicate from "replicate";

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false,
      error: 'Method not allowed' 
    });
  }

  const { personImage, clothImage, productName } = req.body;
  
  // Validate inputs
  if (!personImage || !clothImage) {
    return res.status(400).json({ 
      success: false,
      error: 'Missing required images' 
    });
  }

  // Initialize Replicate
  const replicate = new Replicate({
    auth: process.env.REPLICATE_API_TOKEN,
  });

  try {
    console.log('🤖 Starting AI virtual try-on...');
    console.log('📦 Product:', productName);
    console.log('🖼️ Person image size:', personImage.length, 'bytes');
    console.log('👕 Cloth image size:', clothImage.length, 'bytes');
    
    // CRITICAL: Use the EXACT model that works like Gemini
    // IDM-VTON is the best quality model for realistic try-on
    const output = await replicate.run(
      "cuuupid/idm-vton:c871bb9b046607b680449ecbae55fd8c6d945e0a1948644bf2361b3d021d3ff4",
      {
        input: {
          human_img: personImage,           // Base64 data URL (data:image/jpeg;base64,...)
          garm_img: clothImage,             // Base64 data URL
          garment_des: productName || "clothing item",
          is_checked: true,                 // CRITICAL: Enable AI garment parsing for better results
          is_checked_crop: false,           // Don't auto-crop - preserve full body
          denoise_steps: 30,                // Quality: 30 is optimal (10-50 range, higher=slower)
          seed: Math.floor(Math.random() * 1000000)  // Random seed for variation
        }
      }
    );

    console.log('✅ AI try-on generated successfully!');
    console.log('🔗 Result URL:', output);
    console.log('💰 Cost: ~$0.0023 per generation');
    
    // Output is a URL to the generated image
    return res.status(200).json({ 
      success: true,
      result: output,  // This will be a URL string like "https://replicate.delivery/pbxt/..."
      message: "Try-on generated successfully",
      cost: 0.0023,
      model: "IDM-VTON"
    });
    
  } catch (error) {
    console.error('❌ AI try-on error:', error);
    
    // Provide helpful error messages
    let errorMessage = "Failed to generate try-on";
    
    if (error.message?.includes('authentication')) {
      errorMessage = "Replicate API authentication failed. Check your REPLICATE_API_TOKEN";
    } else if (error.message?.includes('rate limit')) {
      errorMessage = "Rate limit exceeded. Please try again in a moment";
    } else if (error.message?.includes('invalid')) {
      errorMessage = "Invalid image format. Please use JPG or PNG images";
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    // Return error details
    return res.status(500).json({ 
      success: false,
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}