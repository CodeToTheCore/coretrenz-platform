 
/**
 * ============================================================
 * CORETRENZ PLATFORM - Main Application Entry
 * ============================================================
 * Developer Notes:
 * - All sections are labeled with SECTION: comments
 * - All components labeled with COMPONENT: comments
 * - All state variables labeled with STATE: comments
 * - All API calls labeled with API: comments
 * - All handlers labeled with HANDLER: comments
 * - Adjust COMMISSION_PERCENT, DELIVERY_CUT, CARRIER_FEE below
 *   to change business logic percentages without breaking code
 * ============================================================
 */
 
import { useState, useEffect, useRef, useCallback } from "react";
import { loadStripe } from "@stripe/stripe-js"; 

const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY);
const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";
 
// ============================================================
// SECTION: BUSINESS LOGIC CONSTANTS
// Developers: Change these values to adjust fees/percentages
// ============================================================
const DISCOUNT_COMMISSION_PERCENT = 15;   // % CoreTrenz keeps from found discount
const DELIVERY_PLATFORM_CUT = 20;         // % CoreTrenz takes from delivery fee
const CUSTOMER_FINDER_FEE = 10;           // % charged to customer for finding carrier
const TAX_RATE = 0.08875;                 // NYC + NYS combined sales tax
const MILES_RATE = 2.5;                   // $ per mile for delivery
 
// ============================================================
// SECTION: DUMMY / SAMPLE DATA
// Developers: Replace these arrays with real API data later
// Each object is commented with its field purpose
// ============================================================
 
// --- SAMPLE: Partner Store Brands ---
// --- PARTNER BRANDS ---
// CoreTrenz partners with brand COMPANIES directly (not stores).
// To start earning on a brand: join its affiliate program, or make a deal with the brand,
// then paste the tracking link into affiliateUrl and any shopper discount code into promoCode.
// Until then, links go to the brand's normal site (no commission). Tracker: BRAND-PARTNERS.md
const BRANDS = [
  { id: 1, name: "Cult of Individuality", category: "Streetwear & Denim", url: "https://cultofindividuality.com", logo: "COI" },
  { id: 2, name: "BKYS", category: "Streetwear & Denim", url: "https://www.premiumloungeny.com/pages/bkys", logo: "BKYS" },
  { id: 3, name: "Smoke Rise NY", category: "Streetwear & Denim", url: "https://smokeriseny.com", logo: "SR" },
  { id: 4, name: "The North Face", category: "Outerwear", url: "https://www.thenorthface.com", logo: "TNF" },
  { id: 5, name: "Columbia", category: "Outerwear", url: "https://www.columbia.com", logo: "COL" },
  { id: 6, name: "Pelle Pelle", category: "Outerwear", url: "https://pellepelle.com", logo: "PP" },
  { id: 7, name: "New Balance", category: "Footwear", url: "https://www.newbalance.com", logo: "NB" },
  { id: 8, name: "Timberland", category: "Footwear", url: "https://www.timberland.com", logo: "TBL" },
  { id: 9, name: "NBA Gear", category: "Sports", url: "https://store.nba.com", logo: "NBA" },
  { id: 10, name: "G-Star Raw", category: "Streetwear & Denim", url: "https://www.g-star.com", logo: "GSR" },
  { id: 11, name: "Ewing Athletics", category: "Footwear", url: "https://shop.ewingathletics.com", logo: "EWG" },
  // TODO: confirm Voyage Studio's website. voyagestudio.com wasn't responding on Oct 20, 2026
  { id: 12, name: "Voyage Studio", category: "Streetwear & Denim", url: "https://www.voyagestudio.com", logo: "VS" },
  { id: 13, name: "Nike", category: "Footwear", url: "https://www.nike.com", logo: "NIKE" },
  { id: 14, name: "Avirex", category: "Outerwear", url: "https://www.avirex.com", logo: "AVX" },
].map(brand => ({ affiliateUrl: null, promoCode: null, note: "", ...brand }));

const BRAND_CATEGORIES = ["All", ...new Set(BRANDS.map(b => b.category))];

// The link every "Shop" button uses. Tagged so the brand's analytics show
// shoppers came from CoreTrenz, which is proof to show when pitching a partnership.
const shopLink = (brand) => {
  const link = new URL(brand.affiliateUrl || brand.url);
  link.searchParams.set("utm_source", "coretrenz");
  link.searchParams.set("utm_medium", "referral");
  link.searchParams.set("utm_campaign", "partner-brands");
  return link.toString();
};

// --- SAMPLE: Cornell's Denim Inventory ---
// Developers: Replace image URLs with real product photos
// Each item: id, name, brand, price, category, size, color, stock, image(placeholder)
const CORNELLS_INVENTORY = [
  { id: "cd001", name: "Cornell's Classic Denim Jacket", brand: "Cornell's Denim", price: 189, category: "Jackets", cut: "Regular Fit", sizes: ["S","M","L","XL","XXL"], colors: ["Indigo", "Black", "Light Wash"], stock: 8, image: null, description: "Signature denim jacket with custom Cornell's Denim embroidery." },
  { id: "cd002", name: "CoreTrenz Slim Leg Jeans", brand: "Cornell's Denim", price: 129, category: "Jeans", cut: "Slim Fit", sizes: ["30/30","30/32","32/30","32/32","34/32","36/32"], colors: ["Dark Indigo", "Grey Wash"], stock: 12, image: null, description: "Premium slim leg denim crafted with Cone Mills USA denim." },
  { id: "cd003", name: "Brooklyn Oversized Hoodie", brand: "Cornell's Denim", price: 99, category: "Hoodies", cut: "Oversized", sizes: ["S","M","L","XL","XXL","XXXL"], colors: ["Black", "Charcoal", "Navy"], stock: 20, image: null, description: "Heavy 400gsm fleece hoodie with embroidered NYC logo." },
  { id: "cd004", name: "NYC Puffer Jacket", brand: "Cornell's Denim", price: 249, category: "Jackets", cut: "Puffy / Insulated", sizes: ["S","M","L","XL","XXL"], colors: ["Black", "Navy", "Olive"], stock: 5, image: null, description: "Water resistant puffer with down-alternative fill." },
  { id: "cd005", name: "Trendsetter Cargo Pants", brand: "Cornell's Denim", price: 119, category: "Pants", cut: "Baggy / Relaxed", sizes: ["S","M","L","XL","XXL"], colors: ["Khaki", "Black", "Olive", "Camo"], stock: 15, image: null, description: "Tactical-style cargo with 8 pockets and adjustable hem." },
  { id: "cd006", name: "Cornell's 5-Panel Cap", brand: "Cornell's Denim", price: 49, category: "Accessories", cut: "One Size", sizes: ["One Size"], colors: ["Black", "White", "Navy"], stock: 30, image: null, description: "Structured 5-panel snapback with embroidered CD logo." },
  { id: "cd007", name: "Broadway Crewneck Sweater", brand: "Cornell's Denim", price: 89, category: "Sweaters", cut: "Regular Fit", sizes: ["S","M","L","XL","XXL"], colors: ["Heather Grey", "Black", "Burgundy"], stock: 18, image: null, description: "Mid-weight fleece crewneck, perfect for NYC winters." },
  { id: "cd008", name: "Uptown Classic Sneakers", brand: "Cornell's Denim", price: 165, category: "Footwear", cut: "Standard", sizes: ["7","8","9","10","11","12","13"], colors: ["White/Gold", "Black/Red"], stock: 10, image: null, description: "Low-top leather sneakers with CD branding on tongue." },
  { id: "cd009", name: "Denim Shorts - Summer Cut", brand: "Cornell's Denim", price: 79, category: "Shorts", cut: "Relaxed", sizes: ["28","30","32","34","36"], colors: ["Light Wash", "Dark Wash"], stock: 14, image: null, description: "Summer-ready denim shorts with distressed hem." },
  { id: "cd010", name: "Signature Leather Belt", brand: "Cornell's Denim", price: 59, category: "Accessories", cut: "One Size", sizes: ["S/M","L/XL"], colors: ["Black", "Brown"], stock: 25, image: null, description: "Genuine leather belt with CD embossed buckle." },
  { id: "cd011", name: "CoreTrenz Scarf", brand: "Cornell's Denim", price: 45, category: "Accessories", cut: "One Size", sizes: ["One Size"], colors: ["Black/Gold", "Navy/Red"], stock: 20, image: null, description: "Wool-blend scarf with woven CoreTrenz pattern." },
  { id: "cd012", name: "Vintage Wash Tee", brand: "Cornell's Denim", price: 55, category: "T-Shirts", cut: "Oversized", sizes: ["XS","S","M","L","XL","XXL"], colors: ["Vintage White", "Washed Black", "Sage"], stock: 35, image: null, description: "100% ringspun cotton tee with acid wash treatment." },
];
 
// --- CORNELL'S PICKS: products from partner brands I've been tracking ---
// These link to the brand's site (not the CoreTrenz cart) until there's a deal with the brand.
const PARTNER_INVENTORY = [
  { id: "p001", name: "Cult of Individuality Mona Lisa Tee", brand: "Cult of Individuality", price: 89, category: "T-Shirts", cut: "Oversized", sizes: ["S","M","L","XL"], colors: ["Winter White"], stock: 3, image: null },
  { id: "p002", name: "Cult of Individuality 'CULT' Graphic Tee", brand: "Cult of Individuality", price: 85, category: "T-Shirts", cut: "Oversized", sizes: ["S","M","L","XL","XXL"], colors: ["Cream"], stock: 5, image: null },
  { id: "p003", name: "BKYS Skeleton Guitarist Hoodie", brand: "BKYS", price: 125, category: "Hoodies", cut: "Regular Fit", sizes: ["M","L","XL","XXL"], colors: ["Black Glitter"], stock: 4, image: null },
  { id: "p004", name: "BKYS Skeleton Crate Digger Hoodie", brand: "BKYS", price: 125, category: "Hoodies", cut: "Regular Fit", sizes: ["M","L","XL"], colors: ["Black Glitter"], stock: 2, image: null },
  { id: "p005", name: "Smoke Rise Glory Tiger Hoodie", brand: "Smoke Rise NY", price: 148, category: "Hoodies", cut: "Cropped / Regular", sizes: ["M","L","XL","XXL"], colors: ["Rust Red"], stock: 3, image: null },
  { id: "p006", name: "Smoke Rise Metal Graphic Jacket", brand: "Smoke Rise NY", price: 195, category: "Jackets", cut: "Regular Fit", sizes: ["M","L","XL"], colors: ["Black/Red"], stock: 2, image: null },
  { id: "p007", name: "NY Knicks Satin Bomber Jacket", brand: "NBA Gear", price: 185, category: "Jackets", cut: "Regular Fit", sizes: ["M","L","XL","XXL"], colors: ["Black/Gold"], stock: 4, image: null },
  { id: "p008", name: "Chicago Bulls Zip-Up Hoodie", brand: "NBA Gear", price: 95, category: "Hoodies", cut: "Regular Fit", sizes: ["S","M","L","XL","XXL"], colors: ["Red"], stock: 6, image: null },
  { id: "p009", name: "NY Yankees Varsity Jacket", brand: "NBA Gear", price: 165, category: "Jackets", cut: "Regular Fit", sizes: ["M","L","XL","XXL"], colors: ["Navy/White"], stock: 5, image: null },
  { id: "p010", name: "Columbia Watertight Rain Jacket", brand: "Columbia", price: 120, category: "Jackets", cut: "Regular Fit", sizes: ["S","M","L","XL","XXL"], colors: ["Charcoal", "Green"], stock: 7, image: null },
  { id: "p011", name: "North Face Mountain Jacket", brand: "The North Face", price: 220, category: "Jackets", cut: "Regular Fit", sizes: ["S","M","L","XL"], colors: ["Red/Black"], stock: 3, image: null },
  { id: "p012", name: "Columbia Puffer Jacket Shiny", brand: "Columbia", price: 189, category: "Jackets", cut: "Puffy", sizes: ["S","M","L","XL","XXL"], colors: ["Navy","Black"], stock: 6, image: null },
];
 
// --- SAMPLE: Third-Party Marketplace Items (Amazon/eBay/Shopify mock) ---
const MARKETPLACE_ITEMS = [
  { id: "mkt001", name: "Premium Denim Jacket - Vintage Style", source: "Amazon", price: 79.99, originalPrice: 119.99, discount: 33, rating: 4.3, reviews: 1247, category: "Jackets", image: null },
  { id: "mkt002", name: "Oversized Streetwear Hoodie", source: "eBay", price: 45.00, originalPrice: 89.00, discount: 49, rating: 4.1, reviews: 589, category: "Hoodies", image: null },
  { id: "mkt003", name: "Slim Fit Black Cargo Pants", source: "Shopify", price: 65.00, originalPrice: 85.00, discount: 24, rating: 4.5, reviews: 892, category: "Pants", image: null },
  { id: "mkt004", name: "High-Top Basketball Sneakers", source: "Amazon", price: 89.00, originalPrice: 140.00, discount: 36, rating: 4.4, reviews: 2100, category: "Footwear", image: null },
  { id: "mkt005", name: "Graphic Tee - Urban Art Print", source: "Etsy", price: 35.00, originalPrice: 50.00, discount: 30, rating: 4.8, reviews: 340, category: "T-Shirts", image: null },
  { id: "mkt006", name: "Puffer Vest - Lightweight", source: "Walmart", price: 42.00, originalPrice: 68.00, discount: 38, rating: 3.9, reviews: 450, category: "Jackets", image: null },
];
 
// --- SAMPLE: Inventory Analytics Data (fake store purchase records) ---
// Developers: Replace with real spreadsheet uploads or database queries
const INVENTORY_ANALYTICS = {
  imanSports: {
    totalInvested: 48500,
    totalRevenue: 72300,
    profitMargin: 49.07,
    topItem: "NY Knicks Satin Bomber",
    lowStock: ["Smoke Rise Metal Graphic Jacket", "BKYS Skeleton Crate Digger Hoodie"],
    monthlyOrders: [120, 145, 180, 160, 200, 220, 190, 175, 210, 240, 260, 195],
  },
  blueJeans: {
    totalInvested: 32000,
    totalRevenue: 51800,
    profitMargin: 61.88,
    topItem: "North Face Mountain Jacket",
    lowStock: ["Columbia Watertight Rain Jacket - S"],
    monthlyOrders: [90, 105, 130, 110, 155, 170, 145, 135, 160, 185, 200, 150],
  },
  cornellsDenim: {
    totalInvested: 18000,
    totalRevenue: 27600,
    profitMargin: 53.33,
    topItem: "Brooklyn Oversized Hoodie",
    lowStock: ["NYC Puffer Jacket"],
    monthlyOrders: [30, 45, 60, 55, 80, 95, 75, 70, 88, 110, 125, 95],
  },
};
 
