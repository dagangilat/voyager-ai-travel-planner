# AI Agent Instructions for Voyager Travel Planner

## Project Overview
Voyager is a React-based travel planning application that helps users create and manage trips with features for managing destinations, lodging, transportation, and experiences. The application uses Firebase for backend services and integrates with various travel APIs (Amadeus, Google Places) for search capabilities.

## Architecture & Key Components

### Core Structure
- `src/pages/` - React components for main application views
- `src/components/` - Reusable UI components, organized by domain (trips/, common/, ui/)
- `src/entities/` - JSON schema definitions for core domain models (Trip, Destination, etc.)
- `functions/` - Firebase Cloud Functions for backend services
- `src/api/` - API client integrations and entity definitions

### Data Model
The application follows a hierarchical data model where:
- `Trip` is the root entity (see `src/entities/Trip.json`)
- Trips contain: Destinations, Lodging, Transportation, and Experiences
- Each entity has its own schema defined in `src/entities/*.json`

### UI Component System
- Built on Radix UI primitives with custom styling
- Shared components in `src/components/ui/`
- Domain-specific components in respective folders (e.g., `src/components/trips/`)

## Development Workflows

### Setup & Running
```bash
npm install
npm run dev # Starts Vite dev server
```

### Firebase Functions
- Local testing: `firebase emulators:start`
- Deployment: `firebase deploy --only functions`
- Functions are HTTP-triggered (see `functions/*` for endpoints)

### Key Patterns

#### State Management
- React Query (`@tanstack/react-query`) for server state
- React Context for auth state (`src/lib/AuthContext.jsx`)
- Form handling with `react-hook-form` and `zod` validation

#### Routing
- Uses React Router with centralized route config in `src/pages.config.js`
- Layout wrapper defined in `src/Layout.jsx`

#### API Integration
- Amadeus API for flights, hotels, and activities
- Google Places API for location search
- Firebase for backend services

## Common Tasks

### Adding a New Page
1. Create component in `src/pages/`
2. Add route to `src/pages.config.js`
3. Add any required API integrations in `src/api/`

### Adding New Entity Types
1. Define schema in `src/entities/`
2. Create corresponding Firebase functions if needed
3. Add UI components in `src/components/`
4. Update API client in `src/api/`

## Integration Points
- Amadeus API (flights, hotels, activities)
- Google Places API (location search)
- Firebase (auth, database, functions)
- Payment processing (see `src/pages/Payment.jsx`)

## Conventions
- Use TypeScript-style prop validation with JSDoc comments
- Firebase functions use `.js` extension
- UI components are grouped by domain in `src/components/`
- Entity schemas define data structure and validation rules