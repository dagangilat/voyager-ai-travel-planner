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
        const { latitude, longitude, radius = 20 } = await req.json();

        const token = await getAmadeusToken();

        // Search for activities/tours
        const searchUrl = `https://test.api.amadeus.com/v1/shopping/activities?latitude=${latitude}&longitude=${longitude}&radius=${radius}`;

        const activitiesResponse = await fetch(searchUrl, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const activitiesData = await activitiesResponse.json();

        if (!activitiesResponse.ok) {
            return Response.json({ 
                error: activitiesData.errors?.[0]?.detail || 'Failed to search activities',
                options: []
            }, { status: 400 });
        }

        // Transform response to our format
        const options = activitiesData.data?.map(activity => ({
            name: activity.name,
            category: activity.category || 'cultural',
            provider: 'Amadeus',
            location: activity.geoCode ? `${activity.geoCode.latitude},${activity.geoCode.longitude}` : '',
            location_display: activity.name,
            duration: activity.duration || 'N/A',
            price: activity.price ? parseFloat(activity.price.amount) : null,
            rating: activity.rating ? parseFloat(activity.rating) : null,
            details: activity.description || activity.shortDescription || '',
            booking_token: activity.id,
            booking_url: activity.bookingLink
        })) || [];

        return Response.json({ options });

    } catch (error) {
        console.error("Amadeus activities search error:", error);
        return Response.json({ 
            error: error.message,
            options: []
        }, { status: 500 });
    }
});