// --- SAMPLE: Registered Carriers (fake data) ---
const SAMPLE_CARRIERS = [
  { id: "c001", name: "Marcus T.", vehicle: "Bike", zone: "Manhattan", rating: 4.9, deliveries: 312 },
  { id: "c002", name: "Jada S.", vehicle: "Car", zone: "Bronx/Manhattan", rating: 4.7, deliveries: 189 },
  { id: "c003", name: "Devon R.", vehicle: "E-Bike", zone: "Brooklyn/Manhattan", rating: 4.8, deliveries: 245 },
];
 
// --- SAMPLE: Fabric Options for Custom Designer ---
const FABRICS = [
  { id: "f1", name: "100% Ringspun Cotton", weight: "180gsm", feel: "Soft, breathable", best: "T-Shirts, Casual" },
  { id: "f2", name: "Heavyweight French Terry", weight: "400gsm", feel: "Thick, warm fleece", best: "Hoodies, Sweaters" },
  { id: "f3", name: "Cone Mills Selvedge Denim", weight: "12oz", feel: "Structured, stiff then softens", best: "Jeans, Jackets" },
  { id: "f4", name: "Ripstop Nylon", weight: "70D", feel: "Lightweight, wind-resistant", best: "Cargo Pants, Shells" },
];
 
// --- SAMPLE: Printing/Sewing Machines ---
const DESIGN_MACHINES = [
  { id: "m1", name: "Brother PR680W Embroidery Machine", type: "Embroidery", fileFormat: ".DST / .PES", programming: "USB upload or Wi-Fi transfer", connection: "Wi-Fi / USB" },
  { id: "m2", name: "Epson F2100 DTG Printer", type: "Direct-to-Garment Print", fileFormat: ".PNG / .TIFF (RGB)", programming: "Garment Creator 2 Software", connection: "USB / Network" },
  { id: "m3", name: "Silhouette Cameo 4", type: "Heat Transfer Vinyl Cut", fileFormat: ".SVG / .PNG", programming: "Silhouette Studio", connection: "Bluetooth / USB" },
  { id: "m4", name: "Tajima TMBR-S1501 Industrial", type: "Industrial Embroidery", fileFormat: ".DST / .TAP", programming: "DGML by Pulse", connection: "USB / LAN" },
];
 
// ============================================================
// SECTION: LOGO COMPONENTS
// Developers: Replace SVG paths with real logo files if needed
// ============================================================
 
// COMPONENT: CoreTrenz Logo SVG
const CoreTrenzLogo = ({ size = 40, showText = true }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
    {/* CoreTrenz brand mark - hexagonal CT monogram */}
    <svg width={size} height={size} viewBox="0 0 40 40">
      <defs>
        <linearGradient id="ctGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#e85d04" />
          <stop offset="100%" stopColor="#f48c06" />
        </linearGradient>
      </defs>
      {/* Hexagon background */}
      <polygon points="20,2 36,11 36,29 20,38 4,29 4,11" fill="url(#ctGrad)" />
      {/* CT letters */}
      <text x="20" y="26" textAnchor="middle" fontSize="15" fontWeight="800" fill="white" fontFamily="Arial Black, sans-serif">CT</text>
    </svg>
    {showText && (
      <div>
        <div style={{ fontSize: 18, fontWeight: 800, color: "#e85d04", letterSpacing: "-0.5px", lineHeight: 1 }}>CoreTrenz</div>
        <div style={{ fontSize: 9, color: "#666", letterSpacing: 2, textTransform: "uppercase" }}>by CoreTrenz Inc.</div>
      </div>
    )}
  </div>
);
 
// COMPONENT: Cornell's Denim Logo SVG
const CornellsDenimLogo = ({ size = 40, showText = true }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
    {/* Cornell's Denim brand mark - thread needle icon with CD */}
    <svg width={size} height={size} viewBox="0 0 40 40">
      <rect width="40" height="40" rx="6" fill="#1a1a2e" />
      {/* Stylized needle and thread */}
      <circle cx="20" cy="12" r="6" fill="none" stroke="#c9a84c" strokeWidth="2" />
      <line x1="20" y1="18" x2="20" y2="36" stroke="#c9a84c" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="20" y1="36" x2="15" y2="30" stroke="#4fc3f7" strokeWidth="1.5" strokeLinecap="round" />
      <text x="20" y="14" textAnchor="middle" fontSize="7" fontWeight="800" fill="#c9a84c" fontFamily="Arial">CD</text>
    </svg>
    {showText && (
      <div>
        <div style={{ fontSize: 16, fontWeight: 800, color: "#1a1a2e", letterSpacing: 1 }}>Cornell's</div>
        <div style={{ fontSize: 12, fontWeight: 600, color: "#c9a84c", letterSpacing: 3, textTransform: "uppercase", marginTop: -2 }}>Denim</div>
      </div>
    )}
  </div>
);
 
// ============================================================
// SECTION: UTILITY FUNCTIONS
// Developers: Pure helper functions - safe to modify
// ============================================================
 
// UTILITY: Calculate delivery fee based on miles and item weight
const calcDeliveryFee = (miles, weightLbs, items) => {
  const base = miles * MILES_RATE;
  const weightSurcharge = weightLbs > 5 ? (weightLbs - 5) * 0.5 : 0;
  const itemSurcharge = items > 3 ? (items - 3) * 1.0 : 0;
  const subtotal = base + weightSurcharge + itemSurcharge;
  const platformFee = subtotal * (CUSTOMER_FINDER_FEE / 100);
  return { carrierPay: subtotal, platformFee, total: subtotal + platformFee };
};
 
// UTILITY: Calculate discount savings and CoreTrenz commission
const calcDiscountSavings = (originalPrice, discountedPrice) => {
  const saved = originalPrice - discountedPrice;
  const commission = saved * (DISCOUNT_COMMISSION_PERCENT / 100);
  const customerSavings = saved - commission;
  return { saved, commission, customerSavings };
};
 
// UTILITY: Calculate cart total with tax
const calcCartTotal = (items) => {
  const subtotal = items.reduce((acc, item) => acc + item.price * item.qty, 0);
  const tax = subtotal * TAX_RATE;
  return { subtotal, tax, total: subtotal + tax };
};
 
// ============================================================
// SECTION: SUB-COMPONENTS
// ============================================================
 
// COMPONENT: Navigation Tab Button with hover animation
const NavTab = ({ label, active, onClick }) => (
  <button
    onClick={onClick}
    style={{
      padding: "10px 18px",
      background: active ? "#e85d04" : "transparent",
      color: active ? "white" : "#ccc",
      border: active ? "none" : "1px solid rgba(255,255,255,0.15)",
      borderRadius: 8,
      cursor: "pointer",
      fontWeight: active ? 700 : 500,
      fontSize: 13,
      transition: "all 0.2s ease",
      whiteSpace: "nowrap",
    }}
    onMouseEnter={e => { if (!active) { e.target.style.background = "rgba(232,93,4,0.2)"; e.target.style.color = "#e85d04"; }}}
    onMouseLeave={e => { if (!active) { e.target.style.background = "transparent"; e.target.style.color = "#ccc"; }}}
  >
    {label}
  </button>
);
 
// COMPONENT: Product Card with hover effect
const ProductCard = ({ item, onAddToCart, showSource = false }) => {
  const [hovered, setHovered] = useState(false);
  const [selectedSize, setSelectedSize] = useState(item.sizes?.[0] || "");
  const [selectedColor, setSelectedColor] = useState(item.colors?.[0] || "");
 
  // Generate a colorful placeholder based on item category
  const categoryColors = {
    Jackets: ["#1a1a2e", "#e85d04"],
    Jeans: ["#1e3a5f", "#4fc3f7"],
    Hoodies: ["#2d1b69", "#c9a84c"],
    Pants: ["#2d4a22", "#8bc34a"],
    Accessories: ["#4a1a1a", "#e57373"],
    "T-Shirts": ["#1a2d4a", "#64b5f6"],
    Sweaters: ["#3d2b1f", "#a1887f"],
    Footwear: ["#1b2838", "#90caf9"],
    Shorts: ["#1a3040", "#4dd0e1"],
  };
  const [bg, accent] = categoryColors[item.category] || ["#222", "#e85d04"];
 
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: "#1a1a2e",
        borderRadius: 12,
        overflow: "hidden",
        border: hovered ? "1px solid #e85d04" : "1px solid rgba(255,255,255,0.08)",
        transition: "all 0.3s ease",
        transform: hovered ? "translateY(-4px)" : "none",
        boxShadow: hovered ? "0 8px 32px rgba(232,93,4,0.2)" : "none",
      }}
    >
      {/* Product Image Placeholder */}
      <div style={{
        height: 180,
        background: `linear-gradient(135deg, ${bg}, ${accent}22)`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        padding: 16,
      }}>
        {/* Cornell's Denim brand watermark on placeholder */}
        <div style={{ fontSize: 32, opacity: 0.15, fontWeight: 900, color: "#fff", textAlign: "center" }}>
          {item.brand === "Cornell's Denim" ? "CD" : item.brand?.substring(0, 3).toUpperCase()}
        </div>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginTop: 4 }}>{item.category}</div>
        {/* Developers: Replace above placeholder with <img src={item.image} /> */}
 
        {/* Stock badge */}
        {item.stock <= 3 && (
          <div style={{ position: "absolute", top: 8, left: 8, background: "#c62828", color: "white", fontSize: 10, padding: "3px 8px", borderRadius: 20, fontWeight: 700 }}>
            Only {item.stock} left!
          </div>
        )}
        {/* Discount badge */}
        {item.discount && (
          <div style={{ position: "absolute", top: 8, right: 8, background: "#e85d04", color: "white", fontSize: 10, padding: "3px 8px", borderRadius: 20, fontWeight: 700 }}>
            -{item.discount}%
          </div>
        )}
        {/* Source badge for marketplace */}
        {showSource && item.source && (
          <div style={{ position: "absolute", bottom: 8, right: 8, background: "rgba(0,0,0,0.7)", color: "#c9a84c", fontSize: 10, padding: "3px 8px", borderRadius: 20 }}>
            {item.source}
          </div>
        )}
      </div>
 
      {/* Product Info */}
      <div style={{ padding: "12px 14px" }}>
        <div style={{ fontSize: 12, color: "#c9a84c", fontWeight: 600, marginBottom: 2 }}>{item.brand}</div>
        <div style={{ fontSize: 14, color: "#f0f0f0", fontWeight: 600, marginBottom: 6, lineHeight: 1.3 }}>{item.name}</div>
 
        {/* Cut / Style info */}
        {item.cut && <div style={{ fontSize: 11, color: "#888", marginBottom: 8 }}>Cut: {item.cut}</div>}
 
        {/* Size selector */}
        {item.sizes && item.sizes.length > 1 && (
          <div style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 10, color: "#888", marginBottom: 4 }}>Size:</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
              {item.sizes.map(sz => (
                <button
                  key={sz}
                  onClick={() => setSelectedSize(sz)}
                  style={{
                    padding: "2px 8px", fontSize: 11,
                    background: selectedSize === sz ? "#e85d04" : "rgba(255,255,255,0.08)",
                    color: selectedSize === sz ? "white" : "#aaa",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 4, cursor: "pointer",
                  }}
                >{sz}</button>
              ))}
            </div>
          </div>
        )}
 
        {/* Price row */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 8 }}>
          <div>
            <span style={{ fontSize: 16, fontWeight: 700, color: "#e85d04" }}>${item.price}</span>
            {item.originalPrice && (
              <span style={{ fontSize: 12, color: "#666", textDecoration: "line-through", marginLeft: 6 }}>${item.originalPrice}</span>
            )}
          </div>
          {/* Rating */}
          {item.rating && (
            <div style={{ fontSize: 11, color: "#c9a84c" }}>
              {"★".repeat(Math.round(item.rating))} {item.rating}
            </div>
          )}
        </div>
 
        {/* Add to Cart button */}
        <button
          onClick={() => onAddToCart({ ...item, selectedSize, selectedColor, qty: 1 })}
          style={{
            width: "100%",
            marginTop: 10,
            padding: "8px 0",
            background: "#e85d04",
            color: "white",
            border: "none",
            borderRadius: 8,
            fontWeight: 700,
            fontSize: 13,
            cursor: "pointer",
            transition: "background 0.2s",
          }}
          onMouseEnter={e => e.target.style.background = "#f48c06"}
          onMouseLeave={e => e.target.style.background = "#e85d04"}
        >
          Add to Cart
        </button>
      </div>
    </div>
  );
};
 
// COMPONENT: Animated rotating brand ticker
const BrandTicker = () => {
  const [offset, setOffset] = useState(0);
  useEffect(() => {
    // Animate brand ticker scroll
    const interval = setInterval(() => {
      setOffset(prev => (prev - 1) % (BRANDS.length * 120));
    }, 30);
    return () => clearInterval(interval);
  }, []);
 
  return (
    <div style={{ overflow: "hidden", background: "#e85d04", padding: "8px 0" }}>
      <div style={{ display: "flex", gap: 32, transform: `translateX(${offset}px)`, whiteSpace: "nowrap", transition: "transform 0.03s linear" }}>
        {[...BRANDS, ...BRANDS].map((brand, i) => (
          <a key={i} href={shopLink(brand)} target="_blank" rel="noopener noreferrer"
            style={{ color: "white", fontWeight: 700, fontSize: 12, textDecoration: "none", letterSpacing: 1, opacity: 0.9 }}>
            {brand.name.toUpperCase()} •
          </a>
        ))}
      </div>
    </div>
  );
};
 
