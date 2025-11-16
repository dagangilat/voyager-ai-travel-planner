# Voyager AI Travel Planner

Voyager is a React + Firebase travel planning app with AI-assisted itinerary generation, destination search (local + Google Places), and Amadeus integration (flights, hotels, activities).

## Key Features
- Trip creation with multi-destination timeline
- AI itinerary generation (transportation, lodging, experiences)
- Modular global destinations database (local + external fallback)
- Credit system (AI generations + Pro searches)
- Config‑driven pricing & top-ups

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