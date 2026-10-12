const express = require('express');
const router = express.Router(); // <--- This line MUST be here and at the top!

// API: Generate Clothing Design
router.post('/generate-clothing-visual', async (req, res) => {
    const { prompt, color, type } = req.body;

    try {
        // This is a free AI image generator proxy (Pollinations) 
        // It creates an image based on your text prompt instantly!
        const mockGeneratedUrl = `https://pollinations.ai/p/${encodeURIComponent(prompt + " " + type + " " + color)}?width=1024&height=1024&seed=42`;

        res.json({ 
            success: true, 
            imageUrl: mockGeneratedUrl 
        });
    } catch (error) {
        console.error("Design Generation Error:", error);
        res.status(500).json({ error: "Image generation failed" });
    }
});

// A simple test route to make sure this file is working
router.get('/test', (req, res) => {
    res.json({ message: "Design Studio API is active!" });
});

// API: AI Innovation (Adding pockets, patches, or textures)
router.post('/innovate', async (req, res) => {
    const { baseImage, innovationType, detail } = req.body;
    // This will eventually call DALL-E or Midjourney
    // For now, it returns an AI-generated design element
    const innovationUrl = `https://pollinations.ai/p/${encodeURIComponent(innovationType + " " + detail)}?width=512&height=512`;
    
    res.json({
        success: true,
        elementUrl: innovationUrl
    });
});

module.exports = router; // Now 'router' is defined, so this won't crash!