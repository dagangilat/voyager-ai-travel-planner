import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Only allow admins to export full database
        if (user.role !== 'admin') {
            return Response.json({ error: 'Admin access required' }, { status: 403 });
        }

        const { format = 'json' } = await req.json().catch(() => ({}));

        // Use service role to get all data
        const sdk = base44.asServiceRole;

        // Fetch all data
        const [trips, destinations, transportation, lodging, experiences, users] = await Promise.all([
            sdk.entities.Trip.list(),
            sdk.entities.Destination.list(),
            sdk.entities.Transportation.list(),
            sdk.entities.Lodging.list(),
            sdk.entities.Experience.list(),
            sdk.entities.User.list()
        ]);

        if (format === 'json') {
            const data = {
                export_date: new Date().toISOString(),
                trips,
                destinations,
                transportation,
                lodging,
                experiences,
                users: users.map(u => ({
                    id: u.id,
                    email: u.email,
                    full_name: u.full_name,
                    role: u.role,
                    pro_subscription: u.pro_subscription,
                    credits: u.credits,
                    created_date: u.created_date
                }))
            };

            return Response.json({
                format: 'json',
                filename: `voyager-export-${new Date().toISOString().split('T')[0]}.json`,
                content: JSON.stringify(data, null, 2)
            });
            
        } else if (format === 'sql') {
            // Generate SQL INSERT statements
            let sql = `-- ================================================================================\n`;
            sql += `-- VOYAGER TRAVEL PLANNER - DATABASE EXPORT\n`;
            sql += `-- Generated: ${new Date().toISOString()}\n`;
            sql += `-- ================================================================================\n\n`;

            // Export Trips
            sql += `-- ================================================================================\n`;
            sql += `-- TRIPS (${trips.length} records)\n`;
            sql += `-- ================================================================================\n\n`;
            trips.forEach(trip => {
                sql += `INSERT INTO "Trip" (id, created_date, updated_date, created_by, name, origin, departure_date, return_date, status, total_budget, budget_level, tempo, shared_with, notes)\n`;
                sql += `VALUES (\n`;
                sql += `  '${trip.id}',\n`;
                sql += `  '${trip.created_date}',\n`;
                sql += `  '${trip.updated_date}',\n`;
                sql += `  ${sqlString(trip.created_by)},\n`;
                sql += `  ${sqlString(trip.name)},\n`;
                sql += `  ${sqlString(trip.origin)},\n`;
                sql += `  '${trip.departure_date}',\n`;
                sql += `  ${trip.return_date ? `'${trip.return_date}'` : 'NULL'},\n`;
                sql += `  ${sqlString(trip.status)},\n`;
                sql += `  ${trip.total_budget ? trip.total_budget : 'NULL'},\n`;
                sql += `  ${trip.budget_level ? sqlString(trip.budget_level) : 'NULL'},\n`;
                sql += `  ${trip.tempo ? sqlString(trip.tempo) : 'NULL'},\n`;
                sql += `  ${trip.shared_with ? `'${JSON.stringify(trip.shared_with)}'::jsonb` : 'NULL'},\n`;
                sql += `  ${trip.notes ? sqlString(trip.notes) : 'NULL'}\n`;
                sql += `);\n\n`;
            });

            // Export Destinations
            sql += `\n-- ================================================================================\n`;
            sql += `-- DESTINATIONS (${destinations.length} records)\n`;
            sql += `-- ================================================================================\n\n`;
            destinations.forEach(dest => {
                sql += `INSERT INTO "Destination" (id, created_date, updated_date, created_by, trip_id, location, location_name, arrival_date, nights, purposes, "order", notes)\n`;
                sql += `VALUES (\n`;
                sql += `  '${dest.id}',\n`;
                sql += `  '${dest.created_date}',\n`;
                sql += `  '${dest.updated_date}',\n`;
                sql += `  ${sqlString(dest.created_by)},\n`;
                sql += `  '${dest.trip_id}',\n`;
                sql += `  ${sqlString(dest.location)},\n`;
                sql += `  ${dest.location_name ? sqlString(dest.location_name) : 'NULL'},\n`;
                sql += `  '${dest.arrival_date}',\n`;
                sql += `  ${dest.nights},\n`;
                sql += `  ARRAY[${(dest.purposes || []).map(p => sqlString(p)).join(', ')}]::TEXT[],\n`;
                sql += `  ${dest.order || 'NULL'},\n`;
                sql += `  ${dest.notes ? sqlString(dest.notes) : 'NULL'}\n`;
                sql += `);\n\n`;
            });

            // Export Transportation
            sql += `\n-- ================================================================================\n`;
            sql += `-- TRANSPORTATION (${transportation.length} records)\n`;
            sql += `-- ================================================================================\n\n`;
            transportation.forEach(t => {
                sql += `INSERT INTO "Transportation" (id, created_date, updated_date, created_by, trip_id, type, from_location, from_location_display, to_location, to_location_display, departure_datetime, arrival_datetime, provider, booking_reference, price, status, details)\n`;
                sql += `VALUES (\n`;
                sql += `  '${t.id}',\n`;
                sql += `  '${t.created_date}',\n`;
                sql += `  '${t.updated_date}',\n`;
                sql += `  ${sqlString(t.created_by)},\n`;
                sql += `  '${t.trip_id}',\n`;
                sql += `  ${sqlString(t.type)},\n`;
                sql += `  ${sqlString(t.from_location)},\n`;
                sql += `  ${t.from_location_display ? sqlString(t.from_location_display) : 'NULL'},\n`;
                sql += `  ${sqlString(t.to_location)},\n`;
                sql += `  ${t.to_location_display ? sqlString(t.to_location_display) : 'NULL'},\n`;
                sql += `  '${t.departure_datetime}',\n`;
                sql += `  ${t.arrival_datetime ? `'${t.arrival_datetime}'` : 'NULL'},\n`;
                sql += `  ${t.provider ? sqlString(t.provider) : 'NULL'},\n`;
                sql += `  ${t.booking_reference ? sqlString(t.booking_reference) : 'NULL'},\n`;
                sql += `  ${t.price ? t.price : 'NULL'},\n`;
                sql += `  ${sqlString(t.status)},\n`;
                sql += `  ${t.details ? sqlString(t.details) : 'NULL'}\n`;
                sql += `);\n\n`;
            });

            // Export Lodging
            sql += `\n-- ================================================================================\n`;
            sql += `-- LODGING (${lodging.length} records)\n`;
            sql += `-- ================================================================================\n\n`;
            lodging.forEach(l => {
                sql += `INSERT INTO "Lodging" (id, created_date, updated_date, created_by, trip_id, destination_id, name, type, location, location_display, check_in_date, check_out_date, price_per_night, total_price, booking_reference, booking_url, status, rating, amenities, details)\n`;
                sql += `VALUES (\n`;
                sql += `  '${l.id}',\n`;
                sql += `  '${l.created_date}',\n`;
                sql += `  '${l.updated_date}',\n`;
                sql += `  ${sqlString(l.created_by)},\n`;
                sql += `  '${l.trip_id}',\n`;
                sql += `  ${l.destination_id ? `'${l.destination_id}'` : 'NULL'},\n`;
                sql += `  ${sqlString(l.name)},\n`;
                sql += `  ${l.type ? sqlString(l.type) : 'NULL'},\n`;
                sql += `  ${l.location ? sqlString(l.location) : 'NULL'},\n`;
                sql += `  ${l.location_display ? sqlString(l.location_display) : 'NULL'},\n`;
                sql += `  '${l.check_in_date}',\n`;
                sql += `  '${l.check_out_date}',\n`;
                sql += `  ${l.price_per_night ? l.price_per_night : 'NULL'},\n`;
                sql += `  ${l.total_price ? l.total_price : 'NULL'},\n`;
                sql += `  ${l.booking_reference ? sqlString(l.booking_reference) : 'NULL'},\n`;
                sql += `  ${l.booking_url ? sqlString(l.booking_url) : 'NULL'},\n`;
                sql += `  ${sqlString(l.status)},\n`;
                sql += `  ${l.rating ? l.rating : 'NULL'},\n`;
                sql += `  ARRAY[${(l.amenities || []).map(a => sqlString(a)).join(', ')}]::TEXT[],\n`;
                sql += `  ${l.details ? sqlString(l.details) : 'NULL'}\n`;
                sql += `);\n\n`;
            });

            // Export Experiences
            sql += `\n-- ================================================================================\n`;
            sql += `-- EXPERIENCES (${experiences.length} records)\n`;
            sql += `-- ================================================================================\n\n`;
            experiences.forEach(e => {
                sql += `INSERT INTO "Experience" (id, created_date, updated_date, created_by, trip_id, destination_id, name, category, provider, location, location_display, date, duration, price, booking_reference, status, rating, details)\n`;
                sql += `VALUES (\n`;
                sql += `  '${e.id}',\n`;
                sql += `  '${e.created_date}',\n`;
                sql += `  '${e.updated_date}',\n`;
                sql += `  ${sqlString(e.created_by)},\n`;
                sql += `  '${e.trip_id}',\n`;
                sql += `  ${e.destination_id ? `'${e.destination_id}'` : 'NULL'},\n`;
                sql += `  ${sqlString(e.name)},\n`;
                sql += `  ${e.category ? sqlString(e.category) : 'NULL'},\n`;
                sql += `  ${e.provider ? sqlString(e.provider) : 'NULL'},\n`;
                sql += `  ${e.location ? sqlString(e.location) : 'NULL'},\n`;
                sql += `  ${e.location_display ? sqlString(e.location_display) : 'NULL'},\n`;
                sql += `  '${e.date}',\n`;
                sql += `  ${e.duration ? sqlString(e.duration) : 'NULL'},\n`;
                sql += `  ${e.price ? e.price : 'NULL'},\n`;
                sql += `  ${e.booking_reference ? sqlString(e.booking_reference) : 'NULL'},\n`;
                sql += `  ${sqlString(e.status)},\n`;
                sql += `  ${e.rating ? e.rating : 'NULL'},\n`;
                sql += `  ${e.details ? sqlString(e.details) : 'NULL'}\n`;
                sql += `);\n\n`;
            });

            sql += `\n-- ================================================================================\n`;
            sql += `-- END OF EXPORT\n`;
            sql += `-- ================================================================================\n`;

            // Return as JSON with SQL content as a string
            return Response.json({
                format: 'sql',
                filename: `voyager-export-${new Date().toISOString().split('T')[0]}.sql`,
                content: sql
            });
        }

        return Response.json({ error: 'Invalid format. Use "json" or "sql"' }, { status: 400 });

    } catch (error) {
        console.error('Export error:', error);
        return Response.json({
            error: error.message
        }, { status: 500 });
    }
});

// Helper function to escape SQL strings
function sqlString(str) {
    if (str === null || str === undefined) return 'NULL';
    return `'${String(str).replace(/'/g, "''")}'`;
}