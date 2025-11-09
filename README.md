# Voyager AI Travel Planner

Voyager is a React + Firebase travel planning app with AI-assisted itinerary generation, destination search (local + Google Places), and Amadeus integration (flights, hotels, activities).

## Key Features
- Trip creation with multi-destination timeline
- AI itinerary generation (transportation, lodging, experiences)
- Modular global destinations database (local + external fallback)
- Credit system (AI generations + Pro searches)
- Config‑driven pricing & top-ups

## Pricing & Credits Configuration

Pricing, plan limits, and top-up bundles are defined in a single JSON file: `src/config/plans.json`.

Example structure:
```json
{
	"version": 1,
	"currency": "USD",
	"plans": {
		"free": { "monthly_price": 0, "ai_generations_included": 1, "pro_searches_included": 10 },
		"pro_monthly": { "monthly_price": 5.0, "ai_generations_included": "unlimited", "pro_searches_included": "unlimited" }
	},
	"topups": [
		{ "id": "standard", "ai_generations_add": 10, "pro_searches_add": 120, "price": 6.99, "original_price": 11.99 }
	]
}
```

Helper utilities (`src/lib/plans.js`):
```js
import { PLANS, TOPUPS, getTopupById, formatCurrency } from '@/lib/plans';

const proMonthly = PLANS.pro_monthly.monthly_price; // 5.00
const bundle = getTopupById('standard');
```

Automatically computed fields on each top-up:
- `price_per_ai_generation`
- `price_per_pro_search`
- `discount_percent` (from `original_price`)

Update pricing or credit amounts by editing `plans.json` (no code changes needed). The following UI components consume this config:
- `ProUpgrade.jsx` (plan pricing + top-up quick purchase buttons)
- `Payment.jsx` (renders a specific top-up via `?topup=ID` query param)
- `Billing.jsx` (shows combined AI + Pro search credit additions)

## Development
Install & run dev server:
```bash
npm install
npm run dev
```

Deploy functions:
```bash
firebase deploy --only functions
```

## Environment Variables
- `GEMINI_API_KEY` – for LLM generation
- `GOOGLE_PLACES_API_KEY` – for fallback destination search

## Folder Highlights
- `functions/` – Firebase Cloud Functions (search, AI invoke, payments)
- `src/pages/` – Page-level React components
- `src/components/` – Reusable UI & domain components
- `src/lib/plans.js` – Pricing & credits helper layer

## Updating Plans / Top-Ups
1. Edit `src/config/plans.json`
2. Commit & deploy (frontend hot-reloads config)
3. No backend changes needed unless logic around credits changes

## Credits Mapping Rationale
Top-up bundles grant both AI generations and Pro searches. Mapping is approx 1 AI gen ≈ 12 Pro searches in perceived value. Prices reflect >40% reduction compared to baseline to improve competitiveness.

---
For further architectural details see `.github/copilot-instructions.md` (internal guide).