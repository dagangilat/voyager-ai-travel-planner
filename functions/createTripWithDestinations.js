import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }

    const { trip, destinations } = await req.json();

    try {
        // Use the service role to perform multiple creations in a single transaction
        const sdk = base44.asServiceRole;

        // 1. Create the main Trip record
        // Manually set created_by to ensure ownership is correctly assigned for RLS checks.
        const newTripData = { ...trip, created_by: user.email };
        const newTrip = await sdk.entities.Trip.create(newTripData);

        if (!newTrip) {
            throw new Error('Failed to create trip.');
        }

        // 2. Prepare and create the Destination records
        if (destinations && destinations.length > 0) {
            const destinationsWithTripId = destinations.map((dest, idx) => ({
                ...dest,
                trip_id: newTrip.id,
                order: idx + 1,
                created_by: user.email // Also assign ownership here
            }));
            await sdk.entities.Destination.bulkCreate(destinationsWithTripId);
        }

        // 3. Return the newly created trip object
        return new Response(JSON.stringify(newTrip), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });

    } catch (error) {
        console.error('Error creating trip with destinations:', error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
});