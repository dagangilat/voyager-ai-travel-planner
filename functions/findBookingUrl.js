import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { category, type, search_params } = await req.json();
        // category: "transportation" | "lodging" | "experiences"
        // type: specific type like "flight", "hotel", etc.
        // search_params: { name, location, dates, etc. }

        // Get user's vendor preferences
        const vendors = user.travel_vendors?.[category] || [];
        const preferredVendor = vendors.find(v => !type || v.type === type) || vendors[0];

        if (!preferredVendor) {
            return Response.json({ 
                error: 'No vendor configured for this category',
                fallback_url: null 
            }, { status: 400 });
        }

        // Build search query based on category
        let searchQuery = '';
        if (category === 'transportation') {
            searchQuery = `${search_params.from} to ${search_params.to} ${type} on ${search_params.date} site:${preferredVendor.base_url.replace('https://', '')}`;
        } else if (category === 'lodging') {
            searchQuery = `${search_params.name} ${search_params.location} check-in ${search_params.check_in} site:${preferredVendor.base_url.replace('https://', '')}`;
        } else if (category === 'experiences') {
            searchQuery = `${search_params.name} ${search_params.location} site:${preferredVendor.base_url.replace('https://', '')}`;
        }

        // Use LLM to find and analyze the best URL
        const prompt = `Search for: "${searchQuery}"

Find the most relevant booking page URL from ${preferredVendor.name} (${preferredVendor.base_url}) for this search.

Requirements:
1. URL must be from ${preferredVendor.base_url}
2. URL should lead directly to a booking/search results page
3. URL should include search parameters when possible
4. Return a working, accessible URL

Provide:
- url: The direct booking URL
- confidence: How confident you are (high/medium/low)
- reason: Why this is the best URL`;

        const result = await base44.integrations.Core.InvokeLLM({
            prompt,
            add_context_from_internet: true,
            response_json_schema: {
                type: "object",
                properties: {
                    url: { type: "string", format: "uri" },
                    confidence: { type: "string", enum: ["high", "medium", "low"] },
                    reason: { type: "string" }
                },
                required: ["url", "confidence"]
            }
        });

        // Test the URL
        try {
            const testResponse = await fetch(result.url, { 
                method: 'HEAD',
                redirect: 'follow'
            });
            
            if (testResponse.ok || testResponse.status === 403) { // 403 might be anti-bot, but URL exists
                return Response.json({
                    url: result.url,
                    confidence: result.confidence,
                    vendor: preferredVendor.name,
                    tested: true
                });
            } else {
                return Response.json({
                    url: result.url,
                    confidence: 'low',
                    vendor: preferredVendor.name,
                    tested: false,
                    note: `URL returned status ${testResponse.status}`
                });
            }
        } catch (testError) {
            // If test fails, still return the URL but with lower confidence
            return Response.json({
                url: result.url,
                confidence: 'low',
                vendor: preferredVendor.name,
                tested: false,
                note: 'Could not verify URL accessibility'
            });
        }

    } catch (error) {
        console.error("Error finding booking URL:", error);
        return Response.json({ 
            error: error.message,
            fallback_url: null
        }, { status: 500 });
    }
});