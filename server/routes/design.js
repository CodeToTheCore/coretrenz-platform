const express = require('express');
const router = express.Router();

// This matches the "http://localhost:5000/api/design/generate-clothing-visual" call
router.post('/generate-clothing-visual', async (req, res) => {
    try {
        const { prompt, type, color } = req.body;
        console.log(`Generating AI design for: ${prompt}`);

        // In a real setup, this is where DALL-E or Midjourney API goes.
        // For now, we return a high-quality placeholder based on the type.
        const mockImages = {
            "Hoodie": "https://images.unsplash.com/photo-1556821840-3a63f95609a7?q=80&w=1000",
            "T-Shirt": "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?q=80&w=1000",
            "Jeans": "https://images.unsplash.com/photo-1542272604-787c3835535d?q=80&w=1000"
        };

        const imageUrl = mockImages[type] || "https://images.unsplash.com/photo-1523381210434-271e8be1f52b?q=80&w=1000";

        res.json({
            success: true,
            imageUrl: imageUrl
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;