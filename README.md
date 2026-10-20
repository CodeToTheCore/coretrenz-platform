# CoreTrenz Platform

A full-stack fashion business I started building in April 2026: my own brand, Cornell's Denim, plus partner brands. Shoppers browse partner streetwear brands, search products across marketplaces, design custom clothing, and check out with Stripe. The app also calculates delivery fees, finder fees, and NYC sales tax.

## Features

- **Partner Brands.** 14 brand companies (streetwear, outerwear, footwear, sports) with category filters and "Cornell's Picks." Shop links are tagged so brands can see the shoppers CoreTrenz sends them, and they switch to affiliate links as partnerships come through. Tracker: [BRAND-PARTNERS.md](BRAND-PARTNERS.md).
- **Marketplace search.** One search box that queries the server's marketplace API (Amazon, eBay, and Shopify connectors).
- **Design Machine.** Generates clothing design visuals from a text prompt.
- **Stripe checkout.** Creates Stripe Checkout sessions on the server.
- **Business logic in one place.** Commission, delivery cut, carrier fee, and tax rates are constants at the top of `client/src/App.jsx`.

## Built with

React (Create React App), Node.js, Express 5, Stripe, Axios

## Project structure

```
client/   React front end
server/   Express API (routes: marketplace, payments, design, designstudio)
```

## Run it locally

1. Install dependencies:
   ```bash
   cd server && npm install
   cd ../client && npm install
   ```
2. Copy `server/.env.example` to `server/.env` and `client/.env.example` to `client/.env`, then add your own Stripe **test** keys.
3. Start the API (port 5000):
   ```bash
   cd server && node server.js
   ```
4. In a second terminal, start the front end:
   ```bash
   cd client && npm start
   ```

## Roadmap

- **Phase 1 (now):** Cornell's Denim, plus Partner Brands through affiliate links and creator codes (no money up front)
- **Phase 2:** Wholesale deals with the brands that sell best; marketplace deals through affiliate programs
- **Phase 3:** Design Studio, then Delivery
