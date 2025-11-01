import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

const GOOGLE_PLACES_API_KEY = Deno.env.get("GOOGLE_PLACES_API_KEY");

// Comprehensive city to IATA code mapping
const CITY_TO_IATA = {
    'tel aviv': 'TLV',
    'tel aviv-yafo': 'TLV',
    'helsinki': 'HEL',
    'amsterdam': 'AMS',
    'new york': 'NYC',
    'london': 'LON',
    'paris': 'PAR',
    'tokyo': 'TYO',
    'dubai': 'DXB',
    'singapore': 'SIN',
    'hong kong': 'HKG',
    'frankfurt': 'FRA',
    'madrid': 'MAD',
    'barcelona': 'BCN',
    'rome': 'ROM',
    'milan': 'MIL',
    'istanbul': 'IST',
    'bangkok': 'BKK',
    'sydney': 'SYD',
    'melbourne': 'MEL',
    'toronto': 'YTO',
    'vancouver': 'YVR',
    'chicago': 'CHI',
    'san francisco': 'SFO',
    'los angeles': 'LAX',
    'boston': 'BOS',
    'miami': 'MIA',
    'seattle': 'SEA',
    'las vegas': 'LAS',
    'munich': 'MUC',
    'berlin': 'BER',
    'vienna': 'VIE',
    'zurich': 'ZRH',
    'brussels': 'BRU',
    'lisbon': 'LIS',
    'athens': 'ATH',
    'prague': 'PRG',
    'budapest': 'BUD',
    'warsaw': 'WAW',
    'copenhagen': 'CPH',
    'stockholm': 'STO',
    'oslo': 'OSL',
    'dublin': 'DUB',
    'edinburgh': 'EDI',
    'manchester': 'MAN',
    'beijing': 'BJS',
    'shanghai': 'SHA',
    'seoul': 'SEL',
    'delhi': 'DEL',
    'mumbai': 'BOM',
    'kuala lumpur': 'KUL',
    'jakarta': 'JKT',
    'manila': 'MNL',
    'taipei': 'TPE',
    'montreal': 'YMQ',
    'washington': 'WAS',
    'philadelphia': 'PHL',
    'phoenix': 'PHX',
    'houston': 'HOU',
    'dallas': 'DFW',
    'atlanta': 'ATL',
    'denver': 'DEN',
    'minneapolis': 'MSP',
    'detroit': 'DTT',
    'san diego': 'SAN',
    'portland': 'PDX',
    'orlando': 'ORL',
    'tampa': 'TPA',
    'baltimore': 'BWI',
    'nashville': 'BNA',
    'austin': 'AUS',
    'charlotte': 'CLT',
    'raleigh': 'RDU',
    'pittsburgh': 'PIT',
    'cleveland': 'CLE',
    'cincinnati': 'CVG',
    'kansas city': 'MCI',
    'st louis': 'STL',
    'milwaukee': 'MKE',
    'indianapolis': 'IND',
    'columbus': 'CMH',
    'memphis': 'MEM',
    'new orleans': 'MSY',
    'salt lake city': 'SLC',
    'honolulu': 'HNL',
    'anchorage': 'ANC',
    'reykjavik': 'REK',
    'cairo': 'CAI',
    'cape town': 'CPT',
    'johannesburg': 'JNB',
    'nairobi': 'NBO',
    'casablanca': 'CAS',
    'marrakech': 'RAK',
    'tunis': 'TUN',
    'algiers': 'ALG',
    'buenos aires': 'BUE',
    'rio de janeiro': 'RIO',
    'sao paulo': 'SAO',
    'lima': 'LIM',
    'bogota': 'BOG',
    'mexico city': 'MEX',
    'santiago': 'SCL',
    'montevideo': 'MVD',
    'quito': 'UIO',
    'panama city': 'PTY',
    'san juan': 'SJU',
    'havana': 'HAV',
    'cancun': 'CUN',
    'guadalajara': 'GDL',
    'monterrey': 'MTY'
};

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (!GOOGLE_PLACES_API_KEY) {
            console.error('GOOGLE_PLACES_API_KEY is not set');
            return Response.json({ 
                error: 'Google Places API key not configured',
                locations: [] 
            }, { status: 500 });
        }

        const { query, includeAirportCodes = true } = await req.json();

        if (!query || query.length < 2) {
            return Response.json({ locations: [] });
        }

        const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(query)}&types=(cities)&key=${GOOGLE_PLACES_API_KEY}`;

        const response = await fetch(url);
        const data = await response.json();

        console.log('Google Places API response:', data);

        if (data.status === 'REQUEST_DENIED') {
            console.error('Google Places API request denied:', data.error_message);
            return Response.json({ 
                error: 'Google Places API access denied. Please check if Places API is enabled in your Google Cloud Console.',
                locations: [] 
            }, { status: 400 });
        }

        if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
            console.error('Google Places API error:', data);
            return Response.json({ 
                error: data.error_message || 'Failed to search locations',
                locations: [] 
            }, { status: 400 });
        }

        // Transform results to "City, Country [CODE]" format
        const locations = (data.predictions || []).slice(0, 8).map((prediction) => {
            const description = prediction.description;
            const structuredFormatting = prediction.structured_formatting;
            
            // Extract parts
            const parts = description.split(', ');
            const cityName = structuredFormatting?.main_text || parts[0];
            const country = parts.length > 1 ? parts[parts.length - 1] : '';
            
            // Try to extract airport code from description first
            let code = '';
            const codeMatch = description.match(/\(([A-Z]{3})\)/);
            if (codeMatch) {
                code = codeMatch[1];
            } else {
                // Look up proper IATA code from mapping
                const cityLower = cityName.toLowerCase().trim();
                code = CITY_TO_IATA[cityLower] || cityName.substring(0, 3).toUpperCase();
            }
            
            // Format as "City, Country [CODE]"
            let formattedName = cityName;
            if (country && country !== cityName) {
                formattedName = `${cityName}, ${country}`;
            }
            formattedName = `${formattedName} [${code}]`;

            return {
                name: formattedName,
                code: code,
                country: country,
                place_id: prediction.place_id
            };
        });

        return Response.json({ locations });

    } catch (error) {
        console.error("Google Places search error:", error);
        return Response.json({ 
            error: error.message,
            locations: []
        }, { status: 500 });
    }
});