// COMPONENT: AI Discount Bot Chat UI
const AIDiscountBot = ({ cartItems }) => {
  const [messages, setMessages] = useState([
    { role: "bot", text: "Hey! I'm the CoreTrenz Discount AI. I scan Amazon, eBay, Shopify, Walmart, Etsy, and more to find you the best deals. Add items to cart and I'll search for hidden discounts!" }
  ]);
  const [input, setInput] = useState("");
  const [searching, setSearching] = useState(false);

  
// Example of how the Bot should now "Search"
const fetchLiveDeals = async (query) => {
  try {
    const res = await fetch(`${API_URL}/api/marketplace/search?query=${query}`);
    const data = await res.json();
    return data.results; // This returns the Amazon, eBay, and Shopify deals!
  } catch (err) {
    return [];
  }
};

 
  // HANDLER: Simulate AI discount search
  // const handleSearch = async () => {
  //   if (!input.trim() && cartItems.length === 0) return;
  //   setSearching(true);
  //   const query = input || cartItems[0]?.name;
  //   setMessages(prev => [...prev, { role: "user", text: input || `Search discounts for my cart (${cartItems.length} items)` }]);
  //   setInput("");
 
  //   // API: Replace this setTimeout with real discount API call
  //   // Example: fetch('/api/discount-search', { method: 'POST', body: JSON.stringify({ query }) })
  //   await new Promise(r => setTimeout(r, 1800));
 
  //   // Simulate found discount
  //   const mockDiscount = Math.floor(Math.random() * 30) + 10;
  //   const mockOriginal = 120 + Math.floor(Math.random() * 80);
  //   const mockDiscounted = Math.round(mockOriginal * (1 - mockDiscount / 100));
  //   const { saved, commission, customerSavings } = calcDiscountSavings(mockOriginal, mockDiscounted);
 
  //   setMessages(prev => [...prev, {
  //     role: "bot",
  //     text: `Found a discount for "${query}"!\n\n` +
  //       `Original price: $${mockOriginal}\n` +
  //       `Discounted price: $${mockDiscounted} (-${mockDiscount}%)\n\n` +
  //       `Total saved: $${saved.toFixed(2)}\n` +
  //       `CoreTrenz fee (${DISCOUNT_COMMISSION_PERCENT}%): $${commission.toFixed(2)}\n` +
  //       `You save: $${customerSavings.toFixed(2)} 🎉\n\n` +
  //       `CoreTrenz only takes a small cut — you keep most of the savings!`
      // };
    // setSearching(false);
  //   }]);
    const handleSearch = async () => {
      if (!input.trim() && cartItems.length === 0) return;
      setSearching(true);
       const query = input || (cartItems.length > 0 ? cartItems[0].name : "jeans");
  //Add the user's message to the chat window
  setMessages(prev => [...prev, {role: "user", text: input || `searchimg for ${query}`}]);
  setInput("");
      try {
        // This hits your server running on 5000!
        // Fetch from Node.js Server
        const response = await fetch(`${API_URL}/api/marketplace/search?query=${query}`);
        const data = await response.json();
        if (data.success && data.results.length > 0) {
        // Create a nice list of the results we saw in your browser earlier
        // format the results into a string
        const botResponse = data.results.map(item =>
         `• ${item.name}: $${item.price} on ${item.source}`
        ).join('\n');
        // Logic to show the eBay/Amazon results in the chat window...
        setMessages(prev => [...prev, { role: "bot", text: `I Found this real-time deal for "${query}":\n\n${botResponse}\n\nCoreTrenz is ready to help you save!` }]);
      }
      } catch (err) {
        console.error("Server Connection Error", err);
        setMessages(prev => [...prev, { 
          role: "bot", 
          text: "I can't reach the warehouse right now. Please make sure the server is running on Port 5000!" 
        }]);
      }
      setSearching(false);
    
  };
 
  return (
    <div style={{ background: "#0d0d1a", borderRadius: 12, border: "1px solid rgba(232,93,4,0.3)", overflow: "hidden" }}>
      <div style={{ background: "#e85d04", padding: "12px 16px", display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#fff", animation: "pulse 1.5s infinite" }} />
        <span style={{ color: "white", fontWeight: 700, fontSize: 14 }}>CoreTrenz AI Discount Bot</span>
        <span style={{ color: "rgba(255,255,255,0.7)", fontSize: 11, marginLeft: "auto" }}>Scans 8+ platforms</span>
      </div>
 
      {/* Message thread */}
      <div style={{ height: 240, overflowY: "auto", padding: 12, display: "flex", flexDirection: "column", gap: 10 }}>
        {messages.map((msg, i) => (
          <div key={i} style={{ alignSelf: msg.role === "user" ? "flex-end" : "flex-start", maxWidth: "80%" }}>
            <div style={{
              background: msg.role === "user" ? "#e85d04" : "#1a1a2e",
              color: "white",
              padding: "8px 12px",
              borderRadius: msg.role === "user" ? "12px 12px 0 12px" : "12px 12px 12px 0",
              fontSize: 12,
              lineHeight: 1.5,
              whiteSpace: "pre-line",
              border: msg.role === "bot" ? "1px solid rgba(255,255,255,0.08)" : "none",
            }}>
              {msg.text}
            </div>
          </div>
        ))}
        {searching && (
          <div style={{ alignSelf: "flex-start", color: "#e85d04", fontSize: 12, display: "flex", gap: 4 }}>
            <span style={{ animation: "spin 1s linear infinite", display: "inline-block" }}>⏳</span> Scanning platforms for best price...
          </div>
        )}
      </div>
 
      {/* Input row */}
      <div style={{ padding: "8px 12px", borderTop: "1px solid rgba(255,255,255,0.08)", display: "flex", gap: 8 }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleSearch()}
          placeholder="Search item or scan cart for discounts..."
          style={{ flex: 1, background: "#1a1a2e", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 8, padding: "8px 12px", color: "white", fontSize: 12 }}
        />
        <button onClick={handleSearch} style={{ background: "#e85d04", border: "none", borderRadius: 8, padding: "8px 14px", color: "white", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
          {cartItems.length > 0 ? `Scan Cart (${cartItems.length})` : "Search"}
        </button>
      </div>
    </div>
  );
};
 
// COMPONENT: Signup/Register Modal with Terms Checkbox
const SignupModal = ({ type, onClose, onSuccess }) => {
  // STATE: Form fields
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "", address: "", vehicle: "", zone: "", agreed: false, adultAgreed: false });
  const [step, setStep] = useState(1); // 1=form, 2=terms, 3=success
  const isCarrier = type === "carrier";
 
  const handleSubmit = () => {
    if (!form.agreed || !form.adultAgreed) {
      alert("Please agree to all terms before continuing.");
      return;
    }
    // API: Replace with real signup API call
    // fetch('/api/signup', { method: 'POST', body: JSON.stringify({ ...form, type }) })
    setStep(3);
    setTimeout(() => { onSuccess?.(); onClose(); }, 2000);
  };
 
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: "#111", borderRadius: 16, border: "1px solid #e85d04", width: "100%", maxWidth: 520, maxHeight: "90vh", overflowY: "auto" }}>
        {/* Modal header */}
        <div style={{ padding: "20px 24px", borderBottom: "1px solid rgba(255,255,255,0.08)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <CoreTrenzLogo size={30} showText={true} />
            <div style={{ fontSize: 12, color: "#888", marginTop: 4 }}>
              {isCarrier ? "Carrier Signup — Earn with CoreTrenz" : "Customer Account Registration"}
            </div>
          </div>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: "#888", fontSize: 20, cursor: "pointer" }}>✕</button>
        </div>
 
        {step === 1 && (
          <div style={{ padding: 24 }}>
            {/* Basic info fields */}
            {["name", "email", "phone", ...(isCarrier ? ["vehicle", "zone"] : ["address"])].map(field => (
              <div key={field} style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, color: "#888", display: "block", marginBottom: 4, textTransform: "capitalize" }}>{field === "zone" ? "Service Zone (e.g. Manhattan, Bronx)" : field}</label>
                <input
                  value={form[field]}
                  onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
                  placeholder={field === "vehicle" ? "Bike / Car / E-Bike / Public Transit" : ""}
                  style={{ width: "100%", background: "#1a1a2e", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 8, padding: "10px 12px", color: "white", fontSize: 14, boxSizing: "border-box" }}
                />
              </div>
            ))}
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, color: "#888", display: "block", marginBottom: 4 }}>Password</label>
              <input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                style={{ width: "100%", background: "#1a1a2e", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 8, padding: "10px 12px", color: "white", fontSize: 14, boxSizing: "border-box" }} />
            </div>
            <button onClick={() => setStep(2)} style={{ width: "100%", padding: "12px 0", background: "#e85d04", color: "white", border: "none", borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: "pointer", marginTop: 8 }}>
              Continue to Terms & Agreement →
            </button>
          </div>
        )}
 
        {step === 2 && (
          <div style={{ padding: 24 }}>
            <h3 style={{ color: "#e85d04", fontSize: 16, marginBottom: 16 }}>
              {isCarrier ? "CoreTrenz Carrier Service Agreement" : "CoreTrenz Customer Terms of Service"}
            </h3>
 
            {/* Legal terms block */}
            <div style={{ background: "#0d0d1a", borderRadius: 8, padding: 16, fontSize: 12, color: "#aaa", maxHeight: 260, overflowY: "auto", lineHeight: 1.7, marginBottom: 16, border: "1px solid rgba(255,255,255,0.08)" }}>
              <strong style={{ color: "#e85d04" }}>CORETRENZ {isCarrier ? "INDEPENDENT CARRIER" : "CUSTOMER"} AGREEMENT</strong><br /><br />
 
              {isCarrier ? <>
                <strong style={{ color: "#fff" }}>1. INDEPENDENT CONTRACTOR STATUS</strong><br />
                You ("Carrier") acknowledge that you are an independent contractor and not an employee of CoreTrenz Inc. ("Company"). You are solely responsible for your own taxes, insurance, vehicle/equipment maintenance, and compliance with all applicable laws and regulations.<br /><br />
 
                <strong style={{ color: "#fff" }}>2. COMPENSATION</strong><br />
                Carriers receive payment calculated on mileage, item weight, and item count per delivery. CoreTrenz retains a {DELIVERY_PLATFORM_CUT}% platform fee from gross delivery revenue. Customers are charged an additional {CUSTOMER_FINDER_FEE}% finder fee. Carriers receive the remaining balance.<br /><br />
 
                <strong style={{ color: "#fff" }}>3. LIABILITY LIMITATION</strong><br />
                CoreTrenz Inc. is not liable for accidents, injuries, property damage, traffic violations, or any incidents occurring during deliveries. Carriers agree to maintain appropriate insurance coverage for their chosen mode of transportation. CoreTrenz connects carriers with customers but is not responsible for the delivery transaction itself.<br /><br />
 
                <strong style={{ color: "#fff" }}>4. EXCLUSION FROM LAWSUIT</strong><br />
                By accepting this agreement, Carrier expressly waives any right to bring claims, lawsuits, or legal proceedings against CoreTrenz Inc., its officers, directors, employees, or affiliates for any matter arising from carrier activities performed using this platform, to the maximum extent permitted by New York State law.<br /><br />
 
                <strong style={{ color: "#fff" }}>5. SERVICE AREA</strong><br />
                Services are offered in New York City (all 5 boroughs), New York State, and New Jersey. Carriers may set their own service zones within these regions.<br /><br />
 
                <strong style={{ color: "#fff" }}>6. CONDUCT STANDARDS</strong><br />
                Carriers must maintain professional conduct, handle merchandise with care, and complete deliveries in the time window promised. Failure to meet standards may result in account suspension.<br /><br />
 
                <strong style={{ color: "#fff" }}>7. GOVERNING LAW</strong><br />
                This agreement shall be governed by the laws of the State of New York. Any disputes shall be resolved through binding arbitration in New York County, NY.
              </> : <>
                <strong style={{ color: "#fff" }}>1. DISCOUNT SAVINGS PROGRAM</strong><br />
                By using CoreTrenz ("Platform"), you authorize CoreTrenz Inc. to search for discounted pricing on your behalf across partner platforms including Amazon, eBay, Shopify, Walmart, Etsy, and others. When a discount is identified, CoreTrenz retains {DISCOUNT_COMMISSION_PERCENT}% of the total discount amount found as a platform service fee. The remaining {100 - DISCOUNT_COMMISSION_PERCENT}% of savings are passed to you, the customer.<br /><br />
 
                <strong style={{ color: "#fff" }}>2. DELIVERY SERVICES</strong><br />
                CoreTrenz Carrier delivery services are provided by independent contractors. CoreTrenz charges customers a {CUSTOMER_FINDER_FEE}% carrier-finding fee in addition to the base delivery fee. CoreTrenz is not responsible for delivery delays, lost packages, or damages once items are in carrier possession.<br /><br />
 
                <strong style={{ color: "#fff" }}>3. THIRD-PARTY MARKETPLACE</strong><br />
                CoreTrenz aggregates listings from third-party platforms. Prices, availability, and accuracy of listings are subject to change. CoreTrenz is not responsible for discrepancies between displayed and actual prices at time of checkout on third-party platforms.<br /><br />
 
                <strong style={{ color: "#fff" }}>4. PRIVACY & DATA</strong><br />
                Your personal information is used solely for account management, order processing, and delivery logistics. CoreTrenz does not sell personal data to third parties. Payment information is handled by PCI-compliant processors.<br /><br />
 
                <strong style={{ color: "#fff" }}>5. RETURNS & REFUNDS</strong><br />
                Cornell's Denim branded items are returnable within 30 days of delivery in original condition. Third-party marketplace items are subject to each platform's return policy. Delivery fees are non-refundable.<br /><br />
 
                <strong style={{ color: "#fff" }}>6. LIMITATION OF LIABILITY</strong><br />
                CoreTrenz Inc. shall not be liable for any indirect, incidental, or consequential damages arising from platform use. Total liability shall not exceed the amount paid in the transaction giving rise to the claim.<br /><br />
 
                <strong style={{ color: "#fff" }}>7. GOVERNING LAW</strong><br />
                This agreement shall be governed by the laws of the State of New York. Disputes shall be resolved through binding arbitration in New York County, NY.
              </>}
            </div>
 
            {/* Agreement checkboxes */}
            {[
              { key: "agreed", label: `I have read and agree to the CoreTrenz ${isCarrier ? "Carrier" : "Customer"} Terms of Service, including the discount fee structure and liability limitations.` },
              { key: "adultAgreed", label: "I confirm that I am 18 years of age or older and legally authorized to enter into this agreement." },
            ].map(({ key, label }) => (
              <label key={key} style={{ display: "flex", gap: 10, marginBottom: 12, alignItems: "flex-start", cursor: "pointer" }}>
                <input type="checkbox" checked={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.checked }))}
                  style={{ marginTop: 3, accentColor: "#e85d04", width: 16, height: 16 }} />
                <span style={{ fontSize: 12, color: "#aaa", lineHeight: 1.5 }}>{label}</span>
              </label>
            ))}
 
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setStep(1)} style={{ flex: 1, padding: "12px 0", background: "transparent", color: "#888", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 8, cursor: "pointer" }}>← Back</button>
              <button onClick={handleSubmit} style={{ flex: 2, padding: "12px 0", background: form.agreed && form.adultAgreed ? "#e85d04" : "#333", color: "white", border: "none", borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
                Create Account & Sign Agreement
              </button>
            </div>
          </div>
        )}
 
        {step === 3 && (
          <div style={{ padding: 48, textAlign: "center" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
            <div style={{ color: "#e85d04", fontWeight: 700, fontSize: 18, marginBottom: 8 }}>Welcome to CoreTrenz!</div>
            <div style={{ color: "#888", fontSize: 14 }}>Your account has been created. Redirecting...</div>
          </div>
        )}
      </div>
    </div>
  );
};
 
