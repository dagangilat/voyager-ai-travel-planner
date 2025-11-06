
import React, { useState, useEffect } from "react"; // Added useEffect
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

  const [searchParams, setSearchParams] = useState({
    type: 'flight',
    from_location: '',
    from_location_display: '',
    to_location: '',
    to_location_display: '',
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

  // Fetch current user for Pro access check
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
  queryFn: () => firebaseClient.auth.me(),
    staleTime: 5 * 60 * 1000 // 5 minutes
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

  const { data: existingTransportation = [] } = useQuery({
    queryKey: ['transportation', tripId],
  queryFn: () => firebaseClient.entities.Transportation.filter({ trip_id: tripId }),
    enabled: !!tripId
  });

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
      setSavedItems(prev => new Set([...prev, data.id]));
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
      setSearchParams(prev => ({
        ...prev,
        to_location: destination.location,
        to_location_display: destination.location_name || destination.location,
        departure_date: destination.arrival_date
      }));
    }
  };

  const decrementSearchCredit = async () => {
    const credits = user?.credits;
    if (credits && credits.pro_searches_remaining > 0) {
  await firebaseClient.auth.updateMe({
        credits: {
          ...credits,
          pro_searches_remaining: credits.pro_searches_remaining - 1
        }
      });
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
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

        // Decrement credit for free users using Pro search if they have remaining credits
        if (!hasProAccess && user?.credits?.pro_searches_remaining > 0) {
          await decrementSearchCredit();
        }

        // Use Amadeus API
  const response = await firebaseClient.functions.invoke('searchAmadeusFlights', {
          origin: searchParams.from_location, // Assuming this will be an IATA code for Amadeus
          destination: searchParams.to_location, // Assuming this will be an IATA code for Amadeus
          departureDate: searchParams.departure_date,
          adults: 1 // Hardcoding for now, as there's no UI for this
        });

        if (response.data?.options && response.data.options.length > 0) {
          setSearchResults(response.data.options);
        } else {
          setSearchError("No flights found using Amadeus. Try different dates or locations.");
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
                        {destinations.map((dest) => (
                          <SelectItem key={dest.id} value={dest.id}>
                            {dest.location_name || dest.location}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <LocationSearchInput
                  id="from_location"
                  label="From"
                  value={searchParams.from_location}
                  onChange={(value) => setSearchParams({ ...searchParams, from_location: value })}
                  onDisplayChange={(display) => setSearchParams(prev => ({ ...prev, from_location_display: display }))}
                  placeholder="Search departure location"
                  includeAirportCodes={true}
                />

                <LocationSearchInput
                  id="to_location"
                  label="To"
                  value={searchParams.to_location}
                  onChange={(value) => setSearchParams({ ...searchParams, to_location: value })}
                  onDisplayChange={(display) => setSearchParams(prev => ({ ...prev, to_location_display: display }))}
                  placeholder="Search arrival location"
                  includeAirportCodes={true}
                />

                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-gray-700">Date</Label>
                  <Input
                    type="date"
                    value={searchParams.departure_date}
                    onChange={(e) => setSearchParams({ ...searchParams, departure_date: e.target.value })}
                    min={trip?.departure_date}
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
                      🔍 Search
                    </Button>
                    <div className="relative">
                      <Button
                        type="button"
                        variant={useAmadeus && canUseProSearch ? "default" : "outline"}
                        onClick={() => {
                            setUseAmadeus(true);
                            // Ensure type is flight if Amadeus is selected
                            if (searchParams.type !== 'flight') {
                                setSearchParams(prev => ({ ...prev, type: 'flight' }));
                            }
                        }}
                        disabled={!canUseProSearch}
                        className="w-full"
                      >
                        ✨ Pro Search
                      </Button>
                      {!hasProAccess && (
                        <Badge className="absolute -top-2 -right-2 bg-blue-600 text-white text-[10px] px-1.5 py-0.5 rounded-full pointer-events-none">
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
                      Upgrade to Pro for real-time flight data from Amadeus.
                    </p>
                  )}
                  {proStatus === 'trial' && (
                    <p className="text-xs text-blue-600">
                      🎉 You're on a free trial! Amadeus Pro is included.
                    </p>
                  )}
                </div>

                {/* Search button and error message */}
                <Button
                  onClick={handleSearch}
                  disabled={
                    !searchParams.from_location ||
                    !searchParams.to_location ||
                    !searchParams.departure_date ||
                    isSearching ||
                    (useAmadeus && searchParams.type !== 'flight') ||
                    (useAmadeus && !canUseProSearch)
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
                      {useAmadeus ? 'Pro Search' : 'Search'}
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

                    // Calculate the full departure datetime for comparison with existing items
                    const optionDepartureDate = new Date(searchParams.departure_date);
                    const [depHours, depMinutes] = option.departure_time.split(':');
                    optionDepartureDate.setHours(parseInt(depHours), parseInt(depMinutes), 0, 0); // Set seconds and milliseconds to 0 for consistency
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
