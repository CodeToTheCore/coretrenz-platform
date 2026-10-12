/**
 * CORETRENZ BACKEND - MAIN SERVER
 * 
 * Developer Notes:
 * - This file initailizes the Express engine.
 * - dotenv.config() loads your "secret sauce" from .env
 */

// In server.js




require('dotenv').config(); 
const express = require('express');
const cors = require('cors');
const app = express();

// --- ADD THESE DEBUG LINES RIGHT HERE (Line 12 approx) ---
console.log("--- STRIPE CONNECTION CHECK ---");
console.log("Is Key Loaded?:", process.env.STRIPE_SECRET_KEY ? "✅ YES" : "❌ NO");
console.log("Key Starts With:", process.env.STRIPE_SECRET_KEY?.substring(0, 8));

// 1. IMPORT ALL ROUTES HERE
app.use(cors()); 
app.use(express.json()); 



// 2. MIDDLEWARE (Must come before routes!)
const marketplaceRoutes = require('./routes/marketplace');
const paymentRoutes = require('./routes/payments');
const designRoutes = require('./routes/design'); // Add this here


// 3. ATTACH THE ROUTES TO THE APP
app.use('/api/marketplace', marketplaceRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/design', designRoutes); // Add this here

// DEBUG LOGS
console.log("--- STRIPE CONNECTION CHECK ---");
console.log("Is Key Loaded?:", process.env.STRIPE_SECRET_KEY ? "✅ YES" : "❌ NO");

// API STATUS CHECK
app.get('/', (req, res) => {
    res.send("CoreTrenz API is online and Secure.");
});



// In server.js
app.post("/create-checkout-session", async (req, res) => {
    try {
      // ... your session creation code ...
    } catch (e) {
      console.error("STRIPE API ERROR:", e.message); // <--- LOOK AT YOUR TERMINAL FOR THIS
      res.status(500).json({ error: e.message });
    }
  });

// START SERVER
const PORT = process.env.PORT || 5000;
app.listen(PORT, () =>{
    console.log(`Server running on http://localhost:${PORT}`);
});