// HANDLER: Handle Stripe Checkout
const onCheckout = async () => {
  try {
    // This MUST match the route we created in your payments.js
    const response = await fetch(`${API_URL}/api/payments/create-checkout-session`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // We send 'cartItems' because your backend expects that key
      
    });

    const data = await response.json();

    if (data.id) {
      // Initialize Stripe and redirect
      const stripe = await stripePromise;
      const { error } = await stripe.redirectToCheckout({ sessionId: data.id });
      if (error) alert(error.message);
    } else {
      // If the backend sends an error, show it here
      alert("Checkout Error: " + (data.error || "Session failed"));
    }
  } catch (err) {
    console.error("Connection Error:", err);
    alert("Backend Server not found! Is your terminal running 'node server.js' on Port 5000?");
  }
};

// COMPONENT: Shopping Cart Sidebar
const CartSidebar = ({ cart, onClose, onRemove, onUpdateQty, onCheckout }) => {
  const { subtotal, tax, total } = calcCartTotal(cart);

  const [promoCode, setPromoCode] = useState("");
  const [promoApplied, setPromoApplied] = useState(false);
 
  // HANDLER: Apply promo code (sample logic)
  const applyPromo = () => {
    // API: Replace with real promo code validation
    if (promoCode.toUpperCase() === "CORNELLS10") {
      setPromoApplied(true);
    } else {
      alert("Invalid promo code. Try CORNELLS10 for 10% off!");
    }
  };
  const discount = promoApplied ? total * 0.1 : 0;
  const finalTotal = total - discount;

  // Inside your CartSidebar component, after your promo/discount logic
const handleCheckout = async () => {
  try {
    // Send cart to your backend
    const response = await fetch("/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cartItems: cart }) // ✅ cart is in scope here
    });

    const data = await response.json();

    if (data.id) {
      // Initialize Stripe and redirect
      const stripe = await stripePromise; // make sure you imported stripePromise
      const { error } = await stripe.redirectToCheckout({ sessionId: data.id });
      if (error) alert(error.message);
    } else {
      alert("Checkout Error: " + (data.error || "Session failed"));
    }
  } catch (err) {
    console.error("Connection Error:", err);
    alert("Backend Server not found! Is your terminal running 'node server.js' on Port 5000?");
  }
};
 
  return (
    <div style={{ position: "fixed", right: 0, top: 0, bottom: 0, width: 380, background: "#111", zIndex: 8888, borderLeft: "1px solid rgba(255,255,255,0.1)", display: "flex", flexDirection: "column", boxShadow: "-8px 0 32px rgba(0,0,0,0.5)" }}>
      <div style={{ padding: "20px 20px 16px", borderBottom: "1px solid rgba(255,255,255,0.08)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontWeight: 700, color: "white", fontSize: 18 }}>Your Cart ({cart.length})</div>
        <button onClick={onClose} style={{ background: "transparent", border: "none", color: "#888", fontSize: 20, cursor: "pointer" }}>✕</button>

      </div>
 
      {/* Cart items list */}
      <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
        {cart.length === 0 ? (
          <div style={{ textAlign: "center", color: "#555", paddingTop: 60 }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🛒</div>
            <div>Your cart is empty</div>
          </div>
        ) : cart.map((item, i) => (
          <div key={i} style={{ background: "#1a1a2e", borderRadius: 10, padding: 12, marginBottom: 10, border: "1px solid rgba(255,255,255,0.06)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#f0f0f0", flex: 1, paddingRight: 8 }}>{item.name}</div>
              <button onClick={() => onRemove(i)} style={{ background: "transparent", border: "none", color: "#555", cursor: "pointer", fontSize: 16 }}>✕</button>
            </div>
            {item.selectedSize && <div style={{ fontSize: 11, color: "#888" }}>Size: {item.selectedSize}</div>}
            {item.selectedColor && <div style={{ fontSize: 11, color: "#888" }}>Color: {item.selectedColor}</div>}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <button onClick={() => onUpdateQty(i, -1)} style={{ background: "rgba(255,255,255,0.1)", border: "none", color: "white", width: 24, height: 24, borderRadius: 4, cursor: "pointer", fontSize: 14 }}>−</button>
                <span style={{ color: "white", fontSize: 13, minWidth: 20, textAlign: "center" }}>{item.qty}</span>
                <button onClick={() => onUpdateQty(i, 1)} style={{ background: "rgba(255,255,255,0.1)", border: "none", color: "white", width: 24, height: 24, borderRadius: 4, cursor: "pointer", fontSize: 14 }}>+</button>
              </div>
              <div style={{ color: "#e85d04", fontWeight: 700, fontSize: 15 }}>${(item.price * item.qty).toFixed(2)}</div>
            </div>
            
          </div>
        
        ))}
      </div>
 
      {/* Footer (Fixed at bottom) */}
<div style={{ padding: 20, background: "#080810", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
  
  {/* Subtotal */}
  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 14 }}>
    <span style={{ color: "#888" }}>Subtotal:</span>
    <span>${subtotal.toFixed(2)}</span>
  </div>

  {/* Promo code */}
  <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
    <input
      value={promoCode}
      onChange={e => setPromoCode(e.target.value)}
      placeholder="Promo code (try CORNELLS10)"
      style={{
        flex: 1,
        background: "#1a1a2e",
        border: "1px solid rgba(255,255,255,0.15)",
        borderRadius: 8,
        padding: "8px 10px",
        color: "white",
        fontSize: 12
      }}
    />
    <button
      onClick={applyPromo}
      style={{
        background: "#333",
        border: "none",
        borderRadius: 8,
        padding: "8px 12px",
        color: "white",
        cursor: "pointer",
        fontSize: 12
      }}
    >
      Apply
    </button>
  </div>

  {/* Tax */}
  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 13, color: "#aaa" }}>
    <span>Tax</span>
    <span>${tax.toFixed(2)}</span>
  </div>

  {/* Discount */}
  {promoApplied && (
    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 13, color: "#4caf50" }}>
      <span>Promo (10% off)</span>
      <span>-${discount.toFixed(2)}</span>
    </div>
  )}

  {/* Total */}
  <div style={{
    display: "flex",
    justifyContent: "space-between",
    fontWeight: 700,
    fontSize: 16,
    color: "white",
    borderTop: "1px solid rgba(255,255,255,0.08)",
    paddingTop: 10,
    marginBottom: 14
  }}>
    <span>Total</span>
    <span style={{ color: "#e85d04" }}>${finalTotal.toFixed(2)}</span>
  </div>

  {/* Checkout */}
  <button
  onClick={handleCheckout}  // <- use the function inside CartSidebar
  style={{
    width: "100%",
    padding: "14px",
    background: "#e85d04",
    color: "white",
    border: "none",
    borderRadius: 8,
    fontWeight: 700,
    cursor: "pointer",
    fontSize: 15
  }}
>
  Proceed to Checkout
</button>




      
        {/* Price breakdown */}
        {[
          ["Subtotal", `$${subtotal.toFixed(2)}`],
          [`Tax (${(TAX_RATE * 100).toFixed(3)}%)`, `$${tax.toFixed(2)}`],
          ...(promoApplied ? [["Promo (10% off)", `-$${discount.toFixed(2)}`]] : []),
        ].map(([label, val]) => (
          <div key={label} style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 13, color: "#aaa" }}>
            <span>{label}</span><span style={{ color: label.includes("Promo") ? "#4caf50" : "#aaa" }}>{val}</span>
          </div>
        ))}
        <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, fontSize: 16, color: "white", borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: 10, marginBottom: 14 }}>
          <span>Total</span><span style={{ color: "#e85d04" }}>${finalTotal.toFixed(2)}</span>
        </div>
        
        {/* <button 
    onClick={() => onCheckout()} // <--- We want to trigger our new function here
    style={{ background: "#e85d04", color: "white", width: "100%", padding: "12px" }}
  ></button> */}
       
 
        <button onClick={onCheckout} style={{ width: "100%", padding: "14px 0", background: "#e85d04", color: "white", border: "none", borderRadius: 10, fontWeight: 700, fontSize: 15, cursor: "pointer" }}>
          Proceed to Checkout →
        </button> 
      
        </div>
</div>
  );
};
        <div style={{ fontSize: 10, color: "#555", textAlign: "center", marginTop: 8 }}>
          Secure checkout • PCI compliant • CoreTrenz AI will search for discounts automatically
        </div>
      
      
    
 
// ============================================================
// SECTION: PAGE COMPONENTS
// Each page is a standalone component for easy tab switching
// ============================================================
 
// PAGE: Home / Landing page
const HomePage = ({ onAddToCart, onSignup }) => {
  const [currentSlide, setCurrentSlide] = useState(0);
 
  // Background slide images using inventory categories as color themes
  const slides = [
    { label: "NBA Gear", sub: "Rep Your Team", bg: "linear-gradient(135deg, #1a1a2e, #16213e)", accent: "#e85d04" },
    { label: "Cornell's Denim", sub: "Custom Streetwear", bg: "linear-gradient(135deg, #1a1a2e, #0f3460)", accent: "#c9a84c" },
    { label: "Cult of Individuality", sub: "Stand Out", bg: "linear-gradient(135deg, #2d1b69, #11998e)", accent: "#f0f0f0" },
    { label: "Smoke Rise NY", sub: "NYC Roots", bg: "linear-gradient(135deg, #3d0000, #1a1a2e)", accent: "#e85d04" },
  ];
 
  useEffect(() => {
    // Auto-advance hero slides every 4 seconds
    const t = setInterval(() => setCurrentSlide(s => (s + 1) % slides.length), 4000);
    return () => clearInterval(t);
  }, []);
 
  return (
    <div>
      {/* HERO SECTION - rotating background slides */}
      <div style={{ height: 480, background: slides[currentSlide].bg, transition: "background 1s ease", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", position: "relative", overflow: "hidden" }}>
        {/* Decorative circles */}
        <div style={{ position: "absolute", width: 400, height: 400, borderRadius: "50%", border: `2px solid ${slides[currentSlide].accent}22`, top: -100, right: -100 }} />
        <div style={{ position: "absolute", width: 200, height: 200, borderRadius: "50%", border: `1px solid ${slides[currentSlide].accent}33`, bottom: 60, left: 60 }} />
 
        <CoreTrenzLogo size={60} showText={false} />
        <div style={{ fontSize: 48, fontWeight: 900, color: "white", marginTop: 20, letterSpacing: -1 }}>CoreTrenz</div>
        <div style={{ fontSize: 20, color: slides[currentSlide].accent, marginTop: 4, fontWeight: 700, letterSpacing: 4, textTransform: "uppercase" }}>
          {slides[currentSlide].label}
        </div>
        <div style={{ fontSize: 14, color: "#888", marginTop: 8 }}>{slides[currentSlide].sub}</div>
        <div style={{ display: "flex", gap: 14, marginTop: 30 }}>
          <button onClick={() => onSignup("customer")} style={{ padding: "12px 28px", background: "#e85d04", color: "white", border: "none", borderRadius: 30, fontWeight: 700, cursor: "pointer", fontSize: 14 }}>
            Shop Now
          </button>
          <button onClick={() => onSignup("customer")} style={{ padding: "12px 28px", background: "transparent", color: "white", border: "2px solid rgba(255,255,255,0.3)", borderRadius: 30, fontWeight: 600, cursor: "pointer", fontSize: 14 }}>
            Create Account
          </button>
        </div>
 
        {/* Slide dots */}
        <div style={{ position: "absolute", bottom: 20, display: "flex", gap: 6 }}>
          {slides.map((_, i) => (
            <div key={i} onClick={() => setCurrentSlide(i)} style={{ width: i === currentSlide ? 20 : 6, height: 6, borderRadius: 3, background: i === currentSlide ? "#e85d04" : "rgba(255,255,255,0.3)", cursor: "pointer", transition: "all 0.3s" }} />
          ))}
        </div>
      </div>
 
      {/* FEATURE CARDS ROW */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, padding: "32px 24px", background: "#0d0d1a" }}>
        {[
          { icon: "🤖", title: "AI Discount Bot", desc: "Finds hidden discounts across 8+ platforms and shares savings with you." },
          { icon: "🚀", title: "Fast Delivery", desc: "CoreTrenz carriers on bike, car & transit. Same-day options available." },
          { icon: "👕", title: "Cornell's Denim", desc: "Custom designed streetwear built for NYC trendsetters." },
          { icon: "📦", title: "Partner Stores", desc: "Iman Sports & Blue Jeans NYC inventory — check stock before you go." },
          { icon: "✂️", title: "Design Studio", desc: "Customize your own clothes with print & embroidery machine export." },
          { icon: "🌐", title: "Marketplace", desc: "Browse Amazon, eBay, Shopify & more — all in one place." },
        ].map(f => (
          <div key={f.title} style={{ background: "#1a1a2e", borderRadius: 12, padding: 20, border: "1px solid rgba(255,255,255,0.06)" }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>{f.icon}</div>
            <div style={{ fontWeight: 700, color: "#e85d04", fontSize: 14, marginBottom: 6 }}>{f.title}</div>
            <div style={{ fontSize: 12, color: "#888", lineHeight: 1.5 }}>{f.desc}</div>
          </div>
        ))}
      </div>
 
      {/* FEATURED PRODUCTS */}
      <div style={{ padding: "0 24px 32px" }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: "white", marginBottom: 20 }}>
          Featured Items <span style={{ color: "#e85d04" }}>🔥</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16 }}>
          {CORNELLS_INVENTORY.slice(0, 8).map(item => (
            <ProductCard key={item.id} item={item} onAddToCart={onAddToCart} />
          ))}
        </div>
      </div>
 
      {/* ABOUT CORNELL'S DENIM */}
      <div style={{ background: "#1a1a2e", padding: "40px 24px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ maxWidth: 700, margin: "0 auto", textAlign: "center" }}>
          <CornellsDenimLogo size={50} showText={true} />
          <div style={{ fontSize: 18, fontWeight: 700, color: "white", margin: "20px 0 12px" }}>
            The Story Behind Cornell's Denim
          </div>
          <p style={{ color: "#888", lineHeight: 1.8, fontSize: 14 }}>
            Cornell Robertson has always been a Trendsetter. One of his biggest trenz throughout his journey living in NYC was fashion — from church-dressed outfits to casual fits to street wear. People couldn't figure out how his outfits always swaggered different. People always complimented the wear, styles and dress techniques.
          </p>
          <p style={{ color: "#888", lineHeight: 1.8, fontSize: 14, marginTop: 12 }}>
            And now his clothing store is here to shine some light on the queries — giving them fashion insights. Cornell's Denim is established 2026 by CoreTrenz Inc.
          </p>
        </div>
      </div>
    </div>
  );
};
 
// PAGE: Cornell's Denim Store
const CornellsDenimPage = ({ onAddToCart }) => {
  const [category, setCategory] = useState("All");
  const [searchQ, setSearchQ] = useState("");
  const [sortBy, setSortBy] = useState("featured");
 
  const categories = ["All", ...new Set(CORNELLS_INVENTORY.map(i => i.category))];
 
  // Filter and sort inventory
  const filtered = CORNELLS_INVENTORY
    .filter(item => (category === "All" || item.category === category) && item.name.toLowerCase().includes(searchQ.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === "price-asc") return a.price - b.price;
      if (sortBy === "price-desc") return b.price - a.price;
      return 0; // featured = original order
    });
 
  return (
    <div style={{ minHeight: "100vh" }}>
      {/* Store Header Banner */}
      <div style={{ background: "linear-gradient(135deg, #1a1a2e, #0f3460)", padding: "40px 24px", textAlign: "center" }}>
        <CornellsDenimLogo size={60} showText={true} />
        <div style={{ fontSize: 13, color: "#888", marginTop: 12 }}>Est. 2026 · NYC Streetwear & Custom Denim · by CoreTrenz Inc.</div>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 16, flexWrap: "wrap" }}>
          {["Free shipping over $150", "Same-day delivery available", "30-day returns"].map(tag => (
            <span key={tag} style={{ background: "rgba(201,168,76,0.15)", color: "#c9a84c", fontSize: 11, padding: "4px 12px", borderRadius: 20, border: "1px solid rgba(201,168,76,0.3)" }}>{tag}</span>
          ))}
        </div>
      </div>
 
      {/* Filters row */}
      <div style={{ padding: "16px 24px", background: "#111", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <input value={searchQ} onChange={e => setSearchQ(e.target.value)}
          placeholder="Search Cornell's Denim..."
          style={{ flex: 1, minWidth: 180, background: "#1a1a2e", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 8, padding: "8px 12px", color: "white", fontSize: 13 }} />
        <select value={sortBy} onChange={e => setSortBy(e.target.value)}
          style={{ background: "#1a1a2e", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 8, padding: "8px 12px", color: "white", fontSize: 13 }}>
          <option value="featured">Featured</option>
          <option value="price-asc">Price: Low to High</option>
          <option value="price-desc">Price: High to Low</option>
        </select>
      </div>
 
      {/* Category tabs */}
      <div style={{ padding: "12px 24px", display: "flex", gap: 8, overflowX: "auto", background: "#0d0d1a" }}>
        {categories.map(cat => (
          <button key={cat} onClick={() => setCategory(cat)} style={{
            padding: "6px 14px", borderRadius: 20, border: "1px solid rgba(255,255,255,0.15)",
            background: category === cat ? "#e85d04" : "transparent", color: category === cat ? "white" : "#aaa",
            cursor: "pointer", fontSize: 12, whiteSpace: "nowrap", fontWeight: category === cat ? 700 : 400,
          }}>{cat}</button>
        ))}
      </div>
 
      {/* Product grid */}
      <div style={{ padding: "24px", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))", gap: 18 }}>
        {filtered.map(item => <ProductCard key={item.id} item={item} onAddToCart={onAddToCart} />)}
      </div>
 
      {/* Out of stock ordering notice */}
      <div style={{ margin: "0 24px 40px", padding: 20, background: "#1a1a2e", borderRadius: 12, border: "1px solid rgba(201,168,76,0.2)" }}>
        <div style={{ fontWeight: 700, color: "#c9a84c", marginBottom: 8 }}>Item Out of Stock?</div>
        <div style={{ fontSize: 13, color: "#888", lineHeight: 1.6 }}>
          We keep spares on deck, but if something's sold out — we can arrange to order it with standard shipping. Some items may still be available at our partner stores: Iman Sports (137th & Broadway) or Blue Jeans NYC (145th & Broadway). Check the Partner Stores tab for locations.
        </div>
      </div>
    </div>
  );
};
 
