
import React, { useState, useEffect } from "react";
import { firebaseClient } from "@/api/firebaseClient";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Search, Loader2, Hotel, Home, Building2, Save, Check, Star, AlertCircle } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import LocationSearchInput from "../components/common/LocationSearchInput";
import AmadeusHotelCard from "@/components/trips/AmadeusHotelCard";
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
import { format } from 'date-fns';

export default function SearchLodging() {
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
  
  // Invalidate user cache on mount to ensure fresh data
  useEffect(() => {
    console.log('[SearchLodging] Invalidating user cache on mount...');
    queryClient.invalidateQueries({ queryKey: ['user'] });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const [searchParams, setSearchParams] = useState({
    destination_id: '',
    location: '',
    location_display: '',
    check_in_date: '',
    check_out_date: '',
    type: 'hotel',
    guests: 2 // Added 'guests' as per outline
  });

  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  // Corrected initialization of savedItems to be a proper useState hook
  const [savedItems, setSavedItems] = useState(new Set()); 

  const [searchError, setSearchError] = useState(null);
  const [useAmadeus, setUseAmadeus] = useState(false);

  // State for dialogs
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [errorDialogTitle, setErrorDialogTitle] = useState("");
  const [errorDialogMessage, setErrorDialogMessage] = useState("");

  const showDialog = (title, message) => {
    setErrorDialogTitle(title);
    setErrorDialogMessage(message);
    setShowErrorDialog(true);
  };

  const { data: user, refetch: refetchUser, isLoading: isLoadingUser } = useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      const userData = await firebaseClient.auth.me();
      console.log('[SearchLodging] Fetched user data:', userData);
      
      // Initialize credits if they don't exist
      if (!userData.credits) {
        console.log('[SearchLodging] Initializing credits...');
        await firebaseClient.auth.updateMe({
          credits: {
            ai_generations_remaining: 3,
            pro_searches_remaining: 10,
            last_reset_date: null
          }
        });
        // Refetch user data
        const updatedUserData = await firebaseClient.auth.me();
        console.log('[SearchLodging] Credits initialized:', updatedUserData);
        return updatedUserData;
      }
      return userData;
    },
    staleTime: Infinity,
    refetchOnMount: true, // Always refetch on mount to get latest data
  });
  
  // Force refetch if user exists but credits don't
  React.useEffect(() => {
    if (user && !user.credits) {
      console.log('[SearchLodging] User missing credits, forcing refetch...');
      refetchUser();
    }
  }, [user, refetchUser]);

  // Check if user has pro access OR has remaining credits
  const proStatus = user?.pro_subscription?.status;
  const hasProAccess = proStatus === 'pro' || proStatus === 'trial';
  const hasCredits = (user?.credits?.pro_searches_remaining || 0) > 0;
  // Don't disable buttons while loading - give benefit of doubt
  const canUseProSearch = isLoadingUser || hasProAccess || hasCredits;

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

  const { data: existingLodging = [] } = useQuery({
    queryKey: ['lodging', tripId],
  queryFn: () => firebaseClient.entities.Lodging.filter({ trip_id: tripId }),
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

  // Get city code for hotels - tries to extract city name and map to IATA city code
  const getCityCodeForHotels = (location) => {
    if (!location) return '';
    
    // Map of common airport codes to their city codes for hotels
    const airportToCityMap = {
      'FCO': 'ROM', // Rome
      'ORY': 'PAR', // Paris Orly
      'CDG': 'PAR', // Paris CDG
      'LGW': 'LON', // London Gatwick
      'LHR': 'LON', // London Heathrow
      'STN': 'LON', // London Stansted
      'LTN': 'LON', // London Luton
      'JFK': 'NYC', // New York JFK
      'LGA': 'NYC', // New York LaGuardia
      'EWR': 'NYC', // Newark
      'LAX': 'LAX', // Los Angeles (same)
      'SFO': 'SFO', // San Francisco (same)
      'ORD': 'CHI', // Chicago O'Hare
      'MDW': 'CHI', // Chicago Midway
      'DCA': 'WAS', // Washington National
      'IAD': 'WAS', // Washington Dulles
      'NRT': 'TYO', // Tokyo Narita
      'HND': 'TYO', // Tokyo Haneda
      'BCN': 'BCN', // Barcelona (same)
      'MAD': 'MAD', // Madrid (same)
      'AMS': 'AMS', // Amsterdam (same)
      'BER': 'BER', // Berlin (same)
      'MUC': 'MUC', // Munich (same)
      'FRA': 'FRA', // Frankfurt (same)
      'DXB': 'DXB', // Dubai (same)
      'SIN': 'SIN', // Singapore (same)
      'HKG': 'HKG', // Hong Kong (same)
      'BKK': 'BKK', // Bangkok (same)
      'IST': 'IST', // Istanbul (same)
      'TLV': 'TLV', // Tel Aviv (same)
      'MIA': 'MIA', // Miami (same)
      'LAS': 'LAS', // Las Vegas (same)
      'SEA': 'SEA', // Seattle (same)
      'BOS': 'BOS', // Boston (same)
      'DEN': 'DEN', // Denver (same)
      'ATL': 'ATL', // Atlanta (same)
      'DFW': 'DFW', // Dallas (same)
      'IAH': 'HOU', // Houston IAH -> HOU
      'HOU': 'HOU', // Houston Hobby
      'PHX': 'PHX', // Phoenix (same)
      'MCO': 'ORL', // Orlando -> ORL
      'YYZ': 'YTO', // Toronto Pearson -> YTO
      'YUL': 'YMQ', // Montreal -> YMQ
      'MEX': 'MEX', // Mexico City (same)
      'GRU': 'SAO', // São Paulo -> SAO
      'GIG': 'RIO', // Rio de Janeiro -> RIO
      'SYD': 'SYD', // Sydney (same)
      'MEL': 'MEL', // Melbourne (same)
    };
    
    const airportCode = extractIataCode(location);
    
    // Try to map airport code to city code
    if (airportCode && airportToCityMap[airportCode]) {
      console.log(`[SearchLodging] Mapped airport ${airportCode} to city ${airportToCityMap[airportCode]}`);
      return airportToCityMap[airportCode];
    }
    
    // If no mapping found, return the original code (might already be a city code)
    return airportCode;
  };

  const saveLodgingMutation = useMutation({
    mutationFn: (lodgingData) => {
      const isDuplicate = existingLodging.some(l =>
        l.name === lodgingData.name &&
        l.location === lodgingData.location &&
        l.check_in_date === lodgingData.check_in_date &&
        l.check_out_date === lodgingData.check_out_date
      );

      if (isDuplicate) {
        throw new Error('This lodging is already saved to your trip.');
      }

  return firebaseClient.entities.Lodging.create({
        ...lodgingData,
        trip_id: tripId,
        status: 'saved'
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['lodging', tripId] });
      setSavedItems(prev => new Set([...prev, data.id]));
    },
    onError: (error) => {
      showDialog('Save Error', error.message || 'Failed to save lodging');
    }
  });

  const handleDestinationChange = (destId) => {
    const destination = destinations.find(d => d.id === destId);
    if (destination) {
      console.log('[SearchLodging] Selected destination:', destination);
      
      const checkOutDate = new Date(destination.arrival_date);
      checkOutDate.setDate(checkOutDate.getDate() + (destination.nights || 1));
      
      // Use location_name as the location if available
      const displayName = destination.location_name || destination.location;
      
      console.log('[SearchLodging] Setting location to:', displayName);

      setSearchParams({
        ...searchParams,
        destination_id: destId,
        location: displayName, // Use display name, not the code
        location_display: displayName,
        check_in_date: destination.arrival_date,
        check_out_date: format(checkOutDate, 'yyyy-MM-dd')
      });
    }
  };

  const handleSearch = async () => {
    setIsSearching(true);
    setSearchResults([]);
    setSearchError(null);

    try {
      if (useAmadeus && canUseProSearch) {
        // Decrement credit for free users
        if (!hasProAccess && hasCredits) {
          const remaining = user?.credits?.pro_searches_remaining || 0;
          await firebaseClient.auth.updateMe({
            credits: {
              ...user.credits,
              pro_searches_remaining: remaining - 1
            }
          });
          queryClient.invalidateQueries({ queryKey: ['user'] });
        }

        // Extract city code for hotels (not airport code)
        const cityCode = getCityCodeForHotels(searchParams.location_display || searchParams.location);

        console.log('[SearchLodging] Searching hotels with city code:', cityCode, 'from location:', searchParams.location_display);

        if (!cityCode) {
          setSearchError(`Please select a location with a valid city/airport code. Current selection: ${searchParams.location_display || searchParams.location}`);
          setIsSearching(false);
          return;
        }

        const response = await firebaseClient.functions.invoke('searchAmadeusHotels', {
          cityCode: cityCode,
          checkInDate: searchParams.check_in_date,
          checkOutDate: searchParams.check_out_date,
          adults: searchParams.guests || 2
        });

        console.log('[SearchLodging] Amadeus API response:', response);

        // Amadeus returns {data: [...]} - the hotel offers are in the 'data' array
        if (response && response.data && Array.isArray(response.data) && response.data.length > 0) {
          setSearchResults(response.data);
        } else {
          console.log('[SearchLodging] No hotels in response:', response);
          setSearchError("No hotels found using Amadeus. Try different dates, location, or the regular search.");
        }
      } else {
        // Use AI search
        const nights = Math.ceil((new Date(searchParams.check_out_date) - new Date(searchParams.check_in_date)) / (1000 * 60 * 60 * 24));

        const accommodationType = searchParams.type === 'hotel' ? 'hotels' :
                                 searchParams.type === 'airbnb' ? 'Airbnb properties' :
                                 searchParams.type === 'hostel' ? 'hostels' :
                                 searchParams.type === 'resort' ? 'resorts' :
                                 searchParams.type === 'apartment' ? 'apartments' :
                                 searchParams.type === 'villa' ? 'villas' : 'accommodations';

        const prompt = `Find ${accommodationType} in ${searchParams.location_display || searchParams.location} for check-in on ${searchParams.check_in_date} and check-out on ${searchParams.check_out_date} (${nights} nights) for ${searchParams.guests} ${searchParams.guests > 1 ? 'guests' : 'guest'}.

Check Booking.com, Hotels.com, Airbnb.com, VRBO, Hostelworld, or similar platforms for current availability and pricing.

Provide realistic options with:
- Property name
- Type (hotel/airbnb/hostel/resort/apartment/villa)
- Location/address
- Price per night in USD
- Guest rating (1-10 scale)
- Key amenities (WiFi, parking, breakfast, pool, kitchen, etc.)
- Brief description

Return 5-8 options with varied price points if available.`;

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
                    name: { type: "string" },
                    type: { type: "string" },
                    location: { type: "string" },
                    price_per_night: { type: "number" },
                    rating: { type: "number" },
                    amenities: {
                      type: "array",
                      items: { type: "string" }
                    },
                    details: { type: "string" }
                  }
                }
              }
            }
          }
        });

        if (result.options && result.options.length > 0) {
          setSearchResults(result.options);
        } else {
          setSearchError("No accommodations found. Try different dates or locations.");
        }
      }
    } catch (error) {
      console.error("Search error:", error);
      setSearchError("Unable to search at the moment. Please try again later.");
    }

    setIsSearching(false);
  };

  const handleSave = (option) => {
    const nights = Math.ceil((new Date(searchParams.check_out_date) - new Date(searchParams.check_in_date)) / (1000 * 60 * 60 * 24));

    saveLodgingMutation.mutate({
      destination_id: searchParams.destination_id,
      name: option.name,
      type: option.type || searchParams.type,
      location: option.location || searchParams.location,
      location_display: option.location || searchParams.location_display,
      check_in_date: searchParams.check_in_date,
      check_out_date: searchParams.check_out_date,
      price_per_night: option.price_per_night,
      total_price: option.price_per_night * nights,
      rating: option.rating,
      amenities: option.amenities,
      details: option.details,
      guests: searchParams.guests
    });
  };

  // Handler for saving Amadeus hotel offers
  const handleSaveOption = (option) => {
    const isAmadeusResult = option.hotel !== undefined || option.hotelId !== undefined;
    
    if (isAmadeusResult) {
      // Extract data from Amadeus hotel offer
      const hotel = option.hotel || {};
      const hotelName = hotel.name || option.name || 'Hotel';
      const hotelId = hotel.hotelId || option.hotelId;
      const cityCode = hotel.cityCode || option.cityCode;
      
      const offers = option.offers || [];
      const firstOffer = offers[0] || {};
      const price = firstOffer.price || {};
      const room = firstOffer.room || {};
      
      const nights = Math.ceil((new Date(searchParams.check_out_date) - new Date(searchParams.check_in_date)) / (1000 * 60 * 60 * 24));
      const pricePerNight = price.total ? parseFloat(price.total) / nights : 0;
      const totalPrice = price.total ? parseFloat(price.total) : 0;
      
      const roomType = room.typeEstimated?.category || room.type || 'Standard Room';
      const bedType = room.typeEstimated?.bedType || '';
      
      const lodgingData = {
        destination_id: searchParams.destination_id,
        name: hotelName,
        type: 'hotel',
        location: searchParams.location,
        location_display: searchParams.location_display || cityCode,
        check_in_date: searchParams.check_in_date,
        check_out_date: searchParams.check_out_date,
        price_per_night: pricePerNight,
        total_price: totalPrice,
        rating: 0,
        amenities: [],
        details: `${roomType}${bedType ? ' - ' + bedType : ''} • Amadeus Hotel ID: ${hotelId} • ${price.currency} ${totalPrice.toFixed(2)}`,
        guests: searchParams.guests
      };

      console.log('[SearchLodging] Saving Amadeus hotel:', lodgingData);
      
      // Mark as saved immediately
      setSavedItems(prev => new Set([...prev, hotelId]));
      
      saveLodgingMutation.mutate(lodgingData);
    } else {
      // Fall back to regular handleSave for AI-generated results
      handleSave(option);
    }
  };

  // Render nothing if tripId is missing and we are redirecting
  if (!tripId) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-slate-100 p-4 md:p-8">
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
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900">Search Lodging</h1>
            {trip && <p className="text-gray-500 mt-1">{trip.name}</p>}
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <Card className="border-0 shadow-xl rounded-2xl sticky top-4">
              <CardHeader className="bg-gradient-to-r from-purple-600 to-purple-700 text-white p-6 rounded-t-2xl">
                <CardTitle className="text-xl font-bold">Search Options</CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-gray-700">Select Destination</Label>
                  <Select value={searchParams.destination_id} onValueChange={handleDestinationChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select destination" />
                    </SelectTrigger>
                    <SelectContent>
                      {destinations.map((dest) => (
                        <SelectItem key={dest.id} value={dest.id}>
                          {dest.location_name || dest.location}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <LocationSearchInput
                  id="location"
                  label="Or Search Location Manually"
                  value={searchParams.location_display || searchParams.location}
                  onChange={(placeId, displayName, coordinates) => setSearchParams({ 
                    ...searchParams, 
                    location: placeId,
                    location_display: displayName 
                  })}
                  onDisplayChange={(display) => setSearchParams(prev => ({ 
                    ...prev, 
                    location_display: display 
                  }))}
                  placeholder="Search city or area"
                  includeAirportCodes={false}
                />

                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-gray-700">Accommodation Type</Label>
                  <Select
                    value={searchParams.type}
                    onValueChange={(value) => setSearchParams({ ...searchParams, type: value })}
                    disabled={useAmadeus}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hotel">🏨 Hotel</SelectItem>
                      <SelectItem value="airbnb">🏠 Airbnb</SelectItem>
                      <SelectItem value="hostel">🛏️ Hostel</SelectItem>
                      <SelectItem value="resort">🏖️ Resort</SelectItem>
                      <SelectItem value="apartment">🏢 Apartment</SelectItem>
                      <SelectItem value="villa">🏰 Villa</SelectItem>
                    </SelectContent>
                  </Select>
                  {useAmadeus && (
                    <p className="text-xs text-gray-500">
                      Amadeus Pro primarily searches for hotels. Accommodation type selection is disabled.
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-gray-700">Check-in Date</Label>
                  <Input
                    type="date"
                    value={searchParams.check_in_date}
                    onChange={(e) => setSearchParams({ ...searchParams, check_in_date: e.target.value })}
                    min={trip?.departure_date}
                    max={trip?.return_date}
                    className="border-gray-200"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-gray-700">Check-out Date</Label>
                  <Input
                    type="date"
                    value={searchParams.check_out_date}
                    onChange={(e) => setSearchParams({ ...searchParams, check_out_date: e.target.value })}
                    min={searchParams.check_in_date || trip?.departure_date}
                    max={trip?.return_date}
                    className="border-gray-200"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-gray-700">Number of Guests</Label>
                  <Input
                    type="number"
                    value={searchParams.guests}
                    onChange={(e) => setSearchParams({ ...searchParams, guests: parseInt(e.target.value) || 1 })}
                    min="1"
                    className="border-gray-200"
                  />
                </div>

                <Button
                  onClick={handleSearch}
                  disabled={!searchParams.location || !searchParams.check_in_date || !searchParams.check_out_date || isSearching}
                  className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 shadow-lg"
                >
                  {isSearching ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Searching...
                    </>
                  ) : (
                    <>
                      <Search className="w-4 h-4 mr-2" />
                      Search Hotels
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-2">
            <Card className="border-0 shadow-xl rounded-2xl">
              <CardHeader className="border-b bg-gradient-to-r from-white to-purple-50 p-6">
                <CardTitle className="text-2xl font-bold">Results</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                {searchResults.length === 0 && !isSearching && !searchError && (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-purple-50 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Hotel className="w-8 h-8 text-purple-600" />
                    </div>
                    <p className="text-gray-500">Select a destination and dates to search for accommodations</p>
                  </div>
                )}

                {isSearching && (
                  <div className="flex flex-col items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-purple-600 mb-4" />
                    <p className="text-gray-500">Searching for accommodations...</p>
                  </div>
                )}

                <div className="space-y-4">
                  {searchResults.map((option, index) => {
                    // Check if this is an Amadeus hotel result
                    const isAmadeusResult = option.hotel !== undefined || option.hotelId !== undefined;
                    
                    if (isAmadeusResult) {
                      // Render Amadeus hotel card
                      const hotelId = option.hotel?.hotelId || option.hotelId;
                      return (
                        <motion.div
                          key={hotelId || index}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.1 }}
                        >
                          <AmadeusHotelCard
                            offer={option}
                            onSave={() => handleSaveOption(option)}
                            isSaved={savedItems.has(hotelId)}
                            isDisabled={saveLodgingMutation.isPending}
                          />
                        </motion.div>
                      );
                    }

                    // AI-generated result - existing rendering logic
                    const isSaved = existingLodging.some(l =>
                      l.name === option.name &&
                      (l.location === option.location || l.location === searchParams.location) &&
                      l.check_in_date === searchParams.check_in_date &&
                      l.check_out_date === searchParams.check_out_date
                    );

                    const nights = Math.ceil((new Date(searchParams.check_out_date) - new Date(searchParams.check_in_date)) / (1000 * 60 * 60 * 24));
                    const totalPrice = option.price_per_night * nights;

                    return (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="p-6 bg-gradient-to-r from-white to-purple-50 rounded-xl border border-gray-200 hover:shadow-lg transition-shadow"
                      >
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <Badge className="mb-2 bg-purple-100 text-purple-700 border-purple-200">
                              {option.type}
                            </Badge>
                            <h3 className="font-bold text-lg">{option.name}</h3>
                            {option.location_display && (
                              <p className="text-sm text-gray-600 mt-1">{option.location_display}</p>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-gray-500">${option.price_per_night}/night</p>
                            <p className="text-2xl font-bold text-purple-600">${totalPrice}</p>
                            <p className="text-xs text-gray-500">{nights} nights total</p>
                          </div>
                        </div>

                        {option.amenities && option.amenities.length > 0 && (
                          <div className="mb-4">
                            <p className="text-xs font-semibold text-gray-500 mb-2">Amenities</p>
                            <div className="flex flex-wrap gap-1">
                              {option.amenities.slice(0, 5).map((amenity, idx) => (
                                <Badge key={idx} variant="outline" className="text-xs bg-gray-50">
                                  {amenity}
                                </Badge>
                              ))}
                              {option.amenities.length > 5 && (
                                <Badge variant="outline" className="text-xs bg-gray-50">
                                  +{option.amenities.length - 5} more
                                </Badge>
                              )}
                            </div>
                          </div>
                        )}

                        {option.details && (
                          <p className="text-sm text-gray-600 mb-4">{option.details}</p>
                        )}

                        <Button
                          onClick={() => handleSave(option)}
                          disabled={isSaved || saveLodgingMutation.isPending}
                          className={`w-full ${isSaved ? 'bg-green-600 hover:bg-green-600' : 'bg-purple-600 hover:bg-purple-700'}`}
                        >
                          {isSaved ? (
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

      {/* Error Dialog */}
      <Dialog open={showErrorDialog} onOpenChange={setShowErrorDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-600 flex items-center gap-2">
              <AlertCircle className="h-5 w-5" /> {errorDialogTitle}
            </DialogTitle>
            <DialogDescription>
              {errorDialogMessage}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-start">
            <DialogClose asChild>
              <Button type="button" variant="secondary">
                Close
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
