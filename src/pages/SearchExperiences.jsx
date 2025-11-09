
import React, { useState, useMemo } from "react";
import { firebaseClient } from "@/api/firebaseClient";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Search, Loader2, Star, Save, Check, AlertCircle } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import LocationSearchInput from "../components/common/LocationSearchInput";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { format } from 'date-fns';

// Import AlertDialog components
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";


export default function SearchExperiences() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const tripId = urlParams.get('trip_id');

  // Auto-redirect if no trip_id
  React.useEffect(() => {
    if (!tripId) {
      navigate(createPageUrl('Dashboard'));
    }
  }, [tripId, navigate]);
  
  // Invalidate user cache on mount to ensure fresh data
  React.useEffect(() => {
    console.log('[SearchExperiences] Invalidating user cache on mount...');
    queryClient.invalidateQueries({ queryKey: ['user'] });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const [searchParams, setSearchParams] = useState({
    destination_id: '',
    location: '',
    location_display: '',
    location_coordinates: null,
    date: '',
    category: 'city_tour'
  });

  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [savedItems, setSavedItems] = useState(new Set());
  // Removed searchError state as it will be handled by the dialog
  const [useAmadeus, setUseAmadeus] = useState(false); // New state for search method

  // State for the AlertDialog
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogTitle, setDialogTitle] = useState('');
  const [dialogDescription, setDialogDescription] = useState('');

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
    queryFn: async () => {
      const dests = await firebaseClient.entities.Destination.filter({ trip_id: tripId }, 'order');
      console.log('[SearchExperiences] Loaded destinations:', dests);
      return dests;
    },
    enabled: !!tripId
  });

  // Fetch places to get display names for destinations
  const { data: places = [] } = useQuery({
    queryKey: ['places'],
    queryFn: () => firebaseClient.entities.Place.filter({}),
    enabled: destinations.length > 0
  });

  // Enrich destinations with place display names and coordinates
  const enrichedDestinations = useMemo(() => {
    return destinations.map(dest => {
      // Try to find matching place for display name
      const place = places.find(p => p.id === dest.location);
      const displayName = dest.location_name || place?.name || dest.location;
      
      return {
        ...dest,
        location_name: displayName,
        location_coordinates: dest.location_coordinates || place?.location || null
      };
    });
  }, [destinations, places]);

  const { data: existingExperiences = [] } = useQuery({
    queryKey: ['experiences', tripId],
  queryFn: () => firebaseClient.entities.Experience.filter({ trip_id: tripId }),
    enabled: !!tripId
  });

  // Fetch current user for Pro access status
  const { data: user, refetch: refetchUser, isLoading: isLoadingUser } = useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      const userData = await firebaseClient.auth.me();
      console.log('[SearchExperiences] Fetched user data:', userData);
      
      // Initialize credits if they don't exist
      if (!userData.credits) {
        console.log('[SearchExperiences] Initializing credits...');
        await firebaseClient.auth.updateMe({
          credits: {
            ai_generations_remaining: 3,
            pro_searches_remaining: 10,
            last_reset_date: null
          }
        });
        // Refetch user data
        const updatedUserData = await firebaseClient.auth.me();
        console.log('[SearchExperiences] Credits initialized:', updatedUserData);
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
      console.log('[SearchExperiences] User missing credits, forcing refetch...');
      refetchUser();
    }
  }, [user, refetchUser]);

  // Check if user has pro access OR has remaining credits
  const proStatus = user?.pro_subscription?.status;
  const hasProAccess = proStatus === 'pro' || proStatus === 'trial';
  const hasCredits = (user?.credits?.pro_searches_remaining || 0) > 0;
  // Don't disable buttons while loading - give benefit of doubt
  const canUseProSearch = isLoadingUser || hasProAccess || hasCredits;


  const saveExperienceMutation = useMutation({
    mutationFn: (expData) => {
      const isDuplicate = existingExperiences.some(e =>
        e.name === expData.name &&
        e.location === expData.location &&
        e.date === expData.date
      );

      if (isDuplicate) {
        throw new Error('This experience is already saved to your trip.');
      }

  return firebaseClient.entities.Experience.create({
        ...expData,
        trip_id: tripId,
        status: 'saved'
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['experiences', tripId] });
      setSavedItems(prev => new Set([...prev, data.id]));
    },
    onError: (error) => {
      setDialogTitle('Save Error');
      setDialogDescription(error.message || 'Failed to save experience');
      setIsDialogOpen(true);
    }
  });

  const handleDestinationChange = async (destId) => {
    const destination = enrichedDestinations.find(d => d.id === destId);
    if (destination) {
      console.log('[SearchExperiences] Selected destination RAW:', destination);
      console.log('[SearchExperiences] Selected destination details:', {
        id: destId,
        location: destination.location,
        location_name: destination.location_name,
        location_coordinates: destination.location_coordinates,
      });
      
      // Get coordinates from enriched destination (already has place coordinates)
      let coordinates = destination.location_coordinates;
      
      // If still no coordinates, try geocoding the location display name
      if (!coordinates?.lat && destination.location_name) {
        console.log('[SearchExperiences] No coordinates available, will use location name for search');
        // Skip geocoding for now since the API key doesn't have Geocoding API enabled
        // Amadeus can work with city names directly
      }
      
      // Use location_name as the location if available, otherwise fall back
      const displayName = destination.location_name || destination.location;
      
      console.log('[SearchExperiences] Setting search params with displayName:', displayName);
      
      setSearchParams({
        ...searchParams,
        destination_id: destId,
        location: displayName, // Use display name, not the code
        location_display: displayName,
        location_coordinates: coordinates,
        date: destination.arrival_date
      });
      
      console.log('[SearchExperiences] Search params updated');
    }
  };

  const handleSearch = async () => {
    console.log('[SearchExperiences] Starting search with params:', {
      ...searchParams,
      useAmadeus,
      canUseProSearch,
      hasCoordinates: !!searchParams.location_coordinates?.lat
    });
    
    setIsSearching(true);
    setSearchResults([]);
    setDialogTitle('');
    setDialogDescription('');
    setIsDialogOpen(false);

    try {
      let result;

      if (useAmadeus && canUseProSearch) {
        console.log('[SearchExperiences] Using Amadeus API');
        
        // Check for coordinates before trying Amadeus
        if (!searchParams.location_coordinates?.lat || !searchParams.location_coordinates?.lng) {
          console.error('[SearchExperiences] Missing coordinates for Amadeus:', searchParams.location_coordinates);
          setDialogTitle("Coordinates Required");
          setDialogDescription("Amadeus search requires location coordinates. Please select a different destination or use regular search.");
          setIsDialogOpen(true);
          setIsSearching(false);
          return;
        }
        
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

        // Use real Amadeus Activities API
        console.log('[SearchExperiences] Calling Amadeus API with:', {
          latitude: searchParams.location_coordinates.lat,
          longitude: searchParams.location_coordinates.lng,
          radius: 20
        });

        const response = await firebaseClient.functions.invoke('searchAmadeusActivities', {
          latitude: searchParams.location_coordinates.lat,
          longitude: searchParams.location_coordinates.lng,
          radius: 20 // 20km radius
        });

        console.log('[SearchExperiences] Amadeus API response:', response);

        if (response.data && response.data.length > 0) {
          // Transform Amadeus response to our format
          result = {
            options: response.data.map(activity => ({
              name: activity.name,
              category: searchParams.category,
              provider: "Amadeus",
              duration: activity.duration || "Varies",
              price: activity.price?.amount || 0,
              rating: activity.rating || 0,
              details: activity.shortDescription || activity.description || "",
              location_display: searchParams.location_display,
              booking_link: activity.bookingLink
            }))
          };
        } else {
          setDialogTitle("No Results");
          setDialogDescription("No activities found using Amadeus. Try different location or use regular search.");
          setIsDialogOpen(true);
          setIsSearching(false);
          return;
        }

      } else {
        // Use AI search - doesn't require coordinates
        const categoryText = searchParams.category.replace('_', ' ');

        const prompt = `Find ${categoryText} experiences and activities in ${searchParams.location_display || searchParams.location} for ${searchParams.date}.

Check Airbnb Experiences, GetYourGuide, Viator, TimeOut, TripAdvisor, and reliable local tour guides for current availability and pricing.

Provide realistic options with:
- Experience/activity name
- Category (city tour/day trip/food & wine/workshop/outdoor/cultural/adventure/entertainment/wellness)
- Provider (Airbnb, GetYourGuide, Viator, etc.)
- Duration (e.g., 3 hours, Full day, Half day)
- Price per person in USD
- Rating (1-10 scale)
- Brief description of what's included
- location_display (the city or area name, e.g., "Paris, France" or "Kyoto, Japan")

Return 5-8 diverse and highly-rated options if available.`;

  result = await firebaseClient.integrations.Core.InvokeLLM({
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
                    category: { type: "string" },
                    provider: { type: "string" },
                    duration: { type: "string" },
                    price: { type: "number" },
                    rating: { type: "number" },
                    details: { type: "string" },
                    location_display: { type: "string" }
                  }
                }
              }
            }
          }
        });
      }

      if (result.options && result.options.length > 0) {
        setSearchResults(result.options);
      } else {
        setDialogTitle('No Experiences Found');
        setDialogDescription("No experiences found. Try different dates or locations.");
        setIsDialogOpen(true);
      }
    } catch (error) {
      console.error("Search error:", error);
      setDialogTitle('Search Error');
      setDialogDescription(error.message || "Unable to search at the moment. Please try again later.");
      setIsDialogOpen(true);
    }

    setIsSearching(false);
  };

  const handleSave = (option) => {
    saveExperienceMutation.mutate({
      destination_id: searchParams.destination_id,
      name: option.name,
      category: option.category || searchParams.category,
      provider: option.provider,
      location: searchParams.location,
      location_display: option.location_display || searchParams.location_display,
      date: searchParams.date,
      duration: option.duration,
      price: option.price,
      rating: option.rating,
      details: option.details
    });
  };

  if (!tripId) {
    return null; // Just return null while redirecting
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-green-50 to-slate-100 p-4 md:p-8">
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
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900">Search Experiences</h1>
            {trip && <p className="text-gray-500 mt-1">{trip.name}</p>}
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <Card className="border-0 shadow-xl rounded-2xl sticky top-4">
              <CardHeader className="bg-gradient-to-r from-green-600 to-green-700 text-white p-6 rounded-t-2xl">
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
                      {enrichedDestinations.map((dest) => (
                        <SelectItem key={dest.id} value={dest.id}>
                          {dest.location_name || dest.location || `Destination ${dest.id}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <LocationSearchInput
                  id="location"
                  label="Or Search Location Manually"
                  value={searchParams.location}
                  onChange={(value, displayName, coordinates) => setSearchParams({ 
                    ...searchParams, 
                    location: value, 
                    location_display: displayName || value,
                    location_coordinates: coordinates 
                  })}
                  placeholder="Search city or area"
                  includeAirportCodes={false}
                />

                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-gray-700">Category</Label>
                  <Select value={searchParams.category} onValueChange={(value) => setSearchParams({ ...searchParams, category: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="city_tour">🏛️ City Tour</SelectItem>
                      <SelectItem value="day_trip">🚌 Day Trip</SelectItem>
                      <SelectItem value="food_wine">🍷 Food & Wine</SelectItem>
                      <SelectItem value="workshop">🎨 Workshop</SelectItem>
                      <SelectItem value="outdoor">🏔️ Outdoor</SelectItem>
                      <SelectItem value="cultural">🎭 Cultural</SelectItem>
                      <SelectItem value="adventure">🧗 Adventure</SelectItem>
                      <SelectItem value="entertainment">🎪 Entertainment</SelectItem>
                      <SelectItem value="wellness">🧘 Wellness</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-gray-700">Date</Label>
                  <Input
                    type="date"
                    value={searchParams.date}
                    onChange={(e) => setSearchParams({ ...searchParams, date: e.target.value })}
                    min={trip?.departure_date}
                    max={trip?.return_date}
                    className="border-gray-200"
                  />
                </div>

                <Button
                  onClick={handleSearch}
                  disabled={!searchParams.location || !searchParams.date || isSearching}
                  className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 shadow-lg"
                >
                  {isSearching ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Searching...
                    </>
                  ) : (
                    <>
                      <Search className="w-4 h-4 mr-2" />
                      Search Experiences
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-2">
            <Card className="border-0 shadow-xl rounded-2xl">
              <CardHeader className="border-b bg-gradient-to-r from-gray-50 to-green-50 p-6">
                <CardTitle className="text-2xl font-bold">Results</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                {searchResults.length === 0 && !isSearching && !isDialogOpen && (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Star className="w-8 h-8 text-green-600" />
                    </div>
                    <p className="text-gray-500">Select a destination and date to discover experiences</p>
                  </div>
                )}

                {isSearching && (
                  <div className="flex flex-col items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-green-600 mb-4" />
                    <p className="text-gray-500">Searching for amazing experiences...</p>
                  </div>
                )}

                <div className="space-y-4">
                  {searchResults.map((option, index) => {
                    const isSaved = existingExperiences.some(e =>
                      e.name === option.name &&
                      e.location === searchParams.location &&
                      e.date === searchParams.date
                    );

                    return (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="p-6 bg-gradient-to-r from-white to-green-50 rounded-xl border border-gray-200 hover:shadow-lg transition-shadow"
                      >
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <Badge className="mb-2 bg-green-100 text-green-700 border-green-200">
                              {(option.category || searchParams.category)?.replace('_', ' ')}
                            </Badge>
                            <h3 className="font-bold text-lg text-gray-900 mb-1">{option.name}</h3>
                            {option.location_display && (
                              <p className="text-sm text-gray-600 mt-1">{option.location_display}</p>
                            )}
                            {option.rating && (
                              <div className="flex items-center gap-1 mt-2 mb-2">
                                <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                                <span className="font-semibold text-gray-900">{option.rating}</span>
                              </div>
                            )}
                            {option.provider && (
                              <p className="text-sm text-gray-600">by {option.provider}</p>
                            )}
                          </div>
                          {option.price && (
                            <div className="text-right">
                              <p className="text-2xl font-bold text-green-600">${option.price}</p>
                              <p className="text-xs text-gray-500">per person</p>
                            </div>
                          )}
                        </div>

                        {option.duration && (
                          <p className="text-sm text-gray-600 mb-2">⏱️ {option.duration}</p>
                        )}

                        {option.details && (
                          <p className="text-sm text-gray-600 mb-4">{option.details}</p>
                        )}

                        <Button
                          onClick={() => handleSave(option)}
                          disabled={isSaved || saveExperienceMutation.isPending}
                          className={`w-full ${isSaved ? 'bg-green-600 hover:bg-green-600' : 'bg-green-600 hover:bg-green-700'}`}
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

      {/* AlertDialog for displaying errors and messages */}
      <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{dialogTitle}</AlertDialogTitle>
            <AlertDialogDescription>{dialogDescription}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setIsDialogOpen(false)}>OK</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
