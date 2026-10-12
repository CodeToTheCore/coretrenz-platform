# CoreTrenz Platform

A full-stack fashion marketplace I built in April 2026. Shoppers browse partner streetwear brands, search products across marketplaces, design custom clothing, and check out with Stripe. The app also calculates delivery fees, finder fees, and NYC sales tax.

## Features

- **Partner brand directory.** Streetwear and outdoor brands with links to their stores.
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
