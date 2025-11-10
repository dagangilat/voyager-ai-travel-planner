import { useState, useEffect } from "react";
import { firebaseClient } from "@/api/firebaseClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, MapPin, Plus, Trash2, ArrowRight, Sparkles, Loader2, DollarSign, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion, AnimatePresence } from "framer-motion";
import LocationSearchInput from "../components/common/LocationSearchInput";
import { Calendar as CalendarIcon } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format, addDays } from "date-fns";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function CreateTrip() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [tripName, setTripName] = useState("");
  const [origin, setOrigin] = useState("");
  const [originDisplay, setOriginDisplay] = useState("");
  const [departureDate, setDepartureDate] = useState("");
  const [budgetLevel, setBudgetLevel] = useState("economy");
  const [tempo, setTempo] = useState("mix");
  const [destinations, setDestinations] = useState([]);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [createdTripId, setCreatedTripId] = useState(null);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [showAILimitDialog, setShowAILimitDialog] = useState(false);
  const [showAIOptionsDialog, setShowAIOptionsDialog] = useState(false);
  const [aiOptionsCount, setAiOptionsCount] = useState({
    transportation: 2,
    lodging: 2,
    experiences: 2
  });
  const [departureDateOpen, setDepartureDateOpen] = useState(false);
  const [destinationDateOpen, setDestinationDateOpen] = useState({});
  const [aiProgress, setAiProgress] = useState({ show: false, message: '', detail: '' });

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      const userData = await firebaseClient.auth.me();
      console.log('User data loaded:', userData);
      return userData;
    },
    staleTime: Infinity,
  });

  // Set home airport as default origin when user data loads
  useEffect(() => {
    if (user?.home_airport && !origin) {
      setOrigin(user.home_airport);
      setOriginDisplay(user.home_airport_display || user.home_airport);
    }
  }, [user]);

  const createTripMutation = useMutation({
    mutationFn: async ({ trip, destinations }) => {
      const response = await firebaseClient.functions.invoke('createTripWithDestinations', {
        trip,
        destinations
      });
      // Response is already the data (not wrapped in .data)
      return response;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      // data contains { trip, destinations }
      setCreatedTripId(data.trip?.id);
    },
  });

  const addDestination = () => {
    const lastDest = destinations[destinations.length - 1];
    let suggestedDate = departureDate;
    
    if (lastDest && lastDest.arrival_date && lastDest.nights) {
      const lastArrival = new Date(lastDest.arrival_date);
      suggestedDate = format(addDays(lastArrival, lastDest.nights), 'yyyy-MM-dd');
    }

    setDestinations([...destinations, {
      location: '',
      location_name: '',
      arrival_date: suggestedDate,
      nights: 3,
      purposes: []
    }]);
  };

  const removeDestination = (index) => {
    setDestinations(destinations.filter((_, i) => i !== index));
  };

  const updateDestination = (index, field, value) => {
    const updated = [...destinations];
    updated[index][field] = value;
    setDestinations(updated);
  };

  const calculateReturnDate = () => {
    if (destinations.length === 0 || !destinations[destinations.length - 1].arrival_date) {
      return null;
    }
    const lastDest = destinations[destinations.length - 1];
    const lastArrival = new Date(lastDest.arrival_date);
    return format(addDays(lastArrival, lastDest.nights || 0), 'yyyy-MM-dd');
  };

  const handleCreateTrip = async (withAI = false) => {
    console.log('handleCreateTrip called, withAI:', withAI);
    console.log('Current user credits:', user?.credits);
    
    if (!tripName || !origin || !departureDate || destinations.length === 0) {
      console.log('Missing required fields');
      return;
    }

    // Check AI credits first if using AI
    if (withAI) {
      const aiCredits = user?.credits?.ai_generations_remaining || 0;
      console.log('AI credits available:', aiCredits);
      
      if (aiCredits === 0) {
        setShowAILimitDialog(true);
        return;
      }
      
      // Show options dialog before proceeding
      setShowAIOptionsDialog(true);
      return;
    }

    await createTripWithOptions(false);
  };

  const createTripWithOptions = async (withAI = false) => {

    const returnDate = calculateReturnDate();

    const tripData = {
      name: tripName,
      origin: originDisplay || origin,
      departure_date: departureDate,
      return_date: returnDate,
      status: 'planning',
      budget_level: budgetLevel,
      tempo: tempo,
      user_id: user.id  // Add user_id for Firestore security rules
    };

    const destData = destinations.map((dest, idx) => ({
      ...dest,
      order: idx + 1
    }));

    try {
      // Create the trip first
      console.log('Creating trip...');
      const result = await createTripMutation.mutateAsync({ trip: tripData, destinations: destData });
      console.log('Trip created:', result);
      
      const newTripId = result.trip?.id;

      if (withAI && newTripId) {
        setIsGeneratingAI(true);
        setCreatedTripId(newTripId);
        // Don't show success dialog yet - show progress overlay instead
        setAiProgress({ show: true, message: 'Starting AI trip generation...', detail: 'Analyzing your destinations' });
        
        try {
          const destinationsText = destData.map((d, i) =>
            `${i + 1}. ${d.location_name || d.location} (${d.arrival_date}, ${d.nights} nights)${d.purposes && d.purposes.length > 0 ? ` - Focus: ${d.purposes.join(', ')}` : ''}`
          ).join('\n');

          const budgetDescription = {
            economy: 'Budget-friendly options, hostels, budget airlines, free activities',
            premium: 'Mid-range comfortable options, 3-4 star hotels, quality transportation, mix of paid and free activities',
            luxury: 'Premium luxury options, 5-star hotels, business class flights, exclusive experiences'
          }[budgetLevel];

          const tempoDescription = {
            chill: 'Relaxed pace with plenty of downtime, 1-2 activities per day',
            adventure: 'Adventure-focused with outdoor and thrilling activities, 3-4 activities per day',
            culture: 'Cultural immersion with museums, history, and local experiences',
            sports: 'Sports and active recreation focused activities',
            mix: 'Balanced mix of different activity types, 3-4 activities per day'
          }[tempo];

          const prompt = `Create a complete travel itinerary with ${aiOptionsCount.transportation} options for transportation, ${aiOptionsCount.lodging} options for lodging, and ${aiOptionsCount.experiences} options for experiences:

Trip: ${tripName}
Origin: ${originDisplay || origin}
Dates: ${departureDate} to ${returnDate}
Budget Level: ${budgetLevel} (${budgetDescription})
Tempo: ${tempo} (${tempoDescription})

Destinations:
${destinationsText}

IMPORTANT: Generate exactly ${aiOptionsCount.transportation} OPTIONS for transportation, ${aiOptionsCount.lodging} OPTIONS for lodging, and ${aiOptionsCount.experiences} OPTIONS for experiences:

TRANSPORTATION between each city pair:
For each connection (origin to first destination, between destinations), provide exactly ${aiOptionsCount.transportation} options with:
- type (flight/train/bus/ferry)
- from_location (airport/station code)
- from_location_display (full city name with code)
- to_location (airport/station code)
- to_location_display (full city name with code)
- departure_datetime (ISO format with realistic time)
- arrival_datetime (ISO format)
- provider (airline/company name)
- price (in USD)

LODGING at each destination:
For each destination, provide exactly ${aiOptionsCount.lodging} options with:
- name (hotel/property name)
- type (hotel/airbnb/hostel/resort)
- location (city code)
- location_display (full city name)
- check_in_date (arrival date at destination)
- check_out_date (departure date from destination)
- price_per_night (in USD)
- rating (7-10 scale)

EXPERIENCES at each destination:
For each destination, provide exactly ${aiOptionsCount.experiences} activity options with:
- name (activity name)
- category (city_tour/day_trip/food_wine/outdoor/cultural/adventure/entertainment/wellness)
- provider (tour company name)
- location (city code)
- location_display (full city name)
- date (one of the nights they're staying there)
- duration (e.g., "3 hours", "Full day", "Half day")
- price (in USD)
- rating (7-10 scale)

Provide realistic, varied options at different price points. Use actual airline names, hotel chains, and activity providers.`;

          console.log('Calling AI with prompt...');
          setAiProgress({ show: true, message: 'Generating recommendations...', detail: 'Planning transportation options' });
          
          const aiResult = await firebaseClient.integrations.Core.InvokeLLM({
            prompt,
            add_context_from_internet: true,
            response_json_schema: {
              type: "object",
              properties: {
                transportation: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      type: { type: "string" },
                      from_location: { type: "string" },
                      from_location_display: { type: "string" },
                      to_location: { type: "string" },
                      to_location_display: { type: "string" },
                      departure_datetime: { type: "string" },
                      arrival_datetime: { type: "string" },
                      provider: { type: "string" },
                      price: { type: "number" }
                    },
                    required: ["type", "from_location", "to_location", "departure_datetime"]
                  }
                },
                lodging: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      name: { type: "string" },
                      type: { type: "string" },
                      location: { type: "string" },
                      location_display: { type: "string" },
                      check_in_date: { type: "string" },
                      check_out_date: { type: "string" },
                      price_per_night: { type: "number" },
                      rating: { type: "number" }
                    },
                    required: ["name", "location", "check_in_date", "check_out_date"]
                  }
                },
                experiences: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      name: { type: "string" },
                      category: { type: "string" },
                      provider: { type: "string" },
                      location: { type: "string" },
                      location_display: { type: "string" },
                      date: { type: "string" },
                      duration: { type: "string" },
                      price: { type: "number" },
                      rating: { type: "number" }
                    },
                    required: ["name", "category", "location", "date"]
                  }
                }
              },
              required: ["transportation", "lodging", "experiences"]
            }
          });

          console.log('AI Response received:', aiResult);

          // Create transportation items with progress
          const transportationItems = aiResult.transportation || [];
          console.log('Creating transportation items:', transportationItems.length);
          
          for (let i = 0; i < transportationItems.length; i++) {
            const t = transportationItems[i];
            const fromDisplay = t.from_location_display || t.from_location;
            const toDisplay = t.to_location_display || t.to_location;
            setAiProgress({ 
              show: true, 
              message: 'Generating Transportation',
              detail: `${fromDisplay} → ${toDisplay}`
            });
            
            await firebaseClient.entities.Transportation.create({
              ...t,
              trip_id: newTripId,
              status: 'saved'
            });
          }

          // Create lodging items with progress
          const lodgingItems = aiResult.lodging || [];
          console.log('Creating lodging items:', lodgingItems.length);
          
          for (let i = 0; i < lodgingItems.length; i++) {
            const l = lodgingItems[i];
            const locationDisplay = l.location_display || l.location;
            setAiProgress({ 
              show: true, 
              message: 'Generating Lodging',
              detail: `${l.name} in ${locationDisplay}`
            });
            
            let nights = 1;
            if (l.check_in_date && l.check_out_date) {
              const checkIn = new Date(l.check_in_date);
              const checkOut = new Date(l.check_out_date);
              const diffTime = Math.abs(checkOut.getTime() - checkIn.getTime());
              nights = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            }

            await firebaseClient.entities.Lodging.create({
              ...l,
              trip_id: newTripId,
              total_price: l.price_per_night && nights > 0 ? l.price_per_night * nights : undefined,
              status: 'saved'
            });
          }

          // Create experience items with progress
          const experienceItems = aiResult.experiences || [];
          console.log('Creating experience items:', experienceItems.length);
          
          for (let i = 0; i < experienceItems.length; i++) {
            const e = experienceItems[i];
            const locationDisplay = e.location_display || e.location;
            setAiProgress({ 
              show: true, 
              message: 'Generating Experiences',
              detail: `${e.name} in ${locationDisplay}`
            });
            
            await firebaseClient.entities.Experience.create({
              ...e,
              trip_id: newTripId,
              status: 'saved'
            });
          }

          console.log('All items created successfully');
          
          // Decrement credit
          const currentCredits = user?.credits?.ai_generations_remaining || 1;
          await firebaseClient.auth.updateMe({
            credits: {
              ...(user?.credits || {}),
              ai_generations_remaining: currentCredits - 1
            }
          });
          
          queryClient.invalidateQueries({ queryKey: ['user'] });
          console.log('AI generation complete!');
          
          // Show success dialog after AI completes
          setAiProgress({ show: false, message: '' });
          setShowSuccessDialog(true);
        } catch (error) {
          console.error('AI generation error:', error);
          // Still show success dialog even if AI fails - trip was created
          setAiProgress({ show: false, message: '' });
          setShowSuccessDialog(true);
        } finally {
          setIsGeneratingAI(false);
        }
      } else {
        // Show success dialog immediately if not using AI
        setCreatedTripId(newTripId);
        setShowSuccessDialog(true);
      }

    } catch (error) {
      console.error('Error creating trip:', error);
    }
  };

  const getMinDateForDestination = (index) => {
    if (index === 0) {
      return departureDate || format(new Date(), 'yyyy-MM-dd');
    }
    const prevDest = destinations[index - 1];
    if (prevDest && prevDest.arrival_date && prevDest.nights) {
      const prevArrival = new Date(prevDest.arrival_date);
      return format(addDays(prevArrival, prevDest.nights), 'yyyy-MM-dd');
    }
    return departureDate || format(new Date(), 'yyyy-MM-dd');
  };

  const canSubmit = tripName && origin && departureDate && destinations.length > 0 && 
    destinations.every(d => (d.location || d.location_name) && d.arrival_date && d.nights);

  const aiCredits = user?.credits?.ai_generations_remaining || 0;
  
  console.log('Render state:', {
    canSubmit,
    isPending: createTripMutation.isPending,
    isGeneratingAI,
    aiCredits,
    buttonDisabled: !canSubmit || createTripMutation.isPending || isGeneratingAI || aiCredits === 0
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Plan Your Trip</h1>
          <p className="text-gray-600">Create your itinerary step by step, then let AI fill in the details</p>
          <Badge className="mt-2 bg-gradient-to-r from-purple-100 to-blue-100 text-purple-700 border-purple-200">
            <Sparkles className="w-3 h-3 mr-1" />
            {aiCredits} AI generation{aiCredits !== 1 ? 's' : ''} available this month
          </Badge>
        </motion.div>

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
                placeholder="e.g., European Adventure 2026"
                className="border-gray-200 focus:border-blue-500"
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-gray-700">
                  <span className="font-bold">Starting at</span>
                </Label>
                <LocationSearchInput
                  id="origin"
                  value={originDisplay || origin}
                  onChange={(code, displayName) => {
                    setOrigin(code);
                    setOriginDisplay(displayName);
                  }}
                  placeholder="Home city"
                  includeAirportCodes={true}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold text-gray-700">
                  <span className="font-bold">On</span> (Departure Date)
                </Label>
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
                <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  Budget Level
                </Label>
                <Select value={budgetLevel} onValueChange={setBudgetLevel}>
                  <SelectTrigger className="border-gray-200">
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
                <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Zap className="w-4 h-4" />
                  Trip Tempo
                </Label>
                <Select value={tempo} onValueChange={setTempo}>
                  <SelectTrigger className="border-gray-200">
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
                onClick={addDestination}
                disabled={!departureDate}
                className="bg-gradient-to-r from-blue-600 to-blue-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Destination
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {destinations.length === 0 ? (
              <div className="text-center py-12">
                <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No destinations yet. Add your first stop!</p>
              </div>
            ) : (
              <AnimatePresence>
                {destinations.map((dest, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="mb-6 last:mb-0"
                  >
                    <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl p-6 border border-gray-200">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                            {index + 1}
                          </div>
                          <h3 className="text-lg font-bold text-gray-900">
                            {index === 0 ? (
                              <><span className="text-blue-600">Then</span> travel to</>
                            ) : (
                              <><span className="text-blue-600">Then</span> travel to</>
                            )}
                          </h3>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeDestination(index)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>

                      <div className="space-y-4">
                        <LocationSearchInput
                          id={`dest-location-${index}`}
                          value={dest.location_name || dest.location}
                          onChange={(code, displayName) => {
                            updateDestination(index, 'location', code);
                            updateDestination(index, 'location_name', displayName);
                          }}
                          placeholder="Destination city"
                          includeAirportCodes={true}
                        />

                        <div className="grid md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="text-sm font-semibold text-gray-700">
                              <span className="font-bold">On</span> (Arrival Date)
                            </Label>
                            <Popover 
                              open={destinationDateOpen[index]} 
                              onOpenChange={(open) => setDestinationDateOpen(prev => ({ ...prev, [index]: open }))}
                            >
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  className={cn(
                                    "w-full justify-start text-left font-normal border-gray-200",
                                    !dest.arrival_date && "text-muted-foreground"
                                  )}
                                >
                                  <Calendar className="mr-2 h-4 w-4" />
                                  {dest.arrival_date ? format(new Date(dest.arrival_date), 'PPP') : <span>Pick a date</span>}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0">
                                <CalendarIcon
                                  mode="single"
                                  selected={dest.arrival_date ? new Date(dest.arrival_date) : undefined}
                                  onSelect={(date) => {
                                    if (date) {
                                      updateDestination(index, 'arrival_date', format(date, 'yyyy-MM-dd'));
                                      setDestinationDateOpen(prev => ({ ...prev, [index]: false }));
                                    }
                                  }}
                                  disabled={(date) => date < new Date(getMinDateForDestination(index))}
                                  defaultMonth={dest.arrival_date ? new Date(dest.arrival_date) : new Date(getMinDateForDestination(index))}
                                  initialFocus
                                />
                              </PopoverContent>
                            </Popover>
                          </div>

                          <div className="space-y-2">
                            <Label className="text-sm font-semibold text-gray-700">
                              <span className="font-bold">Stay for</span> (Nights)
                            </Label>
                            <Input
                              type="number"
                              min="1"
                              value={dest.nights}
                              onChange={(e) => updateDestination(index, 'nights', parseInt(e.target.value) || 1)}
                              className="border-gray-200"
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-sm font-semibold text-gray-700">Visit Focus (Optional)</Label>
                          <div className="flex flex-wrap gap-2">
                            {['explore', 'nightlife', 'shopping', 'beach', 'food', 'culture', 'adventure', 'rest'].map(purpose => (
                              <Badge
                                key={purpose}
                                variant={dest.purposes?.includes(purpose) ? "default" : "outline"}
                                className={cn(
                                  "cursor-pointer transition-colors",
                                  dest.purposes?.includes(purpose) 
                                    ? "bg-blue-600 hover:bg-blue-700" 
                                    : "hover:bg-blue-50"
                                )}
                                onClick={() => {
                                  const current = dest.purposes || [];
                                  const updated = current.includes(purpose)
                                    ? current.filter(p => p !== purpose)
                                    : [...current, purpose];
                                  updateDestination(index, 'purposes', updated);
                                }}
                              >
                                {purpose.charAt(0).toUpperCase() + purpose.slice(1)}
                              </Badge>
                            ))}
                          </div>
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
            onClick={() => navigate(createPageUrl("Dashboard"))}
            className="px-8"
          >
            Cancel
          </Button>
          <Button
            onClick={() => handleCreateTrip(false)}
            disabled={!canSubmit || createTripMutation.isPending || isGeneratingAI}
            variant="outline"
            className="px-8 border-blue-200 text-blue-700"
          >
            {createTripMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              'Create Trip'
            )}
          </Button>
          <Button
            onClick={() => handleCreateTrip(true)}
            disabled={!canSubmit || createTripMutation.isPending || isGeneratingAI || aiCredits === 0}
            className="px-8 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
          >
            {isGeneratingAI ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Create with AI
              </>
            )}
          </Button>
        </div>
      </div>

      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-center">Trip Created!</DialogTitle>
            <DialogDescription className="text-center text-base pt-2">
              {isGeneratingAI 
                ? "Your trip is being created with AI-generated options. This may take a moment..."
                : "Your trip has been created successfully. Ready to explore your itinerary?"}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              onClick={() => navigate(createPageUrl(`TripDetails?id=${createdTripId}`))}
              disabled={isGeneratingAI}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700"
            >
              {isGeneratingAI ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                'View Trip'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AI Options Dialog */}
      <Dialog open={showAIOptionsDialog} onOpenChange={setShowAIOptionsDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-purple-600" />
              AI Generation Options
            </DialogTitle>
            <DialogDescription className="text-base pt-2">
              Choose how many options you'd like AI to generate for each category per destination
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-gray-700">Transportation Options</Label>
              <div className="flex gap-2">
                {[1, 2, 3].map(num => (
                  <Button
                    key={`trans-${num}`}
                    type="button"
                    variant={aiOptionsCount.transportation === num ? "default" : "outline"}
                    onClick={() => setAiOptionsCount(prev => ({ ...prev, transportation: num }))}
                    className="flex-1"
                  >
                    {num}
                  </Button>
                ))}
              </div>
              <p className="text-xs text-gray-500">Options for flights, trains, buses between destinations</p>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold text-gray-700">Lodging Options</Label>
              <div className="flex gap-2">
                {[1, 2, 3].map(num => (
                  <Button
                    key={`lodging-${num}`}
                    type="button"
                    variant={aiOptionsCount.lodging === num ? "default" : "outline"}
                    onClick={() => setAiOptionsCount(prev => ({ ...prev, lodging: num }))}
                    className="flex-1"
                  >
                    {num}
                  </Button>
                ))}
              </div>
              <p className="text-xs text-gray-500">Hotel and accommodation options per destination</p>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold text-gray-700">Experience Options</Label>
              <div className="flex gap-2">
                {[1, 2, 3].map(num => (
                  <Button
                    key={`exp-${num}`}
                    type="button"
                    variant={aiOptionsCount.experiences === num ? "default" : "outline"}
                    onClick={() => setAiOptionsCount(prev => ({ ...prev, experiences: num }))}
                    className="flex-1"
                  >
                    {num}
                  </Button>
                ))}
              </div>
              <p className="text-xs text-gray-500">Activity and tour options per destination</p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800">
                <span className="font-semibold">Generating:</span> {aiOptionsCount.transportation + aiOptionsCount.lodging + aiOptionsCount.experiences} total options per destination
              </p>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              onClick={() => setShowAIOptionsDialog(false)}
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                setShowAIOptionsDialog(false);
                createTripWithOptions(true);
              }}
              className="bg-gradient-to-r from-purple-600 to-blue-600"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Generate with AI
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AI Limit Dialog */}
      <Dialog open={showAILimitDialog} onOpenChange={setShowAILimitDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-center">No AI Generations Left</DialogTitle>
            <DialogDescription className="text-center text-base pt-2">
              You&apos;ve used your free AI trip generation for this month. Your limit will reset next month, or you can manually plan your trip.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              onClick={() => setShowAILimitDialog(false)}
              className="w-full"
            >
              Got it
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AI Progress Overlay */}
      <AnimatePresence>
        {aiProgress.show && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-blue-600/20 backdrop-blur-sm z-[100] flex items-center justify-center"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl p-8 max-w-md mx-4"
            >
              <div className="flex flex-col items-center space-y-4">
                <div className="relative">
                  <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
                  <Sparkles className="w-6 h-6 text-purple-600 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                </div>
                <div className="text-center">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    AI Trip Planning in Progress
                  </h3>
                  <p className="text-blue-600 font-medium text-lg">
                    {aiProgress.message}
                  </p>
                  {aiProgress.detail && (
                    <p className="text-gray-600 mt-2">
                      {aiProgress.detail}
                    </p>
                  )}
                  <p className="text-sm text-gray-500 mt-3">
                    This may take a minute...
                  </p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
