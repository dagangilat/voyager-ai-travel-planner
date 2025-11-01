
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Calendar as CalendarIcon } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Plus, MapPin, Calendar, Info } from "lucide-react";
import { motion } from "framer-motion";
import LocationSearchInput from "../common/LocationSearchInput";
import { addDays, format } from "date-fns";
import { cn } from "@/lib/utils";

const purposeOptions = [
  { value: "rest", label: "Rest & Relax", icon: "🏖️" },
  { value: "explore", label: "Explore", icon: "🗺️" },
  { value: "beach", label: "Beach", icon: "🏝️" },
  { value: "sports", label: "Sports", icon: "⚽" },
  { value: "museums", label: "Museums", icon: "🏛️" },
  { value: "food", label: "Food", icon: "🍽️" },
  { value: "nightlife", label: "Nightlife", icon: "🎭" },
  { value: "adventure", label: "Adventure", icon: "🧗" },
  { value: "culture", label: "Culture", icon: "🎨" },
  { value: "business", label: "Business", icon: "💼" },
  { value: "shopping", label: "Shopping", icon: "🛍️" }
];

export default function DestinationForm({ destination, onSave, onCancel, previousDestination, tripDepartureDate }) {
  const getSmartDefaultDate = () => {
    if (destination && destination.arrival_date) {
      return destination.arrival_date;
    }
    if (previousDestination && previousDestination.arrival_date && previousDestination.nights) {
      const prevArrival = new Date(previousDestination.arrival_date);
      const departureFromPrev = addDays(prevArrival, previousDestination.nights);
      return format(departureFromPrev, 'yyyy-MM-dd');
    } else if (tripDepartureDate) {
      return tripDepartureDate;
    }
    return format(new Date(), 'yyyy-MM-dd');
  };

  const getMinDate = () => {
    if (previousDestination && previousDestination.arrival_date && previousDestination.nights) {
      const prevArrival = new Date(previousDestination.arrival_date);
      const departureFromPrev = addDays(prevArrival, previousDestination.nights);
      return format(departureFromPrev, 'yyyy-MM-dd');
    } else if (tripDepartureDate) {
      return tripDepartureDate;
    }
    return format(new Date(), 'yyyy-MM-dd');
  };

  const getDefaultMonth = () => {
    if (destination && destination.arrival_date) {
      return new Date(destination.arrival_date);
    }
    if (previousDestination && previousDestination.arrival_date && previousDestination.nights) {
      const prevArrival = new Date(previousDestination.arrival_date);
      return addDays(prevArrival, previousDestination.nights);
    } else if (tripDepartureDate) {
      return new Date(tripDepartureDate);
    }
    return new Date();
  };

  const [formData, setFormData] = useState(destination || {
    location: '',
    location_name: '',
    arrival_date: getSmartDefaultDate(),
    nights: 3,
    purposes: [],
    notes: ''
  });

  const [calendarOpen, setCalendarOpen] = useState(false);

  const togglePurpose = (purpose) => {
    const purposes = formData.purposes || [];
    const newPurposes = purposes.includes(purpose)
      ? purposes.filter(p => p !== purpose)
      : [...purposes, purpose];
    setFormData({ ...formData, purposes: newPurposes });
  };

  const minDate = new Date(getMinDate());
  const defaultMonth = getDefaultMonth();

  const handleDateSelect = (date) => {
    if (date) {
      setFormData({ ...formData, arrival_date: format(date, 'yyyy-MM-dd') });
      setCalendarOpen(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="bg-white rounded-xl shadow-lg p-6 mb-6"
    >
      <h3 className="text-xl font-bold text-gray-900 mb-4">
        {destination ? 'Edit Destination' : 'Add Destination'}
      </h3>

      <div className="space-y-4">
        {previousDestination && !destination && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-2">
            <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-800">
              <p className="font-semibold">Smart Date Selected</p>
              <p>Date automatically set to {format(defaultMonth, 'MMM d, yyyy')} - the day after your {previousDestination.nights}-night stay in {previousDestination.location_name || previousDestination.location}</p>
            </div>
          </div>
        )}

        <LocationSearchInput
          id="location"
          label="Destination"
          value={formData.location}
          onChange={(code, displayName) => {
            setFormData({
              ...formData,
              location: code,
              location_name: displayName // Store full "City, Country [CODE]" format
            });
          }}
          placeholder="e.g., Paris, Barcelona, Tokyo"
          includeAirportCodes={true}
        />

        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="arrival_date" className="text-sm font-semibold text-gray-700">
              Arrival Date
              {previousDestination && !destination && (
                <span className="text-xs text-blue-600 ml-2">(Auto-set to next available date)</span>
              )}
            </Label>
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal border-gray-200 hover:border-blue-500",
                    !formData.arrival_date && "text-muted-foreground"
                  )}
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  {formData.arrival_date ? format(new Date(formData.arrival_date), 'PPP') : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarIcon
                  mode="single"
                  selected={formData.arrival_date ? new Date(formData.arrival_date) : undefined}
                  onSelect={handleDateSelect}
                  disabled={(date) => date < minDate}
                  defaultMonth={defaultMonth}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            {previousDestination && (
              <p className="text-xs text-gray-500 flex items-center gap-1">
                <Info className="w-3 h-3" />
                Cannot be earlier than {format(minDate, 'MMM d, yyyy')}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="nights" className="text-sm font-semibold text-gray-700">Number of Nights</Label>
            <Input
              id="nights"
              type="number"
              min="1"
              value={formData.nights}
              onChange={(e) => setFormData({ ...formData, nights: parseInt(e.target.value) || 1 })}
              className="border-gray-200 focus:border-blue-500 transition-colors"
            />
          </div>
        </div>

        <div className="space-y-3">
          <Label className="text-sm font-semibold text-gray-700">Activities & Purposes</Label>
          <div className="flex flex-wrap gap-2">
            {purposeOptions.map((option) => (
              <Badge
                key={option.value}
                onClick={() => togglePurpose(option.value)}
                className={`cursor-pointer px-4 py-2 transition-all duration-200 hover:scale-105 ${
                  (formData.purposes || []).includes(option.value)
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
                }`}
              >
                <span className="mr-2">{option.icon}</span>
                {option.label}
              </Badge>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="notes" className="text-sm font-semibold text-gray-700">Notes (Optional)</Label>
          <Textarea
            id="notes"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Any special plans or things to remember?"
            className="border-gray-200 focus:border-blue-500 transition-colors h-24 resize-none"
          />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
          <Button
            variant="outline"
            onClick={onCancel}
            className="px-6"
          >
            Cancel
          </Button>
          <Button
            onClick={() => onSave(formData)}
            disabled={!formData.location || !formData.arrival_date}
            className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-6 shadow-lg"
          >
            <Plus className="w-4 h-4 mr-2" />
            {destination ? 'Save Changes' : 'Add Destination'}
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
