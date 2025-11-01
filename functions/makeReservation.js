import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

const MCP_SERVER_URL = Deno.env.get("MCP_SERVER_URL");
const MCP_API_KEY = Deno.env.get("MCP_API_KEY");

Deno.serve(async (req) => {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
        return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    if (!MCP_SERVER_URL || !MCP_API_KEY) {
        console.error("MCP Server URL or API Key is not configured.");
        return Response.json({ 
            success: false, 
            error: "Booking service not configured. Please contact support." 
        }, { status: 500 });
    }

    try {
        const { lodging_id, platform, property_name, location, check_in, check_out } = await req.json();

        console.log("Booking request:", { lodging_id, platform, property_name, location, check_in, check_out });

        const mcpPayload = {
            booking_details: {
                platform: platform || 'booking.com',
                property: property_name,
                city: location,
                checkin_date: check_in,
                checkout_date: check_out,
                num_adults: 2,
            },
            user_info: {
                email: user.email,
                full_name: user.full_name,
            }
        };

        console.log("Calling MCP server at:", MCP_SERVER_URL);
        console.log("MCP payload:", JSON.stringify(mcpPayload, null, 2));

        const mcpResponse = await fetch(MCP_SERVER_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${MCP_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(mcpPayload)
        });

        console.log("MCP response status:", mcpResponse.status);
        
        let responseData;
        const responseText = await mcpResponse.text();
        console.log("MCP raw response:", responseText);

        try {
            responseData = JSON.parse(responseText);
        } catch (e) {
            console.error("Failed to parse MCP response as JSON:", e);
            return Response.json({ 
                success: false, 
                error: `Invalid response from booking service: ${responseText.substring(0, 200)}` 
            }, { status: 500 });
        }

        if (!mcpResponse.ok) {
            console.error("MCP server error:", responseData);
            const errorMessage = responseData.error_message || responseData.error || `Booking service returned error ${mcpResponse.status}`;
            return Response.json({ 
                success: false, 
                error: errorMessage 
            }, { status: 400 });
        }

        if (responseData.status === 'confirmed' && responseData.booking_id) {
            console.log(`Booking successful with reference: ${responseData.booking_id}`);
            return Response.json({
                success: true,
                booking_reference: responseData.booking_id,
                total_price: responseData.price,
            });
        } else {
            const errorMessage = responseData.error_message || responseData.error || 'Booking could not be confirmed';
            console.error("Booking not confirmed:", responseData);
            return Response.json({ 
                success: false, 
                error: errorMessage 
            }, { status: 400 });
        }

    } catch (error) {
        console.error("Error in makeReservation:", error.message, error.stack);
        return Response.json({ 
            success: false, 
            error: `Booking failed: ${error.message}` 
        }, { status: 500 });
    }
});