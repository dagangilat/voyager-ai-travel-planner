
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

  const { data: user } = useQuery({
    queryKey: ['user'],
  queryFn: () => firebaseClient.auth.me(),
    staleTime: Infinity,
  });

  // Check if user has pro access OR has remaining credits
  const proStatus = user?.pro_subscription?.status;
  const hasProAccess = proStatus === 'pro' || proStatus === 'trial';
  const hasCredits = (user?.credits?.pro_searches_remaining || 0) > 0;
  const canUseProSearch = hasProAccess || hasCredits;

  const { data: trip } = useQuery({
    queryKey: ['trip', tripId],
    queryFn: async () => {
  const trips = await firebaseClient.entities.Trip.filter({ id: tripId });
      return trips[0];
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
      const checkOutDate = new Date(destination.arrival_date);
      checkOutDate.setDate(checkOutDate.getDate() + (destination.nights || 1));

      setSearchParams({
        ...searchParams,
        destination_id: destId,
        location: destination.location, // Keep the Place ID for reference
        location_display: destination.location_name || destination.location, // Use display name
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

        // Use Amadeus API
        const cityCode = searchParams.location && searchParams.location.length >= 3
          ? searchParams.location.substring(0, 3).toUpperCase()
          : null;

        if (!cityCode) {
          setSearchError("Please provide a valid location for Amadeus search (e.g., city name).");
          setIsSearching(false);
          return;
        }

  const response = await firebaseClient.functions.invoke('searchAmadeusHotels', {
          cityCode: cityCode,
          checkInDate: searchParams.check_in_date,
          checkOutDate: searchParams.check_out_date,
          adults: searchParams.guests || 2 // Use guests from searchParams, default to 2
        });

        if (response.data && response.data.options && response.data.options.length > 0) {
          setSearchResults(response.data.options);
        } else {
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
                  onChange={(placeId, displayName) => setSearchParams({ 
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

                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-gray-700">Search Method</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      variant={!useAmadeus ? "default" : "outline"}
                      onClick={() => setUseAmadeus(false)}
                      className="w-full"
                    >
                      🔍 Search
                    </Button>
                    <div className="relative">
                      <Button
                        type="button"
                        variant={useAmadeus && canUseProSearch ? "default" : "outline"}
                        onClick={() => setUseAmadeus(true)}
                        disabled={!canUseProSearch}
                        className="w-full"
                      >
                        ✨ Pro Search
                      </Button>
                      {!hasProAccess && (
                        <Badge className="absolute -top-2 -right-2 bg-purple-600 text-white text-[10px] px-1.5 py-0.5 rounded-full pointer-events-none">
                          Pro
                        </Badge>
                      )}
                    </div>
                  </div>
                  {useAmadeus && !hasProAccess && hasCredits && (
                    <p className="text-xs text-amber-600">
                      You have {user.credits.pro_searches_remaining} free Pro searches left.
                    </p>
                  )}
                  {useAmadeus && !hasProAccess && !hasCredits && (
                    <p className="text-xs text-amber-600">
                      Upgrade to Pro for real-time hotel data from Amadeus
                    </p>
                  )}
                  {user?.pro_subscription?.status === 'trial' && (
                    <p className="text-xs text-purple-600">
                      🎉 You're on a free trial! Amadeus Pro is included.
                    </p>
                  )}
                </div>

                <Button
                  onClick={handleSearch}
                  disabled={!searchParams.location || !searchParams.check_in_date || !searchParams.check_out_date || isSearching || (useAmadeus && !canUseProSearch)}
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
                      {useAmadeus && canUseProSearch ? 'Pro Search' : 'Search'}
                      {useAmadeus && !hasProAccess && hasCredits && (
                        <Badge className="ml-2 bg-white/20">
                          {user.credits.pro_searches_remaining} left
                        </Badge>
                      )}
                    </>
                  )}
                </Button>

                {useAmadeus && !canUseProSearch && (
                  <div className="text-center mt-4">
                    <p className="text-xs text-amber-600 mb-2">
                      You've used all your free Pro searches! 🎉
                    </p>
                    <Link to={createPageUrl("ProUpgrade")}>
                      <Button size="sm" className="w-full bg-gradient-to-r from-blue-600 to-purple-600">
                        Get 50% OFF Pro
                      </Button>
                    </Link>
                  </div>
                )}
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
