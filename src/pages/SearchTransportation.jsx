
import React, { useState, useEffect } from "react";
import AmadeusFlightCard from "@/components/trips/AmadeusFlightCard";
import { firebaseClient } from "@/api/firebaseClient";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Search, Loader2, Plane, Train, Bus, Ship, Save, Check, AlertCircle } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import LocationSearchInput from "../components/common/LocationSearchInput";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";

const typeIcons = {
  flight: Plane,
  train: Train,
  bus: Bus,
  ferry: Ship,
  car: Bus
};

export default function SearchTransportation() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const tripId = urlParams.get('trip_id');

  // Auto-redirect if no trip_id
  useEffect(() => {
    if (!tripId) {
      navigate(createPageUrl('Dashboard'));
    }
  }, [tripId, navigate]);
  
  // Prevent bfcache - force reload if page is restored from cache
  useEffect(() => {
    const handlePageShow = (event) => {
      if (event.persisted) {
        console.log('[SearchTransportation] Page restored from bfcache, reloading...');
        window.location.reload();
      }
    };
    window.addEventListener('pageshow', handlePageShow);
    return () => window.removeEventListener('pageshow', handlePageShow);
  }, []);
  
  // Invalidate user cache on mount to ensure fresh data
  useEffect(() => {
    console.log('[SearchTransportation] Invalidating user cache on mount...');
    queryClient.invalidateQueries({ queryKey: ['user'] });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const [searchParams, setSearchParams] = useState({
    type: 'flight',
    from_location: '',
    from_location_display: '',
    from_location_code: '', // IATA code for Amadeus
    to_location: '',
    to_location_display: '',
    to_location_code: '', // IATA code for Amadeus
    departure_date: '',
  });

  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [savedItems, setSavedItems] = useState(new Set());
  const [searchError, setSearchError] = useState(null);

  const [useAmadeus, setUseAmadeus] = useState(false);

  // State for managing dialogs
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogContent, setDialogContent] = useState({ title: '', description: '' });

  // Fetch current user
  const { data: user, refetch: refetchUser, isLoading: isLoadingUser } = useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      const userData = await firebaseClient.auth.me();
      console.log('[SearchTransportation] Fetched user data:', userData);
      return userData;
    },
    staleTime: Infinity,
    refetchOnMount: true,
  });

  const { data: trip } = useQuery({
    queryKey: ['trip', tripId],
    queryFn: async () => {
      // Use .get() to fetch by document ID directly (bypasses collection query rules)
      return await firebaseClient.entities.Trip.get(tripId);
    },
    enabled: !!tripId
  });

  const { data: destinations = [] } = useQuery({
    queryKey: ['destinations', tripId],
  queryFn: () => firebaseClient.entities.Destination.filter({ trip_id: tripId }, 'order'),
    enabled: !!tripId
  });

  const { data: existingTransportation = [] } = useQuery({
    queryKey: ['transportation', tripId],
  queryFn: () => firebaseClient.entities.Transportation.filter({ trip_id: tripId }),
    enabled: !!tripId
  });

  // Helper to extract IATA code from location string
  const extractIataCode = (location) => {
    if (!location) return '';
    
    // If it's already a 3-letter code, return it
    if (/^[A-Z]{3}$/i.test(location)) {
      return location.toUpperCase();
    }
    
    // Try to extract code from brackets like "Tel Aviv, Israel [TLV]"
    const bracketMatch = location.match(/\[([A-Z]{3})\]/i);
    if (bracketMatch) {
      return bracketMatch[1].toUpperCase();
    }
    
    // Try to extract code from parentheses like "Amsterdam Airport Schiphol (AMS)"
    const parenMatch = location.match(/\(([A-Z]{3})\)/i);
    if (parenMatch) {
      return parenMatch[1].toUpperCase();
    }
    
    return '';
  };

  const saveTransportationMutation = useMutation({
    mutationFn: (transportData) => {
      if (!tripId) {
        throw new Error('Trip ID is missing. Please navigate back and try again.');
      }

      // Check for duplicates
      const isDuplicate = existingTransportation.some(t =>
        t.type === transportData.type &&
        t.from_location === transportData.from_location &&
        t.to_location === transportData.to_location &&
        t.departure_datetime === transportData.departure_datetime &&
        t.provider === transportData.provider
      );

      if (isDuplicate) {
        throw new Error('This transportation option is already saved to your trip.');
      }

  return firebaseClient.entities.Transportation.create({
        ...transportData,
        trip_id: tripId,
        status: 'saved'
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['transportation', tripId] });
      // Don't show the success dialog, just mark as saved
      // The button will update to "Saved to Trip" state
    },
    onError: (error) => {
      setDialogContent({
        title: 'Error Saving Transportation',
        description: error.message || 'Failed to save transportation. Please try again.'
      });
      setDialogOpen(true);
    }
  });

  // Auto-select destination for smart date filling
  const handleDestinationChange = (destId) => {
    const destination = destinations.find(d => d.id === destId);
    if (destination) {
      // Check if location looks like a code (long string or place_id pattern)
      const isCode = destination.location && (destination.location.length > 15 || destination.location.startsWith('ChIJ'));
      const displayName = destination.location_name || (isCode ? `Destination ${destination.order || ''}` : destination.location) || `Destination ${destination.order || ''}`;
      const iataCode = extractIataCode(displayName);
      
      setSearchParams(prev => ({
        ...prev,
        to_location: displayName,
        to_location_code: iataCode,
        to_location_display: displayName,
        departure_date: destination.arrival_date
      }));
    }
  };

  const handleSearch = async () => {
    setIsSearching(true);
    setSearchResults([]);
    setSearchError(null);

    try {
      if (useAmadeus) {
        // Amadeus search is only for flights
        if (searchParams.type !== 'flight') {
          setSearchError("Amadeus search is currently only supported for flights. Please switch to 'Regular Search' for other transportation types.");
          setIsSearching(false);
          return;
        }

        // Extract IATA codes from locations
        let originCode = searchParams.from_location_code;
        let destCode = searchParams.to_location_code;
        
        // Fallback: extract from display names if codes are missing
        if (!originCode && searchParams.from_location_display) {
          originCode = extractIataCode(searchParams.from_location_display);
          console.log('[SearchTransportation] Extracted origin code from display:', originCode);
        }
        if (!destCode && searchParams.to_location_display) {
          destCode = extractIataCode(searchParams.to_location_display);
          console.log('[SearchTransportation] Extracted dest code from display:', destCode);
        }

        console.log('[SearchTransportation] Amadeus search codes:', {
          from_location_code: searchParams.from_location_code,
          to_location_code: searchParams.to_location_code,
          from_location_display: searchParams.from_location_display,
          to_location_display: searchParams.to_location_display,
          originCode,
          destCode
        });

        if (!originCode || !destCode) {
          setSearchError(`Please select airports with valid IATA codes. Current selection: ${searchParams.from_location_display || ''} → ${searchParams.to_location_display || ''}`);
          setIsSearching(false);
          return;
        }

        // Use Amadeus API
        try {
          const response = await firebaseClient.functions.invoke('searchAmadeusFlights', {
            originLocationCode: originCode,
            destinationLocationCode: destCode,
            departureDate: searchParams.departure_date,
            adults: 1
          });

          console.log('[SearchTransportation] Amadeus API response:', response);

          // Amadeus returns {data: [...]} - the flight offers are in the 'data' array
          if (response && response.data && Array.isArray(response.data) && response.data.length > 0) {
            setSearchResults(response.data);
          } else {
            console.log('[SearchTransportation] No flights in response:', response);
            setSearchError("No flights found using Amadeus. Try different dates or locations.");
          }
        } catch (error) {
          console.error('[SearchTransportation] Amadeus API error:', error);
          setSearchError(`Error searching flights: ${error.message}`);
        }
      } else {
        // Use AI search with strict type enforcement
        let prompt = '';
        
        if (searchParams.type === 'flight') {
          prompt = `Search ONLY for FLIGHTS from ${searchParams.from_location_display || searchParams.from_location} to ${searchParams.to_location_display || searchParams.to_location} on ${searchParams.departure_date}.

IMPORTANT: Only search for flights. Do not include trains, buses, or other transportation.

Check Skyscanner, Google Flights, or major airlines (United, Delta, American, British Airways, Lufthansa, etc.) for current prices and schedules.

Provide realistic flight options with:
- Airline name (e.g., "United Airlines", "Delta", "Lufthansa")
- Departure time (HH:MM format)
- Arrival time (HH:MM format)
- Current market price in USD
- Flight number and details
- Flight duration

Return 5-8 flight options if available.`;
        } else if (searchParams.type === 'train') {
          prompt = `Search ONLY for TRAINS from ${searchParams.from_location_display || searchParams.from_location} to ${searchParams.to_location_display || searchParams.to_location} on ${searchParams.departure_date}.

IMPORTANT: Only search for trains. Do not include flights, buses, or other transportation.

Check official rail company websites:
- Europe: Eurostar, Deutsche Bahn, Renfe, Trenitalia, SNCF
- USA: Amtrak
- UK: National Rail
- Japan: JR Pass, Shinkansen

Provide realistic train options with:
- Train operator name
- Departure time (HH:MM format)
- Arrival time (HH:MM format)
- Current ticket price in USD
- Train number/service
- Journey duration

Return 5-8 train options if available.`;
        } else if (searchParams.type === 'bus') {
          prompt = `Search ONLY for BUSES from ${searchParams.from_location_display || searchParams.from_location} to ${searchParams.to_location_display || searchParams.to_location} on ${searchParams.departure_date}.

IMPORTANT: Only search for buses. Do not include flights, trains, or other transportation.

Check bus company websites:
- FlixBus, Greyhound, Megabus, BlaBlaBus, National Express, etc.

Provide realistic bus options with:
- Bus company name
- Departure time (HH:MM format)
- Arrival time (HH:MM format)
- Current ticket price in USD
- Service details (express, standard, etc.)
- Journey duration

Return 5-8 bus options if available.`;
        } else if (searchParams.type === 'ferry') {
          prompt = `Search ONLY for FERRIES from ${searchParams.from_location_display || searchParams.from_location} to ${searchParams.to_location_display || searchParams.to_location} on ${searchParams.departure_date}.

IMPORTANT: Only search for ferries. Do not include flights, trains, or other transportation.

Check ferry company websites for this route.

Provide realistic ferry options with:
- Ferry operator name
- Departure time (HH:MM format)
- Arrival time (HH:MM format)
- Current ticket price in USD per person
- Service details
- Journey duration

Return 5-8 ferry options if available.`;
        } else if (searchParams.type === 'car') {
          prompt = `Search ONLY for CAR RENTALS in ${searchParams.from_location_display || searchParams.from_location} for pickup on ${searchParams.departure_date}.

IMPORTANT: Only search for car rentals. Do not include flights, trains, or other transportation.

Check car rental companies: Hertz, Enterprise, Budget, Avis, Sixt, etc.

Provide realistic car rental options with:
- Rental company name
- Car type/model
- Pickup time (HH:MM format)
- Daily rental price in USD
- Details (automatic/manual, fuel policy, etc.)
- Total estimated cost for the rental period

Return 5-8 car rental options if available.`;
        }

  const result = await firebaseClient.integrations.Core.InvokeLLM({
          prompt,
          add_context_from_internet: true,
          response_json_schema: {
            type: "object",
            properties: {
              options: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    provider: { type: "string" },
                    departure_time: { type: "string" },
                    arrival_time: { type: "string" },
                    price: { type: "number" },
                    details: { type: "string" },
                    duration: { type: "string" }
                  }
                }
              }
            }
          }
        });

        if (result.options && result.options.length > 0) {
          setSearchResults(result.options);
        } else {
          setSearchError("No options found for this route. Try different dates or locations.");
        }
      }
    } catch (error) {
      console.error("Search error:", error);
      setSearchError("Unable to search at the moment. You can add transportation manually using the 'Add Manually' button on the trip details page. Error: " + error.message);
    }

    setIsSearching(false);
  };

  const handleSave = (option) => {
    if (!tripId) {
      setDialogContent({
        title: 'Error',
        description: 'Trip ID is missing. Please go back to your trip and try again.'
      });
      setDialogOpen(true);
      return;
    }

    const departureDate = new Date(searchParams.departure_date);
    const [depHours, depMinutes] = option.departure_time.split(':');
    departureDate.setHours(parseInt(depHours), parseInt(depMinutes), 0, 0);

    let arrivalDate = new Date(departureDate);
    if (option.arrival_time) {
      const [arrHours, arrMinutes] = option.arrival_time.split(':');
      arrivalDate.setHours(parseInt(arrHours), parseInt(arrMinutes), 0, 0);
      if (arrivalDate < departureDate) {
        arrivalDate.setDate(arrivalDate.getDate() + 1);
      }
    } else {
      arrivalDate.setHours(departureDate.getHours() + 2);
    }

    saveTransportationMutation.mutate({
      trip_id: tripId,
      type: searchParams.type,
      from_location: searchParams.from_location,
      from_location_display: searchParams.from_location_display,
      to_location: searchParams.to_location,
      to_location_display: searchParams.to_location_display,
      departure_datetime: departureDate.toISOString(),
      arrival_datetime: arrivalDate.toISOString(),
      provider: option.provider,
      price: option.price,
      details: option.details
    });
  };

  // Handler for saving Amadeus flight offers
  const handleSaveOption = (option) => {
    if (!tripId) {
      setDialogContent({
        title: 'Error',
        description: 'Trip ID is missing. Please go back to your trip and try again.'
      });
      setDialogOpen(true);
      return;
    }

    // Check if it's an Amadeus result
    const isAmadeusResult = option.itineraries !== undefined;
    
    if (isAmadeusResult) {
      // Extract data from Amadeus flight offer
      const itinerary = option.itineraries[0];
      const segments = itinerary.segments || [];
      const firstSegment = segments[0];
      const lastSegment = segments[segments.length - 1];

      const departureDateTime = new Date(firstSegment.departure.at);
      const arrivalDateTime = new Date(lastSegment.arrival.at);

      // Build a more detailed flight info string
      const stops = segments.length - 1;
      const stopsText = stops === 0 ? 'Direct flight' : `${stops} stop${stops > 1 ? 's' : ''}`;
      const flightNumbers = segments.map(seg => `${seg.carrierCode}${seg.number}`).join(', ');
      const route = segments.map(seg => 
        `${seg.departure.iataCode} → ${seg.arrival.iataCode}`
      ).join(' → ');
      
      const flightDetails = `${stopsText} • Flights: ${flightNumbers} • Route: ${route}`;

      const transportData = {
        trip_id: tripId,
        type: 'flight',
        from_location: searchParams.from_location || firstSegment.departure.iataCode,
        from_location_display: searchParams.from_location_display || `${firstSegment.departure.iataCode}`,
        to_location: searchParams.to_location || lastSegment.arrival.iataCode,
        to_location_display: searchParams.to_location_display || `${lastSegment.arrival.iataCode}`,
        departure_datetime: departureDateTime.toISOString(),
        arrival_datetime: arrivalDateTime.toISOString(),
        provider: `${firstSegment.carrierCode} (Amadeus)`,
        price: `${option.price.currency} ${parseFloat(option.price.total).toFixed(2)}`,
        details: flightDetails
      };

      console.log('[SearchTransportation] Saving Amadeus flight:', transportData);
      
      // Mark this option as saved immediately using Amadeus offer ID
      setSavedItems(prev => new Set([...prev, option.id]));
      
      saveTransportationMutation.mutate(transportData);
    } else {
      // Fall back to regular handleSave for AI-generated results
      handleSave(option);
    }
  };

  if (!tripId) {
    return null; // Just return null while redirecting
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate(createPageUrl(`TripDetails?id=${tripId}`))}
            className="rounded-xl"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900">Search Transportation</h1>
            {trip && <p className="text-gray-500 mt-1">{trip.name}</p>}
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <Card className="border-0 shadow-xl rounded-2xl sticky top-4">
              <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 rounded-t-2xl">
                <CardTitle className="text-xl font-bold">Search Options</CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-gray-700">Transportation Type</Label>
                  <Select
                    value={searchParams.type}
                    onValueChange={(value) => {
                      setSearchParams({ ...searchParams, type: value });
                      // If Amadeus was selected, and user changes type from 'flight', revert to regular search
                      if (useAmadeus && value !== 'flight') {
                        setUseAmadeus(false);
                      }
                    }}
                    disabled={useAmadeus && searchParams.type === 'flight'}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="flight">✈️ Flight</SelectItem>
                      <SelectItem value="train">🚂 Train</SelectItem>
                      <SelectItem value="bus">🚌 Bus</SelectItem>
                      <SelectItem value="ferry">⛴️ Ferry</SelectItem>
                      <SelectItem value="car">🚗 Car Rental</SelectItem>
                    </SelectContent>
                  </Select>
                  {useAmadeus && searchParams.type !== 'flight' && (
                    <p className="text-xs text-red-500 mt-1">Amadeus search is only available for flights. Please switch to "Regular Search" or select "Flight" type.</p>
                  )}
                </div>

                {destinations.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-gray-700">Quick Select Destination</Label>
                    <Select onValueChange={handleDestinationChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a destination" />
                      </SelectTrigger>
                      <SelectContent>
                        {destinations.map((dest) => {
                          // Check if location looks like a code (long string or place_id pattern)
                          const isCode = dest.location && (dest.location.length > 15 || dest.location.startsWith('ChIJ'));
                          const displayText = dest.location_name || (isCode ? `Destination ${dest.order || ''}` : dest.location) || `Destination ${dest.order || ''}`;
                          
                          return (
                            <SelectItem key={dest.id} value={dest.id}>
                              {displayText}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <LocationSearchInput
                  id="from_location"
                  label="From"
                  value={searchParams.from_location_display}
                  onChange={(placeId, displayName, coordinates) => {
                    const iataCode = extractIataCode(displayName);
                    setSearchParams({ 
                      ...searchParams,
                      from_location: placeId,
                      from_location_code: iataCode,
                      from_location_display: displayName 
                    });
                  }}
                  placeholder="Search departure location"
                  includeAirportCodes={true}
                />

                <LocationSearchInput
                  id="to_location"
                  label="To"
                  value={searchParams.to_location_display}
                  onChange={(placeId, displayName, coordinates) => {
                    console.log('[SearchTransportation] To location onChange called:', {
                      placeId,
                      displayName,
                      coordinates
                    });
                    const iataCode = extractIataCode(displayName);
                    console.log('[SearchTransportation] Extracted IATA code:', iataCode);
                    setSearchParams({ 
                      ...searchParams,
                      to_location: placeId,
                      to_location_code: iataCode,
                      to_location_display: displayName 
                    });
                    console.log('[SearchTransportation] Updated searchParams with to_location_code:', iataCode);
                  }}
                  placeholder="Search arrival location"
                  includeAirportCodes={true}
                />

                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-gray-700">Date</Label>
                  <Input
                    type="date"
                    value={searchParams.departure_date}
                    onChange={(e) => setSearchParams({ ...searchParams, departure_date: e.target.value })}
                    min={(() => {
                      const today = new Date().toISOString().split('T')[0];
                      const tripDate = trip?.departure_date;
                      return tripDate && tripDate > today ? tripDate : today;
                    })()}
                    max={trip?.return_date}
                    className="border-gray-200"
                  />
                </div>

                {/* New Search Method Selection */}
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-gray-700">Search Method</Label>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      variant={!useAmadeus ? "default" : "outline"}
                      onClick={() => setUseAmadeus(false)}
                      className="w-full"
                    >
                      🔍 AI Search
                    </Button>
                    <Button
                      type="button"
                      variant={useAmadeus ? "default" : "outline"}
                      onClick={() => {
                        setUseAmadeus(true);
                        // Ensure type is flight if Amadeus is selected
                        if (searchParams.type !== 'flight') {
                          setSearchParams(prev => ({ ...prev, type: 'flight' }));
                        }
                      }}
                      disabled={searchParams.type !== 'flight'}
                      className="w-full"
                    >
                      ✈️ Amadeus (Flights Only)
                    </Button>
                  </div>
                </div>

                {/* Search button and error message */}
                <Button
                  onClick={handleSearch}
                  disabled={
                    !searchParams.from_location ||
                    !searchParams.to_location ||
                    !searchParams.departure_date ||
                    isSearching ||
                    (useAmadeus && searchParams.type !== 'flight')
                  }
                  className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg"
                >
                  {isSearching ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Searching...
                    </>
                  ) : (
                    <>
                      <Search className="w-4 h-4 mr-2" />
                      {useAmadeus ? 'Amadeus Search' : 'Search'}
                    </>
                  )}
                </Button>

                {searchError && (
                  <Alert variant="destructive" className="mt-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-sm">
                      {searchError}
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-2">
            <Card className="border-0 shadow-xl rounded-2xl">
              <CardHeader className="border-b bg-gradient-to-r from-gray-50 to-blue-50 p-6">
                <CardTitle className="text-2xl font-bold">Results</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                {searchResults.length === 0 && !isSearching && !searchError && (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Search className="w-8 h-8 text-blue-600" />
                    </div>
                    <p className="text-gray-500">Enter search criteria and click Search to find options</p>
                  </div>
                )}

                {isSearching && (
                  <div className="flex flex-col items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-4" />
                    <p className="text-gray-500">Searching for the best options...</p>
                  </div>
                )}

                <div className="space-y-4">
                  {searchResults.map((option, index) => {
                    const Icon = typeIcons[searchParams.type] || Plane;

                    // Handle both Amadeus API results and AI-generated results
                    const isAmadeusResult = option.itineraries !== undefined;
                    
                    if (isAmadeusResult) {
                      // Render Amadeus flight offer
                      return (
                        <AmadeusFlightCard
                          key={option.id || index}
                          offer={option}
                          onSave={() => handleSaveOption(option)}
                          isSaved={savedItems.has(option.id)}
                          isDisabled={saveTransportationMutation.isPending}
                        />
                      );
                    }

                    // Calculate the full departure datetime for comparison with existing items
                    const optionDepartureDate = new Date(searchParams.departure_date);
                    const [depHours, depMinutes] = (option.departure_time || '00:00').split(':');
                    optionDepartureDate.setHours(parseInt(depHours), parseInt(depMinutes), 0, 0);
                    const optionDepartureDateTimeISO = optionDepartureDate.toISOString();

                    // Check if this option (or a very similar one) is already saved in the database
                    const isAlreadySavedInDB = existingTransportation.some(t =>
                      t.type === searchParams.type &&
                      t.from_location === searchParams.from_location &&
                      t.to_location === searchParams.to_location &&
                      t.departure_datetime === optionDepartureDateTimeISO &&
                      t.provider === option.provider
                    );

                    // The button should be disabled if it's already in DB OR if a save mutation is currently pending
                    const isDisabled = isAlreadySavedInDB || saveTransportationMutation.isPending;

                    return (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="p-6 bg-gradient-to-r from-white to-blue-50 rounded-xl border border-gray-200 hover:shadow-lg transition-shadow"
                      >
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                              <Icon className="w-6 h-6 text-blue-600" />
                            </div>
                            <div>
                              <h3 className="font-bold text-lg text-gray-900">{option.provider}</h3>
                              {option.duration && (
                                <p className="text-sm text-gray-500">{option.duration}</p>
                              )}
                            </div>
                          </div>
                          {option.price && (
                            <div className="text-right">
                              <p className="text-2xl font-bold text-blue-600">${option.price}</p>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-4 mb-4 text-sm text-gray-600">
                          <div>
                            <p className="font-semibold text-gray-900">{option.departure_time}</p>
                            <p className="text-xs">{searchParams.from_location_display || `${searchParams.from_location}`}</p>
                          </div>
                          <div className="flex-1 border-t-2 border-dashed border-gray-300"></div>
                          <div className="text-right">
                            <p className="font-semibold text-gray-900">{option.arrival_time}</p>
                            <p className="text-xs">{searchParams.to_location_display || `${searchParams.to_location}`}</p>
                          </div>
                        </div>

                        {option.details && (
                          <p className="text-sm text-gray-600 mb-4">{option.details}</p>
                        )}

                        <Button
                          onClick={() => handleSave(option)}
                          disabled={isDisabled}
                          className={`w-full ${isAlreadySavedInDB ? 'bg-green-600 hover:bg-green-600' : 'bg-blue-600 hover:bg-blue-700'}`}
                        >
                          {isAlreadySavedInDB ? (
                            <>
                              <Check className="w-4 h-4 mr-2" />
                              Saved to Trip
                            </>
                          ) : (
                            <>
                              <Save className="w-4 h-4 mr-2" />
                              Save to Trip
                            </>
                          )}
                        </Button>
                      </motion.div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Global Dialog for error messages */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dialogContent.title}</DialogTitle>
            <DialogDescription>{dialogContent.description}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button onClick={() => setDialogOpen(false)}>Close</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
