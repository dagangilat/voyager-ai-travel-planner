# Voyager AI Travel Planner

Voyager is a React + Firebase travel planning app with AI-assisted itinerary generation, destination search (local + Google Places), and Amadeus integration (flights, hotels, activities).

## Key Features
- Trip creation with multi-destination timeline
- AI itinerary generation (transportation, lodging, experiences)
- Modular global destinations database (local + external fallback)

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
