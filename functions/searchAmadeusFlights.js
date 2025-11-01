import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

const AMADEUS_API_KEY = Deno.env.get("AMADEUS_API_KEY");
const AMADEUS_API_SECRET = Deno.env.get("AMADEUS_API_SECRET");

// Common city to IATA code mappings
const CITY_TO_IATA = {
    'tel aviv': 'TLV',
    'helsinki': 'HEL',
    'new york': 'JFK',
    'london': 'LHR',
    'paris': 'CDG',
    'tokyo': 'NRT',
    'dubai': 'DXB',
    'singapore': 'SIN',
    'hong kong': 'HKG',
    'amsterdam': 'AMS',
    'frankfurt': 'FRA',
    'madrid': 'MAD',
    'barcelona': 'BCN',
    'rome': 'FCO',
    'milan': 'MXP',
    'istanbul': 'IST',
    'bangkok': 'BKK',
    'sydney': 'SYD',
    'melbourne': 'MEL',
    'toronto': 'YYZ',
    'vancouver': 'YVR',
    'chicago': 'ORD',
    'san francisco': 'SFO',
    'los angeles': 'LAX',
    'boston': 'BOS',
    'miami': 'MIA',
    'seattle': 'SEA',
    'las vegas': 'LAS',
    'munich': 'MUC',
    'berlin': 'TXL',
    'vienna': 'VIE',
    'zurich': 'ZRH',
    'brussels': 'BRU',
    'lisbon': 'LIS',
    'athens': 'ATH',
    'prague': 'PRG',
    'budapest': 'BUD',
    'warsaw': 'WAW',
    'copenhagen': 'CPH',
    'stockholm': 'ARN',
    'oslo': 'OSL',
    'dublin': 'DUB',
    'edinburgh': 'EDI',
    'manchester': 'MAN',
    'beijing': 'PEK',
    'shanghai': 'PVG',
    'seoul': 'ICN',
    'delhi': 'DEL',
    'mumbai': 'BOM',
    'bangkok': 'BKK',
    'kuala lumpur': 'KUL',
    'jakarta': 'CGK',
    'manila': 'MNL',
    'taipei': 'TPE'
};

function extractIataCode(location) {
    // If it's already a 3-letter IATA code, return it
    if (/^[A-Z]{3}$/.test(location)) {
        return location;
    }
    
    // Try to extract IATA code from brackets like "Tel Aviv, Israel [TLV]"
    const codeMatch = location.match(/\[([A-Z]{3})\]/);
    if (codeMatch) {
        return codeMatch[1];
    }
    
    // Try to match city name to IATA code
    const cityName = location.toLowerCase().split(',')[0].trim();
    const iataCode = CITY_TO_IATA[cityName];
    
    if (iataCode) {
        return iataCode;
    }
    
    // If no match found, return the original (will likely fail but with clear error)
    return location;
}

async function getAmadeusToken() {
    const response = await fetch('https://test.api.amadeus.com/v1/security/oauth2/token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: `grant_type=client_credentials&client_id=${AMADEUS_API_KEY}&client_secret=${AMADEUS_API_SECRET}`
    });

    const data = await response.json();
    console.log('Amadeus token response:', data);
    return data.access_token;
}

Deno.serve(async (req) => {
    const base44 = createClientFromRequest(req);
    
    try {
        const user = await base44.auth.me();

        if (!user) {
            console.error('User not authenticated');
            return Response.json({ error: 'Unauthorized', options: [] }, { status: 401 });
        }

        const requestData = await req.json();
        console.log('Received search request:', requestData);

        const { origin, destination, departureDate, adults = 1 } = requestData;

        if (!origin || !destination || !departureDate) {
            console.error('Missing required parameters:', { origin, destination, departureDate });
            return Response.json({ 
                error: 'Missing required parameters: origin, destination, or departureDate',
                options: []
            }, { status: 400 });
        }

        // Convert city names to IATA codes
        const originCode = extractIataCode(origin);
        const destinationCode = extractIataCode(destination);
        
        console.log('Converted codes:', { origin: originCode, destination: destinationCode });

        console.log('Getting Amadeus token...');
        const token = await getAmadeusToken();

        if (!token) {
            console.error('Failed to get Amadeus token');
            return Response.json({ 
                error: 'Failed to authenticate with Amadeus',
                options: []
            }, { status: 500 });
        }

        // Search for flight offers
        const searchUrl = `https://test.api.amadeus.com/v2/shopping/flight-offers?originLocationCode=${originCode}&destinationLocationCode=${destinationCode}&departureDate=${departureDate}&adults=${adults}&max=10`;
        console.log('Searching flights with URL:', searchUrl);

        const flightResponse = await fetch(searchUrl, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const flightData = await flightResponse.json();
        console.log('Amadeus flight response status:', flightResponse.status);

        if (!flightResponse.ok) {
            console.error('Amadeus API error:', flightData);
            return Response.json({ 
                error: flightData.errors?.[0]?.detail || 'Failed to search flights',
                options: []
            }, { status: 400 });
        }

        // Transform Amadeus response to our format
        const options = flightData.data?.map(offer => {
            const firstSegment = offer.itineraries[0].segments[0];
            const lastSegment = offer.itineraries[0].segments[offer.itineraries[0].segments.length - 1];
            
            return {
                provider: firstSegment.carrierCode,
                departure_time: new Date(firstSegment.departure.at).toTimeString().slice(0, 5),
                arrival_time: new Date(lastSegment.arrival.at).toTimeString().slice(0, 5),
                price: parseFloat(offer.price.total),
                currency: offer.price.currency,
                details: `Flight ${firstSegment.number} • ${offer.itineraries[0].segments.length} stop(s)`,
                duration: offer.itineraries[0].duration,
                booking_token: offer.id
            };
        }) || [];

        console.log(`Found ${options.length} flight options`);
        return Response.json({ options });

    } catch (error) {
        console.error("Amadeus search error:", error);
        return Response.json({ 
            error: error.message,
            options: []
        }, { status: 500 });
    }
});