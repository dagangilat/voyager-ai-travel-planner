import React, { useState } from "react";
import { firebaseClient } from "@/api/firebaseClient";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar, ArrowLeft, Plus, Trash2, Loader2, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion, AnimatePresence } from "framer-motion";
import LocationSearchInput from "../components/common/LocationSearchInput";
import DestinationForm from "../components/trips/DestinationForm";
import { Calendar as CalendarIcon } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format, addDays } from "date-fns";
import { cn } from "@/lib/utils";

export default function EditTrip() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const tripId = urlParams.get('id');

  const [tripName, setTripName] = useState("");
  const [origin, setOrigin] = useState("");
  const [originDisplay, setOriginDisplay] = useState("");
  const [departureDate, setDepartureDate] = useState("");
  const [budgetLevel, setBudgetLevel] = useState("economy");
  const [tempo, setTempo] = useState("mix");
  const [destinations, setDestinations] = useState([]);
  const [showDestinationForm, setShowDestinationForm] = useState(false);
  const [editingDestination, setEditingDestination] = useState(null);
  const [departureDateOpen, setDepartureDateOpen] = useState(false);

  const { data: trip, isLoading: loadingTrip } = useQuery({
    queryKey: ['trip', tripId],
    queryFn: async () => {
      // Use .get() to fetch by document ID directly (bypasses collection query rules)
      return await firebaseClient.entities.Trip.get(tripId);
    },
    enabled: !!tripId
  });

  const { data: tripDestinations, isLoading: loadingDestinations } = useQuery({
    queryKey: ['destinations', tripId],
    queryFn: async () => {
  const dests = await firebaseClient.entities.Destination.filter({ trip_id: tripId });
      return dests.sort((a, b) => a.order - b.order);
    },
    enabled: !!tripId
  });

  React.useEffect(() => {
    if (trip) {
      setTripName(trip.name || "");
      setOrigin(trip.origin || "");
      setOriginDisplay(trip.origin || "");
      setDepartureDate(trip.departure_date || "");
      setBudgetLevel(trip.budget_level || "economy");
      setTempo(trip.tempo || "mix");
    }
  }, [trip]);

  React.useEffect(() => {
    if (tripDestinations) {
      setDestinations(tripDestinations);
    }
  }, [tripDestinations]);

  const updateTripMutation = useMutation({
    mutationFn: async (data) => {
  await firebaseClient.entities.Trip.update(tripId, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trip', tripId] });
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      navigate(createPageUrl(`TripDetails?id=${tripId}`));
    },
  });

  const createDestinationMutation = useMutation({
    mutationFn: async (destination) => {
  const response = await firebaseClient.functions.invoke('addDestinationToTrip', {
        trip_id: tripId,
        destination
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['destinations', tripId] });
      setShowDestinationForm(false);
      setEditingDestination(null);
    },
  });

  const updateDestinationMutation = useMutation({
    mutationFn: async ({ id, data }) => {
  await firebaseClient.entities.Destination.update(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['destinations', tripId] });
      setShowDestinationForm(false);
      setEditingDestination(null);
    },
  });

  const deleteDestinationMutation = useMutation({
    mutationFn: async (destId) => {
  await firebaseClient.entities.Destination.delete(destId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['destinations', tripId] });
    },
  });

  const handleSaveTrip = async () => {
    if (!tripName || !origin || !departureDate) {
      return;
    }

    const returnDate = calculateReturnDate();

    const tripData = {
      name: tripName,
      origin: originDisplay || origin,
      departure_date: departureDate,
      return_date: returnDate,
      budget_level: budgetLevel,
      tempo: tempo
    };

    updateTripMutation.mutate(tripData);
  };

  const handleDestinationSubmit = async (destinationData) => {
    if (editingDestination) {
      updateDestinationMutation.mutate({
        id: editingDestination.id,
        data: destinationData
      });
    } else {
      const order = destinations.length + 1;
      createDestinationMutation.mutate({
        ...destinationData,
        order
      });
    }
  };

  const handleEditDestination = (dest) => {
    setEditingDestination(dest);
    setShowDestinationForm(true);
  };

  const handleDeleteDestination = (destId) => {
    if (window.confirm('Are you sure you want to delete this destination?')) {
      deleteDestinationMutation.mutate(destId);
    }
  };

  const calculateReturnDate = () => {
    if (destinations.length === 0 || !destinations[destinations.length - 1].arrival_date) {
      return null;
    }
    const lastDest = destinations[destinations.length - 1];
    const lastArrival = new Date(lastDest.arrival_date);
    return format(addDays(lastArrival, lastDest.nights || 0), 'yyyy-MM-dd');
  };

  const getPreviousDestination = () => {
    if (destinations.length === 0) return null;
    return destinations[destinations.length - 1];
  };

  if (loadingTrip || loadingDestinations) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500">Trip not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate(createPageUrl(`TripDetails?id=${tripId}`))}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Trip
          </Button>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Edit Trip</h1>
          <p className="text-gray-600">Update your trip details and destinations</p>
        </div>

        <Card className="border-0 shadow-xl rounded-2xl mb-6">
          <CardHeader className="border-b bg-gradient-to-r from-gray-50 to-blue-50 p-6">
            <CardTitle className="text-2xl font-bold">Trip Details</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="space-y-2">
              <Label htmlFor="tripName" className="text-sm font-semibold text-gray-700">Trip Name</Label>
              <Input
                id="tripName"
                value={tripName}
                onChange={(e) => setTripName(e.target.value)}
                placeholder="e.g., European Adventure 2025"
                className="border-gray-200 focus:border-blue-500"
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-gray-700">Starting at</Label>
                <LocationSearchInput
                  id="origin"
                  value={origin}
                  onChange={(code, displayName) => {
                    setOrigin(code);
                    setOriginDisplay(displayName);
                  }}
                  placeholder="Home city"
                  includeAirportCodes={true}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold text-gray-700">Departure Date</Label>
                <Popover open={departureDateOpen} onOpenChange={setDepartureDateOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal border-gray-200",
                        !departureDate && "text-muted-foreground"
                      )}
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      {departureDate ? format(new Date(departureDate), 'PPP') : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <CalendarIcon
                      mode="single"
                      selected={departureDate ? new Date(departureDate) : undefined}
                      onSelect={(date) => {
                        if (date) {
                          setDepartureDate(format(date, 'yyyy-MM-dd'));
                          setDepartureDateOpen(false);
                        }
                      }}
                      disabled={(date) => date < new Date()}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-gray-700">Budget Level</Label>
                <Select value={budgetLevel} onValueChange={setBudgetLevel}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="economy">Economy - Budget-friendly</SelectItem>
                    <SelectItem value="premium">Premium - Mid-range comfort</SelectItem>
                    <SelectItem value="luxury">Luxury - High-end exclusive</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold text-gray-700">Travel Tempo</Label>
                <Select value={tempo} onValueChange={setTempo}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="chill">Chill - Relaxed pace</SelectItem>
                    <SelectItem value="adventure">Adventure - Outdoor thrills</SelectItem>
                    <SelectItem value="culture">Culture - Museums & history</SelectItem>
                    <SelectItem value="sports">Sports - Active recreation</SelectItem>
                    <SelectItem value="mix">Mix - Balanced variety</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-xl rounded-2xl mb-6">
          <CardHeader className="border-b bg-gradient-to-r from-gray-50 to-blue-50 p-6">
            <div className="flex justify-between items-center">
              <CardTitle className="text-2xl font-bold">Destinations</CardTitle>
              <Button
                onClick={() => {
                  setEditingDestination(null);
                  setShowDestinationForm(true);
                }}
                className="bg-gradient-to-r from-blue-600 to-blue-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Destination
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {showDestinationForm ? (
              <div className="mb-6">
                <DestinationForm
                  destination={editingDestination}
                  onSubmit={handleDestinationSubmit}
                  onCancel={() => {
                    setShowDestinationForm(false);
                    setEditingDestination(null);
                  }}
                  isSubmitting={createDestinationMutation.isPending || updateDestinationMutation.isPending}
                  previousDestination={getPreviousDestination()}
                  tripDepartureDate={departureDate}
                />
              </div>
            ) : destinations.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500">No destinations yet. Add your first stop!</p>
              </div>
            ) : (
              <AnimatePresence>
                {destinations.map((dest, index) => (
                  <motion.div
                    key={dest.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="mb-4 last:mb-0"
                  >
                    <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl p-6 border border-gray-200">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3 flex-1">
                          <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                            {index + 1}
                          </div>
                          <div className="flex-1">
                            <h3 className="text-lg font-bold text-gray-900">{dest.location_name || dest.location}</h3>
                            <p className="text-sm text-gray-600">
                              {dest.arrival_date && format(new Date(dest.arrival_date), 'PPP')} • {dest.nights} night{dest.nights !== 1 ? 's' : ''}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditDestination(dest)}
                            className="text-blue-600 hover:text-blue-700"
                          >
                            <Calendar className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteDestination(dest.id)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                    {index < destinations.length - 1 && (
                      <div className="flex justify-center my-4">
                        <ArrowRight className="w-6 h-6 text-blue-600" />
                      </div>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </CardContent>
        </Card>

        <div className="flex gap-4 justify-end">
          <Button
            variant="outline"
            onClick={() => navigate(createPageUrl(`TripDetails?id=${tripId}`))}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSaveTrip}
            disabled={!tripName || !origin || !departureDate || updateTripMutation.isPending}
            className="bg-gradient-to-r from-blue-600 to-blue-700"
          >
            {updateTripMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}