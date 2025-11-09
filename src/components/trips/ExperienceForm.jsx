
import React from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Save } from "lucide-react"; // Removed Star as it's no longer used in the header
import { motion } from "framer-motion";
import LocationSearchInput from "../common/LocationSearchInput";

export default function ExperienceForm({ experience, onSave, onCancel, minDate, maxDate }) {
  const [formData, setFormData] = React.useState({
    name: experience?.name || '',
    category: experience?.category || 'city_tour',
    provider: experience?.provider || '',
    location: experience?.location || '',
    location_display: experience?.location_display || '', // Ensure this is initialized
    date: experience?.date || '',
    duration: experience?.duration || '',
    price: experience?.price !== undefined && experience.price !== null ? String(experience.price) : '', // Convert number to string for input value, handle null/undefined
    booking_reference: experience?.booking_reference || '',
    status: experience?.status || 'saved',
    rating: experience?.rating !== undefined && experience.rating !== null ? String(experience.rating) : '', // Convert number to string for input value, handle null/undefined
    details: experience?.details || ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const cleanedData = { ...formData };
    
    // Convert price to number if it's a valid number string, otherwise delete
    if (cleanedData.price && !isNaN(parseFloat(cleanedData.price))) {
      cleanedData.price = parseFloat(cleanedData.price);
    } else {
      delete cleanedData.price;
    }

    // Convert rating to number if it's a valid number string, otherwise delete
    if (cleanedData.rating && !isNaN(parseFloat(cleanedData.rating))) {
      cleanedData.rating = parseFloat(cleanedData.rating);
    } else {
      delete cleanedData.rating;
    }
    
    onSave(cleanedData);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }} // Updated initial animation
      animate={{ opacity: 1, y: 0 }}   // Updated animate animation
      exit={{ opacity: 0, y: -20 }}    // Updated exit animation
      className="bg-white rounded-xl shadow-lg p-6 mb-6" // Updated class names
    >
      <h3 className="text-xl font-bold text-gray-900 mb-4">
        {experience ? 'Edit Experience' : 'Add Experience'}
      </h3>

      <form onSubmit={handleSubmit} className="space-y-4"> {/* Form tag kept for functionality */}
        <div className="space-y-2">
          <Label htmlFor="name" className="text-sm font-semibold text-gray-700">Activity Name</Label> {/* Label text changed */}
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g., City Walking Tour"
            className="border-gray-200"
            required // Added required based on submit button disabled state
          />
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-sm font-semibold text-gray-700">Category</Label>
            <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
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

          <LocationSearchInput
            id="location"
            label="Location"
            value={formData.location_display || formData.location}
            onChange={(code, displayName) => {
              setFormData({
                ...formData,
                location: code,
                location_display: displayName
              });
            }}
            placeholder="City or area"
            includeAirportCodes={false}
          />

          <div className="space-y-2">
            <Label htmlFor="date" className="text-sm font-semibold text-gray-700">Date</Label>
            <Input
              id="date"
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              min={minDate}
              max={maxDate}
              className="border-gray-200"
              required // Added required based on submit button disabled state
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="duration" className="text-sm font-semibold text-gray-700">Duration (Optional)</Label>
            <Input
              id="duration"
              value={formData.duration}
              onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
              placeholder="e.g., 3 hours, Full day"
              className="border-gray-200"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="provider" className="text-sm font-semibold text-gray-700">Provider (Optional)</Label>
            <Input
              id="provider"
              value={formData.provider}
              onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
              placeholder="e.g., GetYourGuide, Airbnb"
              className="border-gray-200"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="price" className="text-sm font-semibold text-gray-700">Price (Optional)</Label>
            <Input
              id="price"
              type="number"
              step="0.01"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              placeholder="0.00"
              className="border-gray-200"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="rating" className="text-sm font-semibold text-gray-700">Rating (Optional)</Label>
            <Input
              id="rating"
              type="number"
              step="0.1"
              min="0"
              max="10"
              value={formData.rating}
              onChange={(e) => setFormData({ ...formData, rating: e.target.value })}
              placeholder="0-10"
              className="border-gray-200"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="booking_reference" className="text-sm font-semibold text-gray-700">Booking Reference (Optional)</Label>
            <Input
              id="booking_reference"
              value={formData.booking_reference}
              onChange={(e) => setFormData({ ...formData, booking_reference: e.target.value })}
              placeholder="e.g., ABC123"
              className="border-gray-200"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-semibold text-gray-700">Status</Label>
            <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="saved">Saved</SelectItem>
                <SelectItem value="booked">Booked</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="details" className="text-sm font-semibold text-gray-700">Details (Optional)</Label>
          <Textarea
            id="details"
            value={formData.details}
            onChange={(e) => setFormData({ ...formData, details: e.target.value })}
            placeholder="What's included, meeting point, etc."
            className="border-gray-200 h-20 resize-none"
          />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            className="px-6"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={!formData.name || !formData.date}
            className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white px-6 shadow-lg"
          >
            {experience ? (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </>
            ) : (
              <>
                <Plus className="w-4 h-4 mr-2" />
                Add Experience
              </>
            )}
          </Button>
        </div>
      </form>
    </motion.div>
  );
}
