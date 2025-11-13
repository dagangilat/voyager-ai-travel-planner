const { onRequest } = require("firebase-functions/v2/https");
const axios = require('axios');

/**
 * Geocode a location address to lat/lng coordinates using Google Geocoding API
 */
exports.geocodeLocation = onRequest(
  {
    cors: true,
    region: 'europe-west1',
  },
  async (req, res) => {
    try {
      const { address } = req.body;

      if (!address) {
        return res.status(400).json({ error: "Address is required" });
      }

      // Use the Firebase project API key
      const apiKey = "AIzaSyBATqGAv1CfmOMu93V34r-GRJxzF9nNE7g";
        
      if (!apiKey) {
        console.error("GOOGLE_PLACES_API_KEY not configured");
        return res.status(500).json({ error: "API key not configured" });
      }

      console.log(`Geocoding address: ${address}`);

      const response = await axios.get(
        "https://maps.googleapis.com/maps/api/geocode/json",
        {
          params: {
            address: address,
            key: apiKey,
          },
        }
      );

      if (response.data.status !== "OK") {
        console.error("Geocoding API error:", response.data.status);
        return res.status(400).json({
          error: `Geocoding failed: ${response.data.status}`,
        });
      }

      const result = response.data.results[0];
      const location = {
        lat: result.geometry.location.lat,
        lng: result.geometry.location.lng,
      };

      console.log(`Geocoded to: ${location.lat}, ${location.lng}`);

      res.json({
        location,
        formatted_address: result.formatted_address,
      });
    } catch (error) {
      console.error("Geocoding error:", error.message);
      res.status(500).json({ error: error.message });
    }
  }
);