// PAGE: Partner Stores
// PAGE: Partner Brands (brand companies CoreTrenz partners with)
const PartnerBrandsPage = () => {
  const [category, setCategory] = useState("All");
  const [searchQ, setSearchQ] = useState("");

  const shown = BRANDS.filter(brand =>
    (category === "All" || brand.category === category) &&
    brand.name.toLowerCase().includes(searchQ.toLowerCase())
  );
  // Cornell's picks for a brand, matched by brand name
  const picksFor = (brand) => PARTNER_INVENTORY.filter(item => item.brand === brand.name);

  return (
    <div>
      {/* Header */}
      <div style={{ background: "linear-gradient(135deg, #0d0d1a, #1a0d2e)", padding: "32px 24px" }}>
        <div style={{ fontSize: 24, fontWeight: 800, color: "white", marginBottom: 6 }}>Partner Brands</div>
        <div style={{ fontSize: 13, color: "#888" }}>Brands we wear and trust. Shop them straight from the brand.</div>
      </div>

      {/* Category filter + search */}
      <div style={{ padding: "16px 24px", background: "#111", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ display: "flex", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
          {BRAND_CATEGORIES.map(c => (
            <button key={c} onClick={() => setCategory(c)} aria-pressed={category === c} style={{
              padding: "8px 18px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.15)",
              background: category === c ? "#e85d04" : "#1a1a2e",
              color: "white", cursor: "pointer", fontSize: 13, fontWeight: category === c ? 700 : 400,
            }}>{c}</button>
          ))}
        </div>
        <input value={searchQ} onChange={e => setSearchQ(e.target.value)}
          placeholder="Search brands..." aria-label="Search brands"
          style={{ width: "100%", background: "#1a1a2e", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 8, padding: "10px 14px", color: "white", fontSize: 13, boxSizing: "border-box" }} />
      </div>

      {/* Brand cards */}
      <div style={{ padding: "20px 24px", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16 }}>
        {shown.map(brand => (
          <div key={brand.id} style={{ background: "#1a1a2e", borderRadius: 12, padding: 16, border: "1px solid rgba(255,255,255,0.08)", display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div aria-hidden="true" style={{ width: 44, height: 44, background: "#111", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "#e85d04", fontWeight: 800 }}>{brand.logo}</div>
              <div>
                <div style={{ fontWeight: 700, color: "white", fontSize: 15 }}>{brand.name}</div>
                <div style={{ fontSize: 12, color: "#888" }}>{brand.category}</div>
              </div>
            </div>
            {brand.note && <div style={{ fontSize: 12, color: "#ccc", fontStyle: "italic" }}>"{brand.note}"</div>}
            {brand.promoCode && <div style={{ fontSize: 12, color: "#4ade80" }}>Use code <strong>{brand.promoCode}</strong></div>}
            {picksFor(brand).length > 0 && (
              <div>
                <div style={{ fontSize: 11, color: "#e85d04", fontWeight: 700, letterSpacing: 1, marginBottom: 4 }}>CORNELL'S PICKS</div>
                <ul style={{ margin: 0, paddingLeft: 16, color: "#ccc", fontSize: 12, lineHeight: 1.6 }}>
                  {picksFor(brand).map(item => <li key={item.id}>{item.name}</li>)}
                </ul>
              </div>
            )}
            <a href={shopLink(brand)} target="_blank"
              rel={brand.affiliateUrl ? "sponsored noopener noreferrer" : "noopener noreferrer"}
              style={{ marginTop: "auto", textAlign: "center", padding: "9px 14px", background: "#e85d04", color: "white", borderRadius: 8, fontSize: 13, fontWeight: 700, textDecoration: "none" }}>
              Shop {brand.name} ↗
            </a>
          </div>
        ))}
        {shown.length === 0 && <div style={{ color: "#888", fontSize: 13 }}>No brands match your search.</div>}
      </div>

      {/* Affiliate disclosure (required by the FTC for affiliate links) */}
      <div style={{ padding: "0 24px 32px", fontSize: 11, color: "#777" }}>
        Some of these links may be affiliate links. If you buy through them, CoreTrenz may earn a small commission at no extra cost to you.
      </div>
    </div>
  );
};
 
// PAGE: Marketplace (Amazon, eBay, etc.)
const MarketplacePage = ({ onAddToCart }) => {
  const [searchQ, setSearchQ] = useState("");
  const [filterSource, setFilterSource] = useState("All");
  const [cart, setCart] = useState([]);
 
  const sources = ["All", ...new Set(MARKETPLACE_ITEMS.map(i => i.source))];
  const filtered = MARKETPLACE_ITEMS.filter(item =>
    (filterSource === "All" || item.source === filterSource) &&
    item.name.toLowerCase().includes(searchQ.toLowerCase())
  );
 
  return (
    <div>
      <div style={{ background: "linear-gradient(135deg, #0d1a0d, #1a1a2e)", padding: "32px 24px" }}>
        <div style={{ fontSize: 24, fontWeight: 800, color: "white", marginBottom: 4 }}>CoreTrenz Marketplace</div>
        <div style={{ fontSize: 13, color: "#888", marginBottom: 16 }}>AI-powered discount search across Amazon, eBay, Shopify & more</div>
        {/* Platform logos row */}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {["Amazon", "eBay", "Shopify", "Walmart", "Etsy", "Poshmark"].map(p => (
            <span key={p} style={{ background: "rgba(255,255,255,0.08)", color: "#888", fontSize: 11, padding: "4px 12px", borderRadius: 20, border: "1px solid rgba(255,255,255,0.1)" }}>
              {p}
            </span>
          ))}
        </div>
      </div>
 
      {/* AI Bot */}
      <div style={{ padding: "20px 24px", background: "#111", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <AIDiscountBot cartItems={cart} />
      </div>
 
      {/* Filters */}
      <div style={{ padding: "12px 24px", background: "#0d0d1a", display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <input value={searchQ} onChange={e => setSearchQ(e.target.value)}
          placeholder="Search marketplace..."
          style={{ flex: 1, minWidth: 200, background: "#1a1a2e", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 8, padding: "8px 12px", color: "white", fontSize: 13 }} />
        {sources.map(src => (
          <button key={src} onClick={() => setFilterSource(src)} style={{
            padding: "6px 14px", borderRadius: 20, border: "1px solid rgba(255,255,255,0.15)",
            background: filterSource === src ? "#e85d04" : "transparent", color: filterSource === src ? "white" : "#aaa",
            cursor: "pointer", fontSize: 12, whiteSpace: "nowrap",
          }}>{src}</button>
        ))}
      </div>
 
      {/* Items grid */}
      <div style={{ padding: "20px 24px", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))", gap: 18 }}>
        {filtered.map(item => (
          <ProductCard key={item.id} item={item} onAddToCart={(i) => { onAddToCart(i); setCart(c => [...c, i]); }} showSource={true} />
        ))}
      </div>
 
      {/* Discount transparency box */}
      <div style={{ margin: "0 24px 40px", padding: 20, background: "#1a1a2e", borderRadius: 12, border: "1px solid rgba(232,93,4,0.2)" }}>
        <div style={{ fontWeight: 700, color: "#e85d04", fontSize: 14, marginBottom: 10 }}>How CoreTrenz Discounts Work</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
          {[
            { step: "1", label: "You shop", desc: "Browse our marketplace or Cornell's Denim" },
            { step: "2", label: "AI scans", desc: `Bot searches 8+ platforms for hidden discounts` },
            { step: "3", label: "Savings split", desc: `You keep ${100 - DISCOUNT_COMMISSION_PERCENT}% · CoreTrenz keeps ${DISCOUNT_COMMISSION_PERCENT}%` },
            { step: "4", label: "You win", desc: "Automatic savings credited at checkout" },
          ].map(s => (
            <div key={s.step} style={{ textAlign: "center" }}>
              <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#e85d04", color: "white", fontWeight: 800, fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 8px" }}>{s.step}</div>
              <div style={{ fontWeight: 700, color: "white", fontSize: 13 }}>{s.label}</div>
              <div style={{ fontSize: 11, color: "#888", marginTop: 4 }}>{s.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
 
// PAGE: Delivery / Carrier System
const DeliveryPage = ({ onCarrierSignup, onCustomerSignup }) => {
  const [miles, setMiles] = useState(3);
  const [weight, setWeight] = useState(2);
  const [items, setItems] = useState(2);
  const fees = calcDeliveryFee(miles, weight, items);
 
  return (
    <div>
      <div style={{ background: "linear-gradient(135deg, #0d1a0d, #1a2e1a)", padding: "32px 24px", textAlign: "center" }}>
        <div style={{ fontSize: 24, fontWeight: 800, color: "white", marginBottom: 6 }}>CoreTrenz Delivery Network</div>
        <div style={{ fontSize: 13, color: "#888", marginBottom: 20 }}>NYC, NYS & New Jersey — Bike · Car · E-Bike · Public Transit</div>
        <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
          <button onClick={onCarrierSignup} style={{ padding: "12px 28px", background: "#e85d04", color: "white", border: "none", borderRadius: 30, fontWeight: 700, cursor: "pointer", fontSize: 14 }}>
            Become a Carrier
          </button>
          <button onClick={onCustomerSignup} style={{ padding: "12px 28px", background: "transparent", color: "white", border: "2px solid rgba(255,255,255,0.3)", borderRadius: 30, fontWeight: 600, cursor: "pointer", fontSize: 14 }}>
            Get Delivery
          </button>
        </div>
      </div>
 
      {/* Active carriers sample */}
      <div style={{ padding: "24px", background: "#111" }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: "white", marginBottom: 14 }}>Active Carriers Near You</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
          {SAMPLE_CARRIERS.map(c => (
            <div key={c.id} style={{ background: "#1a1a2e", borderRadius: 10, padding: 14, border: "1px solid rgba(255,255,255,0.06)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#e85d04", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, color: "white", fontSize: 14 }}>
                  {c.name.charAt(0)}
                </div>
                <div>
                  <div style={{ fontWeight: 700, color: "white", fontSize: 13 }}>{c.name}</div>
                  <div style={{ fontSize: 11, color: "#888" }}>{c.vehicle}</div>
                </div>
              </div>
              <div style={{ fontSize: 11, color: "#888" }}>Zone: {c.zone}</div>
              <div style={{ fontSize: 11, color: "#c9a84c" }}>★ {c.rating} · {c.deliveries} deliveries</div>
            </div>
          ))}
        </div>
      </div>
 
      {/* Delivery fee calculator */}
      <div style={{ padding: "24px", background: "#0d0d1a" }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: "white", marginBottom: 16 }}>Delivery Fee Calculator</div>
        <div style={{ background: "#1a1a2e", borderRadius: 12, padding: 20, border: "1px solid rgba(255,255,255,0.06)", maxWidth: 500 }}>
          {[
            { label: "Distance (miles)", val: miles, set: setMiles, min: 1, max: 30 },
            { label: "Item weight (lbs)", val: weight, set: setWeight, min: 1, max: 50 },
            { label: "Number of items", val: items, set: setItems, min: 1, max: 20 },
          ].map(({ label, val, set, min, max }) => (
            <div key={label} style={{ marginBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontSize: 12, color: "#888" }}>{label}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#e85d04" }}>{val}</span>
              </div>
              <input type="range" min={min} max={max} value={val} onChange={e => set(Number(e.target.value))}
                style={{ width: "100%", accentColor: "#e85d04" }} />
            </div>
          ))}
 
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: 14, marginTop: 4 }}>
            {[
              ["Carrier receives", `$${fees.carrierPay.toFixed(2)}`],
              [`CoreTrenz platform fee (${CUSTOMER_FINDER_FEE}%)`, `$${fees.platformFee.toFixed(2)}`],
            ].map(([l, v]) => (
              <div key={l} style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 12, color: "#888" }}>
                <span>{l}</span><span>{v}</span>
              </div>
            ))}
            <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, fontSize: 16, color: "white", borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: 8 }}>
              <span>Total delivery fee</span>
              <span style={{ color: "#e85d04" }}>${fees.total.toFixed(2)}</span>
            </div>
          </div>
          <div style={{ fontSize: 10, color: "#555", marginTop: 10 }}>
            Developers: Edit MILES_RATE, CUSTOMER_FINDER_FEE constants at top of file to update pricing logic.
          </div>
        </div>
 
        {/* Delivery partners */}
        <div style={{ marginTop: 24 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "white", marginBottom: 12 }}>Also Available Through</div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            {["DoorDash", "Uber Eats", "USPS", "FedEx", "UPS"].map(p => (
              <div key={p} style={{ background: "#1a1a2e", borderRadius: 8, padding: "8px 16px", color: "#888", fontSize: 13, border: "1px solid rgba(255,255,255,0.06)" }}>{p}</div>
            ))}
          </div>
          <div style={{ fontSize: 11, color: "#555", marginTop: 8 }}>
            {/* API: Add DoorDash Drive API, Uber Direct API integration here */}
            API integrations: DoorDash Drive, Uber Direct, USPS Web Tools — slots reserved for future integration.
          </div>
        </div>
      </div>
    </div>
  );
};
 
// Styles for the CoreTrenz Design Machine





const machineBtnStyle = { 
  width: "100%",
  padding: "12px", 
  background: "#1a1a2e", 
  color: "#fff", 
  border: "1px solid #444", 
  borderRadius: 8, 
  cursor: "pointer", 
  fontSize: 12, 
  textAlign: 'left',
  fontWeight: '600',
  marginBottom: "5px"
};

const exportBtnStyle = { 
  padding: "10px", 
  background: "#333", 
  color: "#e85d04", 
  border: "1px solid #e85d04", 
  borderRadius: 5, 
  cursor: "pointer", 
  fontSize: 11, 
  fontWeight: "bold" 
};

// PAGE: Design Studio
const DesignStudioPage = () => {


  const [selectedItem, setSelectedItem] = useState("Hoodie");
  const [selectedFabric, setSelectedFabric] = useState(FABRICS[0]);
  const [designNotes, setDesignNotes] = useState("");
  const [savedDesigns, setSavedDesigns] = useState([]);
  const [tab, setTab] = useState("customize"); // customize | designer | machines
  

  


// INSIDE your DesignStudio component
const [aiImageUrl, setAiImageUrl] = useState(null); const [isGenerating, setIsGenerating] = useState(false); const [generatedImage, setGeneratedImage] = useState(null);
 const [selectedColor, setSelectedColor] = useState("black"); // default color
 const [selectedType, setSelectedType] = useState("hoodie");  // default type
 const [selectedFile, setSelectedFile] = useState(null);
const [previewUrl, setPreviewUrl] = useState(null);
const [isInnovating, setIsInnovating] = useState(false);
const [designElements, setDesignElements] = useState([]); // Holds patches, pockets, etc.
const [draggingId, setDraggingId] = useState(null);


// HANDLER: Call the Backend Image Machine
const handleGenerateAI = async () => {
  if (!designNotes) return alert("Please describe your design in the 'Notes' box first!");
  
  setIsGenerating(true);
  try {
    const response = await fetch(`${API_URL}/api/design/generate-clothing-visual`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        prompt: designNotes,
        color: selectedColor, // You can add a color picker later
        type: selectedItem 
      }),
    });

    const data = await response.json();
    if (data.success) {
      setAiImageUrl(data.imageUrl);
    } else {
      alert("Machine Error: " + data.error);
    }
  } catch (err) {
    console.error(err);
    alert("Make sure your backend server is running on Port 5000!");
  } finally {
    setIsGenerating(false);
  }
};
const handleGenerateDesign = async (prompt) => {
  if (!prompt) return alert("Please describe your design first!");
  
  setIsGenerating(true);
  try {
    const response = await fetch(`${API_URL}/api/design/generate-clothing-visual`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        prompt: prompt,
        color: selectedColor, // From your existing state
        type: selectedType    // e.g., 'hoodie', 't-shirt'
      }),
    });

    const data = await response.json();
    if (data.success) {
      setGeneratedImage(data.imageUrl);
    }
  } catch (err) {
    console.error("Generation Error:", err);
    alert("The Image Machine is resting. Try again in a second!");
  } finally {
    setIsGenerating(false);
  }
};

const DesignMachine = ({ 
  previewUrl, 
  setPreviewUrl, 
  designElements, 
  setDesignElements, 
  isInnovating, 
  setIsInnovating, 
  aiImageUrl, 
  isGenerating, 
  draggingId,  
  setDraggingId
}) => {
  const canvasRef = useRef(null);
  
  // 1. IMPORT: Picture or Document
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  // 2. INNOVATE: Add Pockets, Patches, Sculptures
  const handleInnovate = async (type) => {
    setIsInnovating(true);
    try {
      const response = await fetch(`${API_URL}/api/design-studio/innovate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ innovationType: type }),
      });
      const data = await response.json();
  
      // If the backend works, use its URL. If not, use this backup icon:
      const elementUrl = data.success ? data.elementUrl : "https://cdn-icons-png.flaticon.com/512/2612/2612341.png";
  
      setDesignElements(prev => [...prev, { 
        id: Date.now(), 
        url: elementUrl, 
        type: type, 
        x: 100, y: 100 
      }]);
    } catch (err) {
      console.error("Machine Logic Failed, using fallback...");
      // Emergency Fallback so you can still test the dragging
      setDesignElements(prev => [...prev, { 
        id: Date.now(), 
        url: "https://cdn-icons-png.flaticon.com/512/2612/2612341.png", 
        type: type, 
        x: 100, y: 100 
      }]);
    }
    setIsInnovating(false);
  };

  const handleMouseMove = (e) => {
    if (!draggingId) return;
  
    const rect = e.currentTarget.getBoundingClientRect();
    // We subtract the bounding box of the viewport so (0,0) is the top-left of the black box
    const x = e.clientX - rect.left - 50; 
    const y = e.clientY - rect.top - 50;
  
    setDesignElements(prev => prev.map(el => 
      el.id === draggingId ? { ...el, x, y } : el
    ));
  };



  // 3. EXPORT: Save to JPG, PNG, SVG, GIF, RAW
  const exportDesign = (format) => {
    // Note: For 'RAW' and 'SVG' in a browser, we usually export the Canvas data
    // In a production app, we'd use a library like 'fabric.js' to create true vectors
    const link = document.createElement('a');
    link.download = `CoreTrenz_Production_File.${format.toLowerCase()}`;
    // Simple canvas export for images:
    const canvas = document.querySelector("#design-canvas");
    if (canvas) {
        link.href = canvas.toDataURL(`image/${format === 'JPG' ? 'jpeg' : 'png'}`);
        link.click();
    } else {
        alert("Preparing " + format + " file for export...");
    }
  };

  return (
    <div style={{ background: "#000", border: "2px solid #e85d04", borderRadius: 15, padding: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
        <h3 style={{ color: "#e85d04", margin: 0 }}>CORE-DESIGN MACHINE v1.0</h3>
        <input type="file" onChange={handleFileUpload} style={{ color: "#888" }} />
      </div>

      <div style={{ display: "flex", gap: 20 }}>
        {/* Sidebar Tools */}
        <div style={{ width: 200, display: "flex", flexDirection: "column", gap: 10 }}>
          <p style={{ color: "#fff", fontSize: 12 }}>AI INNOVATIONS</p>
          <button onClick={() => handleInnovate('Pocket')} style={machineBtn}>Add 3D Pocket</button>
          <button onClick={() => handleInnovate('Patch')} style={machineBtn}>Add Custom Patch</button>
          <button onClick={() => handleInnovate('Logo')} style={machineBtn}>Add Brand Logo</button>
          
          <p style={{ color: "#fff", fontSize: 12, marginTop: 20 }}>EXPORT PRODUCTION</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 5 }}>
            {['JPG', 'PNG', 'SVG', 'GIF', 'RAW'].map(f => (
              <button key={f} onClick={() => exportDesign(f)} style={exportBtn}>{f}</button>
            ))}
          </div>
        </div>















{/* Main Design Viewport */}
<div style={{ 
  flex: 1, minWidth: 300, height: 500, background: "#050505", borderRadius: 10, 
  position: "relative", overflow: "hidden", display: "flex", 
  justifyContent: "center", alignItems: "center", border: "1px solid #222" 
}}>
  
  {/* LAYER 1: The Main Garment (Imported or AI Generated) */}
  {(previewUrl || aiImageUrl) ? (
    <div style={{ position: "relative", width: '100%', height: '100%' }}>
      <img 
        src={aiImageUrl || previewUrl} 
        style={{ width: "100%", height: "100%", objectFit: 'contain' }} 
        alt="Base Garment" 
      />

      {/* LAYER 2: The Interactive Innovation Elements (Pockets, Patches, Logos) */}
      {/* {designElements.map((el) => (
        <div
          key={el.id}
          style={{
            position: 'absolute',
            left: el.x,
            top: el.y,
            cursor: 'move',
            transition: 'transform 0.2s',
            zIndex: 10
          }}
          // Basic Drag Logic (We can enhance this with a library later)
          onMouseDown={(e) => {
             console.log(`Dragging ${el.type}...`);
          }}
        >
          <img src={el.url} style={{ width: 100, filter: 'drop-shadow(0px 4px 8px rgba(0,0,0,0.5))' }} />
          <div style={{ background: '#e85d04', color: 'white', fontSize: 9, padding: '2px 5px', borderRadius: 4, textAlign: 'center' }}>
            AI {el.type.toUpperCase()}
          </div>
        </div>
      ))} */}
  {/* LAYER 2: The Interactive Innovation Elements */}
{designElements.map((el) => (
   
  <div
    key={el.id}
    onMouseDown={() => setDraggingId(el.id)} // <--- CONNECT THIS
    onMouseMove={handleMouseMove} // <--- ADD THIS
    onMouseUp={() => setDraggingId(null)} // <--- ADD THIS
    style={{
      flex: 1, 
    minWidth: 300, 
    height: 500,
    background: "#050505", 
    // position: "relative", 
    overflow: "hidden",
    position: 'absolute',
      left: el.x,
      top: el.y,
      cursor: draggingId === el.id ? 'grabbing' : 'grab', // Changes icon when holding
      zIndex: 10,
      userSelect: 'none' // Prevents highlighting text while dragging
    }}
  >
    <img 
      src={el.url} 
      alt={el.type}
      onDragStart={(e) => e.preventDefault()} // Stops browser "ghosting"
      style={{ 
        width: 100, 
        filter: 'drop-shadow(0px 4px 8px rgba(0,0,0,0.5))',
        pointerEvents: 'none' // Prevents the image from interfering with the drag
      }} 
    />
    <div style={{ background: '#e85d04', color: 'white', fontSize: 9, padding: '2px 5px', borderRadius: 4, textAlign: 'center' }}>
      AI {el.type.toUpperCase()}
    </div>
  </div>
))}
    </div>
  ) : (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 40, opacity: 0.2 }}>📸</div>
      <div style={{ color: "#444", fontSize: 13, fontWeight: 600 }}>MACHINE IDLE: IMPORT FILE OR GENERATE AI</div>
    </div>
  )}

  {/* LOADING OVERLAY */}
  {(isGenerating || isInnovating) && (
    <div style={{ 
      position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.85)', 
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 100 
    }}>
      <div className="spinner" style={{ border: '4px solid #f3f3f3', borderTop: '4px solid #e85d04', borderRadius: '50%', width: 40, height: 40, animation: 'spin 1s linear infinite' }}></div>
      <p style={{ color: "white", marginTop: 15, fontSize: 12, letterSpacing: 1 }}>🧬 SCULPTING DESIGN...</p>
    </div>
  )}
</div>








        
      </div>
    </div>
  );
};

const machineBtn = { padding: "10px", background: "#1a1a2e", color: "#fff", border: "1px solid #444", borderRadius: 5, cursor: "pointer" };
const exportBtn = { padding: "5px", background: "#e85d04", color: "#fff", border: "none", borderRadius: 3, cursor: "pointer", fontSize: 10, fontWeight: "bold" };










  const garmentTypes = ["Hoodie", "Jeans", "T-Shirt", "Jacket", "Cargo Pants", "Sweater"];
 
  // HANDLER: Save design to profile
  const saveDesign = () => {
    const design = {
      id: Date.now(),
      item: selectedItem,
      fabric: selectedFabric.name,
      notes: designNotes,
      savedAt: new Date().toLocaleDateString(),
    };
    setSavedDesigns(prev => [design, ...prev]);
    alert(`Design saved! In production, this syncs to your profile and can be exported to machine files.`);
  };
 
  return (
    <div>
      <div style={{ background: "linear-gradient(135deg, #1a0d2e, #2d1b69)", padding: "32px 24px" }}>
        <CornellsDenimLogo size={50} showText={true} />
        <div style={{ fontSize: 20, fontWeight: 800, color: "white", marginTop: 12 }}>Custom Design Studio</div>
        <div style={{ fontSize: 13, color: "#888", marginTop: 4 }}>Design your own clothes · Export to embroidery & DTG printers</div>
      </div>
 
      {/* Sub-tabs */}
      <div style={{ display: "flex", gap: 0, background: "#111", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        {[["customize", "Customize"], ["designer", "Fashion Designer Pro"], ["machines", "Machine Export"]].map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} style={{
            padding: "12px 20px", background: tab === id ? "#1a1a2e" : "transparent",
            color: tab === id ? "#e85d04" : "#888", border: "none", borderBottom: tab === id ? "2px solid #e85d04" : "2px solid transparent",
            cursor: "pointer", fontWeight: tab === id ? 700 : 400, fontSize: 13,
          }}>{label}</button>
        ))}
      </div>
 
      {tab === "customize" && (
        <div style={{ padding: 24, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          {/* Left: Design tool */}
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "white", marginBottom: 12 }}>Select Garment Type</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
              {garmentTypes.map(g => (
                <button key={g} onClick={() => setSelectedItem(g)} style={{
                  padding: "8px 14px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.15)",
                  background: selectedItem === g ? "#e85d04" : "#1a1a2e", color: "white", cursor: "pointer", fontSize: 12,
                }}>{g}</button>
              ))}
            </div>
 
            {/* Garment preview canvas placeholder */}
            {/* Garment preview canvas / AI Result */}
            <div style={{ 
              background: "#1a1a2e", borderRadius: 12, height: 320, // Increased height for better view
              display: "flex", alignItems: "center", justifyContent: "center", 
              border: "2px dashed rgba(255,255,255,0.1)", marginBottom: 16, 
              flexDirection: "column", overflow: "hidden", position: 'relative' 
            }}>
              {aiImageUrl ? (
                <img src={aiImageUrl} alt="AI Generated" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <>
                  <div style={{ fontSize: 48, marginBottom: 8 }}>
                    {selectedItem === "Hoodie" ? "🧥" : selectedItem === "Jeans" ? "👖" : selectedItem === "T-Shirt" ? "👕" : selectedItem === "Jacket" ? "🥼" : "👔"}
                  </div>
                  <div style={{ color: "#555", fontSize: 13 }}>{selectedItem} Design Canvas</div>
                  <div style={{ color: "#444", fontSize: 11, marginTop: 4 }}>Describe your design below & hit Generate</div>
                </>
              )}
              
              {isGenerating && (
                <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 14 }}>
                  🧬 Machine is stitching your design...
                </div>
              )}
            </div>


            {/* Fabric selection */}
            <div style={{ fontSize: 14, fontWeight: 700, color: "white", marginBottom: 10 }}>Choose Fabric</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
              {FABRICS.map(fab => (
                <label key={fab.id} style={{ display: "flex", gap: 10, padding: 10, background: selectedFabric.id === fab.id ? "rgba(232,93,4,0.15)" : "#1a1a2e", borderRadius: 8, border: `1px solid ${selectedFabric.id === fab.id ? "#e85d04" : "rgba(255,255,255,0.06)"}`, cursor: "pointer" }}>
                  <input type="radio" name="fabric" checked={selectedFabric.id === fab.id} onChange={() => setSelectedFabric(fab)} style={{ accentColor: "#e85d04" }} />
                  <div>
                    <div style={{ fontWeight: 600, color: "white", fontSize: 13 }}>{fab.name}</div>
                    <div style={{ fontSize: 11, color: "#888" }}>{fab.weight} · {fab.feel}</div>
                    <div style={{ fontSize: 11, color: "#c9a84c" }}>Best for: {fab.best}</div>
                  </div>
                </label>
              ))}
            </div>
 
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 13, color: "#888", marginBottom: 6 }}>Design Notes & Special Instructions</div>
              <textarea value={designNotes} onChange={e => setDesignNotes(e.target.value)}
                placeholder="Describe your design: patches, logos, embroidery placement, color changes..."
                rows={4} style={{ width: "100%", background: "#1a1a2e", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 8, padding: "10px 12px", color: "white", fontSize: 13, resize: "vertical", boxSizing: "border-box" }} />
            </div>
             

          {/* AI GENERATE BUTTON */}
          <button 
              onClick={handleGenerateAI}
              disabled={isGenerating}
              style={{ 
                width: "100%", padding: "10px 0", background: "transparent", 
                color: "#4fc3f7", border: "1px solid #4fc3f7", borderRadius: 10, 
                fontWeight: 700, fontSize: 13, cursor: "pointer", marginBottom: 10,
                opacity: isGenerating ? 0.5 : 1
              }}
            >
              {isGenerating ? "Processing..." : "✨ Generate AI Visual From Notes"}
            </button>

            <button onClick={saveDesign} style={{ width: "100%", padding: "12px 0", background: "#e85d04", color: "white", border: "none", borderRadius: 10, fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
              Save Design to Profile
            </button>
          </div>
 
          {/* Right: Saved designs + fabric note */}
          <div>
            <div style={{ background: "#1a1a2e", borderRadius: 12, padding: 16, marginBottom: 16, border: "1px solid rgba(201,168,76,0.2)" }}>
              <div style={{ fontWeight: 700, color: "#c9a84c", marginBottom: 8 }}>About Fabric Selection</div>
              <div style={{ fontSize: 12, color: "#888", lineHeight: 1.6 }}>
                Since you can't feel the fabric digitally, we've pre-selected 4 trusted materials that our customers consistently love. Each fabric is rated by weight, feel, and best use case. For advanced designers who know their materials, the Designer Pro section has extended fabric options with ordering coordinates.
              </div>
            </div>
 
            <div style={{ fontSize: 14, fontWeight: 700, color: "white", marginBottom: 10 }}>Your Saved Designs</div>
            {savedDesigns.length === 0 ? (
              <div style={{ color: "#555", fontSize: 13, textAlign: "center", padding: 40 }}>
                No saved designs yet. Create your first design above.
              </div>
            ) : savedDesigns.map(d => (
              <div key={d.id} style={{ background: "#1a1a2e", borderRadius: 10, padding: 12, marginBottom: 10, border: "1px solid rgba(255,255,255,0.06)" }}>
                <div style={{ fontWeight: 600, color: "white", fontSize: 13 }}>{d.item} Design</div>
                <div style={{ fontSize: 11, color: "#888" }}>Fabric: {d.fabric}</div>
                <div style={{ fontSize: 11, color: "#888" }}>Saved: {d.savedAt}</div>
                {d.notes && <div style={{ fontSize: 11, color: "#c9a84c", marginTop: 4 }}>"{d.notes.substring(0, 60)}..."</div>}
                <button style={{ marginTop: 8, padding: "4px 12px", background: "#333", border: "none", borderRadius: 6, color: "white", fontSize: 11, cursor: "pointer" }}>
                  Export to Machine File
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
 
      {tab === "designer" && (
        <div style={{ padding: 24 }}>
          <div style={{ background: "linear-gradient(135deg, #2d1b69, #1a1a2e)", borderRadius: 12, padding: 20, marginBottom: 20, border: "1px solid rgba(147,108,221,0.3)" }}>
            <div style={{ fontWeight: 800, color: "#c9a84c", fontSize: 16, marginBottom: 6 }}>Fashion Designer Pro</div>
            <div style={{ fontSize: 13, color: "#888" }}>Advanced section for trained fashion designers and professionals</div>
          </div>
 
          {/* Designer features */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14, marginBottom: 24 }}>
            {[
              { title: "Material Library", desc: "Full fabric database with thread counts, yarn types, and ordering coordinates from Cone Mills, Milliken, and Testfabrics." },
              { title: "Technical Flat Sketches", desc: "Upload your technical flat sketches and we'll generate production-ready specs." },
              { title: "Bulk Order Calculator", desc: "Calculate yardage, thread usage, and production cost for batch orders." },
              { title: "Design File Backup", desc: "All designs sync to your profile for backup. Export as PES, DST, SVG, or PDF spec sheets." },
              { title: "Sewing Machine Programs", desc: "Export to Brother, Tajima, Janome, and Bernina embroidery systems." },
              { title: "Color Matching", desc: "Pantone and CMYK color reference charts for accurate dye matching." },
            ].map(f => (
              <div key={f.title} style={{ background: "#1a1a2e", borderRadius: 10, padding: 16, border: "1px solid rgba(255,255,255,0.06)" }}>
                <div style={{ fontWeight: 700, color: "#e85d04", fontSize: 13, marginBottom: 6 }}>{f.title}</div>
                <div style={{ fontSize: 12, color: "#888", lineHeight: 1.5 }}>{f.desc}</div>
              </div>
            ))}
          </div>
 
          {/* Extended fabric selector */}
          <div style={{ fontSize: 14, fontWeight: 700, color: "white", marginBottom: 12 }}>Advanced Fabric Catalog</div>
          <div style={{ background: "#111", borderRadius: 10, overflow: "hidden", border: "1px solid rgba(255,255,255,0.08)" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ background: "#1a1a2e" }}>
                  {["Material", "Weight", "Feel / Texture", "Best For", "Order Code"].map(h => (
                    <th key={h} style={{ padding: "10px 12px", color: "#888", textAlign: "left", fontWeight: 600 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...FABRICS,
                  { id: "f5", name: "Selvedge Denim - Raw", weight: "14.5oz", feel: "Very stiff, develops natural fade", best: "Premium Jeans", orderCode: "SD-145-RAW" },
                  { id: "f6", name: "Ponte Di Roma", weight: "280gsm", feel: "Smooth, holds shape", best: "Structured Pants", orderCode: "PDR-280" },
                  { id: "f7", name: "Supima Cotton Jersey", weight: "200gsm", feel: "Ultra soft, fine knit", best: "Premium Tees", orderCode: "SCJ-200" },
                  { id: "f8", name: "Sherpa Fleece", weight: "350gsm", feel: "Plush, warm lining", best: "Jacket Linings", orderCode: "SF-350" },
                ].map((f, i) => (
                  <tr key={f.id} style={{ background: i % 2 === 0 ? "#111" : "#0d0d1a", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                    <td style={{ padding: "9px 12px", color: "white" }}>{f.name}</td>
                    <td style={{ padding: "9px 12px", color: "#888" }}>{f.weight}</td>
                    <td style={{ padding: "9px 12px", color: "#888" }}>{f.feel}</td>
                    <td style={{ padding: "9px 12px", color: "#c9a84c" }}>{f.best}</td>
                    <td style={{ padding: "9px 12px", color: "#4fc3f7" }}>{f.orderCode || "See catalog"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
 
 {tab === "machines" && (
        <div style={{ padding: 24 }}>
          <div style={{ background: "linear-gradient(135deg, #111, #000)", border: "2px solid #e85d04", borderRadius: 15, padding: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20, alignItems: 'center' }}>
              <div>
                <h3 style={{ color: "#e85d04", margin: 0, letterSpacing: 2 }}>CORE-DESIGN MACHINE v1.0</h3>
                <p style={{ color: "#888", fontSize: 11, margin: 0 }}>Import garments or documents to innovate with AI</p>
              </div>
              <label style={{ background: "#e85d04", color: "white", padding: "8px 16px", borderRadius: 5, cursor: "pointer", fontSize: 12, fontWeight: 700 }}>
                IMPORT IMAGE / DOC
                <input type="file" hidden onChange={(e) => {
                  const file = e.target.files[0];
                  if (file) 
                    setSelectedFile(file); // Uses your state!
                    {setPreviewUrl(URL.createObjectURL(file));
                  }
                }} accept="image/*" />
              </label>
            </div>

            <div style={{ display: "flex", gap: 20, flexWrap: 'wrap' }}>
              {/* Sidebar Tools */}
              <div style={{ width: 220, display: "flex", flexDirection: "column", gap: 10 }}>
                <p style={{ color: "#fff", fontSize: 12, fontWeight: 700, borderBottom: '1px solid #333', pb: 5 }}>AI INNOVATION TOOLS</p>
                <DesignMachine 
      previewUrl={previewUrl}
      setPreviewUrl={setPreviewUrl}
      designElements={designElements}
      setDesignElements={setDesignElements}
      isInnovating={isInnovating}
      setIsInnovating={setIsInnovating}
      aiImageUrl={aiImageUrl}
      isGenerating={isGenerating}
      draggingId={draggingId}
      setDraggingId={setDraggingId}

    />
                {/* <button onClick={() => handleInnovate("pocket")} style={machineBtnStyle}>Add 3D Pocket</button>
                <button onClick={() => handleInnovate("patch")} style={machineBtnStyle}> Add Custom Patch </button>
                <button onClick={() => handleInnovate("logo")} style={machineBtnStyle}>Auto-Place Logo </button>
                 */}
                <p style={{ color: "#fff", fontSize: 12, fontWeight: 700, marginTop: 20, borderBottom: '1px solid #333', pb: 5 }}>PRODUCTION EXPORT</p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  {['JPG', 'PNG', 'SVG', 'GIF', 'RAW'].map(f => (
                    <button key={f} onClick={() => alert(`Exporting to ${f}...`)} style={exportBtnStyle}>{f}</button>
                  ))}
                </div>
              </div>

              {/* Main Viewport */}
              <div style={{ 
                flex: 1, minWidth: 300, height: 500, background: "#050505", borderRadius: 10, 
                position: "relative", overflow: "hidden", display: "flex", 
                justifyContent: "center", alignItems: "center", border: "1px solid #222" 
              }}>
                {previewUrl ? (
                  <div style={{ position: "relative", width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <img src={previewUrl} style={{ maxWidth: "100%", maxHeight: "100%", objectFit: 'contain' }} alt="Work in progress" />
                    {/* Elements like pockets/patches would map here */}
                  </div>
                ) : (
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 40, opacity: 0.2 }}>📸</div>
                    <div style={{ color: "#444", fontSize: 13, fontWeight: 600 }}>MACHINE IDLE: IMPORT FILE TO START</div>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div style={{ marginTop: 20, color: "#555", fontSize: 11 }}>
            Note: SVG and RAW exports generate production-ready vector coordinates for Brother & Tajima systems.
          </div>
        </div>
      )}
    </div>
);
};
 



// PAGE: Inventory Analytics Scanner
const AnalyticsPage = () => {
  const [uploadedFile, setUploadedFile] = useState(null);
  const [activeStore, setActiveStore] = useState("imanSports");
 
  const data = INVENTORY_ANALYTICS[activeStore];
 
  return (
    <div>
      <div style={{ background: "linear-gradient(135deg, #0d1a0d, #1a2e1a)", padding: "32px 24px" }}>
        <div style={{ fontSize: 24, fontWeight: 800, color: "white", marginBottom: 4 }}>Inventory & Profit Scanner</div>
        <div style={{ fontSize: 13, color: "#888" }}>Analyze store data · Determine profit margins · Track investments</div>
      </div>
 
      {/* Store selector */}
      <div style={{ padding: "16px 24px", background: "#111", display: "flex", gap: 10 }}>
        {[["imanSports", "Iman Sports"], ["blueJeans", "Blue Jeans NYC"], ["cornellsDenim", "Cornell's Denim"]].map(([id, name]) => (
          <button key={id} onClick={() => setActiveStore(id)} style={{
            padding: "8px 16px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.15)",
            background: activeStore === id ? "#e85d04" : "#1a1a2e", color: "white", cursor: "pointer", fontSize: 13, fontWeight: activeStore === id ? 700 : 400,
          }}>{name}</button>
        ))}
      </div>
 
      {/* KPI cards */}
      <div style={{ padding: "20px 24px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
        {[
          { label: "Total Invested", value: `$${data.totalInvested.toLocaleString()}`, color: "#4fc3f7" },
          { label: "Total Revenue", value: `$${data.totalRevenue.toLocaleString()}`, color: "#81c784" },
          { label: "Profit Margin", value: `${data.profitMargin}%`, color: "#e85d04" },
          { label: "Net Profit", value: `$${(data.totalRevenue - data.totalInvested).toLocaleString()}`, color: "#c9a84c" },
        ].map(kpi => (
          <div key={kpi.label} style={{ background: "#1a1a2e", borderRadius: 10, padding: 16, border: "1px solid rgba(255,255,255,0.06)" }}>
            <div style={{ fontSize: 11, color: "#888", marginBottom: 6 }}>{kpi.label}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: kpi.color }}>{kpi.value}</div>
          </div>
        ))}
      </div>
 
      {/* Monthly orders chart (bar visualization) */}
      <div style={{ padding: "0 24px 20px" }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "white", marginBottom: 12 }}>Monthly Order Volume</div>
        <div style={{ background: "#1a1a2e", borderRadius: 10, padding: "16px", border: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ display: "flex", gap: 4, alignItems: "flex-end", height: 100 }}>
            {data.monthlyOrders.map((val, i) => {
              const max = Math.max(...data.monthlyOrders);
              const months = ["J","F","M","A","M","J","J","A","S","O","N","D"];
              return (
                <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                  <div style={{ width: "100%", background: "#e85d04", height: `${(val / max) * 80}px`, borderRadius: "2px 2px 0 0", minHeight: 4 }} />
                  <div style={{ fontSize: 9, color: "#555" }}>{months[i]}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
 
      {/* Low stock alerts */}
      <div style={{ padding: "0 24px 20px" }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#e57373", marginBottom: 10 }}>⚠️ Low Stock Alerts</div>
        <div style={{ background: "#1a1a2e", borderRadius: 10, border: "1px solid rgba(229,115,115,0.2)", overflow: "hidden" }}>
          {data.lowStock.map((item, i) => (
            <div key={i} style={{ padding: "10px 16px", borderBottom: i < data.lowStock.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 13, color: "#ccc" }}>{item}</span>
              <span style={{ background: "rgba(229,115,115,0.15)", color: "#e57373", fontSize: 11, padding: "2px 10px", borderRadius: 20, fontWeight: 600 }}>Restock Needed</span>
            </div>
          ))}
        </div>
      </div>
 
      {/* Data upload section */}
      <div style={{ padding: "0 24px 40px" }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "white", marginBottom: 10 }}>Upload Real Store Data</div>
        <div style={{ background: "#1a1a2e", borderRadius: 10, padding: 20, border: "2px dashed rgba(255,255,255,0.12)", textAlign: "center" }}>
          <div style={{ fontSize: 36, marginBottom: 10 }}>📂</div>
          <div style={{ color: "#888", fontSize: 13, marginBottom: 12 }}>
            Upload spreadsheet, CSV, or inventory export from your store management system.
            <br />Supports: .xlsx, .csv, .json
          </div>
          <input type="file" accept=".xlsx,.csv,.json" onChange={e => setUploadedFile(e.target.files[0])}
            style={{ display: "none" }} id="dataUpload" />
          <label htmlFor="dataUpload" style={{ padding: "10px 24px", background: "#e85d04", color: "white", borderRadius: 8, cursor: "pointer", fontWeight: 700, fontSize: 13 }}>
            {uploadedFile ? `✓ ${uploadedFile.name}` : "Choose File"}
          </label>
          {uploadedFile && (
            <div style={{ marginTop: 12 }}>
              <button style={{ padding: "8px 20px", background: "#333", color: "white", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13 }}>
                Process & Analyze File
                {/* API: Connect to /api/analyze-inventory endpoint */}
              </button>
            </div>
          )}
          <div style={{ fontSize: 10, color: "#444", marginTop: 12 }}>
            Currently showing sample/dummy data. Upload real store files to replace with live analytics.
          </div>
        </div>
      </div>
    </div>
  );
};
 
// ============================================================
// SECTION: MAIN APP COMPONENT
// This is the root component — controls global state & routing
// ============================================================
export default function CoreTrenzApp() {
  // STATE: Active navigation tab
  const [activeTab, setActiveTab] = useState("home");
 
  // STATE: Shopping cart items array
  const [cart, setCart] = useState([]);
 
  // STATE: Cart sidebar visibility
  const [cartOpen, setCartOpen] = useState(false);
 
  // STATE: Signup modal - null | 'customer' | 'carrier'
  const [signupModal, setSignupModal] = useState(null);
 
  // STATE: Mobile nav open/close
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
 
  // HANDLER: Add item to cart
  const handleAddToCart = useCallback((item) => {
    setCart(prev => {
      const existing = prev.findIndex(i => i.id === item.id && i.selectedSize === item.selectedSize);
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = { ...updated[existing], qty: updated[existing].qty + 1 };
        return updated;
      }
      return [...prev, { ...item, qty: 1 }];
    });
    setCartOpen(true);
  }, []);
 
  


  // HANDLER: Remove item from cart by index
  const handleRemoveFromCart = useCallback((index) => {
    setCart(prev => prev.filter((_, i) => i !== index));
  }, []);
 
  // HANDLER: Update item quantity in cart
  const handleUpdateQty = useCallback((index, delta) => {
    setCart(prev => {
      const updated = [...prev];
      updated[index].qty = Math.max(1, updated[index].qty + delta);
      return updated;
    });
  }, []);
 
//handleCheckout  double check does this handleCheckout need other state logic to asist elsewhere in the jsx file   
  const handleCheckout = async () => {
    try {
        const response = await fetch(`${API_URL}/api/payments/create-checkout`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ cartItems: cart }), // Make sure 'cart' is your state variable name
        });

        const data = await response.json();
        
        if (data.id) {
            // This redirects the user to the REAL Stripe hosted page
            window.location.href = `https://checkout.stripe.com/pay/${data.id}`;
        } else{
          alert("Checkout failed.")
        }
    } catch (err) {
        alert("checkut is offline. Please check back.");
    }
};
  

  // NAV: All navigation tabs with labels
  const navTabs = [
    { id: "home", label: "Home" },
    { id: "cornells", label: "Cornell's Denim" },
    { id: "partners", label: "Partner Brands" },
    { id: "marketplace", label: "Marketplace" },
    { id: "delivery", label: "Delivery" },
    { id: "studio", label: "Design Studio" },
    { id: "analytics", label: "Analytics" },
  ];
 
  // RENDER: Active page based on tab selection
  const renderPage = () => {
    switch (activeTab) {
      case "home": return <HomePage onAddToCart={handleAddToCart} onSignup={setSignupModal} />;
      case "cornells": return <CornellsDenimPage onAddToCart={handleAddToCart} />;
      case "partners": return <PartnerBrandsPage />;
      case "marketplace": return <MarketplacePage onAddToCart={handleAddToCart} />;
      case "delivery": return <DeliveryPage onCarrierSignup={() => setSignupModal("carrier")} onCustomerSignup={() => setSignupModal("customer")} />;
      case "studio": return <DesignStudioPage />;
      case "analytics": return <AnalyticsPage />;
      default: return <HomePage onAddToCart={handleAddToCart} onSignup={setSignupModal} />;
    }
  };
 
  return (
    <div style={{ minHeight: "100vh", background: "#0d0d1a", color: "white", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      {/* CSS keyframe animations injected via style tag */}
      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes slideIn { from{transform:translateX(100%)} to{transform:translateX(0)} }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: #111; }
        ::-webkit-scrollbar-thumb { background: #e85d04; border-radius: 2px; }
      `}</style>
 
      {/* ===== GLOBAL HEADER ===== */}
      <header style={{ background: "#080810", borderBottom: "1px solid rgba(255,255,255,0.08)", position: "sticky", top: 0, zIndex: 1000 }}>
        {/* Brand ticker */}
        <BrandTicker />
 
        {/* Main nav bar */}
        <div style={{ padding: "12px 20px", display: "flex", alignItems: "center", gap: 16 }}>
          {/* Logo */}
          <div onClick={() => setActiveTab("home")} style={{ cursor: "pointer", flexShrink: 0 }}>
            <CoreTrenzLogo size={32} showText={true} />
          </div>
 
          {/* Desktop navigation tabs */}
          <div style={{ display: "flex", gap: 6, overflowX: "auto", flex: 1, padding: "2px 0" }}>
            {navTabs.map(tab => (
              <NavTab key={tab.id} label={tab.label} active={activeTab === tab.id} onClick={() => setActiveTab(tab.id)} />
            ))}
          </div>
 
          {/* Right actions */}
          <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
            {/* Cart button with item count badge */}
            <button onClick={() => setCartOpen(true)} style={{ position: "relative", background: "transparent", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 8, padding: "8px 14px", color: "white", cursor: "pointer", fontSize: 14 }}>
              🛒
              {cart.length > 0 && (
                <span style={{ position: "absolute", top: -6, right: -6, background: "#e85d04", color: "white", width: 18, height: 18, borderRadius: "50%", fontSize: 10, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800 }}>
                  {cart.reduce((acc, i) => acc + i.qty, 0)}
                </span>
              )}
            </button>
 
            {/* Sign up button */}
            <button onClick={() => setSignupModal("customer")} style={{ padding: "8px 16px", background: "#e85d04", border: "none", borderRadius: 8, color: "white", fontWeight: 700, cursor: "pointer", fontSize: 13 }}>
              Sign Up
            </button>
          </div>
        </div>
      </header>
 
      {/* ===== MAIN CONTENT AREA ===== */}
      <main>
        {renderPage()}
      </main>
 
      {/* ===== FOOTER ===== */}
      <footer style={{ background: "#080810", borderTop: "1px solid rgba(255,255,255,0.06)", padding: "40px 24px 20px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 32, marginBottom: 32 }}>
          <div>
            <CoreTrenzLogo size={36} showText={true} />
            <p style={{ fontSize: 12, color: "#555", marginTop: 12, lineHeight: 1.6 }}>
              AI-powered fashion marketplace connecting NYC shoppers with the best deals, local stores, and custom designs.
            </p>
          </div>
          {[
            { heading: "Shop", links: ["Cornell's Denim", "Partner Stores", "Marketplace", "Trending"] },
            { heading: "Delivery", links: ["Become a Carrier", "Get Delivered", "Track Order", "Delivery Zones"] },
            { heading: "Help", links: ["About Us", "Returns Policy", "Contact", "FAQ"] },
          ].map(col => (
            <div key={col.heading}>
              <div style={{ fontWeight: 700, color: "#e85d04", fontSize: 13, marginBottom: 12, textTransform: "uppercase", letterSpacing: 1 }}>{col.heading}</div>
              {col.links.map(link => (
                <div key={link} style={{ fontSize: 12, color: "#555", marginBottom: 8, cursor: "pointer" }}
                  onMouseEnter={e => e.target.style.color = "#e85d04"}
                  onMouseLeave={e => e.target.style.color = "#555"}>
                  {link}
                </div>
              ))}
            </div>
          ))}
        </div>
 
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 16, display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
          <div style={{ fontSize: 11, color: "#333" }}>
            © 2026 CoreTrenz Inc. · Cornell's Denim is a trademark of CoreTrenz Inc. · All rights reserved.
          </div>
          <div style={{ fontSize: 11, color: "#333" }}>
            NYC · NYS · New Jersey | Powered by CoreTrenz AI
          </div>
        </div>
 
        {/* Developer footer note */}
        <div style={{ marginTop: 16, padding: 12, background: "#111", borderRadius: 8, border: "1px solid rgba(255,255,255,0.04)" }}>
          <div style={{ fontSize: 10, color: "#333", lineHeight: 1.6 }}>
            <strong style={{ color: "#555" }}>Developer Notes:</strong> Business constants (commissions, fees, tax rates) are at the top of CoreTrenz.jsx. All components are labeled with COMPONENT:, STATE:, HANDLER:, and API: comments. To swap dummy data: update CORNELLS_INVENTORY and MARKETPLACE_ITEMS. Partner brands and affiliate links: BRANDS (see BRAND-PARTNERS.md). For real API integration: search for "API:" comments throughout. Delivery fee logic: calcDeliveryFee(). Discount logic: calcDiscountSavings(). Tax rate: TAX_RATE constant.
          </div>
        </div>
      </footer>
 
      {/* ===== CART SIDEBAR (conditional render) ===== */}
      {cartOpen && (
        <CartSidebar
          cart={cart}
          onClose={() => setCartOpen(false)}
          onRemove={handleRemoveFromCart}
          onUpdateQty={handleUpdateQty}
          onCheckout={handleCheckout}
        />
      )}
 
      {/* ===== SIGNUP MODAL (conditional render) ===== */}
      {signupModal && (
        <SignupModal
          type={signupModal}
          onClose={() => setSignupModal(null)}
          onSuccess={() => console.log("User signed up:", signupModal)}
        />
      )}
    </div>
  );
}