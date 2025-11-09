# Browser Console Debugging Guide for Amadeus Searches

## How to Debug Amadeus Searches in Chrome DevTools

### 1. Open Chrome DevTools
- Press `F12` or `Cmd+Option+I` (Mac) / `Ctrl+Shift+I` (Windows)
- Go to the **Console** tab

### 2. Enable Verbose Logging
The updated code now logs detailed information. You'll see:

```javascript
// When LocationSearchInput returns a location:
{
  code: "JFK",
  displayName: "New York, USA [JFK]",
  location: { lat: 40.6413, lng: -73.7781 }
}

// When Amadeus API is called:
Function searchAmadeusFlights error details: {
  status: 200,
  statusText: "OK",
  errorData: {...},
  url: "https://..."
}
```

### 3. Check Network Tab
1. Switch to **Network** tab
2. Filter by: `XHR` or `Fetch`
3. Look for requests to `cloudfunctions.net`
4. Click on a request to see:
   - **Headers**: Check method (should be GET)
   - **Preview**: See the actual response
   - **Response**: Raw JSON data

### 4. Test Amadeus Searches

#### Testing Flights
```javascript
// In the browser console, you can manually test:
const response = await fetch(
  'https://us-central1-voyager-ai-travel-planner.cloudfunctions.net/searchAmadeusFlights?' +
  'originLocationCode=JFK&destinationLocationCode=LAX&departureDate=2025-12-15&adults=1'
);
const data = await response.json();
console.log('Flights:', data);
```

#### Testing Hotels
```javascript
const response = await fetch(
  'https://us-central1-voyager-ai-travel-planner.cloudfunctions.net/searchAmadeusHotels?' +
  'cityCode=PAR&checkInDate=2025-12-15&checkOutDate=2025-12-20&adults=2'
);
const data = await response.json();
console.log('Hotels:', data);
```

#### Testing Activities
```javascript
const response = await fetch(
  'https://us-central1-voyager-ai-travel-planner.cloudfunctions.net/searchAmadeusActivities?' +
  'latitude=48.8566&longitude=2.3522&radius=20'
);
const data = await response.json();
console.log('Activities:', data);
```

### 5. Common Error Messages and Solutions

#### "Method not allowed"
- **Cause**: Function expecting GET but receiving POST
- **Status**: ✅ FIXED in this update
- **Check**: Network tab should show GET request

#### "Please select airports with valid IATA codes"
- **Cause**: Location doesn't have IATA code in brackets
- **Solution**: Select different airport from dropdown
- **Example**: Choose "New York, USA [JFK]" not just "New York"

#### "Please select a location with coordinates"
- **Cause**: Activities search needs lat/lng (Activities only)
- **Solution**: Make sure location has been selected from dropdown, not typed manually
- **Check**: `console.log(searchParams.location_coordinates)`

#### "Failed to fetch flight/hotel/activity offers"
- **Cause**: Amadeus API returned error
- **Check**: Console will show detailed error including Amadeus error code
- **Common Codes**:
  - `38196`: Resource not found (invalid IATA code or no data)
  - `4926`: Invalid date format
  - `477`: Invalid location code

### 6. Inspect searchParams State

In React DevTools:
1. Install React DevTools extension
2. Open Components tab
3. Find SearchTransportation/SearchLodging/SearchExperiences component
4. Look at hooks → searchParams state
5. Verify it contains:
   - `from_location_code` (Flights)
   - `from_location_display` (Flights)
   - `location_coordinates` (Activities)
   - Proper date formats

### 7. Monitor Search Flow

Set breakpoint or add console.log:

```javascript
// In SearchTransportation.jsx line ~212
console.log('Amadeus Search Params:', {
  originCode,
  destCode,
  departureDate: searchParams.departure_date
});

// Check if codes are extracted correctly
console.log('IATA Codes:', {
  from: extractIataCode(searchParams.from_location_display),
  to: extractIataCode(searchParams.to_location_display)
});
```

### 8. Test IATA Code Extraction

```javascript
// Copy the extractIataCode function to console:
function extractIataCode(location) {
  if (!location) return '';
  if (/^[A-Z]{3}$/i.test(location)) return location.toUpperCase();
  const bracketMatch = location.match(/\[([A-Z]{3})\]/i);
  if (bracketMatch) return bracketMatch[1].toUpperCase();
  const parenMatch = location.match(/\(([A-Z]{3})\)/i);
  if (parenMatch) return parenMatch[1].toUpperCase();
  return '';
}

// Test it:
extractIataCode("New York, USA [JFK]");  // Should return "JFK"
extractIataCode("London (LHR)");         // Should return "LHR"
extractIataCode("Paris");                 // Should return ""
```

### 9. Check Credits/Pro Status

```javascript
// In console, check if user has Pro access or credits:
// (Requires being logged in)
fetch('https://us-central1-voyager-ai-travel-planner.cloudfunctions.net/getCurrentUser', {
  headers: {
    'Authorization': `Bearer ${await firebase.auth().currentUser.getIdToken()}`
  }
}).then(r => r.json()).then(data => {
  console.log('User Pro Status:', {
    status: data.pro_subscription?.status,
    credits: data.credits?.pro_searches_remaining,
    canUseAmadeus: data.pro_subscription?.status === 'pro' || 
                   data.pro_subscription?.status === 'trial' ||
                   (data.credits?.pro_searches_remaining || 0) > 0
  });
});
```

### 10. Verify LocationSearchInput Response

Add temporary logging in LocationSearchInput.jsx:

```javascript
// In handleSelectSuggestion function, line ~110
console.log('Location Selected:', {
  code: suggestion.code,
  name: suggestion.name,
  location: suggestion.location
});
```

### 11. Performance Monitoring

```javascript
// Check how long Amadeus API takes:
console.time('Amadeus Search');
// ... do search ...
console.timeEnd('Amadeus Search');
```

### 12. Clear State Issues

If search seems stuck:
```javascript
// Force re-mount of component by navigating away and back
// Or in console:
localStorage.clear();
location.reload();
```

## Quick Checklist for Debugging

- [ ] Console has no red errors before clicking search
- [ ] Location selection shows formatted text with [CODE]
- [ ] Network tab shows GET request (not POST)
- [ ] Request URL has proper query parameters
- [ ] Response status is 200 (or shows specific error)
- [ ] User has Pro status or remaining credits
- [ ] Date is in future and in YYYY-MM-DD format
- [ ] searchParams state has all required fields

## Need More Help?

Check these files:
- `AMADEUS_FIX_SUMMARY.md` - Implementation details
- `AMADEUS_TEST_RESULTS.md` - API test results
- `test-amadeus-apis.js` - Automated test script
