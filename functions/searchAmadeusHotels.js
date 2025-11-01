import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

const AMADEUS_API_KEY = Deno.env.get("AMADEUS_API_KEY");
const AMADEUS_API_SECRET = Deno.env.get("AMADEUS_API_SECRET");

async function getAmadeusToken() {
    const response = await fetch('https://test.api.amadeus.com/v1/security/oauth2/token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: `grant_type=client_credentials&client_id=${AMADEUS_API_KEY}&client_secret=${AMADEUS_API_SECRET}`
    });

    const data = await response.json();
    return data.access_token;
}

Deno.serve(async (req) => {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { cityCode, checkInDate, checkOutDate, adults = 2 } = await req.json();

        const token = await getAmadeusToken();

        // First, search for hotels by city
        const searchUrl = `https://test.api.amadeus.com/v1/reference-data/locations/hotels/by-city?cityCode=${cityCode}`;

        const hotelsResponse = await fetch(searchUrl, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const hotelsData = await hotelsResponse.json();

        if (!hotelsResponse.ok) {
            return Response.json({ 
                error: hotelsData.errors?.[0]?.detail || 'Failed to search hotels',
                options: []
            }, { status: 400 });
        }

        // Get hotel IDs (limit to 10)
        const hotelIds = hotelsData.data?.slice(0, 10).map(h => h.hotelId).join(',');

        if (!hotelIds) {
            return Response.json({ options: [] });
        }

        // Now search for offers for these hotels
        const offersUrl = `https://test.api.amadeus.com/v3/shopping/hotel-offers?hotelIds=${hotelIds}&checkInDate=${checkInDate}&checkOutDate=${checkOutDate}&adults=${adults}`;

        const offersResponse = await fetch(offersUrl, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const offersData = await offersResponse.json();

        // Transform response to our format
        const options = offersData.data?.map(hotel => {
            const offer = hotel.offers?.[0];
            if (!offer) return null;

            const nights = Math.ceil((new Date(checkOutDate) - new Date(checkInDate)) / (1000 * 60 * 60 * 24));

            return {
                name: hotel.hotel.name,
                type: 'hotel',
                location: hotel.hotel.cityCode,
                price_per_night: parseFloat(offer.price.total) / nights,
                rating: hotel.hotel.rating ? parseFloat(hotel.hotel.rating) : null,
                amenities: hotel.hotel.amenities || [],
                details: offer.room?.description?.text || hotel.hotel.description?.text || '',
                booking_token: offer.id
            };
        }).filter(Boolean) || [];

        return Response.json({ options });

    } catch (error) {
        console.error("Amadeus hotels search error:", error);
        return Response.json({ 
            error: error.message,
            options: []
        }, { status: 500 });
    }
});