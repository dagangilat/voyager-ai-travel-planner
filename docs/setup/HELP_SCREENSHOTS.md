# Help Screenshots Guide

## Required Screenshots

To complete the Help Center, please add the following screenshots to `/public/help-screenshots/`:

### 1. Creating a New Trip
**Filename**: `create-trip.png`
**What to capture**: 
- The Create Trip page showing:
  - Trip name field
  - Budget level selector (Economy/Premium/Luxury)
  - Trip tempo selector (Chill/Adventure/Culture/Sports/Mix)
  - Destination form with arrival date and nights
  - Visit focus tags (badges)

### 2. Creating with AI
**Filename**: `create-with-ai.png`
**What to capture**:
- The AI Options Dialog showing:
  - Transportation options selector (1-3)
  - Lodging options selector (1-3)
  - Experience options selector (1-3)
  - "Generate with AI" button

**Additional**: `ai-progress.png`
- The AI progress overlay showing:
  - Loading spinner with sparkles
  - Progress message
  - Detail text (e.g., "Generating Transportation: LON → PAR")

### 3. Managing Your Trip
**Filename**: `trip-details.png`
**What to capture**:
- Trip Details page showing:
  - Trip header with name, dates, badges
  - Edit Trip button
  - AI Trip button
  - Search buttons (Flights, Hotels, Activities)
  - List of transportation, lodging, and experiences

### 4. Sharing Your Trip
**Filename**: `share-trip.png`
**What to capture**:
- Share dialog showing:
  - Email input field
  - Permission dropdown (Viewer/Editor)
  - Share button

### 5. Email Notifications
**Filename**: `email-example.png`
**What to capture**:
- Screenshot of an actual email notification showing:
  - Gradient header with trip name
  - Trip details (dates, origin, budget, tempo)
  - Destination list with dates
  - "View Full Trip Details" button

**Additional**: `email-preferences.png`
- Profile page showing email notification toggles

### 6. Search & Book
**Filename**: `search-results.png`
**What to capture**:
- Search results page (flights/hotels/activities) showing:
  - Search results list
  - Prices and details
  - "Save to Trip" buttons

### 7. Budget & Tempo
**Filename**: `budget-tempo.png`
**What to capture**:
- Create Trip page focused on:
  - Budget Level selector expanded
  - Trip Tempo selector expanded
  - Both showing all options

### 8. Visit Focus Tags
**Filename**: `visit-focus.png`
**What to capture**:
- Destination section showing:
  - Visit Focus label
  - All 8 badges (Explore, Nightlife, Shopping, Beach, Food, Culture, Adventure, Rest)
  - Some selected (blue) and some unselected (outline)

## How to Add Screenshots

1. **Take Screenshots**:
   - Use your browser's screenshot tool
   - Recommended size: 1200x800px or similar
   - Format: PNG for better quality
   - Make sure UI is clean and representative

2. **Save Files**:
   ```bash
   # Save to this directory
   /public/help-screenshots/
   
   # File naming convention
   create-trip.png
   create-with-ai.png
   ai-progress.png
   trip-details.png
   share-trip.png
   email-example.png
   email-preferences.png
   search-results.png
   budget-tempo.png
   visit-focus.png
   ```

3. **Image Requirements**:
   - Format: PNG (preferred) or JPG
   - Max size: 500KB per image
   - Resolution: At least 1200px wide
   - Quality: Clear and readable text
   - Clean UI: No personal information visible

4. **Update Help.jsx**:
   After adding screenshots, update the Help component to display them:
   
   ```jsx
   // Add after steps in each section
   {section.screenshot && (
     <div className="mt-6">
       <img 
         src={section.screenshot} 
         alt={`${section.title} screenshot`}
         className="w-full rounded-lg border border-gray-200 shadow-md"
       />
     </div>
   )}
   ```

5. **Add screenshot paths to sections array**:
   ```javascript
   {
     title: "Creating a New Trip",
     // ... existing properties
     screenshot: "/help-screenshots/create-trip.png"
   }
   ```

## Screenshot Tips

### Good Screenshots:
✅ Clean, uncluttered UI
✅ All relevant features visible
✅ Good contrast and readability
✅ Representative data (not Lorem Ipsum)
✅ Proper lighting/colors

### Avoid:
❌ Personal information (emails, names)
❌ Blurry or low-resolution images
❌ Dark mode if app is light (or vice versa)
❌ Half-loaded pages
❌ Error states (unless demonstrating error handling)

## Testing

After adding screenshots:
1. Run `npm run dev`
2. Navigate to `/Help`
3. Verify all images load correctly
4. Check responsive design (mobile/tablet/desktop)
5. Ensure images don't slow down page load

## Alternative: Use Placeholders

If you don't have screenshots yet, you can use placeholder images:

```jsx
screenshot: "https://via.placeholder.com/1200x800/3b82f6/ffffff?text=Create+New+Trip"
```

Or create simple SVG placeholders in the code.
