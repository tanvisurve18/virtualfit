// pages/api/ai-tryon.js
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { personImage, clothImage, productName } = req.body;
  
  const HF_TOKEN = process.env.HUGGINGFACE_API_TOKEN;
  
  if (!HF_TOKEN) {
    return res.status(500).json({ 
      error: 'Please add HUGGINGFACE_API_TOKEN to .env.local' 
    });
  }

  try {
    // Convert base64 to buffer
    const base64ToBuffer = (base64) => {
      const base64Data = base64.split(',')[1];
      return Buffer.from(base64Data, 'base64');
    };

    const personBuffer = base64ToBuffer(personImage);
    const clothResponse = await fetch(clothImage);
    const clothBuffer = Buffer.from(await clothResponse.arrayBuffer());

    // Create form data
    const FormData = require('form-data');
    const formData = new FormData();
    
    formData.append('human_img', personBuffer, {
      filename: 'person.jpg',
      contentType: 'image/jpeg'
    });
    
    formData.append('garm_img', clothBuffer, {
      filename: 'garment.jpg',
      contentType: 'image/jpeg'
    });
    
    formData.append('garment_des', productName || 'clothing');

    // Call Hugging Face
    const response = await fetch(
      'https://api-inference.huggingface.co/models/yisol/IDM-VTON',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${HF_TOKEN}`,
          ...formData.getHeaders()
        },
        body: formData
      }
    );

    if (!response.ok) {
      throw new Error(`HF API error: ${response.status}`);
    }

    const resultBuffer = await response.arrayBuffer();
    const base64Result = `data:image/jpeg;base64,${Buffer.from(resultBuffer).toString('base64')}`;

    return res.status(200).json({ success: true, result: base64Result });

  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}