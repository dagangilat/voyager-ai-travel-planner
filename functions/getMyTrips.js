import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            console.error('No authenticated user');
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        console.log(`Fetching trips for user: ${user.email}`);

        // Use service role to fetch all trips
        const sdk = base44.asServiceRole;
        
        // Get all trips
        const allTrips = await sdk.entities.Trip.list();
        console.log(`Total trips in database: ${allTrips.length}`);
        
        // Filter to only trips the user owns or is shared with
        const userTrips = allTrips.filter(trip => {
            // User is the owner
            if (trip.created_by === user.email) {
                return true;
            }
            
            // User is in the shared_with list
            if (trip.shared_with && Array.isArray(trip.shared_with)) {
                return trip.shared_with.some(share => share.user_email === user.email);
            }
            
            return false;
        });
        
        console.log(`User has access to ${userTrips.length} trips`);
        
        // Sort by departure date (newest first)
        userTrips.sort((a, b) => new Date(b.departure_date) - new Date(a.departure_date));
        
        return Response.json(userTrips, {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
        
    } catch (error) {
        console.error('Error in getMyTrips:', error.message, error.stack);
        return Response.json({ 
            error: error.message,
            details: error.stack 
        }, { 
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
});