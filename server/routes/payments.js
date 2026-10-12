const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// API: Create a checkout session
router.post('/create-checkout-session', async (req, res) => { 
    try {
        const { cartItems } = req.body;

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: cartItems.map(item => ({
                price_data: {
                    currency: 'usd',
                    product_data: { name: item.name },
                    // Added Math.round to prevent decimal errors
                    unit_amount: Math.round(item.price * 100), 
                },
                quantity: item.qty,
            })),
            mode: 'payment',
            success_url: 'http://localhost:3000/success',
            cancel_url: 'http://localhost:3000/cancel',
        });

        res.json({ id: session.id });
    } catch (error) {
        console.error("STRIPE ERROR:", error.message);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;